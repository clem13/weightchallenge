// Simple token-based auth using base64-encoded JSON
// In production, replace with JWT or Cloudflare Access

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

export function createToken(payload: TokenPayload): string {
  const data = JSON.stringify({ ...payload, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 });
  return btoa(data);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const data = JSON.parse(atob(token));
    if (data.exp && data.exp < Date.now()) return null;
    return { userId: data.userId, email: data.email, name: data.name };
  } catch {
    return null;
  }
}

// Simple password hashing using Web Crypto API (suitable for CF Workers)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'weight-challenge-salt-2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}
