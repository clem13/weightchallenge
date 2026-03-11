import { Hono } from 'hono';
import { Env } from '../index';
import { createToken, hashPassword, verifyPassword } from '../lib/auth';
import { authMiddleware, getUser } from '../lib/middleware';

export const authRoutes = new Hono<{ Bindings: Env }>();

// Sign up
authRoutes.post('/signup', async (c) => {
  const { name, email, password } = await c.req.json<{
    name: string;
    email: string;
    password: string;
  }>();

  if (!name || !email || !password) {
    return c.json({ error: 'Name, email, and password are required' }, 400);
  }

  if (password.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters' }, 400);
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(email.toLowerCase())
    .first();

  if (existing) {
    return c.json({ error: 'Email already registered' }, 409);
  }

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const colors = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D55', '#00C7BE'];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];

  await c.env.DB.prepare(
    'INSERT INTO users (id, name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, name, email.toLowerCase(), passwordHash, avatarColor).run();

  const token = createToken({ userId: id, email: email.toLowerCase(), name });

  return c.json({ token, user: { id, name, email: email.toLowerCase(), avatarColor } });
});

// Login
authRoutes.post('/login', async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>();

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  const user = await c.env.DB.prepare(
    'SELECT id, name, email, password_hash, avatar_color FROM users WHERE email = ?'
  ).bind(email.toLowerCase()).first<{
    id: string;
    name: string;
    email: string;
    password_hash: string;
    avatar_color: string;
  }>();

  if (!user) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const token = createToken({ userId: user.id, email: user.email, name: user.name });

  return c.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, avatarColor: user.avatar_color },
  });
});

// Get current user
authRoutes.get('/me', authMiddleware, async (c) => {
  const { userId } = getUser(c);

  const user = await c.env.DB.prepare(
    'SELECT id, name, email, avatar_color FROM users WHERE id = ?'
  ).bind(userId).first<{ id: string; name: string; email: string; avatar_color: string }>();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ user: { id: user.id, name: user.name, email: user.email, avatarColor: user.avatar_color } });
});
