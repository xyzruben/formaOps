import { useState, useCallback } from 'react';

export interface Toast {
  id?: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

// Simple toast hook implementation
export function useToast(): {
  toast: (toast: Toast) => void;
  toasts: Toast[];
  removeToast: (id: string) => void;
} {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    ({ title, description, variant = 'default' }: Toast) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast = { id, title, description, variant };

      setToasts(prev => [...prev, newToast]);

      // Auto-remove toast after 5 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);

      return { id };
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return {
    toast,
    dismiss,
    toasts,
  };
}
