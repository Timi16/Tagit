//! Random operation sequences, checked step by step against a plain Rust
//! model of what the registry should hold. Catches interactions the
//! example tests don't think of (release → reclaim → re-point → send…).

extern crate std;

use std::{
    collections::{BTreeSet, HashMap},
    format,
    vec::Vec,
};

use soroban_sdk::{
    testutils::{Address as _, EnvTestConfig},
    token::{StellarAssetClient, TokenClient},
    Address, Env, String,
};

use super::{create_token, setup_in, Setup};
use crate::Error;

/// Override for a longer soak: `MODEL_SEEDS=500 cargo test model`.
const SEEDS: u64 = 12;
const STEPS: usize = 250;
const TAGS: [&str; 6] = ["alice", "bob", "david", "carol", "eve", "shared_1"];

/// xorshift64*: deterministic, so a failing seed reproduces exactly.
struct Rng(u64);

impl Rng {
    fn next(&mut self) -> u64 {
        self.0 ^= self.0 >> 12;
        self.0 ^= self.0 << 25;
        self.0 ^= self.0 >> 27;
        self.0.wrapping_mul(0x2545_f491_4f6c_dd1d)
    }
    fn below(&mut self, n: usize) -> usize {
        (self.next() % n as u64) as usize
    }
    fn chance(&mut self, percent: u64) -> bool {
        self.next() % 100 < percent
    }
}

#[derive(Clone)]
struct Rec {
    owner: Address,
    wallet: Address,
}

struct World<'a> {
    t: Setup<'a>,
    /// Users who can own tags and send.
    users: Vec<Address>,
    /// Every address that can hold funds: users plus spare wallets.
    holders: Vec<Address>,
    /// XLM, USDC, and one token that is never allowlisted.
    tokens: Vec<Address>,
    usdc_allowed: bool,
    tags: HashMap<&'static str, Rec>,
    balances: HashMap<(usize, usize), i128>,
    /// Every outcome seen, so the test can prove it reached them all.
    hits: BTreeSet<std::string::String>,
}

impl World<'_> {
    fn new() -> Self {
        let env = Env::new_with_config(EnvTestConfig {
            capture_snapshot_at_drop: false,
        });
        let t = setup_in(env, None);
        let (other, _) = create_token(&t.env, &t.admin);

        let users = std::vec![
            t.alice.clone(),
            t.bob.clone(),
            t.david.clone(),
            Address::generate(&t.env),
            Address::generate(&t.env),
        ];
        let mut holders = users.clone();
        holders.push(Address::generate(&t.env));
        holders.push(Address::generate(&t.env));
        let tokens = std::vec![t.xlm.address.clone(), t.usdc.address.clone(), other.address];

        // Top everyone up to 1,000 of each token.
        let mut balances = HashMap::new();
        for (h, who) in holders.iter().enumerate() {
            for (k, token) in tokens.iter().enumerate() {
                let have = TokenClient::new(&t.env, token).balance(who);
                if have < 1_000 {
                    StellarAssetClient::new(&t.env, token).mint(who, &(1_000 - have));
                }
                balances.insert((h, k), 1_000);
            }
        }

        World {
            t,
            users,
            holders,
            tokens,
            usdc_allowed: true,
            tags: HashMap::new(),
            balances,
            hits: BTreeSet::new(),
        }
    }

    fn s(&self, v: &str) -> String {
        String::from_str(&self.t.env, v)
    }

    fn holder_index(&self, a: &Address) -> usize {
        self.holders.iter().position(|h| h == a).unwrap()
    }

    fn owned_by(&self, user: &Address) -> Option<&'static str> {
        self.tags
            .iter()
            .find(|(_, r)| &r.owner == user)
            .map(|(tag, _)| *tag)
    }

    fn step(&mut self, rng: &mut Rng, log: &mut Vec<std::string::String>) {
        let tag = TAGS[rng.below(TAGS.len())];
        match rng.below(10) {
            0..=2 => {
                let owner = self.users[rng.below(self.users.len())].clone();
                let expected = if self.tags.contains_key(tag) {
                    Err(Error::TagTaken)
                } else if self.owned_by(&owner).is_some() {
                    Err(Error::AlreadyHasTag)
                } else {
                    Ok(())
                };
                log.push(format!("register({owner:?}, {tag}) -> {expected:?}"));
                self.hits.insert(format!("register {expected:?}"));
                let got = self.t.registry.try_register(&owner, &self.s(tag));
                assert_eq!(got.map(|_| ()).map_err(|e| e.unwrap()), expected);
                if expected.is_ok() {
                    self.tags.insert(
                        tag,
                        Rec {
                            wallet: owner.clone(),
                            owner,
                        },
                    );
                }
            }
            3 => {
                let wallet = if rng.chance(5) {
                    self.t.id.clone()
                } else {
                    self.holders[rng.below(self.holders.len())].clone()
                };
                let expected = match self.tags.get(tag) {
                    None => Err(Error::NotFound),
                    Some(_) if wallet == self.t.id => Err(Error::InvalidWallet),
                    Some(_) => Ok(()),
                };
                log.push(format!("set_wallet({tag}, {wallet:?}) -> {expected:?}"));
                self.hits.insert(format!("set_wallet {expected:?}"));
                let got = self.t.registry.try_set_wallet(&self.s(tag), &wallet);
                assert_eq!(got.map(|_| ()).map_err(|e| e.unwrap()), expected);
                if expected.is_ok() {
                    self.tags.get_mut(tag).unwrap().wallet = wallet;
                }
            }
            4 => {
                let expected = if self.tags.contains_key(tag) {
                    Ok(())
                } else {
                    Err(Error::NotFound)
                };
                log.push(format!("release({tag}) -> {expected:?}"));
                self.hits.insert(format!("release {expected:?}"));
                let got = self.t.registry.try_release(&self.s(tag));
                assert_eq!(got.map(|_| ()).map_err(|e| e.unwrap()), expected);
                self.tags.remove(tag);
            }
            5 => {
                self.usdc_allowed = !self.usdc_allowed;
                log.push(format!("set_token_allowed(usdc, {})", self.usdc_allowed));
                self.t
                    .registry
                    .set_token_allowed(&self.tokens[1], &self.usdc_allowed);
            }
            _ => self.send(rng, tag, log),
        }
    }

    fn send(&mut self, rng: &mut Rng, tag: &'static str, log: &mut Vec<std::string::String>) {
        let from = self.users[rng.below(self.users.len())].clone();
        let k = match rng.below(10) {
            0 => 2,
            1..=4 => 1,
            _ => 0,
        };
        let f = self.holder_index(&from);
        let balance = self.balances[&(f, k)];
        let amount = rng.below(balance as usize + 8) as i128 - 2;
        // Usually the sender reviewed the current wallet; sometimes it's stale.
        let expected_wallet = match self.tags.get(tag) {
            Some(r) if rng.chance(75) => r.wallet.clone(),
            _ => self.holders[rng.below(self.holders.len())].clone(),
        };

        let allowed = k == 0 || (k == 1 && self.usdc_allowed);
        let predicted: Result<(), Option<Error>> = if amount <= 0 {
            Err(Some(Error::InvalidAmount))
        } else if !allowed {
            Err(Some(Error::TokenNotAllowed))
        } else {
            match self.tags.get(tag) {
                None => Err(Some(Error::NotFound)),
                Some(r) if r.wallet != expected_wallet => Err(Some(Error::RecipientChanged)),
                Some(r) if r.owner == from || r.wallet == from => Err(Some(Error::SelfPayment)),
                // The token itself refuses an overdraft.
                Some(_) if amount > balance => Err(None),
                Some(_) => Ok(()),
            }
        };
        log.push(format!(
            "send({from:?}, {tag}, {expected_wallet:?}, token {k}, {amount}) -> {predicted:?}"
        ));
        self.hits.insert(format!("send {predicted:?}"));

        let got = self.t.registry.try_send(
            &from,
            &self.s(tag),
            &expected_wallet,
            &self.tokens[k],
            &amount,
        );
        match (&predicted, got) {
            (Ok(()), Ok(Ok(()))) => {
                let to = self.holder_index(&expected_wallet);
                *self.balances.get_mut(&(f, k)).unwrap() -= amount;
                *self.balances.get_mut(&(to, k)).unwrap() += amount;
            }
            (Err(Some(e)), Err(Ok(got))) => assert_eq!(&got, e),
            (Err(None), Err(Err(_))) => {}
            (p, g) => panic!("predicted {p:?}, got {g:?}"),
        }
    }

    fn check(&self) {
        let r = &self.t.registry;
        for tag in TAGS {
            match self.tags.get(tag) {
                Some(rec) => {
                    let got = r.get(&self.s(tag));
                    assert_eq!(got.owner, rec.owner, "{tag} owner");
                    assert_eq!(got.wallet, rec.wallet, "{tag} wallet");
                    assert_eq!(r.resolve(&self.s(tag)), rec.wallet);
                    assert!(r.is_registered(&self.s(tag)));
                }
                None => {
                    assert_eq!(r.try_get(&self.s(tag)), Err(Ok(Error::NotFound)), "{tag}");
                    assert!(!r.is_registered(&self.s(tag)));
                }
            }
        }
        for user in &self.users {
            assert_eq!(r.tag_of(user), self.owned_by(user).map(|t| self.s(t)));
        }
        for (h, who) in self.holders.iter().enumerate() {
            for (k, token) in self.tokens.iter().enumerate() {
                assert_eq!(
                    TokenClient::new(&self.t.env, token).balance(who),
                    self.balances[&(h, k)],
                    "balance of holder {h} in token {k}"
                );
            }
        }
        for token in &self.tokens {
            assert_eq!(TokenClient::new(&self.t.env, token).balance(&self.t.id), 0);
        }
    }
}

const MUST_HIT: [&str; 15] = [
    "register Ok(())",
    "register Err(TagTaken)",
    "register Err(AlreadyHasTag)",
    "set_wallet Ok(())",
    "set_wallet Err(NotFound)",
    "set_wallet Err(InvalidWallet)",
    "release Ok(())",
    "release Err(NotFound)",
    "send Ok(())",
    "send Err(Some(InvalidAmount))",
    "send Err(Some(TokenNotAllowed))",
    "send Err(Some(NotFound))",
    "send Err(Some(RecipientChanged))",
    "send Err(Some(SelfPayment))",
    "send Err(None)",
];

#[test]
fn random_sequences_match_the_model() {
    let mut hits = BTreeSet::new();
    let seeds = std::env::var("MODEL_SEEDS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(SEEDS);
    for seed in 1..=seeds {
        let mut rng = Rng(seed.wrapping_mul(0x9e37_79b9_7f4a_7c15));
        let mut world = World::new();
        let mut log = Vec::new();
        for _ in 0..STEPS {
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                world.step(&mut rng, &mut log);
                world.check();
            }));
            if let Err(e) = result {
                std::eprintln!("seed {seed} failed after:");
                for line in log.iter().rev().take(15).rev() {
                    std::eprintln!("  {line}");
                }
                std::panic::resume_unwind(e);
            }
        }
        hits.extend(world.hits);
    }
    for outcome in MUST_HIT {
        assert!(hits.contains(outcome), "never reached: {outcome}");
    }
}
