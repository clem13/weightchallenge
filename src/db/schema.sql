-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#007AFF',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  join_code TEXT UNIQUE NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  start_date TEXT NOT NULL,
  end_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Challenge members
CREATE TABLE IF NOT EXISTS challenge_members (
  challenge_id TEXT NOT NULL REFERENCES challenges(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (challenge_id, user_id)
);

-- Weight entries
CREATE TABLE IF NOT EXISTS weight_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  challenge_id TEXT NOT NULL REFERENCES challenges(id),
  weight REAL NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, challenge_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_weight_entries_user ON weight_entries(user_id, challenge_id, date);
CREATE INDEX IF NOT EXISTS idx_challenge_members_user ON challenge_members(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_join_code ON challenges(join_code);
