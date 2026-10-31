import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, api } from '../services/api';
import { resetSocket } from '../services/socket';
import { IAuthUser } from '../types';

interface AuthContextValue {
  user: IAuthUser | null;
  loading: boolean;
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<IAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('nagardrishti_session');
    if (!token) { setLoading(false); return; }
    const cachedUser = sessionStorage.getItem('nagardrishti_user');
    if (cachedUser) {
      try { setUser(JSON.parse(cachedUser) as IAuthUser); }
      catch { sessionStorage.removeItem('nagardrishti_user'); }
    }
    api.getCurrentUser().then((currentUser) => {
      sessionStorage.setItem('nagardrishti_user', JSON.stringify(currentUser));
      setUser(currentUser);
    }).catch((error: unknown) => {
      // Preserve a valid-looking local session during outages; the server still
      // validates every protected request. Clear only sessions rejected as unauthorized.
      if (error instanceof ApiError && error.status === 401) {
        sessionStorage.removeItem('nagardrishti_session');
        sessionStorage.removeItem('nagardrishti_user');
        setUser(null);
      }
    }).finally(() => setLoading(false));
  }, []);

  const establish = async (action: Promise<{ user: IAuthUser; token: string }>) => {
    const result = await action;
    sessionStorage.setItem('nagardrishti_session', result.token);
    sessionStorage.setItem('nagardrishti_user', JSON.stringify(result.user));
    resetSocket();
    setUser(result.user);
  };
  const logout = () => {
    sessionStorage.removeItem('nagardrishti_session');
    sessionStorage.removeItem('nagardrishti_user');
    resetSocket();
    setUser(null);
  };
  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    login: (email, password) => establish(api.login(email, password)),
    register: (name, email, password) => establish(api.register(name, email, password)),
    logout,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
