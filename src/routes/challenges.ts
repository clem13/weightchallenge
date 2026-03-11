import { Hono } from 'hono';
import { Env } from '../index';
import { authMiddleware, getUser } from '../lib/middleware';

export const challengeRoutes = new Hono<{ Bindings: Env }>();

// All challenge routes require auth
challengeRoutes.use('*', authMiddleware);

// Create a challenge
challengeRoutes.post('/', async (c) => {
  const { userId } = getUser(c);
  const { name, description, startDate, endDate } = await c.req.json<{
    name: string;
    description?: string;
    startDate: string;
    endDate?: string;
  }>();

  if (!name || !startDate) {
    return c.json({ error: 'Name and start date are required' }, 400);
  }

  const id = crypto.randomUUID();
  const joinCode = crypto.randomUUID().slice(0, 8).toUpperCase();

  await c.env.DB.batch([
    c.env.DB.prepare(
      'INSERT INTO challenges (id, name, description, join_code, created_by, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, name, description || null, joinCode, userId, startDate, endDate || null),
    c.env.DB.prepare(
      'INSERT INTO challenge_members (challenge_id, user_id) VALUES (?, ?)'
    ).bind(id, userId),
  ]);

  return c.json({ id, name, description, joinCode, startDate, endDate });
});

// List user's challenges
challengeRoutes.get('/', async (c) => {
  const { userId } = getUser(c);

  const result = await c.env.DB.prepare(`
    SELECT c.id, c.name, c.description, c.join_code, c.start_date, c.end_date, c.created_by,
      (SELECT COUNT(*) FROM challenge_members WHERE challenge_id = c.id) as member_count
    FROM challenges c
    JOIN challenge_members cm ON c.id = cm.challenge_id
    WHERE cm.user_id = ?
    ORDER BY c.created_at DESC
  `).bind(userId).all<{
    id: string;
    name: string;
    description: string | null;
    join_code: string;
    start_date: string;
    end_date: string | null;
    created_by: string;
    member_count: number;
  }>();

  return c.json({
    challenges: result.results.map(ch => ({
      id: ch.id,
      name: ch.name,
      description: ch.description,
      joinCode: ch.join_code,
      startDate: ch.start_date,
      endDate: ch.end_date,
      createdBy: ch.created_by,
      memberCount: ch.member_count,
    })),
  });
});

// Get single challenge with members
challengeRoutes.get('/:id', async (c) => {
  const { userId } = getUser(c);
  const challengeId = c.req.param('id');

  // Verify membership
  const membership = await c.env.DB.prepare(
    'SELECT 1 FROM challenge_members WHERE challenge_id = ? AND user_id = ?'
  ).bind(challengeId, userId).first();

  if (!membership) {
    return c.json({ error: 'Not a member of this challenge' }, 403);
  }

  const challenge = await c.env.DB.prepare(
    'SELECT id, name, description, join_code, start_date, end_date, created_by FROM challenges WHERE id = ?'
  ).bind(challengeId).first<{
    id: string;
    name: string;
    description: string | null;
    join_code: string;
    start_date: string;
    end_date: string | null;
    created_by: string;
  }>();

  if (!challenge) {
    return c.json({ error: 'Challenge not found' }, 404);
  }

  const members = await c.env.DB.prepare(`
    SELECT u.id, u.name, u.avatar_color
    FROM users u
    JOIN challenge_members cm ON u.id = cm.user_id
    WHERE cm.challenge_id = ?
  `).bind(challengeId).all<{ id: string; name: string; avatar_color: string }>();

  return c.json({
    challenge: {
      id: challenge.id,
      name: challenge.name,
      description: challenge.description,
      joinCode: challenge.join_code,
      startDate: challenge.start_date,
      endDate: challenge.end_date,
      createdBy: challenge.created_by,
    },
    members: members.results.map(m => ({
      id: m.id,
      name: m.name,
      avatarColor: m.avatar_color,
    })),
  });
});

// Join a challenge by code
challengeRoutes.post('/join', async (c) => {
  const { userId } = getUser(c);
  const { joinCode } = await c.req.json<{ joinCode: string }>();

  if (!joinCode) {
    return c.json({ error: 'Join code is required' }, 400);
  }

  const challenge = await c.env.DB.prepare(
    'SELECT id, name FROM challenges WHERE join_code = ?'
  ).bind(joinCode.toUpperCase()).first<{ id: string; name: string }>();

  if (!challenge) {
    return c.json({ error: 'Invalid join code' }, 404);
  }

  const existing = await c.env.DB.prepare(
    'SELECT 1 FROM challenge_members WHERE challenge_id = ? AND user_id = ?'
  ).bind(challenge.id, userId).first();

  if (existing) {
    return c.json({ error: 'Already a member of this challenge' }, 409);
  }

  await c.env.DB.prepare(
    'INSERT INTO challenge_members (challenge_id, user_id) VALUES (?, ?)'
  ).bind(challenge.id, userId).run();

  return c.json({ challengeId: challenge.id, name: challenge.name });
});
