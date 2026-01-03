/**
 * Safe JSON Parser Utility
 * 
 * Centralized utility for safely parsing JSON from network responses.
 * Prevents crashes from undefined, empty, or malformed JSON responses.
 */

/**
 * Safely parses JSON from a response text string.
 * 
 * @param text - The response text to parse
 * @param source - Optional source identifier for error messages (e.g., endpoint URL)
 * @param statusCode - Optional status code for error messages
 * @returns Parsed JSON object, or null if parsing fails or text is invalid
 * @throws Error with descriptive message if parsing fails and text is non-empty
 */
export function parseJsonSafely<T = any>(
  text: string | null | undefined,
  source?: string,
  statusCode?: number,
): T | null {
  // Guard: Return null for empty, undefined, or invalid strings
  if (!text || typeof text !== 'string') {
    return null;
  }

  const trimmed = text.trim();

  // Guard: Return null for empty strings or literal "undefined"/"null" strings
  if (
    !trimmed ||
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    trimmed === ''
  ) {
    return null;
  }

  // Attempt to parse JSON
  try {
    return JSON.parse(trimmed) as T;
  } catch (error) {
    // If parsing fails, throw a descriptive error
    const sourceInfo = source ? ` from ${source}` : '';
    const statusInfo = statusCode ? ` (status ${statusCode})` : '';
    const errorMessage = `Invalid JSON response${sourceInfo}${statusInfo}`;
    
    throw new Error(errorMessage);
  }
}

/**
 * Safely parses JSON from a Response object.
 * Reads the response body as text first, then parses it.
 * 
 * @param response - The fetch Response object
 * @returns Parsed JSON object, or null if response is empty or parsing fails
 * @throws Error if response body exists but is invalid JSON
 */
export async function parseResponseJsonSafely<T = any>(
  response: Response,
): Promise<T | null> {
  // Read response body as text (can only be read once)
  const text = await response.text();

  // Use the safe parser with response metadata
  return parseJsonSafely<T>(text, response.url, response.status);
}

