import { Hono } from 'hono';
import { Env } from '../index';
import { createToken, generateCode, sendVerificationEmail } from '../lib/auth';
import { authMiddleware, getUser } from '../lib/middleware';

export const authRoutes = new Hono<{ Bindings: Env }>();

// Step 1: Request a verification code
authRoutes.post('/send-code', async (c) => {
  const { email } = await c.req.json<{ email: string }>();

  if (!email) {
    return c.json({ error: 'Email is required' }, 400);
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if email is allowed
  const allowed = await c.env.DB.prepare(
    'SELECT email, name FROM allowed_emails WHERE email = ?'
  ).bind(normalizedEmail).first<{ email: string; name: string }>();

  if (!allowed) {
    return c.json({ error: 'This email is not authorized. Contact the admin to get access.' }, 403);
  }

  // Generate code and store it (expires in 10 minutes)
  const code = generateCode();
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Invalidate previous unused codes for this email
  await c.env.DB.prepare(
    'UPDATE verification_codes SET used = 1 WHERE email = ? AND used = 0'
  ).bind(normalizedEmail).run();

  await c.env.DB.prepare(
    'INSERT INTO verification_codes (id, email, code, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(id, normalizedEmail, code, expiresAt).run();

  // Send the code via email
  try {
    await sendVerificationEmail(
      c.env.RESEND_API_KEY,
      c.env.FROM_EMAIL,
      normalizedEmail,
      code
    );
  } catch (err) {
    console.error('Failed to send email:', err);
    return c.json({ error: 'Failed to send verification email. Please try again.' }, 500);
  }

  return c.json({ success: true, message: 'Verification code sent' });
});

// Step 2: Verify the code and log in
authRoutes.post('/verify-code', async (c) => {
  const { email, code } = await c.req.json<{ email: string; code: string }>();

  if (!email || !code) {
    return c.json({ error: 'Email and code are required' }, 400);
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Find a valid, unused code
  const verification = await c.env.DB.prepare(
    `SELECT id, code, expires_at FROM verification_codes
     WHERE email = ? AND used = 0
     ORDER BY created_at DESC LIMIT 1`
  ).bind(normalizedEmail).first<{ id: string; code: string; expires_at: string }>();

  if (!verification) {
    return c.json({ error: 'No verification code found. Please request a new one.' }, 400);
  }

  if (new Date(verification.expires_at) < new Date()) {
    return c.json({ error: 'Code has expired. Please request a new one.' }, 400);
  }

  if (verification.code !== code) {
    return c.json({ error: 'Invalid code' }, 400);
  }

  // Mark code as used
  await c.env.DB.prepare(
    'UPDATE verification_codes SET used = 1 WHERE id = ?'
  ).bind(verification.id).run();

  // Get the allowed email entry for the name
  const allowed = await c.env.DB.prepare(
    'SELECT name FROM allowed_emails WHERE email = ?'
  ).bind(normalizedEmail).first<{ name: string }>();

  const name = allowed?.name || normalizedEmail.split('@')[0];

  // Find or create the user
  let user = await c.env.DB.prepare(
    'SELECT id, name, email, avatar_color FROM users WHERE email = ?'
  ).bind(normalizedEmail).first<{ id: string; name: string; email: string; avatar_color: string }>();

  if (!user) {
    const id = crypto.randomUUID();
    const colors = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D55', '#00C7BE'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    await c.env.DB.prepare(
      'INSERT INTO users (id, name, email, avatar_color) VALUES (?, ?, ?, ?)'
    ).bind(id, name, normalizedEmail, avatarColor).run();

    user = { id, name, email: normalizedEmail, avatar_color: avatarColor };
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
