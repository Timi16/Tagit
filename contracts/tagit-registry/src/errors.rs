use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Wrong length or characters.
    InvalidTag = 1,
    /// Duplicate registration.
    TagTaken = 2,
    /// Unknown tag on resolve, send, set or release.
    NotFound = 3,
    /// Wallet already owns a tag.
    AlreadyHasTag = 4,
    /// `send` found a different wallet than `expected`.
    RecipientChanged = 5,
    /// Asset not on the allowlist.
    TokenNotAllowed = 6,
    /// Zero or negative amount.
    InvalidAmount = 7,
    /// Sending to your own tag.
    SelfPayment = 8,
    /// `set_wallet` to an address that could never spend what it receives.
    InvalidWallet = 9,
}
