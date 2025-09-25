'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  DollarSign,
  Timer,
  Zap,
  TrendingUp,
  Calculator,
  BarChart3,
} from 'lucide-react';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface MetricsDisplayProps {
  tokenUsage: TokenUsage;
  cost: number;
  executionTime?: number;
  model: string;
  className?: string;
  // Preference-based visibility options
  showTokenMetrics?: boolean;
  showCostMetrics?: boolean;
  showLatencyMetrics?: boolean;
}

// Model pricing data (per 1K tokens) - in a real app, this would come from an API or config
const MODEL_PRICING = {
  'gpt-3.5-turbo': {
    input: 0.0015,
    output: 0.002,
    name: 'GPT-3.5 Turbo',
  },
  'gpt-4': {
    input: 0.03,
    output: 0.06,
    name: 'GPT-4',
  },
  'gpt-4-turbo': {
    input: 0.01,
    output: 0.03,
    name: 'GPT-4 Turbo',
  },
} as const;

// Utility functions for calculations and formatting
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  }).format(amount);
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

const formatDuration = (ms?: number): string => {
  if (!ms) return 'Unknown';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

const calculateTokensPerSecond = (
  totalTokens: number,
  executionTime?: number
): number => {
  if (!executionTime || executionTime === 0) return 0;
  return totalTokens / (executionTime / 1000);
};

const calculateCostBreakdown = (tokenUsage: TokenUsage, model: string) => {
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING];
  if (!pricing) {
    return {
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
    };
  }

  const inputCost = (tokenUsage.inputTokens / 1000) * pricing.input;
  const outputCost = (tokenUsage.outputTokens / 1000) * pricing.output;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
};

const getEfficiencyRating = (
  inputRatio: number
): {
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  color: string;
  description: string;
} => {
  if (inputRatio >= 0.8) {
    return {
      rating: 'Poor',
      color: 'text-red-600',
      description: 'High input-to-output ratio suggests verbose prompting',
    };
  }
  if (inputRatio >= 0.6) {
    return {
      rating: 'Fair',
      color: 'text-yellow-600',
      description: 'Moderate efficiency - consider optimizing prompts',
    };
  }
  if (inputRatio >= 0.4) {
    return {
      rating: 'Good',
      color: 'text-blue-600',
      description: 'Good balance between input and output',
    };
  }
  return {
    rating: 'Excellent',
    color: 'text-green-600',
    description: 'Excellent efficiency - concise input, rich output',
  };
};

export function MetricsDisplay({
  tokenUsage,
  cost,
  executionTime,
  model,
  className = '',
  showTokenMetrics = true,
  showCostMetrics = true,
  showLatencyMetrics = true,
}: MetricsDisplayProps): JSX.Element {
  const costBreakdown = calculateCostBreakdown(tokenUsage, model);
  const tokensPerSecond = calculateTokensPerSecond(
    tokenUsage.totalTokens,
    executionTime
  );
  const inputRatio = tokenUsage.inputTokens / tokenUsage.totalTokens;
  const outputRatio = tokenUsage.outputTokens / tokenUsage.totalTokens;
  const efficiency = getEfficiencyRating(inputRatio);

  return (
    <div className={`space-y-4 ${className}`} data-testid="metrics-display">
      {/* Token Usage Visualization */}
      {showTokenMetrics && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5" />
              Token Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Token breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Input tokens</span>
                  <span className="font-medium">
                    {formatNumber(tokenUsage.inputTokens)}
                  </span>
                </div>
                <Progress
                  value={inputRatio * 100}
                  className="h-2"
                  aria-label={`Input tokens: ${tokenUsage.inputTokens}`}
                />
                <p className="text-xs text-muted-foreground">
                  {(inputRatio * 100).toFixed(1)}% of total
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Output tokens</span>
                  <span className="font-medium">
                    {formatNumber(tokenUsage.outputTokens)}
                  </span>
                </div>
                <Progress
                  value={outputRatio * 100}
                  className="h-2"
                  aria-label={`Output tokens: ${tokenUsage.outputTokens}`}
                />
                <p className="text-xs text-muted-foreground">
                  {(outputRatio * 100).toFixed(1)}% of total
                </p>
              </div>
            </div>

            {/* Total tokens */}
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="font-medium">Total Tokens</span>
              <Badge variant="secondary" className="text-sm">
                {formatNumber(tokenUsage.totalTokens)}
              </Badge>
            </div>

            {/* Efficiency rating */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium">Efficiency</span>
                  <Badge variant="outline" className={efficiency.color}>
                    {efficiency.rating}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {efficiency.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Analysis */}
      {showCostMetrics && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5" />
              Cost Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Model information */}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Model</span>
              <Badge variant="outline">
                {MODEL_PRICING[model as keyof typeof MODEL_PRICING]?.name ||
                  model}
              </Badge>
            </div>

            {/* Cost breakdown */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Input cost</span>
                <span className="font-medium">
                  {formatCurrency(costBreakdown.inputCost)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Output cost</span>
                <span className="font-medium">
                  {formatCurrency(costBreakdown.outputCost)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-medium">Total Cost</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(cost)}
                </span>
              </div>
            </div>

            {/* Cost efficiency metrics */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Per Token
                  </span>
                </div>
                <p className="text-sm font-medium">
                  {formatCurrency(cost / tokenUsage.totalTokens)}
                </p>
              </div>

              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Per 1K Tokens
                  </span>
                </div>
                <p className="text-sm font-medium">
                  {formatCurrency((cost / tokenUsage.totalTokens) * 1000)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      {showLatencyMetrics && executionTime && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Timer className="h-5 w-5" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Timer className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">
                  Execution Time
                </p>
                <p className="text-xl font-bold">
                  {formatDuration(executionTime)}
                </p>
              </div>

              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Zap className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">Throughput</p>
                <p className="text-xl font-bold">
                  {tokensPerSecond > 0
                    ? `${tokensPerSecond.toFixed(1)} t/s`
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* Performance insights */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium text-sm">
                  Performance Insights
                </span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                {executionTime < 1000 && (
                  <p>
                    ⚡ Very fast response time - excellent for interactive use
                  </p>
                )}
                {executionTime >= 1000 && executionTime < 5000 && (
                  <p>✅ Good response time for this output complexity</p>
                )}
                {executionTime >= 5000 && (
                  <p>
                    ⏰ Slower response - consider breaking into smaller requests
                  </p>
                )}
                {tokensPerSecond > 100 && (
                  <p>🚀 High throughput - efficient token generation</p>
                )}
                {tokensPerSecond > 0 && tokensPerSecond <= 20 && (
                  <p>🐌 Low throughput - may indicate complex reasoning task</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {formatNumber(tokenUsage.totalTokens)}
              </p>
              <p className="text-xs text-muted-foreground">Total Tokens</p>
            </div>

            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(cost).replace('$', '$')}
              </p>
              <p className="text-xs text-muted-foreground">Total Cost</p>
            </div>

            {executionTime && (
              <>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {formatDuration(executionTime)}
                  </p>
                  <p className="text-xs text-muted-foreground">Duration</p>
                </div>

                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {tokensPerSecond > 0 ? tokensPerSecond.toFixed(0) : '0'}
                  </p>
                  <p className="text-xs text-muted-foreground">Tokens/sec</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
