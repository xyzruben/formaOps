'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '@/lib/monitoring/logger';

interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  errorInfo?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean;
}

interface ErrorFallbackProps {
  error?: Error;
  errorInfo?: ErrorInfo;
  resetError: () => void;
  errorId?: string;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private resetTimeoutId?: NodeJS.Timeout;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const enhancedErrorInfo: ErrorInfo = {
      componentStack: errorInfo.componentStack || '',
      errorBoundary: this.constructor.name,
    };

    this.setState({
      errorInfo: enhancedErrorInfo,
    });

    // Log error to monitoring system
    logger.error('React Error Boundary caught error', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, enhancedErrorInfo);
    }

    // Auto-recovery attempt after 10 seconds (for non-critical errors)
    if (!this.props.isolate) {
      this.resetTimeoutId = setTimeout(() => {
        this.handleReset();
      }, 10000);
    }
  }

  componentWillUnmount(): void {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  handleReset = (): void => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined,
    });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;

      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          resetError={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({
  error,
  errorInfo,
  resetError,
  errorId,
}: ErrorFallbackProps): React.ReactElement {
  const handleReload = (): void => {
    window.location.reload();
  };

  const handleGoHome = (): void => {
    window.location.href = '/';
  };

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
          <CardDescription>
            We encountered an unexpected error. Please try refreshing the page
            or contact support if the problem persists.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {errorId && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Error ID: <code className="font-mono">{errorId}</code>
              </p>
            </div>
          )}

          {isDevelopment && error && (
            <details className="p-3 bg-destructive/10 rounded-lg">
              <summary className="cursor-pointer text-sm font-medium text-destructive">
                Debug Information (Development Only)
              </summary>
              <div className="mt-2 space-y-2">
                <div>
                  <p className="text-xs font-medium text-destructive">Error:</p>
                  <p className="text-xs font-mono bg-destructive/5 p-2 rounded">
                    {error.name}: {error.message}
                  </p>
                </div>
                {error.stack && (
                  <div>
                    <p className="text-xs font-medium text-destructive">
                      Stack Trace:
                    </p>
                    <pre className="text-xs font-mono bg-destructive/5 p-2 rounded overflow-auto max-h-32">
                      {error.stack}
                    </pre>
                  </div>
                )}
                {errorInfo?.componentStack && (
                  <div>
                    <p className="text-xs font-medium text-destructive">
                      Component Stack:
                    </p>
                    <pre className="text-xs font-mono bg-destructive/5 p-2 rounded overflow-auto max-h-32">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button onClick={resetError} variant="outline" className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button onClick={handleReload} variant="outline" className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload Page
          </Button>
          <Button onClick={handleGoHome} className="flex-1">
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// Specialized error boundary for API calls
export function APIErrorBoundary({ children, onError }: ErrorBoundaryProps) {
  return (
    <ErrorBoundary onError={onError} fallback={APIErrorFallback}>
      {children}
    </ErrorBoundary>
  );
}

function APIErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-destructive">API Error</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {error?.message || 'Failed to load data. Please try again.'}
          </p>
          <Button
            onClick={resetError}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}

// Specialized error boundary for forms
export function FormErrorBoundary({ children, onError }: ErrorBoundaryProps) {
  return (
    <ErrorBoundary onError={onError} fallback={FormErrorFallback} isolate>
      {children}
    </ErrorBoundary>
  );
}

function FormErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <p className="text-sm font-medium text-destructive">Form Error</p>
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        {error?.message ||
          'There was an issue with the form. Please refresh and try again.'}
      </p>
      <Button onClick={resetError} variant="outline" size="sm" className="mt-3">
        Reset Form
      </Button>
    </div>
  );
}

// HOC for wrapping components with error boundaries
export function withErrorBoundary<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  options: {
    fallback?: React.ComponentType<ErrorFallbackProps>;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    isolate?: boolean;
  } = {}
): React.ComponentType<T> {
  const WrappedComponent: React.ComponentType<T> = props => {
    return (
      <ErrorBoundary {...options}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for error handling in components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
    logger.error('Component error caught by useErrorHandler', error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  // Re-throw error to be caught by error boundary
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, clearError, error };
}

// Async error handler for promises
export function handleAsyncError(promise: Promise<any>): Promise<any> {
  return promise.catch(error => {
    logger.error('Async operation failed', error);
    throw error;
  });
}

export { ErrorBoundary };
