use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use argon2::Argon2;
use rand::RngCore;

const NONCE_LEN: usize = 12;
const KEY_LEN: usize = 32;
const SALT_LEN: usize = 16;

/// Derive a 256-bit key from a password using Argon2.
fn derive_key(password: &[u8], salt: &[u8]) -> [u8; KEY_LEN] {
    let mut key = [0u8; KEY_LEN];
    Argon2::default()
        .hash_password_into(password, salt, &mut key)
        .expect("Argon2 key derivation failed");
    key
}

/// Get a machine-bound password for key derivation.
fn machine_password() -> String {
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().into_owned())
        .unwrap_or_else(|_| "default".to_string());
    let username = whoami::username();
    format!("omni-code:{}:{}", hostname, username)
}

/// Encrypt a plaintext string. Returns base64-encoded nonce + ciphertext.
pub fn encrypt_api_key(plaintext: &str) -> String {
    if plaintext.is_empty() {
        return String::new();
    }

    let password = machine_password();
    let mut salt = [0u8; SALT_LEN];
    OsRng.fill_bytes(&mut salt);
    let key = derive_key(password.as_bytes(), &salt);

    let cipher = Aes256Gcm::new_from_slice(&key).expect("invalid key length");
    let mut nonce_bytes = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .expect("encryption failed");

    // Format: base64(salt + nonce + ciphertext)
    let mut combined = Vec::with_capacity(SALT_LEN + NONCE_LEN + ciphertext.len());
    combined.extend_from_slice(&salt);
    combined.extend_from_slice(&nonce_bytes);
    combined.extend_from_slice(&ciphertext);

    base64_encode(&combined)
}

/// Decrypt a base64-encoded nonce + ciphertext string.
pub fn decrypt_api_key(encrypted: &str) -> String {
    if encrypted.is_empty() {
        return String::new();
    }

    let data = match base64_decode(encrypted) {
        Ok(d) => d,
        Err(_) => return encrypted.to_string(), // fallback: return as-is
    };

    if data.len() < SALT_LEN + NONCE_LEN {
        return encrypted.to_string();
    }

    let (salt, rest) = data.split_at(SALT_LEN);
    let (nonce_bytes, ciphertext) = rest.split_at(NONCE_LEN);

    let password = machine_password();
    let key = derive_key(password.as_bytes(), salt);

    let cipher = match Aes256Gcm::new_from_slice(&key) {
        Ok(c) => c,
        Err(_) => return encrypted.to_string(),
    };
    let nonce = Nonce::from_slice(nonce_bytes);

    match cipher.decrypt(nonce, ciphertext) {
        Ok(plaintext) => String::from_utf8_lossy(&plaintext).into_owned(),
        Err(_) => encrypted.to_string(), // fallback: return as-is
    }
}

// Simple base64 encoding/decoding (no external dependency needed)
const BASE64_CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

fn base64_encode(data: &[u8]) -> String {
    let mut result = String::with_capacity((data.len() + 2) / 3 * 4);
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;

        result.push(BASE64_CHARS[((triple >> 18) & 0x3F) as usize] as char);
        result.push(BASE64_CHARS[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            result.push(BASE64_CHARS[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
        if chunk.len() > 2 {
            result.push(BASE64_CHARS[(triple & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
    }
    result
}

fn base64_decode(input: &str) -> Result<Vec<u8>, ()> {
    let input = input.trim_end_matches('=');
    let mut result = Vec::with_capacity(input.len() * 3 / 4);
    let mut buf: u32 = 0;
    let mut bits: u32 = 0;

    for &byte in input.as_bytes() {
        let val = match byte {
            b'A'..=b'Z' => byte - b'A',
            b'a'..=b'z' => byte - b'a' + 26,
            b'0'..=b'9' => byte - b'0' + 52,
            b'+' => 62,
            b'/' => 63,
            _ => return Err(()),
        };
        buf = (buf << 6) | val as u32;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            result.push((buf >> bits) as u8);
        }
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip() {
        let original = "sk-test-api-key-12345";
        let encrypted = encrypt_api_key(original);
        assert_ne!(encrypted, original);
        let decrypted = decrypt_api_key(&encrypted);
        assert_eq!(decrypted, original);
    }

    #[test]
    fn empty_string() {
        assert_eq!(encrypt_api_key(""), "");
        assert_eq!(decrypt_api_key(""), "");
    }
}
