'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState } from '@/components/ui/loading-spinner';
import { AIResultsViewer } from '@/components/execution/ai-results-viewer';
import {
  executionService,
  ExecutionServiceError,
} from '@/lib/services/execution-service';
import {
  useExecutionWebSocket,
  type ExecutionStatusUpdate,
} from '@/lib/services/execution-websocket';
import type { ExecutionResult } from '@/components/execution/ai-results-viewer';

// Using ExecutionResult type from AI Results Viewer - no additional types needed

export default function ExecutionDetailPage(): JSX.Element {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const executionId = params.id as string;

  const [execution, setExecution] = useState<ExecutionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WebSocket integration for real-time updates
  const { isConnected, subscribe } = useExecutionWebSocket();

  // Fetch execution details using the service
  const fetchExecution = React.useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const executionResult = await executionService.getExecutionById(
        executionId,
        user.id
      );
      setExecution(executionResult);
    } catch (err) {
      if (err instanceof ExecutionServiceError) {
        setError(`${err.message} (${err.code})`);
      } else {
        setError(
          err instanceof Error ? err.message : 'Failed to load execution'
        );
      }
      console.error('Error fetching execution:', err);
    } finally {
      setLoading(false);
    }
  }, [executionId, user]);

  // Handle retry execution using the service
  const handleRetry = async (): Promise<void> => {
    if (!execution || !user) return;

    try {
      const result = await executionService.retryExecution(
        executionId,
        user.id
      );

      // Navigate to the new execution
      router.push(`/executions/${result.newExecutionId}`);
    } catch (err) {
      if (err instanceof ExecutionServiceError) {
        alert(`Failed to retry execution: ${err.message}`);
      } else {
        alert('Failed to retry execution');
      }
      console.error('Error retrying execution:', err);
    }
  };

  // Handle save to history (for demo purposes)
  const handleSave = (_executionResult: ExecutionResult): void => {
    // In a real implementation, this would save to user's execution history
    // For now, we just track that the save was requested
    // In a real implementation, this would save to user's execution history
  };

  // Handle share execution
  const handleShare = async (
    executionResult: ExecutionResult
  ): Promise<void> => {
    const shareData = {
      title: `AI Execution Result - ${executionResult.executionId}`,
      text: `Check out this AI execution result: ${executionResult.output?.substring(0, 100)}...`,
      url: `${window.location.origin}/executions/${executionResult.executionId}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Sharing cancelled or failed - no need to log
      }
    } else {
      // Fallback: copy URL to clipboard
      await navigator.clipboard.writeText(shareData.url);
      alert('Execution URL copied to clipboard!');
    }
  };

  // Authentication and data loading
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/?auth=required');
      return;
    }

    if (user && executionId) {
      fetchExecution();
    }
  }, [user, isLoading, executionId, router, fetchExecution]);

  // Subscribe to real-time updates for this execution
  useEffect(() => {
    if (!execution || !executionId) return;

    // Only subscribe for active executions that might change
    if (execution.status === 'PENDING' || execution.status === 'RUNNING') {
      const unsubscribe = subscribe(
        executionId,
        (update: ExecutionStatusUpdate) => {
          setExecution(prev => {
            if (!prev) return prev;

            // Update execution with real-time data
            return {
              ...prev,
              status: update.status,
              tokenUsage: update.tokenUsage
                ? {
                    inputTokens: update.tokenUsage.input,
                    outputTokens: update.tokenUsage.output,
                    totalTokens: update.tokenUsage.total,
                  }
                : prev.tokenUsage,
              executionTime: update.latencyMs || prev.executionTime,
              costUsd: update.costUsd || prev.costUsd,
              timestamp: update.timestamp || prev.timestamp,
            };
          });

          // If execution completed, refresh full data to get output
          if (update.status === 'COMPLETED' || update.status === 'FAILED') {
            // Small delay to ensure database is updated
            setTimeout(() => {
              fetchExecution();
            }, 1000);
          }
        }
      );

      return unsubscribe;
    }
  }, [execution, executionId, subscribe, fetchExecution]);

  if (isLoading) {
    return <LoadingState message="Loading execution details..." />;
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Redirecting to login...</div>
      </div>
    );
  }

  if (loading) {
    return <LoadingState message="Loading execution details..." />;
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState message={error} onRetry={fetchExecution} />
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          message="Execution not found"
          onRetry={() => router.push('/executions')}
        />
      </div>
    );
  }

  // execution is already in ExecutionResult format from the service

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Breadcrumbs and Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
          >
            Dashboard
          </Button>
          <span>/</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/executions')}
          >
            Executions
          </Button>
          <span>/</span>
          <span>{executionId.slice(-8)}</span>
        </div>

        {/* Real-time connection indicator */}
        {(execution?.status === 'PENDING' ||
          execution?.status === 'RUNNING') && (
          <div className="flex items-center gap-2 text-xs">
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className="text-muted-foreground">
              {isConnected
                ? 'Live updates active'
                : 'Live updates disconnected'}
            </span>
          </div>
        )}
      </div>

      {/* Main AI Results Viewer */}
      <AIResultsViewer
        execution={execution}
        onRetry={handleRetry}
        onSave={handleSave}
        onShare={handleShare}
      />

      {/* Additional Actions */}
      <div className="flex items-center gap-3 pt-4 border-t">
        <Button variant="outline" onClick={() => router.push('/executions')}>
          ← Back to Executions
        </Button>

        <Button
          variant="outline"
          onClick={() =>
            router.push(`/prompts/${execution.executionData?.prompt?.id || ''}`)
          }
          disabled={!execution.executionData?.prompt?.id}
        >
          View Prompt Details
        </Button>

        {execution.status === 'FAILED' && (
          <Button onClick={handleRetry}>Retry Execution</Button>
        )}

        <div className="ml-auto">
          <Button variant="outline" onClick={() => router.push('/prompts')}>
            Browse Prompts
          </Button>
        </div>
      </div>

      {/* Debug Information (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            Debug Information
          </summary>
          <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto">
            {JSON.stringify(execution, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
