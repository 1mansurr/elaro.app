// Simple encryption utility for sensitive data
export async function encrypt(text: string, key?: string): Promise<string> {
  if (!key) {
    console.warn('No encryption key provided, returning original text');
    return text;
  }

  try {
    // Convert text and key to Uint8Array
    const textEncoder = new TextEncoder();
    const keyEncoder = new TextEncoder();
    
    const data = textEncoder.encode(text);
    const keyData = keyEncoder.encode(key.substring(0, 32)); // Use first 32 bytes of key
    
    // Import the key for encryption
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    // Generate a random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the data
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      data
    );

    // Combine IV and encrypted data
    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encrypted), iv.length);

    // Return base64 encoded result
    return btoa(String.fromCharCode(...result));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

export async function decrypt(encryptedText: string, key?: string): Promise<string> {
  if (!key) {
    console.warn('No encryption key provided, returning original text');
    return encryptedText;
  }

  try {
    // Convert base64 back to Uint8Array
    const encryptedData = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));
    
    // Extract IV (first 12 bytes) and encrypted data
    const iv = encryptedData.slice(0, 12);
    const encrypted = encryptedData.slice(12);
    
    // Convert key to Uint8Array
    const keyEncoder = new TextEncoder();
    const keyData = keyEncoder.encode(key.substring(0, 32));
    
    // Import the key for decryption
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encrypted
    );

    // Convert back to string
    const textDecoder = new TextDecoder();
    return textDecoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}