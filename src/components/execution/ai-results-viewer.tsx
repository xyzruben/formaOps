'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { OutputDisplay } from './output-display';
import { MetricsDisplay } from './metrics-display';
import { ResultsActions } from './results-actions';
import { ErrorDisplay } from './error-display';
import { useAIResultsPreferences } from '@/contexts/PreferencesContext';
import { FONT_SIZE_MAP } from '@/types/preferences';

// Types based on existing ExecutionResult from enhanced-execution-panel.tsx
export interface AIResultsViewerProps {
  execution: ExecutionResult;
  onRetry?: () => void;
  onSave?: (execution: ExecutionResult) => void;
  onShare?: (execution: ExecutionResult) => void;
  className?: string;
}

export interface ExecutionResult {
  executionId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  output: string;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  costUsd: number;
  validationStatus: 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED';
  validationErrors: Array<{
    path: string;
    message: string;
  }>;
  executionData?: {
    inputs: Record<string, any>;
    model: string;
    maxTokens: number;
    temperature: number;
    prompt?: {
      id: string;
      name: string;
    };
  };
  timestamp?: string;
  executionTime?: number;
  latencyMs?: number; // Legacy property for compatibility
  error?: {
    type:
      | 'VALIDATION_ERROR'
      | 'API_ERROR'
      | 'TIMEOUT_ERROR'
      | 'RATE_LIMIT_ERROR';
    message: string;
    retryable: boolean;
    retryAfter?: number;
    details?: Record<string, unknown> | string | null;
  };
}

interface ResultsViewerState {
  activeTab: 'output' | 'metrics' | 'raw';
}

export function AIResultsViewer({
  execution,
  onRetry,
  onSave,
  onShare,
  className = '',
}: AIResultsViewerProps): JSX.Element {
  const aiResultsPrefs = useAIResultsPreferences();
  const [state, setState] = useState<ResultsViewerState>({
    activeTab: 'output',
  });

  // Initialize default tab from preferences
  useEffect(() => {
    if (aiResultsPrefs?.defaultViewMode) {
      setState(prev => ({
        ...prev,
        activeTab: aiResultsPrefs.defaultViewMode,
      }));
    }
  }, [aiResultsPrefs?.defaultViewMode]);

  const isSuccess = execution.status === 'COMPLETED';
  const isFailed = execution.status === 'FAILED';
  const isPending = execution.status === 'PENDING';
  const isRunning = execution.status === 'RUNNING';
  const isCancelled = execution.status === 'CANCELLED';

  // Status configuration
  const getStatusConfig = (): {
    variant: 'default' | 'destructive' | 'secondary' | 'outline';
    icon: React.ComponentType<{ className?: string }>;
    text: string;
    className: string;
  } => {
    if (isSuccess) {
      return {
        variant: 'default' as const,
        icon: CheckCircle,
        text: 'Completed Successfully',
        className: 'bg-green-50 text-green-700 border-green-200',
      };
    }

    if (isFailed) {
      return {
        variant: 'destructive' as const,
        icon: XCircle,
        text: 'Execution Failed',
        className: 'bg-red-50 text-red-700 border-red-200',
      };
    }

    if (isRunning) {
      return {
        variant: 'secondary' as const,
        icon: Clock,
        text: 'Running',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    }

    if (isPending) {
      return {
        variant: 'outline' as const,
        icon: Clock,
        text: 'Pending',
        className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      };
    }

    if (isCancelled) {
      return {
        variant: 'outline' as const,
        icon: XCircle,
        text: 'Cancelled',
        className: 'bg-gray-50 text-gray-700 border-gray-200',
      };
    }

    return {
      variant: 'secondary' as const,
      icon: Clock,
      text: 'Processing',
      className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  // Handler for modifying and retrying (opens execution panel with prefilled data)
  const handleModifyAndRetry = (): void => {
    // This would typically trigger the parent component to show the execution panel
    // with the previous execution data pre-filled
    if (onRetry) {
      onRetry();
    }
  };

  const handleSupport = (): void => {
    // Open support dialog or redirect to support page
    window.open('/support?execution=' + execution.executionId, '_blank');
  };

  return (
    <Card
      className={`ai-results-viewer ${className}`}
      data-testid="ai-results-viewer"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon className="h-5 w-5" />
            <div>
              <h3 className="text-lg font-semibold">Execution Result</h3>
              <Badge className={statusConfig.className}>
                {statusConfig.text}
              </Badge>
            </div>
          </div>

          {execution.timestamp && (
            <div className="text-sm text-muted-foreground">
              {new Date(execution.timestamp).toLocaleString()}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Tabs
          value={state.activeTab}
          onValueChange={value =>
            setState(prev => ({
              ...prev,
              activeTab: value as 'output' | 'metrics' | 'raw',
            }))
          }
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="output">Output</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
          </TabsList>

          <TabsContent value="output" className="mt-4">
            {isFailed && execution.error ? (
              <ErrorDisplay
                error={execution.error}
                executionId={execution.executionId}
                onRetry={onRetry}
                onSupport={handleSupport}
                onModify={handleModifyAndRetry}
                className="mb-6"
              />
            ) : (
              <div className="space-y-6">
                {isSuccess && execution.output && (
                  <OutputDisplay
                    output={execution.output}
                    maxHeight={400}
                    showLineNumbers={false}
                    collapsible={true}
                    fontSize={
                      aiResultsPrefs?.outputFontSize === 'custom'
                        ? `${aiResultsPrefs.customFontSize}px`
                        : FONT_SIZE_MAP[
                            aiResultsPrefs?.outputFontSize || 'medium'
                          ]
                    }
                    enableSyntaxHighlight={
                      aiResultsPrefs?.enableSyntaxHighlight ?? true
                    }
                    enableWordWrap={aiResultsPrefs?.enableWordWrap ?? true}
                  />
                )}

                {!isSuccess && !isFailed && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 animate-pulse" />
                    <p>Execution in progress...</p>
                  </div>
                )}

                {execution.executionData && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Input Variables</h4>
                    <div className="bg-muted/50 p-3 rounded-md">
                      <dl className="space-y-2">
                        {Object.entries(execution.executionData.inputs).map(
                          ([key, value]) => (
                            <div
                              key={key}
                              className="flex justify-between text-sm"
                            >
                              <dt className="font-medium text-muted-foreground">
                                {key}:
                              </dt>
                              <dd className="ml-2 break-words">
                                {String(value)}
                              </dd>
                            </div>
                          )
                        )}
                      </dl>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="metrics" className="mt-4">
            <MetricsDisplay
              tokenUsage={execution.tokenUsage}
              cost={execution.costUsd}
              executionTime={execution.executionTime}
              model={execution.executionData?.model || 'unknown'}
              showTokenMetrics={aiResultsPrefs?.showTokenMetrics ?? true}
              showCostMetrics={aiResultsPrefs?.showCostMetrics ?? true}
              showLatencyMetrics={aiResultsPrefs?.showLatencyMetrics ?? true}
            />
          </TabsContent>

          <TabsContent value="raw" className="mt-4">
            <div className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-medium">Raw Execution Data</h4>
                <p className="text-sm text-muted-foreground">
                  Complete execution data including request/response details,
                  metadata, and technical information.
                </p>
              </div>

              <OutputDisplay
                output={JSON.stringify(execution, null, 2)}
                maxHeight={500}
                showLineNumbers={true}
                collapsible={true}
                fontSize={
                  aiResultsPrefs?.outputFontSize === 'custom'
                    ? `${aiResultsPrefs.customFontSize}px`
                    : FONT_SIZE_MAP[aiResultsPrefs?.outputFontSize || 'medium']
                }
                enableSyntaxHighlight={
                  aiResultsPrefs?.enableSyntaxHighlight ?? true
                }
                enableWordWrap={aiResultsPrefs?.enableWordWrap ?? true}
              />

              <div className="grid gap-3 md:grid-cols-3 text-sm">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="font-medium">Execution ID</div>
                  <div className="text-muted-foreground font-mono">
                    {execution.executionId}
                  </div>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="font-medium">Status</div>
                  <div className="text-muted-foreground">
                    {execution.status}
                  </div>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="font-medium">Validation</div>
                  <div className="text-muted-foreground">
                    {execution.validationStatus}
                  </div>
                </div>
              </div>

              {execution.validationErrors &&
                execution.validationErrors.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-destructive">
                      Validation Errors
                    </h5>
                    <div className="space-y-1">
                      {execution.validationErrors.map((error, index) => (
                        <div
                          key={index}
                          className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm"
                        >
                          <div className="font-medium text-destructive">
                            {error.path}
                          </div>
                          <div className="text-muted-foreground">
                            {error.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="pt-4 border-t">
        <ResultsActions
          execution={execution}
          onRetry={onRetry}
          onSave={onSave ? (): void => onSave(execution) : undefined}
          onShare={
            onShare
              ? (_options): Promise<void> => {
                  // For now, ignore share options and just call with execution
                  // In a real implementation, you'd use the options to configure sharing
                  onShare(execution);
                }
              : undefined
          }
          className="w-full"
        />
      </CardFooter>
    </Card>
  );
}
