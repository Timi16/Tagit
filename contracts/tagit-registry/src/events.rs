use soroban_sdk::{contractevent, Address, String};

/// `("tagit", "registered", tag)` → owner
#[contractevent(topics = ["tagit", "registered"], data_format = "single-value")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Registered {
    #[topic]
    pub tag: String,
    pub owner: Address,
}

/// `("tagit", "updated", tag)` → [old_wallet, new_wallet]
#[contractevent(topics = ["tagit", "updated"], data_format = "vec")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Updated {
    #[topic]
    pub tag: String,
    pub old_wallet: Address,
    pub new_wallet: Address,
}

/// `("tagit", "released", tag)` → owner
#[contractevent(topics = ["tagit", "released"], data_format = "single-value")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Released {
    #[topic]
    pub tag: String,
    pub owner: Address,
}

/// `("tagit", "paid", from, to)` → [tag, token, amount]
///
/// `from` and `to` are topics so history can filter on either side.
#[contractevent(topics = ["tagit", "paid"], data_format = "vec")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Paid {
    #[topic]
    pub from: Address,
    #[topic]
    pub to: Address,
    pub tag: String,
    pub token: Address,
    pub amount: i128,
}
