// FILE: supabase/functions/_shared/encryption.ts
// Create this new shared file. It will contain the core crypto logic.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Helper function to derive a cryptographic key from our master key string
async function getKey(secretKey: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey.slice(0, 32)), // Use the first 32 chars for a 256-bit key
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("elaro-salt"), // A static salt is acceptable here
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encrypt(text: string, secretKey: string): Promise<string> {
  if (!text) return text;
  const key = await getKey(secretKey);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // Initialization Vector
  const encodedText = encoder.encode(text);

  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encodedText
  );

  // Combine IV and encrypted data and convert to a base64 string for storage
  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedData), iv.length);
  
  // TypeScript in Deno can be strict about apply's args; coerce safely
  return btoa(String.fromCharCode.apply(null, Array.from(combined) as unknown as number[]));
}

export async function decrypt(encryptedText: string, secretKey: string): Promise<string> {
  if (!encryptedText) return encryptedText;
  try {
    const key = await getKey(secretKey);
    const combined = new Uint8Array(atob(encryptedText).split('').map(c => c.charCodeAt(0)));
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decryptedData = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      data
    );

    return decoder.decode(decryptedData);
  } catch (error) {
    console.error("Decryption failed:", error);
    // If decryption fails, return a placeholder or the encrypted text itself
    // to prevent the app from crashing.
    return "[Decryption Failed]";
  }
}


