'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createSupabaseClient } from '@/lib/auth/client';
import {
  testAuthManager,
  type MockUser,
  type MockAuthState,
} from '@/lib/auth/test-mock';

interface AuthContextType {
  user: User | MockUser | null;
  isLoading: boolean;
  error: string | null;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<User | MockUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isTestMode = process.env.NODE_ENV === 'test';
  const supabase = !isTestMode ? createSupabaseClient() : null;

  useEffect(() => {
    if (isTestMode) {
      // Test mode: use mock auth manager
      const unsubscribe = testAuthManager.subscribe((state: MockAuthState) => {
        setUser(state.user);
        setIsLoading(state.isLoading);
        setError(state.error);
      });

      // Set initial state
      const initialState = testAuthManager.getState();
      setUser(initialState.user);
      setIsLoading(initialState.isLoading);
      setError(initialState.error);

      return unsubscribe;
    } else {
      // Production mode: use Supabase
      const getInitialSession = async (): Promise<void> => {
        try {
          if (supabase) {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
          }
        } catch (err) {
          console.error('Error getting initial session:', err);
        } finally {
          setIsLoading(false);
        }
      };

      getInitialSession();

      // Listen for auth changes
      if (supabase) {
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          setUser(session?.user ?? null);
          setIsLoading(false);

          // Clear error on successful auth state change
          if (event === 'SIGNED_IN') {
            setError(null);
          }
        });

        return () => subscription.unsubscribe();
      }
    }
  }, [isTestMode, supabase]);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (isTestMode) {
      return testAuthManager.login(email, password);
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const { user: userData } = await response.json();
      setUser(userData);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<{ success: boolean; error?: string }> => {
    if (isTestMode) {
      return testAuthManager.logout();
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Logout failed');
      }

      setUser(null);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = (): void => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    error,
    login,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
