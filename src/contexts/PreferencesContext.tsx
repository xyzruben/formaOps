'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import type {
  UserPreferences,
  UserPreferencesUpdate,
  PreferencesResponse,
  PreferencesUpdateResponse,
  AIResultsViewerPreferences,
  DashboardPreferences,
  ThemePreferences,
  BehaviorPreferences,
} from '@/types/preferences';
import { DEFAULT_PREFERENCES } from '@/types/preferences';
import { useAuth } from './AuthContext';

interface PreferencesContextValue {
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: string | null;
  isDefault: boolean;
  updatePreferences: (updates: UserPreferencesUpdate) => Promise<void>;
  resetPreferences: () => Promise<void>;
  exportPreferences: () => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(
  undefined
);

interface PreferencesProviderProps {
  children: React.ReactNode;
}

export function PreferencesProvider({
  children,
}: PreferencesProviderProps): JSX.Element {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState(false);

  // Fetch user preferences from the API
  const fetchPreferences = useCallback(async (): Promise<void> => {
    if (!user) {
      setPreferences(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/preferences');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: { success: boolean; data: PreferencesResponse } =
        await response.json();

      if (!data.success) {
        throw new Error('Failed to fetch preferences');
      }

      setPreferences(data.data.preferences);
      setIsDefault(data.data.isDefault);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load preferences';
      setError(errorMessage);
      console.error('Error fetching preferences:', err);

      // Fall back to default preferences on error
      setPreferences({
        id: 'temp',
        userId: user.id,
        ...DEFAULT_PREFERENCES,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserPreferences);
      setIsDefault(true);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Update user preferences
  const updatePreferences = useCallback(
    async (updates: UserPreferencesUpdate): Promise<void> => {
      if (!user) throw new Error('User not authenticated');

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: { success: boolean; data: PreferencesUpdateResponse } =
          await response.json();

        if (!data.success) {
          throw new Error('Failed to update preferences');
        }

        setPreferences(data.data.preferences);
        setIsDefault(false);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update preferences';
        setError(errorMessage);
        console.error('Error updating preferences:', err);
        throw err; // Re-throw for component handling
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  // Reset preferences to defaults
  const resetPreferences = useCallback(async (): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/preferences', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: { success: boolean; data: PreferencesUpdateResponse } =
        await response.json();

      if (!data.success) {
        throw new Error('Failed to reset preferences');
      }

      setPreferences(data.data.preferences);
      setIsDefault(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to reset preferences';
      setError(errorMessage);
      console.error('Error resetting preferences:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Export preferences as JSON file
  const exportPreferences = useCallback(async (): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const response = await fetch('/api/preferences/export');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `formaops-preferences-${user.id.slice(-8)}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to export preferences';
      setError(errorMessage);
      console.error('Error exporting preferences:', err);
      throw err;
    }
  }, [user]);

  // Refresh preferences (useful for manual refresh)
  const refreshPreferences = useCallback(async (): Promise<void> => {
    await fetchPreferences();
  }, [fetchPreferences]);

  // Fetch preferences when user changes
  useEffect(() => {
    if (user) {
      fetchPreferences();
    } else {
      setPreferences(null);
      setIsDefault(false);
      setError(null);
    }
  }, [user, fetchPreferences]);

  const contextValue: PreferencesContextValue = {
    preferences,
    isLoading,
    error,
    isDefault,
    updatePreferences,
    resetPreferences,
    exportPreferences,
    refreshPreferences,
  };

  return (
    <PreferencesContext.Provider value={contextValue}>
      {children}
    </PreferencesContext.Provider>
  );
}

// Hook to use preferences context
export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}

// Specialized hooks for different preference categories
export function useAIResultsPreferences(): AIResultsViewerPreferences | null {
  const { preferences } = usePreferences();

  if (!preferences) return null;

  return {
    defaultViewMode: preferences.defaultViewMode,
    outputFontSize: preferences.outputFontSize,
    customFontSize: preferences.customFontSize,
    enableSyntaxHighlight: preferences.enableSyntaxHighlight,
    enableWordWrap: preferences.enableWordWrap,
    showTokenMetrics: preferences.showTokenMetrics,
    showCostMetrics: preferences.showCostMetrics,
    showLatencyMetrics: preferences.showLatencyMetrics,
    enableAutoRefresh: preferences.enableAutoRefresh,
    defaultExportFormat: preferences.defaultExportFormat,
    defaultCopyFormat: preferences.defaultCopyFormat,
  };
}

export function useDashboardPreferences(): DashboardPreferences | null {
  const { preferences } = usePreferences();

  if (!preferences) return null;

  return {
    defaultLandingPage: preferences.defaultLandingPage,
    executionsPerPage: preferences.executionsPerPage,
    executionsSortBy: preferences.executionsSortBy,
    executionsSortOrder: preferences.executionsSortOrder,
    promptsViewMode: preferences.promptsViewMode,
    promptsPerPage: preferences.promptsPerPage,
    promptsSortBy: preferences.promptsSortBy,
    promptsSortOrder: preferences.promptsSortOrder,
    sidebarCollapsed: preferences.sidebarCollapsed,
  };
}

export function useThemePreferences(): ThemePreferences | null {
  const { preferences } = usePreferences();

  if (!preferences) return null;

  return {
    theme: preferences.theme,
    primaryColor: preferences.primaryColor,
    layoutDensity: preferences.layoutDensity,
    enableAnimations: preferences.enableAnimations,
  };
}

export function useBehaviorPreferences(): BehaviorPreferences | null {
  const { preferences } = usePreferences();

  if (!preferences) return null;

  return {
    enableDesktopNotifications: preferences.enableDesktopNotifications,
    showDetailedErrors: preferences.showDetailedErrors,
    enableConfirmationDialogs: preferences.enableConfirmationDialogs,
    enableAutoSave: preferences.enableAutoSave,
  };
}
