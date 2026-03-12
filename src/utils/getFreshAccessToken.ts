// Offline MVP stub — auth token not available in offline mode

export async function getFreshAccessToken(): Promise<string> {
  throw new Error('Auth not available in offline mode');
}
