#![no_std]

//! TagIt registry: maps `@tags` to Stellar wallets and pays by tag.
//!
//! Every write is signed by the wallet it affects. The admin can only edit
//! the token allowlist; it can't touch tags or move funds.

mod errors;
mod events;
mod pay;
mod storage;
mod tag;

#[cfg(test)]
mod test;

use soroban_sdk::{contract, contractimpl, Address, Env, String, Vec};

pub use errors::Error;
pub use storage::TagRecord;

use events::{Registered, Released, Updated};

#[contract]
pub struct TagItRegistry;

#[contractimpl]
impl TagItRegistry {
    pub fn __constructor(env: Env, admin: Address, tokens: Vec<Address>) {
        storage::set_admin(&env, &admin);
        for token in tokens.iter() {
            storage::set_token_allowed(&env, &token, true);
        }
        storage::bump_instance(&env);
    }

    // Tags

    /// Claims `tag` for `owner`. One tag per wallet.
    pub fn register(env: Env, owner: Address, tag: String) -> Result<TagRecord, Error> {
        owner.require_auth();
        tag::validate(&tag)?;

        if storage::has_tag(&env, &tag) {
            return Err(Error::TagTaken);
        }
        if storage::tag_of(&env, &owner).is_some() {
            return Err(Error::AlreadyHasTag);
        }

        let now = env.ledger().timestamp();
        let record = TagRecord {
            tag: tag.clone(),
            owner: owner.clone(),
            wallet: owner.clone(),
            created_at: now,
            updated_at: now,
        };
        storage::set_tag(&env, &record);
        storage::bump_instance(&env);

        Registered { tag, owner }.publish(&env);
        Ok(record)
    }

    /// Points `tag` at a different receiving wallet. Owner only.
    pub fn set_wallet(env: Env, tag: String, new_wallet: Address) -> Result<TagRecord, Error> {
        tag::validate(&tag)?;
        let mut record = storage::tag(&env, &tag).ok_or(Error::NotFound)?;
        record.owner.require_auth();

        // The registry has no way to pay out, so funds sent there are lost.
        if new_wallet == env.current_contract_address() {
            return Err(Error::InvalidWallet);
        }

        let old_wallet = record.wallet.clone();
        record.wallet = new_wallet.clone();
        record.updated_at = env.ledger().timestamp();
        storage::set_tag(&env, &record);
        storage::bump_instance(&env);

        Updated {
            tag,
            old_wallet,
            new_wallet,
        }
        .publish(&env);
        Ok(record)
    }

    /// Deletes `tag` so it can be claimed again. Owner only.
    pub fn release(env: Env, tag: String) -> Result<(), Error> {
        tag::validate(&tag)?;
        let record = storage::tag(&env, &tag).ok_or(Error::NotFound)?;
        record.owner.require_auth();

        storage::remove_tag(&env, &record);
        storage::bump_instance(&env);

        Released {
            tag,
            owner: record.owner,
        }
        .publish(&env);
        Ok(())
    }

    /// Availability check for the claim screen.
    pub fn is_registered(env: Env, tag: String) -> Result<bool, Error> {
        tag::validate(&tag)?;
        Ok(storage::has_tag(&env, &tag))
    }

    /// The wallet payments to `tag` go to.
    pub fn resolve(env: Env, tag: String) -> Result<Address, Error> {
        Self::get(env, tag).map(|record| record.wallet)
    }

    /// Full record for profile and review screens.
    pub fn get(env: Env, tag: String) -> Result<TagRecord, Error> {
        tag::validate(&tag)?;
        storage::tag(&env, &tag).ok_or(Error::NotFound)
    }

    /// Reverse lookup: the tag owned by `owner`, if any.
    pub fn tag_of(env: Env, owner: Address) -> Option<String> {
        storage::tag_of(&env, &owner)
    }

    // Payments

    /// Pays `amount` of `token` to `tag`, only if it still resolves to `expected`.
    pub fn send(
        env: Env,
        from: Address,
        tag: String,
        expected: Address,
        token: Address,
        amount: i128,
    ) -> Result<(), Error> {
        pay::send(&env, from, tag, expected, token, amount)
    }

    // Admin

    pub fn admin(env: Env) -> Address {
        storage::admin(&env)
    }

    pub fn is_token_allowed(env: Env, token: Address) -> bool {
        storage::is_token_allowed(&env, &token)
    }

    /// Adds or removes an asset contract from the allowlist. Admin only.
    pub fn set_token_allowed(env: Env, token: Address, allowed: bool) {
        storage::admin(&env).require_auth();
        storage::set_token_allowed(&env, &token, allowed);
        storage::bump_instance(&env);
    }
}
