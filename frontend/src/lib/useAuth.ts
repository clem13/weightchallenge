import { useState, useEffect, useCallback } from 'react';
import { auth, User } from './api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    auth.me()
      .then(({ user }) => setUser(user))
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      })
      .finally(() => setLoading(false));
  }, []);

  const sendCode = useCallback(async (email: string) => {
    await auth.sendCode(email);
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    const res = await auth.verifyCode(email, code);
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  return { user, loading, sendCode, verifyCode, logout };
}
