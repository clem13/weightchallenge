import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './routes/auth';
import { challengeRoutes } from './routes/challenges';
import { weightRoutes } from './routes/weights';

export type Env = {
  DB: D1Database;
  RESEND_API_KEY: string;
  FROM_EMAIL: string;
};

const app = new Hono<{ Bindings: Env }>();

// CORS for local dev
app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'http://localhost:8787'],
  credentials: true,
}));

// API routes
app.route('/api/auth', authRoutes);
app.route('/api/challenges', challengeRoutes);
app.route('/api/weights', weightRoutes);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

export default app;
