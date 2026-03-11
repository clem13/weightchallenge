import { Hono } from 'hono';
import { Env } from '../index';

const DEFAULT_USER_ID = 'default-user';

export const weightRoutes = new Hono<{ Bindings: Env }>();

// Log a weight entry
weightRoutes.post('/', async (c) => {
  const userId = DEFAULT_USER_ID;
  const { challengeId, weight, date, note } = await c.req.json<{
    challengeId: string;
    weight: number;
    date: string;
    note?: string;
  }>();

  if (!challengeId || !weight || !date) {
    return c.json({ error: 'Challenge ID, weight, and date are required' }, 400);
  }

  if (weight < 20 || weight > 500) {
    return c.json({ error: 'Weight must be between 20 and 500' }, 400);
  }

  // Verify membership
  const membership = await c.env.DB.prepare(
    'SELECT 1 FROM challenge_members WHERE challenge_id = ? AND user_id = ?'
  ).bind(challengeId, userId).first();

  if (!membership) {
    return c.json({ error: 'Not a member of this challenge' }, 403);
  }

  const id = crypto.randomUUID();

  // Upsert: update if entry exists for this date, otherwise insert
  await c.env.DB.prepare(`
    INSERT INTO weight_entries (id, user_id, challenge_id, weight, date, note)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, challenge_id, date)
    DO UPDATE SET weight = excluded.weight, note = excluded.note
  `).bind(id, userId, challengeId, weight, date, note || null).run();

  return c.json({ id, weight, date, note });
});

// Get all weight entries for a challenge (all members)
weightRoutes.get('/challenge/:challengeId', async (c) => {
  const userId = DEFAULT_USER_ID;
  const challengeId = c.req.param('challengeId');

  // Verify membership
  const membership = await c.env.DB.prepare(
    'SELECT 1 FROM challenge_members WHERE challenge_id = ? AND user_id = ?'
  ).bind(challengeId, userId).first();

  if (!membership) {
    return c.json({ error: 'Not a member of this challenge' }, 403);
  }

  const entries = await c.env.DB.prepare(`
    SELECT we.id, we.user_id, we.weight, we.date, we.note, u.name, u.avatar_color
    FROM weight_entries we
    JOIN users u ON we.user_id = u.id
    WHERE we.challenge_id = ?
    ORDER BY we.date ASC
  `).bind(challengeId).all<{
    id: string;
    user_id: string;
    weight: number;
    date: string;
    note: string | null;
    name: string;
    avatar_color: string;
  }>();

  return c.json({
    entries: entries.results.map(e => ({
      id: e.id,
      userId: e.user_id,
      weight: e.weight,
      date: e.date,
      note: e.note,
      userName: e.name,
      avatarColor: e.avatar_color,
    })),
  });
});

// Get weight entries for current user in a challenge
weightRoutes.get('/my/:challengeId', async (c) => {
  const userId = DEFAULT_USER_ID;
  const challengeId = c.req.param('challengeId');

  const entries = await c.env.DB.prepare(`
    SELECT id, weight, date, note
    FROM weight_entries
    WHERE user_id = ? AND challenge_id = ?
    ORDER BY date ASC
  `).bind(userId, challengeId).all<{
    id: string;
    weight: number;
    date: string;
    note: string | null;
  }>();

  return c.json({ entries: entries.results });
});

// Delete a weight entry
weightRoutes.delete('/:id', async (c) => {
  const userId = DEFAULT_USER_ID;
  const entryId = c.req.param('id');

  const entry = await c.env.DB.prepare(
    'SELECT id FROM weight_entries WHERE id = ? AND user_id = ?'
  ).bind(entryId, userId).first();

  if (!entry) {
    return c.json({ error: 'Entry not found' }, 404);
  }

  await c.env.DB.prepare('DELETE FROM weight_entries WHERE id = ?').bind(entryId).run();

  return c.json({ success: true });
});
