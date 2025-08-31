/**
 * Safe localStorage utilities for test environment
 */

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // eslint-disable-next-line no-undef
        return localStorage.getItem(key);
      }
      return null;
    } catch (error) {
      console.warn('localStorage access denied:', error);
      return null;
    }
  },

  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // eslint-disable-next-line no-undef
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.warn('localStorage access denied:', error);
    }
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // eslint-disable-next-line no-undef
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('localStorage access denied:', error);
    }
  },

  clear: (): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // eslint-disable-next-line no-undef
        localStorage.clear();
      }
    } catch (error) {
      console.warn('localStorage access denied:', error);
    }
  },
};
