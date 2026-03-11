import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { challenges, Challenge, User } from '../lib/api';

interface ChallengeListProps {
  user: User;
  onLogout: () => void;
}

export function ChallengeList({ user, onLogout }: ChallengeListProps) {
  const navigate = useNavigate();
  const [list, setList] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      const { challenges: data } = await challenges.list();
      setList(data);
      if (data.length > 0) {
        navigate(`/challenge/${data[0].id}`, { replace: true });
      }
    } catch {
      // handle error silently
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div className="header-left">
          <div className="avatar" style={{ background: user.avatarColor }}>
            {user.name[0].toUpperCase()}
          </div>
          <div>
            <h1 className="page-title">Big Boss Weight Challenge</h1>
            <p className="page-subtitle">Hey, {user.name}</p>
          </div>
        </div>
        <button className="btn-icon" onClick={onLogout} title="Sign out">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </header>

      <div className="content">
        {loading ? (
          <div className="empty-state">
            <div className="loading-spinner" />
          </div>
        ) : list.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3>No challenges yet</h3>
            <p>Join the challenge with an invite code</p>
          </div>
        ) : (
          <div className="challenge-grid">
            {list.map((ch) => (
              <button
                key={ch.id}
                className="challenge-card"
                onClick={() => navigate(`/challenge/${ch.id}`)}
              >
                <div className="challenge-card-header">
                  <h3 className="challenge-card-title">{ch.name}</h3>
                  <span className="challenge-card-members">
                    {ch.memberCount} {ch.memberCount === 1 ? 'member' : 'members'}
                  </span>
                </div>
                {ch.description && (
                  <p className="challenge-card-desc">{ch.description}</p>
                )}
                <div className="challenge-card-footer">
                  <span className="challenge-card-date">
                    Started {new Date(ch.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="challenge-card-code">Code: {ch.joinCode}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="action-buttons">
          <button className="btn btn-primary" onClick={() => setShowJoin(true)}>
            Join Challenge
          </button>
        </div>
      </div>

      {showJoin && (
        <JoinChallengeModal
          onClose={() => setShowJoin(false)}
          onJoined={(id) => {
            setShowJoin(false);
            loadChallenges();
            navigate(`/challenge/${id}`);
          }}
        />
      )}
    </div>
  );
}

function JoinChallengeModal({
  onClose,
  onJoined,
}: {
  onClose: () => void;
  onJoined: (challengeId: string) => void;
}) {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const { challengeId } = await challenges.join(code);
      onJoined(challengeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Join Challenge</h2>
          <button className="btn-icon" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Invite Code</label>
            <input
              type="text"
              className="form-input code-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter 8-character code"
              required
              maxLength={8}
              autoFocus
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
            {submitting ? <span className="btn-loading" /> : 'Join Challenge'}
          </button>
        </form>
      </div>
    </div>
  );
}
