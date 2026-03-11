import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/useAuth';
import { AuthScreen } from './components/AuthScreen';
import { ChallengeList } from './components/ChallengeList';
import { ChallengeDashboard } from './components/ChallengeDashboard';

export function App() {
  const { user, loading, sendCode, verifyCode, logout } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onSendCode={sendCode} onVerifyCode={verifyCode} />;
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<ChallengeList user={user} onLogout={logout} />} />
        <Route path="/challenge/:id" element={<ChallengeDashboard user={user} onLogout={logout} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
