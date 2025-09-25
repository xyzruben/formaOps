'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertTriangle,
  XCircle,
  Clock,
  Zap,
  Key,
  DollarSign,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Info,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';
import { useState } from 'react';

export interface ExecutionError {
  type: 'VALIDATION_ERROR' | 'API_ERROR' | 'TIMEOUT_ERROR' | 'RATE_LIMIT_ERROR';
  message: string;
  retryable: boolean;
  retryAfter?: number;
  details?: Record<string, unknown> | string | null;
}

export interface ErrorDisplayProps {
  error: ExecutionError;
  executionId: string;
  onRetry?: () => void;
  onSupport?: () => void;
  onModify?: () => void;
  className?: string;
}

interface ErrorDisplayData {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  variant: 'default' | 'destructive';
  actions: Array<{
    label: string;
    action: () => void;
    variant: 'default' | 'outline' | 'destructive';
    icon?: React.ComponentType<any>;
  }>;
  suggestions?: string[];
  documentation?: string;
  technicalDetails?: React.ReactNode;
}

const formatErrorDetails = (details: ExecutionError['details']): string => {
  if (!details) return 'No additional details available';

  if (typeof details === 'string') return details;

  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
};

const getRetryDelay = (retryAfter?: number): string => {
  if (!retryAfter) return '';

  if (retryAfter < 60) return `${retryAfter} seconds`;
  if (retryAfter < 3600) return `${Math.ceil(retryAfter / 60)} minutes`;
  return `${Math.ceil(retryAfter / 3600)} hours`;
};

export function ErrorDisplay({
  error,
  executionId,
  onRetry,
  onSupport,
  onModify,
  className = '',
}: ErrorDisplayProps): JSX.Element {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const getErrorDisplayData = (): ErrorDisplayData => {
    const baseActions = [];

    // Add retry action if error is retryable
    if (error.retryable && onRetry) {
      baseActions.push({
        label: error.retryAfter
          ? `Retry in ${getRetryDelay(error.retryAfter)}`
          : 'Try Again',
        action: onRetry,
        variant: 'default' as const,
        icon: RotateCcw,
      });
    }

    // Add modify action if available
    if (onModify) {
      baseActions.push({
        label: 'Modify & Retry',
        action: onModify,
        variant: 'outline' as const,
      });
    }

    // Add support action if available
    if (onSupport) {
      baseActions.push({
        label: 'Contact Support',
        action: onSupport,
        variant: 'outline' as const,
        icon: MessageSquare,
      });
    }

    switch (error.type) {
      case 'RATE_LIMIT_ERROR':
        return {
          title: 'Rate Limit Exceeded',
          description:
            'You have exceeded the API rate limit. Please wait before making another request.',
          icon: Clock,
          variant: 'default',
          actions: baseActions,
          suggestions: [
            'Wait for the rate limit to reset',
            'Consider upgrading your plan for higher limits',
            'Implement request batching to reduce API calls',
            'Use caching to minimize duplicate requests',
          ],
          documentation: 'https://docs.formaops.com/api/rate-limits',
          technicalDetails: (
            <div className="space-y-2 text-sm">
              <p>
                <strong>Error Code:</strong> RATE_LIMIT_EXCEEDED
              </p>
              <p>
                <strong>Reset Time:</strong>{' '}
                {error.retryAfter ? getRetryDelay(error.retryAfter) : 'Unknown'}
              </p>
              <p>
                <strong>Current Limit:</strong> Based on your subscription plan
              </p>
            </div>
          ),
        };

      case 'TIMEOUT_ERROR':
        return {
          title: 'Request Timeout',
          description:
            'The request took too long to complete and was cancelled.',
          icon: AlertTriangle,
          variant: 'default',
          actions: baseActions,
          suggestions: [
            'Try breaking your prompt into smaller parts',
            'Reduce the maximum token limit',
            'Simplify the complexity of your request',
            'Check your internet connection',
          ],
          documentation: 'https://docs.formaops.com/troubleshooting/timeouts',
          technicalDetails: (
            <div className="space-y-2 text-sm">
              <p>
                <strong>Error Code:</strong> TIMEOUT_ERROR
              </p>
              <p>
                <strong>Timeout Duration:</strong> 30 seconds
              </p>
              <p>
                <strong>Suggestion:</strong> Try reducing prompt complexity
              </p>
            </div>
          ),
        };

      case 'VALIDATION_ERROR':
        return {
          title: 'Validation Error',
          description:
            'There was an issue with the request parameters or input data.',
          icon: XCircle,
          variant: 'destructive',
          actions: baseActions.filter(action => action.label !== 'Try Again'), // Remove retry for validation errors
          suggestions: [
            'Check that all required fields are filled',
            'Ensure input values match expected formats',
            'Verify variable definitions in your prompt',
            'Review parameter constraints (token limits, etc.)',
          ],
          documentation: 'https://docs.formaops.com/prompts/validation',
          technicalDetails: (
            <div className="space-y-2 text-sm">
              <p>
                <strong>Error Code:</strong> VALIDATION_ERROR
              </p>
              <p>
                <strong>Details:</strong>
              </p>
              <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                {formatErrorDetails(error.details)}
              </pre>
            </div>
          ),
        };

      case 'API_ERROR': {
        // Determine specific API error type from message
        const message = error.message.toLowerCase();

        if (message.includes('api key') || message.includes('authentication')) {
          return {
            title: 'API Configuration Error',
            description:
              'There is an issue with the API authentication or configuration.',
            icon: Key,
            variant: 'destructive',
            actions: baseActions.concat([
              {
                label: 'Check Settings',
                action: () => (window.location.href = '/settings'),
                variant: 'outline' as const,
              },
            ]),
            suggestions: [
              'Verify your API keys are correctly configured',
              'Check if your API key has expired',
              'Ensure you have the necessary permissions',
              'Contact your administrator for access',
            ],
            documentation: 'https://docs.formaops.com/setup/api-keys',
            technicalDetails: (
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Error Code:</strong> API_AUTHENTICATION_ERROR
                </p>
                <p>
                  <strong>Possible Causes:</strong> Invalid/expired API key,
                  insufficient permissions
                </p>
              </div>
            ),
          };
        }

        if (
          message.includes('quota') ||
          message.includes('billing') ||
          message.includes('credits')
        ) {
          return {
            title: 'Quota or Billing Issue',
            description:
              'You have reached your usage quota or there is a billing issue.',
            icon: DollarSign,
            variant: 'default',
            actions: baseActions.concat([
              {
                label: 'View Billing',
                action: () => (window.location.href = '/billing'),
                variant: 'outline' as const,
              },
            ]),
            suggestions: [
              'Check your current usage and limits',
              'Consider upgrading your plan',
              'Review your billing information',
              'Contact billing support if needed',
            ],
            documentation: 'https://docs.formaops.com/billing/quotas',
            technicalDetails: (
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Error Code:</strong> QUOTA_EXCEEDED
                </p>
                <p>
                  <strong>Current Plan:</strong> Check your subscription details
                </p>
              </div>
            ),
          };
        }

        if (message.includes('model') || message.includes('unavailable')) {
          return {
            title: 'Model Unavailable',
            description:
              'The selected AI model is currently unavailable or does not exist.',
            icon: Zap,
            variant: 'default',
            actions: baseActions,
            suggestions: [
              'Try using a different model',
              'Check if the model name is spelled correctly',
              'Some models may have regional restrictions',
              'Wait a few minutes and try again',
            ],
            documentation: 'https://docs.formaops.com/models/availability',
            technicalDetails: (
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Error Code:</strong> MODEL_UNAVAILABLE
                </p>
                <p>
                  <strong>Requested Model:</strong>{' '}
                  {typeof error.details === 'object' &&
                  error.details &&
                  typeof error.details.model === 'string'
                    ? error.details.model
                    : 'Unknown'}
                </p>
              </div>
            ),
          };
        }

        // Generic API error
        return {
          title: 'API Error',
          description:
            error.message ||
            'An unexpected error occurred while processing your request.',
          icon: XCircle,
          variant: 'destructive',
          actions: baseActions,
          suggestions: [
            'Try your request again in a few moments',
            'Check if the issue persists with other prompts',
            'Verify your internet connection',
            'Contact support if the problem continues',
          ],
          documentation: 'https://docs.formaops.com/troubleshooting',
          technicalDetails: (
            <div className="space-y-2 text-sm">
              <p>
                <strong>Error Code:</strong> GENERIC_API_ERROR
              </p>
              <p>
                <strong>Message:</strong> {error.message}
              </p>
              {error.details && (
                <>
                  <p>
                    <strong>Details:</strong>
                  </p>
                  <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                    {formatErrorDetails(error.details)}
                  </pre>
                </>
              )}
            </div>
          ),
        };
      }

      default:
        return {
          title: 'Unknown Error',
          description: 'An unexpected error occurred during execution.',
          icon: HelpCircle,
          variant: 'destructive',
          actions: baseActions,
          suggestions: [
            'Try running the execution again',
            'Check if other executions work normally',
            'Contact support with the execution ID',
          ],
          technicalDetails: (
            <div className="space-y-2 text-sm">
              <p>
                <strong>Error Type:</strong> {error.type}
              </p>
              <p>
                <strong>Message:</strong> {error.message}
              </p>
            </div>
          ),
        };
    }
  };

  const errorData = getErrorDisplayData();
  const ErrorIcon = errorData.icon;

  return (
    <div className={`space-y-4 ${className}`} data-testid="error-display">
      {/* Main Error Alert */}
      <Alert variant={errorData.variant}>
        <ErrorIcon className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          {errorData.title}
          <Badge variant="outline" className="text-xs">
            {error.type.replace('_', ' ')}
          </Badge>
        </AlertTitle>
        <AlertDescription className="mt-2">
          {errorData.description}
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      {errorData.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {errorData.actions.map((action, index) => {
            const ActionIcon = action.icon;
            return (
              <Button
                key={index}
                variant={action.variant}
                onClick={action.action}
                className="flex items-center gap-2"
                size="sm"
              >
                {ActionIcon && <ActionIcon className="h-4 w-4" />}
                {action.label}
              </Button>
            );
          })}
        </div>
      )}

      {/* Suggestions Card */}
      {errorData.suggestions && errorData.suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4" />
              Suggestions
            </CardTitle>
            <CardDescription>
              Here are some ways to resolve this issue:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {errorData.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2"></span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>

            {errorData.documentation && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(errorData.documentation, '_blank')}
                  className="flex items-center gap-2 p-0 h-auto"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Documentation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Technical Details */}
      {errorData.technicalDetails && (
        <Collapsible
          open={showTechnicalDetails}
          onOpenChange={setShowTechnicalDetails}
        >
          <Card>
            <CollapsibleTrigger>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    Technical Details
                  </span>
                  {showTechnicalDetails ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="text-sm">
                    <p>
                      <strong>Execution ID:</strong> {executionId}
                    </p>
                    <p>
                      <strong>Timestamp:</strong> {new Date().toISOString()}
                    </p>
                    <p>
                      <strong>Retryable:</strong>{' '}
                      {error.retryable ? 'Yes' : 'No'}
                    </p>
                  </div>

                  <div className="border-t pt-3">
                    {errorData.technicalDetails}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}
