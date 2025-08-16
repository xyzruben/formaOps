'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import {
  LoadingSpinner,
  LoadingState,
  ErrorState,
} from '../ui/loading-spinner';
import { Badge } from '../ui/badge';
import { formatCurrency } from '../../lib/utils';
import type { CostMetrics } from '../../lib/monitoring/cost-tracker';

interface DashboardProps {
  userId: string;
  dateRange?: { from: Date; to: Date };
}

interface DashboardMetrics {
  totalExecutions: number;
  successRate: number;
  totalCostUsd: number;
  avgCostPerExecution: number;
  executionsToday: number;
  mostUsedPrompt: string;
}

interface AnalyticsData {
  metrics: DashboardMetrics;
  costMetrics: CostMetrics;
  topPrompts: Array<{
    promptId: string;
    promptName: string;
    executions: number;
    totalCost: number;
    avgCost: number;
    totalTokens: number;
  }>;
}

interface DateRangeFilter {
  label: string;
  days: number;
}

const DATE_RANGES: DateRangeFilter[] = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

export function SimpleDashboard({
  userId,
  dateRange,
}: DashboardProps): JSX.Element {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<DateRangeFilter>(
    DATE_RANGES[1]
  ); // Default: 30 days
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(
    async (days: number = selectedRange.days): Promise<void> => {
      try {
        setError(null);

        const from = dateRange?.from || startOfDay(subDays(new Date(), days));
        const to = dateRange?.to || endOfDay(new Date());

        const params = new URLSearchParams({
          from: from.toISOString(),
          to: to.toISOString(),
        });

        const response = await fetch(`/api/analytics/dashboard?${params}`, {
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Analytics request failed: ${response.status}`
          );
        }

        const analyticsData = await response.json();

        if (!analyticsData.success) {
          throw new Error(
            analyticsData.message || 'Failed to fetch analytics data'
          );
        }

        setData(analyticsData.data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load analytics';
        setError(message);
        console.error('Analytics fetch error:', err);
      }
    },
    [selectedRange.days, dateRange]
  );

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const handleRangeChange = async (range: DateRangeFilter): Promise<void> => {
    setSelectedRange(range);
    setLoading(true);
    await fetchAnalytics(range.days);
    setLoading(false);
  };

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      setLoading(true);
      await fetchAnalytics();
      setLoading(false);
    };

    loadData();
  }, [userId, dateRange, fetchAnalytics]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercentage = (rate: number): string => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toLocaleString();
  };

  if (loading) {
    return <LoadingState message="Loading analytics dashboard..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={handleRefresh} />;
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Analytics Dashboard</CardTitle>
            <CardDescription>No analytics data available</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { metrics, costMetrics, topPrompts } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">Analytics Dashboard</CardTitle>
              <CardDescription>
                AI execution insights and cost tracking
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Date Range Selector */}
              <div className="flex gap-1">
                {DATE_RANGES.map(range => (
                  <Button
                    key={range.days}
                    variant={
                      selectedRange.days === range.days ? 'default' : 'outline'
                    }
                    size="sm"
                    onClick={() => handleRangeChange(range)}
                    disabled={loading}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Refreshing...
                  </>
                ) : (
                  'Refresh'
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Executions */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">
              Total Executions
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {formatNumber(metrics.totalExecutions)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xs text-muted-foreground">
              {metrics.executionsToday} today
            </div>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Success Rate</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              {formatPercentage(metrics.successRate)}
              <Badge
                variant={
                  metrics.successRate > 0.9
                    ? 'default'
                    : metrics.successRate > 0.7
                      ? 'secondary'
                      : 'destructive'
                }
              >
                {metrics.successRate > 0.9
                  ? 'Excellent'
                  : metrics.successRate > 0.7
                    ? 'Good'
                    : 'Needs Attention'}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Total Cost */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Cost</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {formatCurrency(metrics.totalCostUsd)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xs text-muted-foreground">
              {formatCurrency(costMetrics.todayCostUsd)} today
            </div>
          </CardContent>
        </Card>

        {/* Avg Cost per Execution */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">
              Avg Cost/Execution
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {formatCurrency(metrics.avgCostPerExecution)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Token Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Token Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm text-muted-foreground">Total Tokens</div>
              <div className="text-2xl font-bold">
                {formatTokens(costMetrics.tokenUsage.totalTokens)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Input Tokens</div>
              <div className="text-2xl font-bold">
                {formatTokens(costMetrics.tokenUsage.totalInput)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Output Tokens</div>
              <div className="text-2xl font-bold">
                {formatTokens(costMetrics.tokenUsage.totalOutput)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Breakdown and Top Prompts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Model Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Model Breakdown</CardTitle>
            <CardDescription>Usage and costs by AI model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(costMetrics.modelBreakdown).length > 0 ? (
                Object.entries(costMetrics.modelBreakdown).map(
                  ([model, stats]) => (
                    <div
                      key={model}
                      className="flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{model}</div>
                        <div className="text-xs text-muted-foreground">
                          {stats.executions} executions •{' '}
                          {formatTokens(stats.inputTokens + stats.outputTokens)}{' '}
                          tokens
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {formatCurrency(stats.costUsd)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(stats.costUsd / stats.executions)}
                          /exec
                        </div>
                      </div>
                    </div>
                  )
                )
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No model data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Prompts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Prompts</CardTitle>
            <CardDescription>
              Most used prompts by execution count
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPrompts && topPrompts.length > 0 ? (
                topPrompts.slice(0, 5).map((prompt, index) => (
                  <div
                    key={prompt.promptId}
                    className="flex items-center justify-between"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                        <div className="text-sm font-medium truncate">
                          {prompt.promptName}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {prompt.executions} executions •{' '}
                        {formatTokens(prompt.totalTokens)} tokens
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatCurrency(prompt.totalCost)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(prompt.avgCost)}/exec
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No prompt data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Trend */}
      {costMetrics.dailyTrend && costMetrics.dailyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily Trend</CardTitle>
            <CardDescription>
              Execution volume and costs over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {costMetrics.dailyTrend.map(day => (
                <div
                  key={day.date}
                  className="flex items-center justify-between"
                >
                  <div className="text-sm">
                    {format(new Date(day.date), 'MMM dd')}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      {day.executions} executions
                    </div>
                    <div className="text-sm font-medium">
                      {formatCurrency(day.costUsd)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Most Used Prompt Summary */}
      {metrics.mostUsedPrompt && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Most Used Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <Badge variant="default" className="text-sm">
                {metrics.mostUsedPrompt}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
