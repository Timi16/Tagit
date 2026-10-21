//! Runs against the compiled contract, which is what Testnet executes.
//!
//! Ignored by plain `cargo test` because it needs a fresh build; `make test`
//! builds first and includes them.

extern crate std;

use soroban_sdk::{
    testutils::{Address as _, EnvTestConfig, Events as _},
    Address, Env,
};

use super::{s, setup_in, Setup};
use crate::Error;

const WASM: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../target/wasm32v1-none/release/tagit_registry.wasm"
);

/// Mainnet/Testnet per-transaction limit is 100M instructions.
const MAX_SEND_INSTRUCTIONS: i64 = 10_000_000;
const MAX_WASM_BYTES: usize = 32 * 1024;
/// 0.01 XLM, at the Mainnet fee snapshot the SDK uses.
const MAX_SEND_FEE_STROOPS: i64 = 100_000;

fn wasm() -> std::vec::Vec<u8> {
    let wasm = std::fs::read(WASM).unwrap_or_else(|_| {
        panic!("{WASM} missing: run `stellar contract build` (or `make test`)")
    });

    // Refuse to test a build older than the source it came from.
    let built = std::fs::metadata(WASM).unwrap().modified().unwrap();
    let src = concat!(env!("CARGO_MANIFEST_DIR"), "/src");
    for entry in std::fs::read_dir(src).unwrap().flatten() {
        let changed = entry.metadata().unwrap().modified().unwrap();
        if entry.path().extension().is_some_and(|e| e == "rs") && changed > built {
            panic!("{WASM} is older than {:?}: rebuild first", entry.path());
        }
    }
    wasm
}

fn setup_wasm<'a>(bytes: &[u8]) -> Setup<'a> {
    let env = Env::new_with_config(EnvTestConfig {
        capture_snapshot_at_drop: false,
    });
    let t = setup_in(env, Some(bytes));
    t.registry.register(&t.alice, &s(&t.env, "alice"));
    t.registry.register(&t.bob, &s(&t.env, "bob"));
    t.registry.register(&t.david, &s(&t.env, "david"));
    t
}

#[test]
#[ignore = "needs a fresh wasm build: run `make test`"]
fn wasm_is_small() {
    let size = wasm().len();
    std::println!("wasm size: {size} bytes");
    assert!(size <= MAX_WASM_BYTES, "wasm is {size} bytes");
}

#[test]
#[ignore = "needs a fresh wasm build: run `make test`"]
fn wasm_end_to_end() {
    let bytes = wasm();
    let t = setup_wasm(&bytes);
    let david = s(&t.env, "david");

    assert_eq!(t.registry.resolve(&david), t.david);
    assert_eq!(
        t.registry.try_register(&t.bob, &david),
        Err(Ok(Error::TagTaken))
    );
    assert_eq!(
        t.registry.try_resolve(&s(&t.env, "Da!")),
        Err(Ok(Error::InvalidTag))
    );

    t.registry
        .send(&t.alice, &david, &t.david, &t.xlm.address, &25);
    assert_eq!(
        t.env
            .events()
            .all()
            .filter_by_contract(&t.id)
            .events()
            .len(),
        1
    );
    t.registry
        .send(&t.alice, &s(&t.env, "bob"), &t.bob, &t.usdc.address, &10);
    assert_eq!(t.xlm.balance(&t.david), 1_025);
    assert_eq!(t.usdc.balance(&t.bob), 1_010);

    let reviewed = t.registry.resolve(&david);
    t.registry.set_wallet(&david, &t.bob);
    assert_eq!(
        t.registry
            .try_send(&t.alice, &david, &reviewed, &t.xlm.address, &25),
        Err(Ok(Error::RecipientChanged))
    );
}

#[test]
#[ignore = "needs a fresh wasm build: run `make test`"]
fn wasm_resource_costs() {
    let bytes = wasm();
    let t = setup_wasm(&bytes);

    t.registry
        .register(&Address::generate(&t.env), &s(&t.env, "carol"));
    let register = t.env.cost_estimate().resources();

    t.registry.resolve(&s(&t.env, "david"));
    let resolve = t.env.cost_estimate().resources();

    t.registry
        .send(&t.alice, &s(&t.env, "david"), &t.david, &t.xlm.address, &25);
    let send = t.env.cost_estimate().resources();
    let fee = t.env.cost_estimate().fee();

    std::println!("register: {register:#?}");
    std::println!("resolve:  {resolve:#?}");
    std::println!("send:     {send:#?}");
    std::println!("send fee: {fee:#?}");

    assert!(
        send.instructions < MAX_SEND_INSTRUCTIONS,
        "send: {}",
        send.instructions
    );
    // Mock auth adds a nonce entry whose rent dominates the estimate; a wallet
    // signing as the transaction source doesn't create one.
    let real_fee = fee.total - fee.temporary_entry_rent;
    assert!(
        real_fee < MAX_SEND_FEE_STROOPS,
        "send fee: {real_fee} stroops"
    );
    assert!(register.instructions < MAX_SEND_INSTRUCTIONS);
    assert!(resolve.instructions < MAX_SEND_INSTRUCTIONS);
}
