use soroban_sdk::String;

use crate::errors::Error;

pub const MIN_LEN: u32 = 3;
pub const MAX_LEN: u32 = 20;

/// Checks a tag is 3–20 bytes of `a–z`, `0–9` or `_`.
///
/// The app normalises input before calling, but every byte is still checked
/// here so a raw call can't register `David` alongside `david`, or `@david`.
pub fn validate(tag: &String) -> Result<(), Error> {
    let len = tag.len();
    if !(MIN_LEN..=MAX_LEN).contains(&len) {
        return Err(Error::InvalidTag);
    }

    let mut buf = [0u8; MAX_LEN as usize];
    let bytes = &mut buf[..len as usize];
    tag.copy_into_slice(bytes);

    if bytes
        .iter()
        .all(|b| matches!(b, b'a'..=b'z' | b'0'..=b'9' | b'_'))
    {
        Ok(())
    } else {
        Err(Error::InvalidTag)
    }
}
