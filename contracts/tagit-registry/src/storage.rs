use soroban_sdk::{contracttype, Address, Env, String};

const DAY_IN_LEDGERS: u32 = 17_280;

/// Entries are topped back up to 120 days whenever they drop below 30.
const TTL_THRESHOLD: u32 = 30 * DAY_IN_LEDGERS;
const TTL_EXTEND_TO: u32 = 120 * DAY_IN_LEDGERS;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TagRecord {
    pub tag: String,
    /// Who can manage it.
    pub owner: Address,
    /// Where payments go (defaults to owner).
    pub wallet: Address,
    pub created_at: u64,
    pub updated_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Persistent: `TagRecord`.
    Tag(String),
    /// Persistent: the owner's tag, for "my tag" and reverse lookup.
    TagOf(Address),
    /// Instance: `true` for allowlisted asset contracts.
    AllowedToken(Address),
    /// Instance: can edit the token allowlist only.
    Admin,
}

pub fn bump_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
}

fn bump(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

// Admin and allowlist

pub fn admin(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Admin).unwrap()
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn is_token_allowed(env: &Env, token: &Address) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::AllowedToken(token.clone()))
        .unwrap_or(false)
}

pub fn set_token_allowed(env: &Env, token: &Address, allowed: bool) {
    let key = DataKey::AllowedToken(token.clone());
    if allowed {
        env.storage().instance().set(&key, &true);
    } else {
        env.storage().instance().remove(&key);
    }
}

// Tags

pub fn tag(env: &Env, tag: &String) -> Option<TagRecord> {
    env.storage().persistent().get(&DataKey::Tag(tag.clone()))
}

pub fn has_tag(env: &Env, tag: &String) -> bool {
    env.storage().persistent().has(&DataKey::Tag(tag.clone()))
}

/// Saves the record and, if needed, the owner's reverse entry.
pub fn set_tag(env: &Env, record: &TagRecord) {
    let tag_key = DataKey::Tag(record.tag.clone());
    let owner_key = DataKey::TagOf(record.owner.clone());
    env.storage().persistent().set(&tag_key, record);
    env.storage().persistent().set(&owner_key, &record.tag);
    bump(env, &tag_key);
    bump(env, &owner_key);
}

pub fn remove_tag(env: &Env, record: &TagRecord) {
    env.storage()
        .persistent()
        .remove(&DataKey::Tag(record.tag.clone()));
    env.storage()
        .persistent()
        .remove(&DataKey::TagOf(record.owner.clone()));
}

/// Keeps a tag (and its owner's reverse entry) alive when it's used.
pub fn bump_tag(env: &Env, record: &TagRecord) {
    bump(env, &DataKey::Tag(record.tag.clone()));
    bump(env, &DataKey::TagOf(record.owner.clone()));
}

pub fn tag_of(env: &Env, owner: &Address) -> Option<String> {
    env.storage()
        .persistent()
        .get(&DataKey::TagOf(owner.clone()))
}
