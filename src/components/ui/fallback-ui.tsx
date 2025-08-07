'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Wifi, WifiOff, RefreshCw, Search, Inbox, ShieldAlert, Clock, Database } from 'lucide-react';

interface FallbackUIProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: React.ReactNode;
}

function BaseFallback({ title, description, icon, action, children }: FallbackUIProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      {icon && (
        <div className="mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      
      {title && (
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {title}
        </h2>
      )}
      
      {description && (
        <p className="text-muted-foreground max-w-md mb-6">
          {description}
        </p>
      )}
      
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
      
      {children}
    </div>
  );
}

// Network/Connection Issues
export function NetworkErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <BaseFallback
      icon={<WifiOff size={48} />}
      title="Connection Issues"
      description="Unable to connect to our servers. Please check your internet connection and try again."
      action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
    />
  );
}

export function OfflineFallback() {
  return (
    <BaseFallback
      icon={<Wifi size={48} />}
      title="You're Offline"
      description="Some features may not be available while you're offline. Please check your internet connection."
    />
  );
}

// Data States
export function EmptyStateFallback({ 
  title = "No data available",
  description = "There's nothing to show here yet.",
  action
}: Partial<FallbackUIProps>) {
  return (
    <BaseFallback
      icon={<Inbox size={48} />}
      title={title}
      description={description}
      action={action}
    />
  );
}

export function NoSearchResultsFallback({ 
  searchTerm,
  onClear 
}: { 
  searchTerm?: string;
  onClear?: () => void;
}) {
  return (
    <BaseFallback
      icon={<Search size={48} />}
      title="No results found"
      description={
        searchTerm 
          ? `No results found for "${searchTerm}". Try different keywords or clear your search.`
          : "No results found. Try adjusting your search criteria."
      }
      action={onClear ? { label: 'Clear Search', onClick: onClear } : undefined}
    />
  );
}

// Permission/Access Issues
export function UnauthorizedFallback({ onLogin }: { onLogin?: () => void }) {
  return (
    <BaseFallback
      icon={<ShieldAlert size={48} />}
      title="Access Required"
      description="You need to sign in to access this feature."
      action={onLogin ? { label: 'Sign In', onClick: onLogin } : undefined}
    />
  );
}

export function ForbiddenFallback() {
  return (
    <BaseFallback
      icon={<ShieldAlert size={48} />}
      title="Access Denied"
      description="You don't have permission to view this content. Contact your administrator if you think this is an error."
    />
  );
}

// Loading/Processing States
export function TimeoutFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <BaseFallback
      icon={<Clock size={48} />}
      title="Request Timed Out"
      description="The request is taking longer than expected. Please try again."
      action={onRetry ? { label: 'Retry', onClick: onRetry } : undefined}
    />
  );
}

export function ProcessingFallback({ message = "Processing your request..." }: { message?: string }) {
  return (
    <BaseFallback
      icon={<RefreshCw size={48} className="animate-spin" />}
      title="Processing"
      description={message}
    />
  );
}

// Service-Specific Fallbacks
export function DatabaseErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <BaseFallback
      icon={<Database size={48} />}
      title="Database Error"
      description="We're having trouble accessing the database. Please try again in a moment."
      action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
    />
  );
}

export function APIErrorFallback({ 
  error,
  onRetry 
}: { 
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <BaseFallback
      icon={<AlertCircle size={48} />}
      title="Service Unavailable"
      description={error || "Our service is temporarily unavailable. Please try again later."}
      action={onRetry ? { label: 'Retry', onClick: onRetry } : undefined}
    />
  );
}

export function MaintenanceFallback() {
  return (
    <BaseFallback
      icon={<AlertCircle size={48} />}
      title="Under Maintenance"
      description="We're currently performing maintenance. Please check back in a few minutes."
    />
  );
}

// Page-Specific Fallbacks
export function PromptNotFoundFallback({ onGoBack }: { onGoBack?: () => void }) {
  return (
    <BaseFallback
      icon={<Search size={48} />}
      title="Prompt Not Found"
      description="The prompt you're looking for doesn't exist or has been removed."
      action={onGoBack ? { label: 'Go Back', onClick: onGoBack } : undefined}
    />
  );
}

export function ExecutionFailedFallback({ 
  error,
  onRetry 
}: { 
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">Execution Failed</CardTitle>
        </div>
        <CardDescription>
          {error || "The AI service encountered an error while processing your request."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2">Troubleshooting Tips:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Check your input variables are properly formatted</li>
              <li>• Ensure your prompt template is valid</li>
              <li>• Try again in a moment - this may be a temporary issue</li>
            </ul>
          </div>
          
          {onRetry && (
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Generic error card component
export function ErrorCard({ 
  title,
  description,
  error,
  onRetry,
  onDismiss 
}: {
  title: string;
  description?: string;
  error?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">{title}</CardTitle>
          </div>
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              ×
            </Button>
          )}
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      
      {(error || onRetry) && (
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="text-sm font-mono text-muted-foreground">{error}</p>
            </div>
          )}
          
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// Hook for managing fallback states
export function useFallbackState() {
  const [state, setState] = React.useState<{
    type: 'loading' | 'error' | 'empty' | 'offline' | null;
    message?: string;
    error?: Error;
  }>({ type: null });

  const setLoading = React.useCallback(() => {
    setState({ type: 'loading' });
  }, []);

  const setError = React.useCallback((error: Error | string) => {
    setState({ 
      type: 'error', 
      error: typeof error === 'string' ? new Error(error) : error,
      message: typeof error === 'string' ? error : error.message,
    });
  }, []);

  const setEmpty = React.useCallback((message?: string) => {
    setState({ type: 'empty', message });
  }, []);

  const setOffline = React.useCallback(() => {
    setState({ type: 'offline' });
  }, []);

  const reset = React.useCallback(() => {
    setState({ type: null });
  }, []);

  return {
    state,
    setLoading,
    setError,
    setEmpty,
    setOffline,
    reset,
    isLoading: state.type === 'loading',
    hasError: state.type === 'error',
    isEmpty: state.type === 'empty',
    isOffline: state.type === 'offline',
  };
}