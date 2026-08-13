import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchCurrentUser, loginWithGoogle, logout as logoutRequest } from '../api/auth';
import type { User } from '../types/auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const currentUser = await fetchCurrentUser();
        if (!cancelled) setUser(currentUser);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load session.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credential: string) => {
    setError(null);
    try {
      const loggedInUser = await loginWithGoogle(credential);
      setUser(loggedInUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    await logoutRequest();
    setUser(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({ user, loading, error, login, logout, clearError }),
    [user, loading, error, login, logout, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
