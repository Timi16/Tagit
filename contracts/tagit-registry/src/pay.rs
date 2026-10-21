use soroban_sdk::{token, Address, Env, String};

use crate::{errors::Error, events::Paid, storage, tag};

/// Pays `amount` of `token` from `from` to whatever wallet `tag` points at,
/// but only if that wallet is still `expected`: the address the sender saw
/// on the review screen. If the tag was re-pointed in between, nothing moves.
pub fn send(
    env: &Env,
    from: Address,
    tag: String,
    expected: Address,
    token: Address,
    amount: i128,
) -> Result<(), Error> {
    from.require_auth();

    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    if !storage::is_token_allowed(env, &token) {
        return Err(Error::TokenNotAllowed);
    }
    tag::validate(&tag)?;

    let record = storage::tag(env, &tag).ok_or(Error::NotFound)?;
    if record.wallet != expected {
        return Err(Error::RecipientChanged);
    }
    if record.owner == from || record.wallet == from {
        return Err(Error::SelfPayment);
    }

    // `from` authorised this call, and that authorisation covers the nested
    // transfer, so the sender signs once and the registry never holds funds.
    token::Client::new(env, &token).transfer(&from, &record.wallet, &amount);

    storage::bump_tag(env, &record);
    storage::bump_instance(env);

    Paid {
        from,
        to: record.wallet,
        tag,
        token,
        amount,
    }
    .publish(env);

    Ok(())
}
