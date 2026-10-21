//! Tags must not be archived while they're in use.

use soroban_sdk::testutils::{storage::Instance as _, storage::Persistent as _, Ledger as _};

use super::{s, setup, setup_with_tags};
use crate::storage::DataKey;

const DAY: u32 = 17_280;
/// Testnet's current `max_entry_ttl`; extending past it would fail.
const NETWORK_MAX_TTL: u32 = 3_110_400;

fn ttls(t: &super::Setup, tag: &str) -> (u32, u32, u32) {
    t.env.as_contract(&t.id, || {
        let p = t.env.storage().persistent();
        let record: crate::TagRecord = p.get(&DataKey::Tag(s(&t.env, tag))).unwrap();
        (
            p.get_ttl(&DataKey::Tag(s(&t.env, tag))),
            p.get_ttl(&DataKey::TagOf(record.owner)),
            t.env.storage().instance().get_ttl(),
        )
    })
}

fn advance(t: &super::Setup, ledgers: u32) {
    t.env.ledger().with_mut(|l| {
        l.sequence_number += ledgers;
        l.timestamp += ledgers as u64 * 5;
    });
}

#[test]
fn register_extends_to_120_days() {
    let t = setup();
    t.env.ledger().set_max_entry_ttl(NETWORK_MAX_TTL);
    t.registry.register(&t.david, &s(&t.env, "david"));
    assert_eq!(ttls(&t, "david"), (120 * DAY, 120 * DAY, 120 * DAY));
}

#[test]
fn send_tops_up_a_tag_that_is_running_low() {
    let t = setup_with_tags();
    advance(&t, 100 * DAY);
    let (tag_ttl, _, _) = ttls(&t, "david");
    assert_eq!(tag_ttl, 20 * DAY);

    t.registry
        .send(&t.alice, &s(&t.env, "david"), &t.david, &t.xlm.address, &1);
    assert_eq!(ttls(&t, "david"), (120 * DAY, 120 * DAY, 120 * DAY));
}

#[test]
fn healthy_entries_are_not_rewritten() {
    // Below the 30-day threshold only, so busy tags don't pay rent every send.
    let t = setup_with_tags();
    advance(&t, 10 * DAY);
    t.registry
        .send(&t.alice, &s(&t.env, "david"), &t.david, &t.xlm.address, &1);
    let (tag_ttl, _, _) = ttls(&t, "david");
    assert_eq!(tag_ttl, 110 * DAY);
}

#[test]
fn active_tag_survives_a_year() {
    let t = setup_with_tags();
    let david = s(&t.env, "david");
    for _ in 0..4 {
        advance(&t, 95 * DAY);
        t.registry
            .send(&t.alice, &david, &t.david, &t.xlm.address, &1);
    }
    assert_eq!(t.registry.resolve(&david), t.david);
}

#[test]
fn set_wallet_and_release_keep_the_instance_alive() {
    let t = setup_with_tags();
    advance(&t, 100 * DAY);
    t.registry.set_wallet(&s(&t.env, "david"), &t.alice);
    assert_eq!(ttls(&t, "david").2, 120 * DAY);
}
