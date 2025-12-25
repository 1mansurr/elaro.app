import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AppError, ERROR_CODES, ERROR_STATUS_CODES } from './error-codes.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

/**
 * Get the active master key hash from database
 */
export async function getActiveMasterKeyHash(): Promise<string | null> {
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabaseAdmin
    .from('master_decryption_keys')
    .select('key_hash')
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data.key_hash;
}

/**
 * Hash master key using PBKDF2 (Web Crypto API)
 * This is a secure alternative to bcrypt that works in Deno
 */
export async function hashMasterKey(key: string): Promise<string> {
  try {
    // Convert key to ArrayBuffer
    const keyData = new TextEncoder().encode(key);

    // Import key for PBKDF2
    const baseKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      'PBKDF2',
      false,
      ['deriveBits'],
    );

    // Generate salt
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Derive key using PBKDF2 (100,000 iterations for security)
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      baseKey,
      256, // 32 bytes = 256 bits
    );

    // Combine salt and derived key, then base64 encode
    const combined = new Uint8Array(salt.length + 32);
    combined.set(salt);
    combined.set(new Uint8Array(derivedBits), salt.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Error hashing master key:', error);
    throw new AppError(
      'Failed to hash master key',
      ERROR_STATUS_CODES.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR,
    );
  }
}

/**
 * Verify master key against stored hash
 */
export async function verifyMasterKey(providedKey: string): Promise<boolean> {
  const storedHash = await getActiveMasterKeyHash();

  if (!storedHash) {
    throw new AppError(
      'Master key not configured. Please set up master key first.',
      ERROR_STATUS_CODES.CONFIG_ERROR,
      ERROR_CODES.CONFIG_ERROR,
    );
  }

  try {
    // Decode stored hash
    const storedData = Uint8Array.from(atob(storedHash), c => c.charCodeAt(0));

    // Extract salt (first 16 bytes) and stored derived key (next 32 bytes)
    const salt = storedData.slice(0, 16);
    const storedDerived = storedData.slice(16, 48);

    // Convert provided key to ArrayBuffer
    const keyData = new TextEncoder().encode(providedKey);

    // Import key for PBKDF2
    const baseKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      'PBKDF2',
      false,
      ['deriveBits'],
    );

    // Derive key using same parameters
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      baseKey,
      256,
    );

    const providedDerived = new Uint8Array(derivedBits);

    // Constant-time comparison to prevent timing attacks
    if (providedDerived.length !== storedDerived.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < providedDerived.length; i++) {
      result |= providedDerived[i] ^ storedDerived[i];
    }

    return result === 0;
  } catch (error) {
    console.error('Error verifying master key:', error);
    return false;
  }
}

/**
 * Check if user is top-level admin (role = 'admin')
 */
export async function isTopLevelAdmin(
  userId: string,
  supabaseClient: ReturnType<typeof createClient>,
): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.role === 'admin';
}

/**
 * Get count of top-level admins
 */
export async function getTopLevelAdminCount(
  supabaseClient: ReturnType<typeof createClient>,
): Promise<number> {
  const { count, error } = await supabaseClient
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'admin');

  if (error) {
    return 0;
  }

  return count || 0;
}
