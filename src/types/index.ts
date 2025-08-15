// Re-export all types for easy importing
export * from './database';
export * from './api';

// Global types
export interface Config {
  database: {
    url: string;
  };
  auth: {
    supabaseUrl: string;
    supabaseAnonKey: string;
    supabaseServiceRoleKey?: string;
  };
  ai: {
    openaiApiKey: string;
  };
  redis?: {
    url: string;
  };
  app: {
    url: string;
    environment: 'development' | 'staging' | 'production';
  };
}

export interface AppState {
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  loading: boolean;
  error: string | null;
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'number';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

// Navigation types
export interface NavItem {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  active?: boolean;
}

// Theme types
export type Theme = 'light' | 'dark' | 'system';

// Utility types
export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export type OptionalExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;
