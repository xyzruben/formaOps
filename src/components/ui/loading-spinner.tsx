import * as React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ 
  className, 
  size = 'md',
  ...props 
}: LoadingSpinnerProps): JSX.Element {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-current border-t-transparent',
        {
          'h-4 w-4': size === 'sm',
          'h-6 w-6': size === 'md',
          'h-8 w-8': size === 'lg',
        },
        className
      )}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({ 
  message = 'Loading...', 
  size = 'md' 
}: LoadingStateProps): JSX.Element {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex items-center space-x-2">
        <LoadingSpinner size={size} />
        <span className="text-muted-foreground">{message}</span>
      </div>
    </div>
  );
}

export function ErrorState({ 
  message, 
  onRetry 
}: { 
  message: string; 
  onRetry?: () => void;
}): JSX.Element {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center space-y-2">
        <p className="text-destructive">Error: {message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm text-primary hover:underline"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="text-center space-y-4">
        <h3 className="text-lg font-medium">{title}</h3>
        {description && (
          <p className="text-muted-foreground max-w-md">{description}</p>
        )}
        {action && action}
      </div>
    </div>
  );
}