import { Context, Next } from 'hono';
import { verifyToken, TokenPayload } from './auth';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  c.set('user', payload);
  await next();
}

// Type helper for getting user from context
export function getUser(c: Context): TokenPayload {
  return c.get('user') as TokenPayload;
}
