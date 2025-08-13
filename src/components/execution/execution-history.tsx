'use client';

import React, { useState } from 'react';
import { formatDate } from '../../lib/utils';
import { useExecutions } from '../../hooks/use-executions';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
// Note: Using a simple select for now to avoid Radix dependency
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { LoadingState, ErrorState, EmptyState } from '../ui/loading-spinner';
import type { ExecutionStatus } from '../../types/database';

interface ExecutionHistoryProps {
  promptId?: string;
  userId: string;
  onExecutionSelect?: (executionId: string) => void;
}

interface ExecutionListItem {
  id: string;
  status: ExecutionStatus;
  createdAt: Date;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
  costUsd?: number;
  hasError: boolean;
  prompt: {
    id: string;
    name: string;
  };
  validationStatus: 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED';
  latencyMs?: number;
}

export function ExecutionHistory({ 
  promptId, 
  userId, 
  onExecutionSelect 
}: ExecutionHistoryProps): JSX.Element {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ExecutionStatus | undefined>(undefined);
  const [dateFilter, setDateFilter] = useState<{ from?: string; to?: string }>({});
  const limit = 20;

  const { 
    executions, 
    pagination, 
    loading, 
    error, 
    refetch, 
    retryExecution 
  } = useExecutions({
    promptId,
    status: statusFilter,
    page,
    limit,
    from: dateFilter.from,
    to: dateFilter.to,
  });

  const handleRetry = async (executionId: string): Promise<void> => {
    try {
      await retryExecution(executionId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to retry execution');
    }
  };

  const handleRowClick = (executionId: string): void => {
    onExecutionSelect?.(executionId);
  };

  const getStatusBadgeVariant = (status: ExecutionStatus) => {
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
    if (cost === null || cost === undefined) return '-';
    return `$${cost.toFixed(6)}`;
  };

  const formatLatency = (latency: number | null): string => {
    if (latency === null || latency === undefined) return '-';
    return `${latency}ms`;
  };

  const formatTokens = (tokenUsage: any): string => {
    if (!tokenUsage) return '-';
    const total = tokenUsage.total || tokenUsage.totalTokens || 0;
    const input = tokenUsage.input || tokenUsage.inputTokens || 0;
    const output = tokenUsage.output || tokenUsage.outputTokens || 0;
    
    if (total === 0) return '-';
    return `${total} (${input}+${output})`;
  };

  if (loading) {
    return <LoadingState message="Loading execution history..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Execution History</CardTitle>
          <CardDescription>
            View and manage your prompt execution history
            {promptId && ' for this prompt'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={statusFilter === undefined ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(undefined)}
                >
                  All Statuses
                </Button>
                <Button
                  variant={statusFilter === 'COMPLETED' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('COMPLETED')}
                >
                  Completed
                </Button>
                <Button
                  variant={statusFilter === 'FAILED' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('FAILED')}
                >
                  Failed
                </Button>
                <Button
                  variant={statusFilter === 'RUNNING' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('RUNNING')}
                >
                  Running
                </Button>
                <Button
                  variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('PENDING')}
                >
                  Pending
                </Button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Input
                type="date"
                placeholder="From date"
                value={dateFilter.from || ''}
                onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                className="w-40"
              />
              <Input
                type="date"
                placeholder="To date"
                value={dateFilter.to || ''}
                onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                className="w-40"
              />
            </div>
            
            <Button variant="outline" onClick={refetch}>
              Refresh
            </Button>
          </div>

          {/* Execution Table */}
          {executions.length === 0 ? (
            <EmptyState
              title="No executions found"
              description="No executions match your current filters"
              action={
                <Button variant="outline" onClick={() => {
                  setStatusFilter(undefined);
                  setDateFilter({});
                  setPage(1);
                }}>
                  Clear Filters
                </Button>
              }
            />
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      {!promptId && <TableHead>Prompt</TableHead>}
                      <TableHead>Created</TableHead>
                      <TableHead>Tokens</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Latency</TableHead>
                      <TableHead>Validation</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executions.map((execution) => (
                      <TableRow 
                        key={execution.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(execution.id)}
                      >
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(execution.status)}>
                            {execution.status}
                          </Badge>
                        </TableCell>
                        {!promptId && (
                          <TableCell className="font-medium">
                            <div className="max-w-[200px] truncate">
                              {execution.prompt.name}
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="text-sm">
                            {formatDate(execution.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-mono">
                            {formatTokens(execution.tokenUsage)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-mono">
                            {formatCost(execution.costUsd)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-mono">
                            {formatLatency(execution.latencyMs)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getValidationBadgeVariant(execution.validationStatus)}>
                            {execution.validationStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {execution.status === 'FAILED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRetry(execution.id);
                                }}
                              >
                                Retry
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(execution.id);
                              }}
                            >
                              View
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} executions
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                    >
                      Previous
                    </Button>
                    
                    {/* Page numbers */}
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, page - 2) + i;
                        if (pageNum > pagination.totalPages) return null;
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}