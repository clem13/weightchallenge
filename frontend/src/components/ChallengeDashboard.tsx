import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { challenges, weights, Challenge, Member, WeightEntry, User } from '../lib/api';
import { WeightChart } from './WeightChart';

interface ChallengeDashboardProps {
  user: User;
  onLogout: () => void;
}

export function ChallengeDashboard({ user }: ChallengeDashboardProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [showShareCode, setShowShareCode] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      const [challengeData, weightData] = await Promise.all([
        challenges.get(id),
        weights.getAll(id),
      ]);
      setChallenge(challengeData.challenge);
      setMembers(challengeData.members);
      setEntries(weightData.entries);
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const hasLoggedToday = entries.some(
    (e) => e.userId === user.id && e.date === todayStr
  );

  const stats = useMemo(() => {
    return members.map((member) => {
      const memberEntries = entries
        .filter((e) => e.userId === member.id)
        .sort((a, b) => a.date.localeCompare(b.date));

      const latest = memberEntries[memberEntries.length - 1];
      const first = memberEntries[0];
      const change = latest && first ? latest.weight - first.weight : 0;
      const streak = calculateStreak(memberEntries);

      return {
        ...member,
        latestWeight: latest?.weight ?? null,
        totalChange: change,
        entryCount: memberEntries.length,
        streak,
      };
    }).sort((a, b) => a.totalChange - b.totalChange);
  }, [members, entries]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!challenge) return null;

  return (
    <div className="page">
      <header className="page-header">
        <div className="header-left">
          <button className="btn-icon" onClick={() => navigate('/')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h1 className="page-title">{challenge.name}</h1>
            <p className="page-subtitle">{members.length} {members.length === 1 ? 'member' : 'members'}</p>
          </div>
        </div>
        <button
          className="btn-icon"
          onClick={() => setShowShareCode(true)}
          title="Share invite code"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </button>
      </header>

      <div className="content">
        {/* Today's weight prompt */}
        {!hasLoggedToday && (
          <button
            className="today-prompt"
            onClick={() => setShowWeightInput(true)}
          >
            <div className="today-prompt-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div className="today-prompt-text">
              <strong>Log today's weight</strong>
              <span>Tap to add your weight for {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}

        {/* Chart */}
        {entries.length > 0 && (
          <div className="card">
            <h3 className="card-title">Progress</h3>
            <WeightChart entries={entries} members={members} currentUserId={user.id} />
          </div>
        )}

        {/* Leaderboard */}
        <div className="card">
          <h3 className="card-title">Leaderboard</h3>
          <div className="leaderboard">
            {stats.map((s, i) => (
              <div key={s.id} className={`leaderboard-row ${s.id === user.id ? 'is-you' : ''}`}>
                <div className="leaderboard-rank">{i + 1}</div>
                <div className="avatar avatar-sm" style={{ background: s.avatarColor }}>
                  {s.name[0].toUpperCase()}
                </div>
                <div className="leaderboard-info">
                  <span className="leaderboard-name">
                    {s.name}{s.id === user.id ? ' (you)' : ''}
                  </span>
                  <span className="leaderboard-meta">
                    {s.entryCount} entries &middot; {s.streak} day streak
                  </span>
                </div>
                <div className="leaderboard-stats">
                  {s.latestWeight !== null && (
                    <span className="leaderboard-weight">{s.latestWeight} kg</span>
                  )}
                  {s.entryCount > 1 && (
                    <span className={`leaderboard-change ${s.totalChange < 0 ? 'positive' : s.totalChange > 0 ? 'negative' : ''}`}>
                      {s.totalChange > 0 ? '+' : ''}{s.totalChange.toFixed(1)} kg
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent entries */}
        {entries.length > 0 && (
          <div className="card">
            <h3 className="card-title">Recent Activity</h3>
            <div className="activity-list">
              {[...entries]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 20)
                .map((entry) => (
                  <div key={entry.id} className="activity-row">
                    <div className="avatar avatar-xs" style={{ background: entry.avatarColor }}>
                      {entry.userName[0].toUpperCase()}
                    </div>
                    <div className="activity-info">
                      <span className="activity-name">{entry.userName}</span>
                      <span className="activity-date">
                        {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <span className="activity-weight">{entry.weight} kg</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Floating action button */}
        <button
          className="fab"
          onClick={() => setShowWeightInput(true)}
          title="Log weight"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {showWeightInput && (
        <WeightInputModal
          challengeId={id!}
          onClose={() => setShowWeightInput(false)}
          onSaved={() => {
            setShowWeightInput(false);
            loadData();
          }}
        />
      )}

      {showShareCode && challenge && (
        <ShareCodeModal
          code={challenge.joinCode}
          onClose={() => setShowShareCode(false)}
        />
      )}
    </div>
  );
}

function WeightInputModal({
  challengeId,
  onClose,
  onSaved,
}: {
  challengeId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await weights.log({
        challengeId,
        weight: parseFloat(weight),
        date,
        note: note || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Log Weight</h2>
          <button className="btn-icon" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Weight (kg)</label>
            <input
              type="number"
              className="form-input weight-input"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0.0"
              step="0.1"
              min="20"
              max="500"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <input
              type="text"
              className="form-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="How are you feeling?"
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
            {submitting ? <span className="btn-loading" /> : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ShareCodeModal({ code, onClose }: { code: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Invite Code</h2>
          <button className="btn-icon" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <p className="share-text">Share this code with friends so they can join your challenge</p>
        <div className="share-code-display">
          <span className="share-code">{code}</span>
          <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}

function calculateStreak(entries: { date: string }[]): number {
  if (entries.length === 0) return 0;

  const dates = new Set(entries.map((e) => e.date));
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    if (dates.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return streak;
}
