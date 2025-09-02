/**
 * Test-specific auth mock to eliminate Supabase dependencies
 */

import { safeLocalStorage } from '@/lib/utils/storage';

export interface MockUser {
  id: string;
  email: string;
}

export interface MockAuthState {
  user: MockUser | null;
  isLoading: boolean;
  error: string | null;
}

class TestAuthManager {
  private state: MockAuthState = {
    user: null,
    isLoading: false,
    error: null,
  };

  private listeners: ((state: MockAuthState) => void)[] = [];

  constructor() {
    // Initialize from localStorage if available - start as not loading if data exists
    const stored = safeLocalStorage.getItem('auth-user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        this.state = { user, isLoading: false, error: null };
      } catch (error) {
        console.warn('Invalid stored auth data:', error);
        this.state.isLoading = false;
      }
    } else {
      this.state.isLoading = false;
    }
    
    // Listen for localStorage changes during tests
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageChange.bind(this));
      
      // Also set up a periodic check for E2E tests where storage events might not fire
      setInterval(() => {
        this.loadFromStorage();
      }, 100);
    }
  }

  private loadFromStorage(): void {
    const stored = safeLocalStorage.getItem('auth-user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        if (!this.state.user || this.state.user.id !== user.id) {
          this.updateState({ user, isLoading: false, error: null });
        }
      } catch (error) {
        console.warn('Invalid stored auth data:', error);
      }
    } else if (this.state.user) {
      this.updateState({ user: null, isLoading: false, error: null });
    }
  }

  private handleStorageChange(event: StorageEvent): void {
    if (event.key === 'auth-user') {
      this.loadFromStorage();
    }
  }

  private saveToStorage(): void {
    if (this.state.user) {
      safeLocalStorage.setItem('auth-user', JSON.stringify(this.state.user));
    } else {
      safeLocalStorage.removeItem('auth-user');
    }
  }

  private updateState(updates: Partial<MockAuthState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }

  getState(): MockAuthState {
    return { ...this.state };
  }

  subscribe(listener: (state: MockAuthState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    this.updateState({ isLoading: true, error: null });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Test validation logic
    if (!email || !email.includes('@')) {
      this.updateState({
        isLoading: false,
        error: 'Invalid email format',
      });
      return { success: false, error: 'Invalid email format' };
    }

    if (!password || password.length < 6) {
      this.updateState({
        isLoading: false,
        error: 'Password is required',
      });
      return { success: false, error: 'Password is required' };
    }

    // Mock invalid credentials
    if (email === 'test@example.com' && password === 'wrongpassword') {
      this.updateState({
        isLoading: false,
        error: 'Invalid credentials',
      });
      return { success: false, error: 'Invalid credentials' };
    }

    // Mock successful login
    const user: MockUser = {
      id: 'test-user-id',
      email,
    };

    this.state.user = user;
    this.saveToStorage();
    this.updateState({ user, isLoading: false, error: null });
    return { success: true };
  }

  async logout(): Promise<{ success: boolean; error?: string }> {
    this.updateState({ isLoading: true, error: null });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 50));

    this.state.user = null;
    safeLocalStorage.removeItem('auth-user');
    this.updateState({ user: null, isLoading: false, error: null });
    return { success: true };
  }

  clearError(): void {
    this.updateState({ error: null });
  }
}

// Singleton instance for tests
export const testAuthManager = new TestAuthManager();
