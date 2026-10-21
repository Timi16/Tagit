extern crate std;

use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Events as _, MockAuth, MockAuthInvoke},
    vec, Address, Env, IntoVal, Symbol, Val,
};

use super::{create_token, s, setup, setup_with_tags};
use crate::Error;

// 3+ tags registered, 3+ tags resolve correctly

#[test]
fn registers_and_resolves_three_tags() {
    let t = setup_with_tags();

    assert_eq!(t.registry.resolve(&s(&t.env, "alice")), t.alice);
    assert_eq!(t.registry.resolve(&s(&t.env, "bob")), t.bob);
    assert_eq!(t.registry.resolve(&s(&t.env, "david")), t.david);

    let record = t.registry.get(&s(&t.env, "david"));
    assert_eq!(record.tag, s(&t.env, "david"));
    assert_eq!(record.owner, t.david);
    assert_eq!(record.wallet, t.david);

    assert!(t.registry.is_registered(&s(&t.env, "david")));
    assert!(!t.registry.is_registered(&s(&t.env, "nobody_here")));

    assert_eq!(t.registry.tag_of(&t.david), Some(s(&t.env, "david")));
    assert_eq!(t.registry.tag_of(&Address::generate(&t.env)), None);
}

#[test]
fn register_requires_owner_auth_and_emits_event() {
    let t = setup();
    t.registry.register(&t.david, &s(&t.env, "david"));

    assert_eq!(
        t.env.auths(),
        std::vec![(
            t.david.clone(),
            soroban_sdk::testutils::AuthorizedInvocation {
                function: soroban_sdk::testutils::AuthorizedFunction::Contract((
                    t.id.clone(),
                    Symbol::new(&t.env, "register"),
                    (t.david.clone(), s(&t.env, "david")).into_val(&t.env),
                )),
                sub_invocations: std::vec![],
            }
        )]
    );

    assert_eq!(
        t.env.events().all().filter_by_contract(&t.id),
        vec![
            &t.env,
            (
                t.id.clone(),
                (
                    symbol_short!("tagit"),
                    Symbol::new(&t.env, "registered"),
                    s(&t.env, "david")
                )
                    .into_val(&t.env),
                t.david.into_val(&t.env),
            ),
        ]
    );
}

// Invalid or unknown tag rejected

#[test]
fn rejects_invalid_tags() {
    let t = setup();
    let bad = [
        "",
        "ab",                    // too short
        "abcdefghijklmnopqrstu", // 21 chars
        "@david",                // @ is never stored
        "A!",
        "David", // uppercase
        "da vid",
        "da-vid",
        "dávid", // non-ASCII
    ];
    for tag in bad {
        let tag = s(&t.env, tag);
        assert_eq!(
            t.registry.try_register(&t.alice, &tag),
            Err(Ok(Error::InvalidTag))
        );
        assert_eq!(t.registry.try_resolve(&tag), Err(Ok(Error::InvalidTag)));
        assert_eq!(
            t.registry.try_is_registered(&tag),
            Err(Ok(Error::InvalidTag))
        );
    }
}

#[test]
fn accepts_boundary_tags() {
    let t = setup();
    let three = s(&t.env, "a_1");
    let twenty = s(&t.env, "abcdefghij0123456789");
    t.registry.register(&t.alice, &three);
    t.registry.register(&t.bob, &twenty);
    assert_eq!(t.registry.resolve(&three), t.alice);
    assert_eq!(t.registry.resolve(&twenty), t.bob);
}

#[test]
fn unknown_tag_is_not_found() {
    let t = setup_with_tags();
    let nobody = s(&t.env, "nobody_here");

    assert_eq!(t.registry.try_resolve(&nobody), Err(Ok(Error::NotFound)));
    assert_eq!(t.registry.try_get(&nobody), Err(Ok(Error::NotFound)));
    assert_eq!(
        t.registry
            .try_send(&t.alice, &nobody, &t.bob, &t.xlm.address, &10),
        Err(Ok(Error::NotFound))
    );
    assert_eq!(
        t.registry.try_set_wallet(&nobody, &t.alice),
        Err(Ok(Error::NotFound))
    );
    assert_eq!(t.registry.try_release(&nobody), Err(Ok(Error::NotFound)));
}

// Duplicate registration prevented

#[test]
fn duplicate_tag_is_taken() {
    let t = setup_with_tags();
    let stranger = Address::generate(&t.env);
    assert_eq!(
        t.registry.try_register(&stranger, &s(&t.env, "david")),
        Err(Ok(Error::TagTaken))
    );
    assert_eq!(t.registry.resolve(&s(&t.env, "david")), t.david);
}

#[test]
fn one_tag_per_wallet() {
    let t = setup_with_tags();
    assert_eq!(
        t.registry.try_register(&t.david, &s(&t.env, "david2")),
        Err(Ok(Error::AlreadyHasTag))
    );
}

// Can't modify someone else's tag

#[test]
fn stranger_cannot_set_wallet_or_release() {
    let t = setup_with_tags();
    let stranger = Address::generate(&t.env);
    let david = s(&t.env, "david");

    // Only the stranger signs: the owner's require_auth must fail.
    let res = t
        .registry
        .mock_auths(&[MockAuth {
            address: &stranger,
            invoke: &MockAuthInvoke {
                contract: &t.id,
                fn_name: "set_wallet",
                args: (david.clone(), stranger.clone()).into_val(&t.env),
                sub_invokes: &[],
            },
        }])
        .try_set_wallet(&david, &stranger);
    assert!(res.is_err());
    assert!(
        !matches!(res, Err(Ok(_))),
        "should fail auth, not a contract error"
    );

    let res = t
        .registry
        .mock_auths(&[MockAuth {
            address: &stranger,
            invoke: &MockAuthInvoke {
                contract: &t.id,
                fn_name: "release",
                args: (david.clone(),).into_val(&t.env),
                sub_invokes: &[],
            },
        }])
        .try_release(&david);
    assert!(res.is_err());
    assert!(
        !matches!(res, Err(Ok(_))),
        "should fail auth, not a contract error"
    );

    let record = t.registry.get(&david);
    assert_eq!(record.owner, t.david);
    assert_eq!(record.wallet, t.david);
}

// Manage your tag

#[test]
fn owner_can_set_wallet() {
    let t = setup_with_tags();
    let david = s(&t.env, "david");
    let cold = Address::generate(&t.env);

    let record = t.registry.set_wallet(&david, &cold);
    assert_eq!(
        t.env.events().all().filter_by_contract(&t.id),
        vec![
            &t.env,
            (
                t.id.clone(),
                (
                    symbol_short!("tagit"),
                    symbol_short!("updated"),
                    david.clone()
                )
                    .into_val(&t.env),
                vec![&t.env, t.david.clone(), cold.clone()].into_val(&t.env),
            ),
        ]
    );

    assert_eq!(record.owner, t.david);
    assert_eq!(record.wallet, cold);
    assert_eq!(t.registry.resolve(&david), cold);
    // Reverse lookup still follows the owner.
    assert_eq!(t.registry.tag_of(&t.david), Some(david));
}

#[test]
fn owner_can_release_and_tag_is_reclaimable() {
    let t = setup_with_tags();
    let david = s(&t.env, "david");

    t.registry.release(&david);
    assert_eq!(
        t.env.events().all().filter_by_contract(&t.id),
        vec![
            &t.env,
            (
                t.id.clone(),
                (
                    symbol_short!("tagit"),
                    Symbol::new(&t.env, "released"),
                    david.clone()
                )
                    .into_val(&t.env),
                t.david.into_val(&t.env),
            ),
        ]
    );

    assert!(!t.registry.is_registered(&david));
    assert_eq!(t.registry.tag_of(&t.david), None);
    assert_eq!(t.registry.try_resolve(&david), Err(Ok(Error::NotFound)));

    // Someone else can claim it now, and the old owner can claim a new tag.
    let newcomer = Address::generate(&t.env);
    t.registry.register(&newcomer, &david);
    assert_eq!(t.registry.resolve(&david), newcomer);
    t.registry.register(&t.david, &s(&t.env, "david_new"));
}

// 5+ real payments, pay by tag

#[test]
fn send_moves_balances_and_emits_paid() {
    let t = setup_with_tags();
    let david = s(&t.env, "david");
    let expected = t.registry.resolve(&david);

    t.registry
        .send(&t.alice, &david, &expected, &t.xlm.address, &25);

    assert_eq!(
        t.env.events().all().filter_by_contract(&t.id),
        vec![
            &t.env,
            (
                t.id.clone(),
                (
                    symbol_short!("tagit"),
                    symbol_short!("paid"),
                    t.alice.clone(),
                    t.david.clone()
                )
                    .into_val(&t.env),
                vec![
                    &t.env,
                    IntoVal::<Env, Val>::into_val(&david, &t.env),
                    t.xlm.address.into_val(&t.env),
                    25_i128.into_val(&t.env),
                ]
                .into_val(&t.env),
            ),
        ]
    );

    assert_eq!(t.xlm.balance(&t.alice), 975);
    assert_eq!(t.xlm.balance(&t.david), 1_025);
    assert_eq!(t.xlm.balance(&t.id), 0);
}

#[test]
fn send_needs_only_the_senders_signature() {
    let t = setup_with_tags();
    let bob = s(&t.env, "bob");

    t.registry
        .send(&t.alice, &bob, &t.bob, &t.usdc.address, &10);

    let auths = t.env.auths();
    assert_eq!(auths.len(), 1);
    let (signer, invocation) = &auths[0];
    assert_eq!(signer, &t.alice);
    assert_eq!(
        invocation.function,
        soroban_sdk::testutils::AuthorizedFunction::Contract((
            t.id.clone(),
            symbol_short!("send"),
            (
                t.alice.clone(),
                bob,
                t.bob.clone(),
                t.usdc.address.clone(),
                10_i128
            )
                .into_val(&t.env),
        ))
    );
    // The nested transfer is covered by the same signature.
    assert_eq!(invocation.sub_invocations.len(), 1);
    assert_eq!(
        invocation.sub_invocations[0].function,
        soroban_sdk::testutils::AuthorizedFunction::Contract((
            t.usdc.address.clone(),
            symbol_short!("transfer"),
            (t.alice.clone(), t.bob.clone(), 10_i128).into_val(&t.env),
        ))
    );
}

#[test]
fn five_payments_across_assets_and_recipients() {
    let t = setup_with_tags();
    let pay = |from: &Address, tag: &str, token: &Address, amount: i128| {
        let tag = s(&t.env, tag);
        let expected = t.registry.resolve(&tag);
        t.registry.send(from, &tag, &expected, token, &amount);
    };

    pay(&t.alice, "david", &t.xlm.address, 25);
    pay(&t.alice, "bob", &t.usdc.address, 10);
    pay(&t.bob, "alice", &t.xlm.address, 5);
    pay(&t.david, "alice", &t.usdc.address, 7);
    pay(&t.bob, "david", &t.usdc.address, 3);

    assert_eq!(t.xlm.balance(&t.alice), 1_000 - 25 + 5);
    assert_eq!(t.xlm.balance(&t.bob), 1_000 - 5);
    assert_eq!(t.xlm.balance(&t.david), 1_000 + 25);
    assert_eq!(t.usdc.balance(&t.alice), 1_000 - 10 + 7);
    assert_eq!(t.usdc.balance(&t.bob), 1_000 + 10 - 3);
    assert_eq!(t.usdc.balance(&t.david), 1_000 - 7 + 3);
}

#[test]
fn send_pays_the_repointed_wallet() {
    let t = setup_with_tags();
    let david = s(&t.env, "david");
    let cold = Address::generate(&t.env);
    t.registry.set_wallet(&david, &cold);

    t.registry
        .send(&t.alice, &david, &cold, &t.xlm.address, &40);
    assert_eq!(t.xlm.balance(&cold), 40);
    assert_eq!(t.xlm.balance(&t.david), 1_000);
}

// Recipient-changed guard

#[test]
fn send_rejects_if_recipient_changed() {
    let t = setup_with_tags();
    let david = s(&t.env, "david");

    // The sender reviews this address...
    let reviewed = t.registry.resolve(&david);
    // ...then the tag is re-pointed before they sign.
    let new_wallet = Address::generate(&t.env);
    t.registry.set_wallet(&david, &new_wallet);

    assert_eq!(
        t.registry
            .try_send(&t.alice, &david, &reviewed, &t.xlm.address, &25),
        Err(Ok(Error::RecipientChanged))
    );
    assert_eq!(t.xlm.balance(&t.alice), 1_000);
    assert_eq!(t.xlm.balance(&new_wallet), 0);
}

// Other send guards

#[test]
fn send_rejects_bad_amounts() {
    let t = setup_with_tags();
    let david = s(&t.env, "david");
    for amount in [0_i128, -1] {
        assert_eq!(
            t.registry
                .try_send(&t.alice, &david, &t.david, &t.xlm.address, &amount),
            Err(Ok(Error::InvalidAmount))
        );
    }
}

#[test]
fn send_rejects_tokens_off_the_allowlist() {
    let t = setup_with_tags();
    let (other, other_admin) = create_token(&t.env, &t.admin);
    other_admin.mint(&t.alice, &100);

    assert_eq!(
        t.registry
            .try_send(&t.alice, &s(&t.env, "david"), &t.david, &other.address, &10),
        Err(Ok(Error::TokenNotAllowed))
    );
}

#[test]
fn send_rejects_self_payment() {
    let t = setup_with_tags();
    let david = s(&t.env, "david");
    assert_eq!(
        t.registry
            .try_send(&t.david, &david, &t.david, &t.xlm.address, &10),
        Err(Ok(Error::SelfPayment))
    );

    // Still a self-payment when the tag points at another of the owner's wallets.
    let cold = Address::generate(&t.env);
    t.registry.set_wallet(&david, &cold);
    assert_eq!(
        t.registry
            .try_send(&t.david, &david, &cold, &t.xlm.address, &10),
        Err(Ok(Error::SelfPayment))
    );
}

#[test]
fn send_rejects_invalid_tag() {
    let t = setup_with_tags();
    assert_eq!(
        t.registry.try_send(
            &t.alice,
            &s(&t.env, "@David"),
            &t.david,
            &t.xlm.address,
            &10
        ),
        Err(Ok(Error::InvalidTag))
    );
}

// Admin

#[test]
fn admin_manages_allowlist() {
    let t = setup();
    assert_eq!(t.registry.admin(), t.admin);
    assert!(t.registry.is_token_allowed(&t.xlm.address));
    assert!(t.registry.is_token_allowed(&t.usdc.address));

    t.registry.set_token_allowed(&t.usdc.address, &false);
    assert_eq!(
        t.env.auths()[0].0,
        t.admin,
        "allowlist changes are signed by the admin"
    );
    assert!(!t.registry.is_token_allowed(&t.usdc.address));

    t.registry.set_token_allowed(&t.usdc.address, &true);
    assert!(t.registry.is_token_allowed(&t.usdc.address));
}

#[test]
fn stranger_cannot_edit_allowlist() {
    let t = setup();
    let stranger = Address::generate(&t.env);
    let res = t
        .registry
        .mock_auths(&[MockAuth {
            address: &stranger,
            invoke: &MockAuthInvoke {
                contract: &t.id,
                fn_name: "set_token_allowed",
                args: (t.xlm.address.clone(), false).into_val(&t.env),
                sub_invokes: &[],
            },
        }])
        .try_set_token_allowed(&t.xlm.address, &false);
    assert!(res.is_err());
    assert!(t.registry.is_token_allowed(&t.xlm.address));
}

// Hardening

#[test]
fn set_wallet_rejects_the_registry_itself() {
    let t = setup_with_tags();
    let david = s(&t.env, "david");
    assert_eq!(
        t.registry.try_set_wallet(&david, &t.id),
        Err(Ok(Error::InvalidWallet))
    );
    assert_eq!(t.registry.resolve(&david), t.david);
}

#[test]
fn stranger_cannot_register_for_someone_else() {
    let t = setup();
    let stranger = Address::generate(&t.env);
    let tag = s(&t.env, "alice");
    let res = t
        .registry
        .mock_auths(&[MockAuth {
            address: &stranger,
            invoke: &MockAuthInvoke {
                contract: &t.id,
                fn_name: "register",
                args: (t.alice.clone(), tag.clone()).into_val(&t.env),
                sub_invokes: &[],
            },
        }])
        .try_register(&t.alice, &tag);
    assert!(res.is_err());
    assert!(
        !matches!(res, Err(Ok(_))),
        "should fail auth, not a contract error"
    );
    assert!(!t.registry.is_registered(&tag));
}

#[test]
fn stranger_cannot_spend_someone_elses_funds() {
    let t = setup_with_tags();
    let stranger = Address::generate(&t.env);
    let david = s(&t.env, "david");
    let args = (
        t.alice.clone(),
        david.clone(),
        t.david.clone(),
        t.xlm.address.clone(),
        100_i128,
    );
    let res = t
        .registry
        .mock_auths(&[MockAuth {
            address: &stranger,
            invoke: &MockAuthInvoke {
                contract: &t.id,
                fn_name: "send",
                args: args.clone().into_val(&t.env),
                sub_invokes: &[MockAuthInvoke {
                    contract: &t.xlm.address,
                    fn_name: "transfer",
                    args: (t.alice.clone(), t.david.clone(), 100_i128).into_val(&t.env),
                    sub_invokes: &[],
                }],
            },
        }])
        .try_send(&args.0, &args.1, &args.2, &args.3, &args.4);
    assert!(res.is_err());
    assert!(
        !matches!(res, Err(Ok(_))),
        "should fail auth, not a contract error"
    );
    assert_eq!(t.xlm.balance(&t.alice), 1_000);
    assert_eq!(t.xlm.balance(&t.david), 1_000);
}

#[test]
fn old_owner_loses_control_after_release() {
    let t = setup_with_tags();
    let david = s(&t.env, "david");
    t.registry.release(&david);
    let newcomer = Address::generate(&t.env);
    t.registry.register(&newcomer, &david);

    // Only the old owner signs.
    let res = t
        .registry
        .mock_auths(&[MockAuth {
            address: &t.david,
            invoke: &MockAuthInvoke {
                contract: &t.id,
                fn_name: "set_wallet",
                args: (david.clone(), t.david.clone()).into_val(&t.env),
                sub_invokes: &[],
            },
        }])
        .try_set_wallet(&david, &t.david);
    assert!(res.is_err());
    assert_eq!(t.registry.resolve(&david), newcomer);
}

#[test]
fn send_after_release_is_not_found() {
    let t = setup_with_tags();
    let david = s(&t.env, "david");
    let reviewed = t.registry.resolve(&david);
    t.registry.release(&david);
    assert_eq!(
        t.registry
            .try_send(&t.alice, &david, &reviewed, &t.xlm.address, &10),
        Err(Ok(Error::NotFound))
    );
    assert_eq!(t.xlm.balance(&t.alice), 1_000);
}

#[test]
fn reclaimed_tag_trips_the_recipient_guard() {
    // Released and claimed by someone else between review and signing.
    let t = setup_with_tags();
    let david = s(&t.env, "david");
    let reviewed = t.registry.resolve(&david);
    t.registry.release(&david);
    let squatter = Address::generate(&t.env);
    t.registry.register(&squatter, &david);

    assert_eq!(
        t.registry
            .try_send(&t.alice, &david, &reviewed, &t.xlm.address, &10),
        Err(Ok(Error::RecipientChanged))
    );
    assert_eq!(t.xlm.balance(&squatter), 0);
}

#[test]
fn insufficient_balance_moves_nothing() {
    let t = setup_with_tags();
    let david = s(&t.env, "david");
    let res = t
        .registry
        .try_send(&t.alice, &david, &t.david, &t.xlm.address, &1_001);
    assert!(res.is_err());
    assert!(
        !matches!(res, Err(Ok(_))),
        "the token rejects it, not the registry"
    );
    assert_eq!(t.env.events().all().filter_by_contract(&t.id), vec![&t.env]);
    assert_eq!(t.xlm.balance(&t.alice), 1_000);
    assert_eq!(t.xlm.balance(&t.david), 1_000);
}

#[test]
fn failed_send_emits_nothing() {
    let t = setup_with_tags();
    let david = s(&t.env, "david");
    let stale = Address::generate(&t.env);
    assert_eq!(
        t.registry
            .try_send(&t.alice, &david, &stale, &t.xlm.address, &10),
        Err(Ok(Error::RecipientChanged))
    );
    assert_eq!(t.env.events().all().filter_by_contract(&t.id), vec![&t.env]);
}

#[test]
fn records_ledger_timestamps() {
    use soroban_sdk::testutils::Ledger as _;

    let t = setup();
    let david = s(&t.env, "david");
    t.env.ledger().set_timestamp(1_000);
    let created = t.registry.register(&t.david, &david);
    assert_eq!((created.created_at, created.updated_at), (1_000, 1_000));

    t.env.ledger().set_timestamp(5_000);
    let updated = t.registry.set_wallet(&david, &t.alice);
    assert_eq!((updated.created_at, updated.updated_at), (1_000, 5_000));
    assert_eq!(t.registry.get(&david), updated);
}

#[test]
fn removed_token_blocks_sends_immediately() {
    let t = setup_with_tags();
    t.registry.set_token_allowed(&t.usdc.address, &false);
    assert_eq!(
        t.registry.try_send(
            &t.alice,
            &s(&t.env, "david"),
            &t.david,
            &t.usdc.address,
            &10
        ),
        Err(Ok(Error::TokenNotAllowed))
    );
}

#[test]
fn registry_never_holds_funds() {
    let t = setup_with_tags();
    for (from, tag, to) in [
        (&t.alice, "bob", &t.bob),
        (&t.bob, "david", &t.david),
        (&t.david, "alice", &t.alice),
    ] {
        t.registry
            .send(from, &s(&t.env, tag), to, &t.xlm.address, &50);
        t.registry
            .send(from, &s(&t.env, tag), to, &t.usdc.address, &50);
    }
    assert_eq!(t.xlm.balance(&t.id), 0);
    assert_eq!(t.usdc.balance(&t.id), 0);
}

#[test]
fn error_codes_match_the_spec() {
    // The app maps these numbers to messages; they must never shift.
    let codes = [
        (Error::InvalidTag, 1),
        (Error::TagTaken, 2),
        (Error::NotFound, 3),
        (Error::AlreadyHasTag, 4),
        (Error::RecipientChanged, 5),
        (Error::TokenNotAllowed, 6),
        (Error::InvalidAmount, 7),
        (Error::SelfPayment, 8),
        (Error::InvalidWallet, 9),
    ];
    for (err, code) in codes {
        assert_eq!(err as u32, code);
    }
}
