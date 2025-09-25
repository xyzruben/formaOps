/**
 * User Preferences Types
 *
 * Comprehensive type definitions for the user preferences system,
 * providing type safety across the application.
 */

// Base preferences interface matching the database schema
export interface UserPreferences {
  id: string;
  userId: string;

  // AI Results Viewer Preferences
  defaultViewMode: 'output' | 'metrics' | 'raw';
  outputFontSize: 'small' | 'medium' | 'large' | 'custom';
  customFontSize: number | null;
  enableSyntaxHighlight: boolean;
  enableWordWrap: boolean;
  showTokenMetrics: boolean;
  showCostMetrics: boolean;
  showLatencyMetrics: boolean;
  enableAutoRefresh: boolean;
  defaultExportFormat: 'txt' | 'json' | 'html' | 'csv';
  defaultCopyFormat: 'plain' | 'formatted';

  // Dashboard Preferences
  defaultLandingPage: 'dashboard' | 'executions' | 'prompts';
  executionsPerPage: number;
  executionsSortBy: 'createdAt' | 'status' | 'costUsd';
  executionsSortOrder: 'asc' | 'desc';
  promptsViewMode: 'list' | 'grid';
  promptsPerPage: number;
  promptsSortBy: 'updatedAt' | 'createdAt' | 'name';
  promptsSortOrder: 'asc' | 'desc';
  sidebarCollapsed: boolean;

  // Display & Theme
  theme: 'light' | 'dark' | 'system';
  primaryColor: 'blue' | 'green' | 'purple' | 'red' | 'orange';
  layoutDensity: 'compact' | 'comfortable' | 'spacious';
  enableAnimations: boolean;

  // Notifications & Behavior
  enableDesktopNotifications: boolean;
  showDetailedErrors: boolean;
  enableConfirmationDialogs: boolean;
  enableAutoSave: boolean;

  // Privacy & Data
  dataRetentionDays: number | null;
  enableUsageAnalytics: boolean;
  defaultShareExpiration: number;
  includeMetadataInExports: boolean;

  createdAt: Date;
  updatedAt: Date;
}

// Partial update type for API requests
export type UserPreferencesUpdate = Partial<
  Omit<UserPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
>;

// Specialized preference subsets for different contexts
export interface AIResultsViewerPreferences {
  defaultViewMode: UserPreferences['defaultViewMode'];
  outputFontSize: UserPreferences['outputFontSize'];
  customFontSize: UserPreferences['customFontSize'];
  enableSyntaxHighlight: UserPreferences['enableSyntaxHighlight'];
  enableWordWrap: UserPreferences['enableWordWrap'];
  showTokenMetrics: UserPreferences['showTokenMetrics'];
  showCostMetrics: UserPreferences['showCostMetrics'];
  showLatencyMetrics: UserPreferences['showLatencyMetrics'];
  enableAutoRefresh: UserPreferences['enableAutoRefresh'];
  defaultExportFormat: UserPreferences['defaultExportFormat'];
  defaultCopyFormat: UserPreferences['defaultCopyFormat'];
}

export interface DashboardPreferences {
  defaultLandingPage: UserPreferences['defaultLandingPage'];
  executionsPerPage: UserPreferences['executionsPerPage'];
  executionsSortBy: UserPreferences['executionsSortBy'];
  executionsSortOrder: UserPreferences['executionsSortOrder'];
  promptsViewMode: UserPreferences['promptsViewMode'];
  promptsPerPage: UserPreferences['promptsPerPage'];
  promptsSortBy: UserPreferences['promptsSortBy'];
  promptsSortOrder: UserPreferences['promptsSortOrder'];
  sidebarCollapsed: UserPreferences['sidebarCollapsed'];
}

export interface ThemePreferences {
  theme: UserPreferences['theme'];
  primaryColor: UserPreferences['primaryColor'];
  layoutDensity: UserPreferences['layoutDensity'];
  enableAnimations: UserPreferences['enableAnimations'];
}

export interface BehaviorPreferences {
  enableDesktopNotifications: UserPreferences['enableDesktopNotifications'];
  showDetailedErrors: UserPreferences['showDetailedErrors'];
  enableConfirmationDialogs: UserPreferences['enableConfirmationDialogs'];
  enableAutoSave: UserPreferences['enableAutoSave'];
}

export interface PrivacyPreferences {
  dataRetentionDays: UserPreferences['dataRetentionDays'];
  enableUsageAnalytics: UserPreferences['enableUsageAnalytics'];
  defaultShareExpiration: UserPreferences['defaultShareExpiration'];
  includeMetadataInExports: UserPreferences['includeMetadataInExports'];
}

// API response types
export interface PreferencesResponse {
  preferences: UserPreferences;
  isDefault: boolean;
}

export interface PreferencesUpdateResponse {
  preferences: UserPreferences;
  message: string;
}

// Export/Import types
export interface PreferencesExport {
  version: string;
  exportedAt: string;
  exportedBy: string;
  preferences: Omit<
    UserPreferences,
    'id' | 'userId' | 'createdAt' | 'updatedAt'
  >;
}

// Theme system types
export interface ThemeConfig {
  name: string;
  label: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    border: string;
  };
}

export interface LayoutDensityConfig {
  name: string;
  label: string;
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
  };
}

// Settings panel types
export interface SettingsSection {
  id: string;
  label: string;
  description: string;
  icon: string;
  component: React.ComponentType<Record<string, unknown>>;
}

export interface SettingsField {
  key: keyof UserPreferences;
  label: string;
  description?: string;
  type: 'boolean' | 'select' | 'number' | 'color';
  options?: Array<{ value: string | number; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  dependsOn?: {
    field: keyof UserPreferences;
    value: unknown;
  };
}

// Preference validation types
export interface PreferenceValidationRule {
  field: keyof UserPreferences;
  validate: (value: unknown, preferences: UserPreferences) => boolean | string;
}

// Font size mapping for AI Results Viewer
export const FONT_SIZE_MAP = {
  small: '12px',
  medium: '14px',
  large: '16px',
} as const;

// Default preferences constant
export const DEFAULT_PREFERENCES: Omit<
  UserPreferences,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
> = {
  // AI Results Viewer
  defaultViewMode: 'output',
  outputFontSize: 'medium',
  customFontSize: null,
  enableSyntaxHighlight: true,
  enableWordWrap: true,
  showTokenMetrics: true,
  showCostMetrics: true,
  showLatencyMetrics: true,
  enableAutoRefresh: true,
  defaultExportFormat: 'txt',
  defaultCopyFormat: 'formatted',

  // Dashboard
  defaultLandingPage: 'dashboard',
  executionsPerPage: 20,
  executionsSortBy: 'createdAt',
  executionsSortOrder: 'desc',
  promptsViewMode: 'list',
  promptsPerPage: 20,
  promptsSortBy: 'updatedAt',
  promptsSortOrder: 'desc',
  sidebarCollapsed: false,

  // Theme
  theme: 'system',
  primaryColor: 'blue',
  layoutDensity: 'comfortable',
  enableAnimations: true,

  // Behavior
  enableDesktopNotifications: false,
  showDetailedErrors: true,
  enableConfirmationDialogs: true,
  enableAutoSave: true,

  // Privacy
  dataRetentionDays: null,
  enableUsageAnalytics: false,
  defaultShareExpiration: 168,
  includeMetadataInExports: true,
};

// Utility type guards
export const isValidTheme = (
  theme: string
): theme is UserPreferences['theme'] => {
  return ['light', 'dark', 'system'].includes(theme);
};

export const isValidPrimaryColor = (
  color: string
): color is UserPreferences['primaryColor'] => {
  return ['blue', 'green', 'purple', 'red', 'orange'].includes(color);
};

export const isValidDensity = (
  density: string
): density is UserPreferences['layoutDensity'] => {
  return ['compact', 'comfortable', 'spacious'].includes(density);
};
