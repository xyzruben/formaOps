'use client';

import React, { useState } from 'react';
import { useExecutions } from '../../hooks/use-executions';
import { ExecutionHistory } from './execution-history';
import { ResultsViewer } from './results-viewer';
import { Card, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { LoadingState, ErrorState } from '../ui/loading-spinner';
import type { ExecutionWithDetails } from '../../lib/database/queries';

interface ExecutionViewerProps {
  userId: string;
  promptId?: string;
}

export function ExecutionViewer({
  userId,
  promptId,
}: ExecutionViewerProps): JSX.Element {
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(
    null
  );
  const [selectedExecution, setSelectedExecution] =
    useState<ExecutionWithDetails | null>(null);
  const [loadingExecution, setLoadingExecution] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const { getExecutionById, retryExecution } = useExecutions();

  const handleExecutionSelect = async (executionId: string): Promise<void> => {
    try {
      setLoadingExecution(true);
      setExecutionError(null);
      setSelectedExecutionId(executionId);

      const execution = await getExecutionById(executionId);
      setSelectedExecution(execution);
    } catch (error) {
      setExecutionError(
        error instanceof Error ? error.message : 'Failed to load execution'
      );
      setSelectedExecution(null);
    } finally {
      setLoadingExecution(false);
    }
  };

  const handleRetry = async (): Promise<void> => {
    if (!selectedExecutionId) return;

    try {
      await retryExecution(selectedExecutionId);
      // Refresh the selected execution after retry
      await handleExecutionSelect(selectedExecutionId);
    } catch (error) {
      setExecutionError(
        error instanceof Error ? error.message : 'Failed to retry execution'
      );
    }
  };

  const handleBack = (): void => {
    setSelectedExecutionId(null);
    setSelectedExecution(null);
    setExecutionError(null);
  };

  if (selectedExecutionId) {
    return (
      <div className="space-y-6">
        {/* Back Navigation */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Execution Details</CardTitle>
              <Button variant="outline" onClick={handleBack}>
                ← Back to History
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Execution Details */}
        {loadingExecution && (
          <LoadingState message="Loading execution details..." />
        )}

        {executionError && (
          <ErrorState
            message={executionError}
            onRetry={() => handleExecutionSelect(selectedExecutionId)}
          />
        )}

        {selectedExecution && !loadingExecution && (
          <ResultsViewer execution={selectedExecution} onRetry={handleRetry} />
        )}
      </div>
    );
  }

  return (
    <ExecutionHistory
      userId={userId}
      promptId={promptId}
      onExecutionSelect={handleExecutionSelect}
    />
  );
}
