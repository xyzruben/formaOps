'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  LoadingSpinner,
  LoadingState,
  ErrorState,
} from '@/components/ui/loading-spinner';
import { formatDate } from '@/lib/utils';
import {
  getExecutions,
  ExecutionAPIError,
  type ExecutionFilters,
  type ExecutionListResponse,
} from '@/lib/api/execution-client';
// ExecutionResult type imported through the API client

// Using types from the execution service

export default function ExecutionsPage(): JSX.Element {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [executionData, setExecutionData] =
    useState<ExecutionListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'all' | 'running' | 'completed' | 'failed'
  >('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch executions with optional filtering using the service
  const fetchExecutions = React.useCallback(
    async (status?: string, page: number = 1): Promise<void> => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        const filters: ExecutionFilters = {
          page,
          limit: 20,
        };

        if (status && status !== 'all') {
          filters.status = status.toUpperCase() as
            | 'PENDING'
            | 'RUNNING'
            | 'COMPLETED'
            | 'FAILED'
            | 'CANCELLED';
        }

        const data = await getExecutions(filters);
        setExecutionData(data);
      } catch (err) {
        if (err instanceof ExecutionAPIError) {
          setError(`${err.message} (${err.code || err.statusCode})`);
        } else {
          setError(
            err instanceof Error ? err.message : 'Failed to load executions'
          );
        }
        console.error('Error fetching executions:', err);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // Handle tab change and filtering
  const handleTabChange = (value: string): void => {
    setActiveTab(value as typeof activeTab);
    setCurrentPage(1);
    fetchExecutions(value, 1);
  };

  // Handle pagination
  const handlePageChange = (page: number): void => {
    setCurrentPage(page);
    fetchExecutions(activeTab === 'all' ? undefined : activeTab, page);
  };

  // Convenience getters
  const executions = executionData?.executions || [];
  const pagination = executionData?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  };

  // Get status badge variant
  const getStatusBadgeVariant = (
    status: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'COMPLETED':
        return 'default';
      case 'RUNNING':
      case 'PENDING':
        return 'secondary';
      case 'FAILED':
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Format execution time
  const formatExecutionTime = (executionTime: number | undefined): string => {
    if (!executionTime) return 'N/A';
    if (executionTime < 1000) return `${executionTime}ms`;
    return `${(executionTime / 1000).toFixed(1)}s`;
  };

  // Format cost
  const formatCost = (costUsd: number): string => {
    if (!costUsd) return '$0.000';
    return `$${costUsd.toFixed(6)}`;
  };

  // Handle execution click - navigate to detail page
  const handleExecutionClick = (executionId: string | undefined): void => {
    if (!executionId) return;
    router.push(`/executions/${executionId}`);
  };

  // Authentication check
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/?auth=required');
      return;
    }

    if (user) {
      fetchExecutions();
    }
  }, [user, isLoading, router, fetchExecutions]);

  if (isLoading) {
    return <LoadingState message="Loading executions..." />;
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Redirecting to login...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              ← Back to Dashboard
            </Button>
          </div>
          <h1 className="text-3xl font-bold">Execution History</h1>
          <p className="text-muted-foreground text-lg">
            View and analyze your AI prompt executions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/prompts')}>
            Browse Prompts
          </Button>
          <Button onClick={() => router.push('/dashboard')}>
            New Execution
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {executions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Executions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pagination.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {executions.length > 0
                  ? Math.round(
                      (executions.filter(e => e.status === 'COMPLETED').length /
                        executions.length) *
                        100
                    )
                  : 0}
                %
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Response Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {executions.filter(e => e.latencyMs).length > 0
                  ? formatExecutionTime(
                      Math.round(
                        executions
                          .filter(e => e.latencyMs)
                          .reduce((acc, e) => acc + (e.latencyMs || 0), 0) /
                          executions.filter(e => e.latencyMs).length
                      )
                    )
                  : 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCost(
                  executions.reduce((acc, e) => acc + (e.costUsd || 0), 0)
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Execution List */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Executions</TabsTrigger>
          <TabsTrigger value="running">Running</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center justify-center">
                  <LoadingSpinner className="mr-2" />
                  Loading executions...
                </div>
              </CardContent>
            </Card>
          ) : error ? (
            <ErrorState
              message={error}
              onRetry={() =>
                fetchExecutions(
                  activeTab === 'all' ? undefined : activeTab,
                  currentPage
                )
              }
            />
          ) : executions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    {activeTab === 'all'
                      ? 'No executions found. Start by running a prompt!'
                      : `No ${activeTab} executions found.`}
                  </p>
                  <Button onClick={() => router.push('/prompts')}>
                    Browse Prompts
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {executions.map(execution => (
                <Card
                  key={execution.executionId}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleExecutionClick(execution.executionId)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      {/* Main execution info */}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={getStatusBadgeVariant(execution.status)}
                          >
                            {execution.status}
                          </Badge>
                          <span className="font-medium">
                            {execution.executionData?.prompt?.name ||
                              'Unknown Prompt'}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ID: {execution.executionId?.slice(-8) || 'N/A'}
                          </span>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {execution.output
                            ? execution.output.substring(0, 120) +
                              (execution.output.length > 120 ? '...' : '')
                            : 'No output available'}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Created:{' '}
                            {execution.timestamp
                              ? formatDate(new Date(execution.timestamp))
                              : 'Unknown'}
                          </span>
                          {execution.executionTime && (
                            <span>
                              Duration:{' '}
                              {formatExecutionTime(execution.executionTime)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="text-right space-y-1 text-sm min-w-[120px]">
                        {execution.executionTime && (
                          <div>
                            <span className="text-muted-foreground">
                              Time:{' '}
                            </span>
                            {formatExecutionTime(execution.executionTime)}
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">
                            Tokens:{' '}
                          </span>
                          {(
                            execution.tokenUsage?.totalTokens ?? 0
                          ).toLocaleString()}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Cost: </span>
                          {formatCost(execution.costUsd)}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {execution.validationStatus}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>

                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {pagination.totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
