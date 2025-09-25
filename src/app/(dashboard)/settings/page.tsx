'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import type { UserPreferences } from '@/types/preferences';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { LoadingState, ErrorState } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import {
  Settings,
  Eye,
  Layout,
  Bell,
  Shield,
  Download,
  RotateCcw,
  Save,
  ArrowLeft,
} from 'lucide-react';

export default function SettingsPage(): JSX.Element {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const {
    preferences,
    isLoading: prefsLoading,
    error,
    updatePreferences,
    resetPreferences,
    exportPreferences,
    isDefault,
  } = usePreferences();

  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('viewer');

  // Handle preference updates
  const handleUpdate = async (
    updates: Partial<UserPreferences>
  ): Promise<void> => {
    try {
      setIsSaving(true);
      await updatePreferences(updates);
      toast({
        title: 'Settings saved',
        description: 'Your preferences have been updated successfully.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle reset to defaults
  const handleReset = async (): Promise<void> => {
    if (
      !window.confirm(
        'Are you sure you want to reset all settings to defaults? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      setIsSaving(true);
      await resetPreferences();
      toast({
        title: 'Settings reset',
        description: 'All preferences have been reset to defaults.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to reset settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle export
  const handleExport = async (): Promise<void> => {
    try {
      await exportPreferences();
      toast({
        title: 'Settings exported',
        description: 'Your preferences have been downloaded as a JSON file.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to export settings. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (authLoading || prefsLoading) {
    return <LoadingState message="Loading settings..." />;
  }

  if (!user) {
    router.push('/?auth=required');
    return <div>Redirecting...</div>;
  }

  if (error || !preferences) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          message={error || 'Failed to load preferences'}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Button>
          </div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-lg">
            Customize your FormaOps experience
            {isDefault && (
              <span className="text-yellow-600 ml-2">(Using defaults)</span>
            )}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={isSaving}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="viewer" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            AI Results
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Layout className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2"
          >
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Privacy
          </TabsTrigger>
        </TabsList>

        {/* AI Results Viewer Settings */}
        <TabsContent value="viewer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Results Viewer Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Default View Mode */}
              <div className="space-y-2">
                <Label htmlFor="defaultViewMode">Default View Mode</Label>
                <Select
                  value={preferences.defaultViewMode}
                  onValueChange={(value: 'output' | 'metrics' | 'raw') =>
                    handleUpdate({ defaultViewMode: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="output">Output</SelectItem>
                    <SelectItem value="metrics">Metrics</SelectItem>
                    <SelectItem value="raw">Raw Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Font Size */}
              <div className="space-y-2">
                <Label htmlFor="outputFontSize">Font Size</Label>
                <Select
                  value={preferences.outputFontSize}
                  onValueChange={(
                    value: 'small' | 'medium' | 'large' | 'custom'
                  ) => handleUpdate({ outputFontSize: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Font Size */}
              {preferences.outputFontSize === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="customFontSize">Custom Font Size (px)</Label>
                  <Input
                    type="number"
                    min="8"
                    max="32"
                    value={preferences.customFontSize || 14}
                    onChange={e =>
                      handleUpdate({ customFontSize: parseInt(e.target.value) })
                    }
                  />
                </div>
              )}

              {/* Display Options */}
              <div className="space-y-4">
                <h4 className="font-medium">Display Options</h4>

                <div className="flex items-center justify-between">
                  <Label htmlFor="syntaxHighlight">Syntax Highlighting</Label>
                  <Switch
                    id="syntaxHighlight"
                    checked={preferences.enableSyntaxHighlight}
                    onCheckedChange={checked =>
                      handleUpdate({ enableSyntaxHighlight: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="wordWrap">Word Wrap</Label>
                  <Switch
                    id="wordWrap"
                    checked={preferences.enableWordWrap}
                    onCheckedChange={checked =>
                      handleUpdate({ enableWordWrap: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="autoRefresh">
                    Auto-refresh for Running Executions
                  </Label>
                  <Switch
                    id="autoRefresh"
                    checked={preferences.enableAutoRefresh}
                    onCheckedChange={checked =>
                      handleUpdate({ enableAutoRefresh: checked })
                    }
                  />
                </div>
              </div>

              {/* Metrics Display */}
              <div className="space-y-4">
                <h4 className="font-medium">Metrics Display</h4>

                <div className="flex items-center justify-between">
                  <Label htmlFor="showTokens">Show Token Usage</Label>
                  <Switch
                    id="showTokens"
                    checked={preferences.showTokenMetrics}
                    onCheckedChange={checked =>
                      handleUpdate({ showTokenMetrics: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="showCost">Show Cost Information</Label>
                  <Switch
                    id="showCost"
                    checked={preferences.showCostMetrics}
                    onCheckedChange={checked =>
                      handleUpdate({ showCostMetrics: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="showLatency">Show Latency Information</Label>
                  <Switch
                    id="showLatency"
                    checked={preferences.showLatencyMetrics}
                    onCheckedChange={checked =>
                      handleUpdate({ showLatencyMetrics: checked })
                    }
                  />
                </div>
              </div>

              {/* Export Defaults */}
              <div className="space-y-4">
                <h4 className="font-medium">Export Defaults</h4>

                <div className="space-y-2">
                  <Label htmlFor="defaultExportFormat">
                    Default Export Format
                  </Label>
                  <Select
                    value={preferences.defaultExportFormat}
                    onValueChange={(value: 'txt' | 'json' | 'html' | 'csv') =>
                      handleUpdate({ defaultExportFormat: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="txt">Text (.txt)</SelectItem>
                      <SelectItem value="json">JSON (.json)</SelectItem>
                      <SelectItem value="html">HTML (.html)</SelectItem>
                      <SelectItem value="csv">CSV (.csv)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultCopyFormat">Default Copy Format</Label>
                  <Select
                    value={preferences.defaultCopyFormat}
                    onValueChange={(value: 'plain' | 'formatted') =>
                      handleUpdate({ defaultCopyFormat: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plain">Plain Text</SelectItem>
                      <SelectItem value="formatted">Formatted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dashboard Settings */}
        <TabsContent value="dashboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Landing Page */}
              <div className="space-y-2">
                <Label htmlFor="landingPage">Default Landing Page</Label>
                <Select
                  value={preferences.defaultLandingPage}
                  onValueChange={(
                    value: 'dashboard' | 'executions' | 'prompts'
                  ) => handleUpdate({ defaultLandingPage: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dashboard">Dashboard</SelectItem>
                    <SelectItem value="executions">Executions</SelectItem>
                    <SelectItem value="prompts">Prompts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Executions Settings */}
              <div className="space-y-4">
                <h4 className="font-medium">Executions List</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="executionsPerPage">Items per Page</Label>
                    <Select
                      value={preferences.executionsPerPage.toString()}
                      onValueChange={value =>
                        handleUpdate({ executionsPerPage: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="executionsSortBy">Default Sort By</Label>
                    <Select
                      value={preferences.executionsSortBy}
                      onValueChange={(
                        value: 'createdAt' | 'status' | 'costUsd'
                      ) => handleUpdate({ executionsSortBy: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="createdAt">Created Date</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="costUsd">Cost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Prompts Settings */}
              <div className="space-y-4">
                <h4 className="font-medium">Prompts List</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="promptsViewMode">View Mode</Label>
                    <Select
                      value={preferences.promptsViewMode}
                      onValueChange={(value: 'list' | 'grid') =>
                        handleUpdate({ promptsViewMode: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="list">List</SelectItem>
                        <SelectItem value="grid">Grid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="promptsPerPage">Items per Page</Label>
                    <Select
                      value={preferences.promptsPerPage.toString()}
                      onValueChange={value =>
                        handleUpdate({ promptsPerPage: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Sidebar Setting */}
              <div className="flex items-center justify-between">
                <Label htmlFor="sidebarCollapsed">
                  Collapse Sidebar by Default
                </Label>
                <Switch
                  id="sidebarCollapsed"
                  checked={preferences.sidebarCollapsed}
                  onCheckedChange={checked =>
                    handleUpdate({ sidebarCollapsed: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme */}
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={preferences.theme}
                  onValueChange={(value: 'light' | 'dark' | 'system') =>
                    handleUpdate({ theme: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Primary Color */}
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <Select
                  value={preferences.primaryColor}
                  onValueChange={(
                    value: 'blue' | 'green' | 'purple' | 'red' | 'orange'
                  ) => handleUpdate({ primaryColor: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="purple">Purple</SelectItem>
                    <SelectItem value="red">Red</SelectItem>
                    <SelectItem value="orange">Orange</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Layout Density */}
              <div className="space-y-2">
                <Label htmlFor="layoutDensity">Layout Density</Label>
                <Select
                  value={preferences.layoutDensity}
                  onValueChange={(
                    value: 'compact' | 'comfortable' | 'spacious'
                  ) => handleUpdate({ layoutDensity: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="spacious">Spacious</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Animations */}
              <div className="flex items-center justify-between">
                <Label htmlFor="enableAnimations">Enable Animations</Label>
                <Switch
                  id="enableAnimations"
                  checked={preferences.enableAnimations}
                  onCheckedChange={checked =>
                    handleUpdate({ enableAnimations: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="desktopNotifications">
                    Desktop Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when executions complete
                  </p>
                </div>
                <Switch
                  id="desktopNotifications"
                  checked={preferences.enableDesktopNotifications}
                  onCheckedChange={checked =>
                    handleUpdate({ enableDesktopNotifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="detailedErrors">
                    Detailed Error Messages
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Show technical details in error messages
                  </p>
                </div>
                <Switch
                  id="detailedErrors"
                  checked={preferences.showDetailedErrors}
                  onCheckedChange={checked =>
                    handleUpdate({ showDetailedErrors: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="confirmationDialogs">
                    Confirmation Dialogs
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Show confirmations for destructive actions
                  </p>
                </div>
                <Switch
                  id="confirmationDialogs"
                  checked={preferences.enableConfirmationDialogs}
                  onCheckedChange={checked =>
                    handleUpdate({ enableConfirmationDialogs: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="autoSave">Auto-save</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save drafts and settings
                  </p>
                </div>
                <Switch
                  id="autoSave"
                  checked={preferences.enableAutoSave}
                  onCheckedChange={checked =>
                    handleUpdate({ enableAutoSave: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Data Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="dataRetention">Data Retention (days)</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  placeholder="Leave empty to keep forever"
                  value={preferences.dataRetentionDays || ''}
                  onChange={e =>
                    handleUpdate({
                      dataRetentionDays: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  How long to keep execution history. Leave empty to keep
                  forever.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="usageAnalytics">Usage Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    Help improve FormaOps with anonymous usage data
                  </p>
                </div>
                <Switch
                  id="usageAnalytics"
                  checked={preferences.enableUsageAnalytics}
                  onCheckedChange={checked =>
                    handleUpdate({ enableUsageAnalytics: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shareExpiration">
                  Default Share Expiration (hours)
                </Label>
                <Select
                  value={preferences.defaultShareExpiration.toString()}
                  onValueChange={value =>
                    handleUpdate({ defaultShareExpiration: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="168">1 week</SelectItem>
                    <SelectItem value="720">1 month</SelectItem>
                    <SelectItem value="8760">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="includeMetadata">
                    Include Metadata in Exports
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Include execution metadata when exporting results
                  </p>
                </div>
                <Switch
                  id="includeMetadata"
                  checked={preferences.includeMetadataInExports}
                  onCheckedChange={checked =>
                    handleUpdate({ includeMetadataInExports: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save indicator */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-lg">
          <div className="flex items-center gap-2">
            <Save className="w-4 h-4 animate-spin" />
            Saving settings...
          </div>
        </div>
      )}
    </div>
  );
}
