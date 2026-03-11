import { Routes, Route, Navigate } from 'react-router-dom';
import { ChallengeList } from './components/ChallengeList';
import { ChallengeDashboard } from './components/ChallengeDashboard';

const DEFAULT_USER = {
  id: 'default-user',
  name: 'Player',
  email: 'player@weightchallenge.app',
  avatarColor: '#007AFF',
};

export function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<ChallengeList user={DEFAULT_USER} onLogout={() => {}} />} />
        <Route path="/challenge/:id" element={<ChallengeDashboard user={DEFAULT_USER} onLogout={() => {}} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
