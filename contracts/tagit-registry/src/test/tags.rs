//! Tag validation, checked byte by byte rather than by example.

use soroban_sdk::{testutils::Address as _, Address, String};

use super::setup;
use crate::{tag, Error};

fn allowed(b: u8) -> bool {
    b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_'
}

#[test]
fn every_byte_at_every_position() {
    let t = setup();
    for pos in 0..5 {
        for b in 0..=u8::MAX {
            let mut bytes = *b"abcde";
            bytes[pos] = b;
            let tag = String::from_bytes(&t.env, &bytes);
            let expected = if allowed(b) {
                Ok(())
            } else {
                Err(Error::InvalidTag)
            };
            assert_eq!(tag::validate(&tag), expected, "byte {b:#04x} at {pos}");
        }
    }
}

#[test]
fn every_length() {
    let t = setup();
    for len in 0..=40usize {
        let bytes = [b'a'; 40];
        let tag = String::from_bytes(&t.env, &bytes[..len]);
        let expected = if (3..=20).contains(&len) {
            Ok(())
        } else {
            Err(Error::InvalidTag)
        };
        assert_eq!(tag::validate(&tag), expected, "length {len}");
    }
}

#[test]
fn multibyte_lookalikes_are_rejected() {
    let t = setup();
    // Cyrillic "а", full-width "ａ", zero-width space, combining accent.
    for v in ["dаvid", "ｄavid", "da\u{200b}vid", "dave\u{301}"] {
        assert_eq!(
            tag::validate(&String::from_str(&t.env, v)),
            Err(Error::InvalidTag),
            "{v:?}"
        );
    }
}

#[test]
fn validation_runs_before_any_storage_access() {
    // An invalid tag fails the same way whether or not a similar tag exists.
    let t = setup();
    t.registry
        .register(&t.david, &String::from_str(&t.env, "david"));
    let upper = String::from_str(&t.env, "David");
    let stranger = Address::generate(&t.env);
    assert_eq!(
        t.registry.try_register(&stranger, &upper),
        Err(Ok(Error::InvalidTag))
    );
    assert_eq!(t.registry.try_get(&upper), Err(Ok(Error::InvalidTag)));
    assert_eq!(
        t.registry.try_set_wallet(&upper, &stranger),
        Err(Ok(Error::InvalidTag))
    );
    assert_eq!(t.registry.try_release(&upper), Err(Ok(Error::InvalidTag)));
}
