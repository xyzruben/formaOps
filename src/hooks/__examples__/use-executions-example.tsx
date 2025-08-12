'use client';

import React, { useState } from 'react';
import { useExecutions } from '../use-executions';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';

/**
 * Example component demonstrating the enhanced useExecutions hook
 * This shows how to use all the new features from Task 14
 */
export function UseExecutionsExample(): JSX.Element {
  const [promptId, setPromptId] = useState('');
  const [userInput, setUserInput] = useState('{"message": "Hello, World!"}');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Example 1: Basic usage with auto-refresh
  const {
    executions,
    loading,
    error,
    refetch,
    executePrompt,
    retryExecution,
    getExecutionById,
  } = useExecutions({
    promptId: promptId || undefined,
    autoRefresh,
    refreshInterval: 5000, // 5 seconds
    page: 1,
    limit: 10,
  });

  // Example 2: Execute a prompt with custom options
  const handleExecutePrompt = async (): Promise<void> => {
    if (!promptId) {
      alert('Please enter a prompt ID');
      return;
    }

    try {
      const inputs = JSON.parse(userInput);
      const result = await executePrompt(promptId, inputs, {
        model: 'gpt-3.5-turbo',
        maxTokens: 150,
        temperature: 0.7,
      });
      
      console.log('Execution result:', result);
      alert(`Execution completed! ID: ${result.executionId}`);
    } catch (err) {
      console.error('Execution failed:', err);
      alert(`Execution failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Example 3: Retry a failed execution
  const handleRetryExecution = async (executionId: string): Promise<void> => {
    try {
      await retryExecution(executionId);
      alert(`Execution ${executionId} retried successfully!`);
    } catch (err) {
      console.error('Retry failed:', err);
      alert(`Retry failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Example 4: Get execution details
  const handleGetExecutionDetails = async (executionId: string): Promise<void> => {
    try {
      const execution = await getExecutionById(executionId);
      console.log('Execution details:', execution);
      alert(`Execution details logged to console`);
    } catch (err) {
      console.error('Failed to get execution details:', err);
      alert(`Failed to get details: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading && executions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading executions...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>useExecutions Hook Example</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Prompt ID</label>
              <Input
                placeholder="Enter prompt ID"
                value={promptId}
                onChange={(e) => setPromptId(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Input JSON</label>
              <Input
                placeholder='{"message": "Hello!"}'
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button onClick={handleExecutePrompt} disabled={!promptId}>
              Execute Prompt
            </Button>
            <Button onClick={refetch} variant="outline">
              Refresh
            </Button>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh (5s)
            </label>
          </div>

          {error && (
            <div className="text-red-600 text-sm">
              Error: {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Executions List */}
      <Card>
        <CardHeader>
          <CardTitle>Executions ({executions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {executions.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              No executions found
            </div>
          ) : (
            <div className="space-y-2">
              {executions.map((execution) => (
                <div
                  key={execution.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{execution.id}</span>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          execution.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : execution.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : execution.status === 'RUNNING'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {execution.status}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGetExecutionDetails(execution.id)}
                      >
                        Details
                      </Button>
                      {execution.status === 'FAILED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetryExecution(execution.id)}
                        >
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Prompt: {execution.prompt.name} • 
                    Created: {new Date(execution.createdAt).toLocaleString()}
                    {execution.costUsd && (
                      <> • Cost: ${execution.costUsd.toFixed(4)}</>
                    )}
                  </div>
                  
                  {execution.output && (
                    <div className="text-sm">
                      <strong>Output:</strong> {execution.output.slice(0, 100)}
                      {execution.output.length > 100 && '...'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}