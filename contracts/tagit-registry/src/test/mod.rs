//! Shared fixtures for the test suites.
//!
//! - `registry`: one case per rule and per proof in the plan
//! - `tags`: exhaustive checks of tag validation
//! - `ttl`: entries stay alive across months of ledgers
//! - `model`: random operation sequences checked against a reference model
//! - `wasm`: the compiled contract, its spec and its resource costs

extern crate std;

mod model;
mod registry;
mod tags;
mod ttl;
mod wasm;

use soroban_sdk::{
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
    vec, Address, Env, String,
};

use crate::{TagItRegistry, TagItRegistryClient};

pub struct Setup<'a> {
    pub env: Env,
    pub id: Address,
    pub registry: TagItRegistryClient<'a>,
    pub admin: Address,
    pub xlm: TokenClient<'a>,
    pub usdc: TokenClient<'a>,
    pub alice: Address,
    pub bob: Address,
    pub david: Address,
}

pub fn s(env: &Env, v: &str) -> String {
    String::from_str(env, v)
}

pub fn create_token<'a>(env: &Env, admin: &Address) -> (TokenClient<'a>, StellarAssetClient<'a>) {
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    (
        TokenClient::new(env, &sac.address()),
        StellarAssetClient::new(env, &sac.address()),
    )
}

/// Registry with XLM and USDC allowlisted, and alice, bob and david funded
/// with 1,000 of each.
pub fn setup<'a>() -> Setup<'a> {
    setup_in(Env::default(), None)
}

/// Like `setup()`, on a given `Env`, optionally running the compiled `wasm`
/// instead of the native contract.
pub fn setup_in<'a>(env: Env, wasm: Option<&[u8]>) -> Setup<'a> {
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (xlm, xlm_admin) = create_token(&env, &admin);
    let (usdc, usdc_admin) = create_token(&env, &admin);

    let args = (
        admin.clone(),
        vec![&env, xlm.address.clone(), usdc.address.clone()],
    );
    let id = match wasm {
        Some(wasm) => env.register(wasm, args),
        None => env.register(TagItRegistry, args),
    };
    let registry = TagItRegistryClient::new(&env, &id);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let david = Address::generate(&env);
    for who in [&alice, &bob, &david] {
        xlm_admin.mint(who, &1_000);
        usdc_admin.mint(who, &1_000);
    }

    Setup {
        env,
        id,
        registry,
        admin,
        xlm,
        usdc,
        alice,
        bob,
        david,
    }
}

/// `setup()` plus @alice, @bob and @david registered to their own wallets.
pub fn setup_with_tags<'a>() -> Setup<'a> {
    let t = setup();
    t.registry.register(&t.alice, &s(&t.env, "alice"));
    t.registry.register(&t.bob, &s(&t.env, "bob"));
    t.registry.register(&t.david, &s(&t.env, "david"));
    t
}
