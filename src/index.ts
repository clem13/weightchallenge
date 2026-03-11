import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { challengeRoutes } from './routes/challenges';
import { weightRoutes } from './routes/weights';

export type Env = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Env }>();

// CORS for local dev
app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'http://localhost:8787'],
  credentials: true,
}));

// Ensure default user exists
app.use('/api/*', async (c, next) => {
  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO users (id, name, email, avatar_color) VALUES (?, ?, ?, ?)`
  ).bind('default-user', 'Player', 'player@weightchallenge.app', '#007AFF').run();
  await next();
});

// API routes
app.route('/api/challenges', challengeRoutes);
app.route('/api/weights', weightRoutes);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

export default app;
