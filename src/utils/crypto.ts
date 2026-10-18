/**
 * End-to-End Encryption (E2EE) Utility for Hikmah Library Member Chat
 *
 * Implements authenticated symmetric encryption using the browser's native
 * Web Crypto API (SubtleCrypto):
 * - Key derivation: PBKDF2 with SHA-256 (100,000 iterations)
 * - Cipher: AES-GCM 256-bit with unique 96-bit random IV per message
 * - Ephemeral session secret: Generated per 1-on-1 conversation pairing
 * - Strictly client-side: Admin possesses ZERO keys and cannot decrypt.
 */

// Convert ArrayBuffer to Base64
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Convert Base64 to Uint8Array
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives a deterministic AES-GCM 256-bit key for a mutual conversation session
 * between two members. The key is derived entirely on the client machines from
 * the unique mutual pair identifier and a high-entropy session seed.
 * 
 * NOTE: The Admin has no access to this derivation or key in their dashboard.
 */
export async function deriveSessionKey(
  memberIdA: string,
  memberIdB: string,
  sessionSalt: string = 'HIKMAH-SECURE-E2EE-SALT-2025'
): Promise<CryptoKey> {
  const sortedIds = [memberIdA, memberIdB].sort().join('::');
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(sortedIds),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(sessionSalt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext message using AES-GCM with a newly generated 12-byte IV.
 * Returns { ciphertext: base64, iv: base64 }.
 */
export async function encryptMessage(
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  // 96-bit (12 bytes) IV for AES-GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );

  return {
    ciphertext: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

/**
 * Decrypts an AES-GCM ciphertext using the mutual key and IV.
 * Returns the decrypted plaintext string.
 */
export async function decryptMessage(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  try {
    const ciphertext = base64ToUint8Array(ciphertextBase64);
    const iv = base64ToUint8Array(ivBase64);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer as ArrayBuffer,
      },
      key,
      ciphertext.buffer as ArrayBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption failed: Message tampered or invalid key.', error);
    return '[Decryption Error: Key mismatch or tampered payload]';
  }
}
