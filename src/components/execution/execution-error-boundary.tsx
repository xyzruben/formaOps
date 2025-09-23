'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
}

export class ExecutionErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorId: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development (console.error is allowed)
    if (process.env.NODE_ENV === 'development') {
      console.error('ExecutionErrorBoundary caught an error:', error);
      console.error('Error Info:', errorInfo);
    }

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to log to an error reporting service
    // Example: logErrorToService(error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: '',
    });
  };

  private handleCopyError = (): void => {
    const errorDetails = {
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  Execution Panel Error
                </CardTitle>
                <CardDescription>
                  An unexpected error occurred in the execution panel
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {this.state.errorId}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm font-medium mb-2">Error Details:</p>
              <p className="text-sm text-muted-foreground">
                {this.state.error?.message || 'Unknown error occurred'}
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground mb-2">
                  Show technical details (Development only)
                </summary>
                <div className="rounded-md bg-background border p-3 overflow-auto">
                  <div className="space-y-2">
                    <div>
                      <strong>Stack Trace:</strong>
                      <pre className="text-xs mt-1 whitespace-pre-wrap">
                        {this.state.error?.stack}
                      </pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="text-xs mt-1 whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </details>
            )}

            <div className="flex gap-2">
              <Button onClick={this.handleRetry} size="sm">
                Try Again
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleCopyError}
              >
                Copy Error Details
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>If this error persists, please:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Check your internet connection</li>
                <li>Try refreshing the page</li>
                <li>Contact support with error ID: {this.state.errorId}</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withExecutionErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
): React.ComponentType<P> {
  const WrappedComponent = (props: P): JSX.Element => (
    <ExecutionErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ExecutionErrorBoundary>
  );

  WrappedComponent.displayName = `withExecutionErrorBoundary(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
}

// Hook for logging errors to external service (placeholder)
export const useErrorReporting = (): {
  reportError: (
    error: Error,
    errorInfo: ErrorInfo,
    context?: Record<string, unknown>
  ) => void;
} => {
  const reportError = React.useCallback(
    (error: Error, errorInfo: ErrorInfo, context?: Record<string, unknown>) => {
      // In production, integrate with error reporting service
      // Example: Sentry, LogRocket, Bugsnag, etc.

      if (process.env.NODE_ENV === 'development') {
        console.error('🔥 Error Report - Error:', error);
        console.error('🔥 Error Report - Error Info:', errorInfo);
        console.error('🔥 Error Report - Context:', context);
      }

      // Example production error reporting:
      // try {
      //   errorReportingService.captureException(error, {
      //     extra: errorInfo,
      //     tags: {
      //       component: 'execution-panel',
      //       ...context
      //     }
      //   });
      // } catch (reportingError) {
      //   console.error('Failed to report error:', reportingError);
      // }
    },
    []
  );

  return { reportError };
};
