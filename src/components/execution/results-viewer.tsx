'use client';

import React, { useState } from 'react';
import { formatDate } from '../../lib/utils';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { LoadingSpinner } from '../ui/loading-spinner';
import type { ExecutionWithDetails } from '../../lib/database/queries';

interface ResultsViewerProps {
  execution: ExecutionWithDetails;
  onRetry?: () => void;
}

export function ResultsViewer({ execution, onRetry }: ResultsViewerProps): JSX.Element {
  const [isRetrying, setIsRetrying] = useState(false);
  const [copyStatus, setCopyStatus] = useState<{ [key: string]: boolean }>({});

  const handleRetry = async (): Promise<void> => {
    if (!onRetry) return;
    
    try {
      setIsRetrying(true);
      await onRetry();
    } catch (error) {
      // Error handling is done by parent component
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCopy = async (text: string, key: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopyStatus(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (error) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      
      setCopyStatus(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopyStatus(prev => ({ ...prev, [key]: false }));
      }, 2000);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'default';
      case 'FAILED':
        return 'destructive';
      case 'RUNNING':
        return 'secondary';
      case 'PENDING':
        return 'outline';
      case 'CANCELLED':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getValidationBadgeVariant = (status: string) => {
    switch (status) {
      case 'PASSED':
        return 'default';
      case 'FAILED':
        return 'destructive';
      case 'PENDING':
        return 'secondary';
      case 'SKIPPED':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatCost = (cost: number | null): string => {
    if (cost === null || cost === undefined) return 'N/A';
    return `$${cost.toFixed(6)}`;
  };

  const formatLatency = (latency: number | null): string => {
    if (latency === null || latency === undefined) return 'N/A';
    if (latency < 1000) return `${latency}ms`;
    return `${(latency / 1000).toFixed(2)}s`;
  };

  const formatTokens = (tokenUsage: any): { display: string; breakdown: string } => {
    if (!tokenUsage) return { display: 'N/A', breakdown: 'No token information available' };
    
    const total = tokenUsage.total || tokenUsage.totalTokens || 0;
    const input = tokenUsage.input || tokenUsage.inputTokens || 0;
    const output = tokenUsage.output || tokenUsage.outputTokens || 0;
    
    if (total === 0) return { display: 'N/A', breakdown: 'No tokens used' };
    
    return {
      display: total.toLocaleString(),
      breakdown: `${input.toLocaleString()} input + ${output.toLocaleString()} output tokens`
    };
  };

  const formatInputs = (inputs: any): string => {
    if (!inputs || typeof inputs !== 'object') return JSON.stringify(inputs, null, 2);
    
    try {
      return JSON.stringify(inputs, null, 2);
    } catch {
      return String(inputs);
    }
  };

  const isJsonString = (str: string): boolean => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  };

  const formatOutput = (output: string | null): { formatted: string; isJson: boolean } => {
    if (!output) return { formatted: 'No output generated', isJson: false };
    
    if (isJsonString(output)) {
      try {
        const parsed = JSON.parse(output);
        return {
          formatted: JSON.stringify(parsed, null, 2),
          isJson: true
        };
      } catch {
        return { formatted: output, isJson: false };
      }
    }
    
    return { formatted: output, isJson: false };
  };

  const getDuration = (): string => {
    if (!execution.startedAt || !execution.completedAt) return 'N/A';
    
    const start = new Date(execution.startedAt).getTime();
    const end = new Date(execution.completedAt).getTime();
    const duration = end - start;
    
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const tokenInfo = formatTokens(execution.tokenUsage);
  const outputInfo = formatOutput(execution.output);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                Execution Result
                <Badge variant={getStatusBadgeVariant(execution.status)}>
                  {execution.status}
                </Badge>
              </CardTitle>
              <CardDescription>
                {execution.prompt.name} • {formatDate(execution.createdAt)}
              </CardDescription>
            </div>
            {execution.status === 'FAILED' && onRetry && (
              <Button 
                onClick={handleRetry} 
                disabled={isRetrying}
                variant="outline"
              >
                {isRetrying ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Retrying...
                  </>
                ) : (
                  'Retry Execution'
                )}
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Cost</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {formatCost(execution.costUsd)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Tokens</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {tokenInfo.display}
            </CardTitle>
            <CardDescription className="text-xs">
              {tokenInfo.breakdown}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Latency</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {formatLatency(execution.latencyMs)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Validation</CardDescription>
            <CardTitle className="text-lg">
              <Badge variant={getValidationBadgeVariant(execution.validationStatus)}>
                {execution.validationStatus}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Execution Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Inputs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Input Variables</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(formatInputs(execution.inputs), 'inputs')}
              >
                {copyStatus.inputs ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-md text-sm overflow-auto max-h-96">
                <code>{formatInputs(execution.inputs)}</code>
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Execution Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Execution Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created:</span>
              <span>{formatDate(execution.createdAt)}</span>
            </div>
            {execution.startedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Started:</span>
                <span>{formatDate(execution.startedAt)}</span>
              </div>
            )}
            {execution.completedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completed:</span>
                <span>{formatDate(execution.completedAt)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-medium">
              <span className="text-muted-foreground">Duration:</span>
              <span>{getDuration()}</span>
            </div>
            {execution.tokenUsage?.model && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Model:</span>
                <span className="font-mono">{execution.tokenUsage.model}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Output */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Output
              {outputInfo.isJson && (
                <Badge variant="outline" className="ml-2">JSON</Badge>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(execution.output || '', 'output')}
              disabled={!execution.output}
            >
              {copyStatus.output ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="bg-muted p-4 rounded-md text-sm overflow-auto max-h-96 whitespace-pre-wrap">
              <code>{outputInfo.formatted}</code>
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      {execution.logs && execution.logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Execution Logs</CardTitle>
            <CardDescription>
              {execution.logs.length} log entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-auto">
              {execution.logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-md text-sm border-l-4 ${
                    log.level === 'ERROR' ? 'border-destructive bg-destructive/5' :
                    log.level === 'WARN' ? 'border-yellow-500 bg-yellow-50' :
                    log.level === 'INFO' ? 'border-blue-500 bg-blue-50' :
                    'border-muted bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge 
                      variant={
                        log.level === 'ERROR' ? 'destructive' :
                        log.level === 'WARN' ? 'secondary' :
                        'outline'
                      }
                      className="text-xs"
                    >
                      {log.level}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(log.timestamp)}
                    </span>
                  </div>
                  <p className="font-mono whitespace-pre-wrap">{log.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}