const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth
export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const auth = {
  signup: (name: string, email: string, password: string) =>
    request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ user: User }>('/auth/me'),
};

// Challenges
export interface Challenge {
  id: string;
  name: string;
  description: string | null;
  joinCode: string;
  startDate: string;
  endDate: string | null;
  createdBy: string;
  memberCount?: number;
}

export interface Member {
  id: string;
  name: string;
  avatarColor: string;
}

export const challenges = {
  list: () => request<{ challenges: Challenge[] }>('/challenges'),

  get: (id: string) => request<{ challenge: Challenge; members: Member[] }>(`/challenges/${id}`),

  create: (data: { name: string; description?: string; startDate: string; endDate?: string }) =>
    request<Challenge>('/challenges', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  join: (joinCode: string) =>
    request<{ challengeId: string; name: string }>('/challenges/join', {
      method: 'POST',
      body: JSON.stringify({ joinCode }),
    }),
};

// Weights
export interface WeightEntry {
  id: string;
  userId: string;
  weight: number;
  date: string;
  note: string | null;
  userName: string;
  avatarColor: string;
}

export const weights = {
  log: (data: { challengeId: string; weight: number; date: string; note?: string }) =>
    request<{ id: string }>('/weights', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAll: (challengeId: string) =>
    request<{ entries: WeightEntry[] }>(`/weights/challenge/${challengeId}`),

  getMy: (challengeId: string) =>
    request<{ entries: Pick<WeightEntry, 'id' | 'weight' | 'date' | 'note'>[] }>(
      `/weights/my/${challengeId}`
    ),

  delete: (id: string) =>
    request<{ success: boolean }>(`/weights/${id}`, { method: 'DELETE' }),
};
