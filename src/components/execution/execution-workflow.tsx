'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EnhancedExecutionPanel } from './enhanced-execution-panel';
import { AIResultsViewer } from './ai-results-viewer';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import type { Prompt } from '../../types/database';
import type { ExecutionResult } from './ai-results-viewer';

interface ExecutionWorkflowProps {
  prompt: Prompt;
  onBack?: () => void;
  onSaveToHistory?: (execution: ExecutionResult) => void;
  onShareExecution?: (execution: ExecutionResult) => void;
  className?: string;
}

type WorkflowState = 'configure' | 'executing' | 'results' | 'retry';

interface WorkflowData {
  currentExecution?: ExecutionResult;
  executionHistory: ExecutionResult[];
  executionStartTime?: number;
}

export function ExecutionWorkflow({
  prompt,
  onBack,
  onSaveToHistory,
  onShareExecution,
  className = '',
}: ExecutionWorkflowProps): JSX.Element {
  const [workflowState, setWorkflowState] =
    useState<WorkflowState>('configure');
  const [workflowData, setWorkflowData] = useState<WorkflowData>({
    executionHistory: [],
  });

  // Handle execution start from the panel
  const handleExecutionStart = (_executionId: string): void => {
    setWorkflowState('executing');
    // Execution started successfully
  };

  // Handle execution completion from the panel
  const handleExecutionComplete = (result: ExecutionResult): void => {
    // Transform the result from the panel format to our format
    const transformedResult: ExecutionResult = {
      executionId: result.executionId,
      status: result.status,
      output: result.output,
      tokenUsage: {
        inputTokens: result.tokenUsage.inputTokens,
        outputTokens: result.tokenUsage.outputTokens,
        totalTokens: result.tokenUsage.totalTokens,
      },
      costUsd: result.costUsd,
      validationStatus: result.validationStatus,
      validationErrors: result.validationErrors,
      executionData: result.executionData,
      timestamp: new Date().toISOString(),
      executionTime:
        Date.now() - (workflowData.executionStartTime || Date.now()),
      ...(result.status === 'FAILED' && {
        error: {
          type: 'API_ERROR' as const,
          message: 'Execution failed',
          retryable: true,
        },
      }),
    };

    setWorkflowData(prev => ({
      ...prev,
      currentExecution: transformedResult,
      executionHistory: [
        transformedResult,
        ...prev.executionHistory.slice(0, 9),
      ], // Keep last 10
      executionStartTime: undefined,
    }));

    setWorkflowState('results');
  };

  // Handle retry from results viewer
  const handleRetry = (): void => {
    setWorkflowState('configure');
  };

  // Handle modify and retry (prefill form with previous data)
  const handleModifyAndRetry = (): void => {
    setWorkflowState('retry');
  };

  // Handle save to history
  const handleSaveToHistory = (execution: ExecutionResult): void => {
    if (onSaveToHistory) {
      onSaveToHistory(execution);
    }

    // Also add to local history if not already there
    setWorkflowData(prev => {
      const existsInHistory = prev.executionHistory.some(
        h => h.executionId === execution.executionId
      );

      if (existsInHistory) {
        return prev;
      }

      return {
        ...prev,
        executionHistory: [execution, ...prev.executionHistory.slice(0, 9)],
      };
    });
  };

  // Handle share execution
  const handleShareExecution = async (
    execution: ExecutionResult
  ): Promise<void> => {
    if (onShareExecution) {
      return onShareExecution(execution);
    }

    // Default sharing implementation
    const shareData = {
      title: `AI Execution Result - ${execution.executionId}`,
      text: `Check out this AI execution result: ${execution.output?.substring(0, 100)}...`,
      url: `${window.location.origin}/executions/${execution.executionId}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Sharing cancelled or failed - no action needed
      }
    } else {
      // Fallback: copy URL to clipboard
      await navigator.clipboard.writeText(shareData.url);
      // Share URL copied to clipboard
    }
  };

  // Get workflow title and description
  const getWorkflowInfo = (): { title: string; description: string } => {
    switch (workflowState) {
      case 'configure':
        return {
          title: 'Configure Execution',
          description:
            'Set up variables and parameters for your prompt execution',
        };
      case 'executing':
        return {
          title: 'Executing Prompt',
          description: 'Your prompt is being processed by the AI model',
        };
      case 'results':
        return {
          title: 'Execution Results',
          description: 'Review the AI response and execution metrics',
        };
      case 'retry':
        return {
          title: 'Modify & Retry',
          description: 'Adjust parameters and try the execution again',
        };
    }
  };

  const workflowInfo = getWorkflowInfo();

  return (
    <div className={`space-y-4 ${className}`} data-testid="execution-workflow">
      {/* Workflow Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack &&
            (workflowState === 'results' || workflowState === 'retry') && (
              <Button
                variant="ghost"
                onClick={onBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Prompts
              </Button>
            )}

          <div>
            <h1 className="text-2xl font-bold">{workflowInfo.title}</h1>
            <p className="text-muted-foreground">{workflowInfo.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Workflow state indicator */}
          <Badge
            variant={workflowState === 'executing' ? 'default' : 'secondary'}
          >
            {workflowState.charAt(0).toUpperCase() + workflowState.slice(1)}
          </Badge>

          {/* Execution history count */}
          {workflowData.executionHistory.length > 0 && (
            <Badge variant="outline">
              {workflowData.executionHistory.length} execution
              {workflowData.executionHistory.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Prompt Context Card */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold">{prompt.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {prompt.description || 'No description provided'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Model: gpt-3.5-turbo</span>
              <span>•</span>
              <span>
                {Array.isArray(prompt.variables) ? prompt.variables.length : 0}{' '}
                variables
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Workflow Content */}
      <div className="grid gap-4">
        {/* Configuration and Execution Phase */}
        {(workflowState === 'configure' ||
          workflowState === 'executing' ||
          workflowState === 'retry') && (
          <Card>
            <CardContent className="p-6">
              <EnhancedExecutionPanel
                prompt={prompt}
                onExecutionStart={handleExecutionStart}
                onExecutionComplete={handleExecutionComplete}
              />
            </CardContent>
          </Card>
        )}

        {/* Results Phase */}
        {workflowState === 'results' && workflowData.currentExecution && (
          <div className="space-y-4">
            <AIResultsViewer
              execution={workflowData.currentExecution}
              onRetry={handleRetry}
              onSave={handleSaveToHistory}
              onShare={handleShareExecution}
            />

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={handleModifyAndRetry}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Modify & Retry
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => setWorkflowState('configure')}
                  >
                    New Execution
                  </Button>

                  {onBack && (
                    <Button
                      variant="ghost"
                      onClick={onBack}
                      className="ml-auto"
                    >
                      Back to Prompts
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Execution History Sidebar */}
        {workflowData.executionHistory.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">Recent Executions</h3>
              <div className="space-y-2">
                {workflowData.executionHistory.slice(0, 5).map(execution => (
                  <div
                    key={execution.executionId}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                      workflowData.currentExecution?.executionId ===
                      execution.executionId
                        ? 'bg-muted border-primary'
                        : ''
                    }`}
                    onClick={() => {
                      setWorkflowData(prev => ({
                        ...prev,
                        currentExecution: execution,
                      }));
                      setWorkflowState('results');
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              execution.status === 'COMPLETED'
                                ? 'default'
                                : 'destructive'
                            }
                            className="text-xs"
                          >
                            {execution.status}
                          </Badge>
                          <span className="text-sm font-medium">
                            {execution.executionId.slice(-8)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {execution.timestamp
                            ? new Date(execution.timestamp).toLocaleString()
                            : 'Unknown time'}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {execution.tokenUsage.totalTokens} tokens
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
