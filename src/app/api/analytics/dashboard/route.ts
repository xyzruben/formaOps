import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '../../../../lib/auth/server';
import { getExecutionStats } from '../../../../lib/database/queries';
import { costTracker } from '../../../../lib/monitoring/cost-tracker';
import { handleApiError } from '../../../../lib/utils/error-handler';

const AnalyticsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

interface DashboardAnalytics {
  executions: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  };
  costs: {
    totalUsd: number;
    avgPerExecution: number;
    byModel: Record<string, number>;
  };
  usage: {
    totalTokens: number;
    avgTokensPerExecution: number;
    topPrompts: { name: string; count: number }[];
  };
}

interface CombinedAnalyticsData {
  metrics: {
    totalExecutions: number;
    successRate: number;
    totalCostUsd: number;
    avgCostPerExecution: number;
    executionsToday: number;
    mostUsedPrompt: string;
  };
  costMetrics: {
    totalCostUsd: number;
    todayCostUsd: number;
    avgCostPerExecution: number;
    tokenUsage: {
      totalInput: number;
      totalOutput: number;
      totalTokens: number;
    };
    modelBreakdown: Record<
      string,
      {
        executions: number;
        costUsd: number;
        inputTokens: number;
        outputTokens: number;
      }
    >;
    dailyTrend: Array<{
      date: string;
      executions: number;
      costUsd: number;
    }>;
  };
  topPrompts: Array<{
    promptId: string;
    promptName: string;
    executions: number;
    totalCost: number;
    avgCost: number;
    totalTokens: number;
  }>;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const query = AnalyticsQuerySchema.parse({
      from: searchParams.get('from'),
      to: searchParams.get('to'),
    });

    // Validate date parameters
    let dateRange: { from: Date; to: Date } | undefined;

    if (query.from || query.to) {
      const fromDate = query.from
        ? new Date(query.from)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
      const toDate = query.to ? new Date(query.to) : new Date();

      // Validate dates are valid
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return NextResponse.json(
          {
            error: 'Invalid date format. Use ISO date strings.',
            code: 'INVALID_DATE_FORMAT',
          },
          { status: 400 }
        );
      }

      // Validate date range is reasonable (not more than 1 year)
      const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
      if (toDate.getTime() - fromDate.getTime() > maxRange) {
        return NextResponse.json(
          {
            error: 'Date range cannot exceed 1 year',
            code: 'DATE_RANGE_TOO_LARGE',
          },
          { status: 400 }
        );
      }

      // Validate from date is not in the future
      if (fromDate > new Date()) {
        return NextResponse.json(
          {
            error: 'From date cannot be in the future',
            code: 'INVALID_DATE_RANGE',
          },
          { status: 400 }
        );
      }

      // Validate from date is before to date
      if (fromDate > toDate) {
        return NextResponse.json(
          {
            error: 'From date must be before to date',
            code: 'INVALID_DATE_RANGE',
          },
          { status: 400 }
        );
      }

      dateRange = { from: fromDate, to: toDate };
    }

    // Calculate the number of days for the cost tracker
    const days = dateRange
      ? Math.ceil(
          (dateRange.to.getTime() - dateRange.from.getTime()) /
            (24 * 60 * 60 * 1000)
        )
      : 30; // Default to 30 days

    // Fetch data in parallel for better performance
    const [executionStats, costMetrics, topPrompts] = await Promise.all([
      getExecutionStats(user.id, dateRange),
      costTracker.getUserCostMetrics(user.id, days),
      costTracker.getTopExpensivePrompts(user.id, 10),
    ]);

    // Calculate today's executions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRange = { from: today, to: new Date() };
    const todayStats = await getExecutionStats(user.id, todayRange);

    // Find most used prompt from top prompts
    const mostUsedPrompt =
      topPrompts.length > 0
        ? topPrompts.reduce((prev, current) =>
            prev.executions > current.executions ? prev : current
          ).promptName
        : 'No prompts found';

    // Calculate model breakdown by cost (simplified from the detailed breakdown)
    const modelCostBreakdown: Record<string, number> = {};
    Object.entries(costMetrics.modelBreakdown).forEach(([model, stats]) => {
      modelCostBreakdown[model] = stats.costUsd;
    });

    // Transform top prompts to match the expected format for usage
    const topPromptsForUsage = topPrompts.slice(0, 5).map(prompt => ({
      name: prompt.promptName,
      count: prompt.executions,
    }));

    // Build the structured analytics response
    const analyticsData: DashboardAnalytics = {
      executions: {
        total: executionStats.total,
        successful: executionStats.completed,
        failed: executionStats.failed,
        successRate: executionStats.successRate / 100, // Convert percentage to decimal
      },
      costs: {
        totalUsd: costMetrics.totalCostUsd,
        avgPerExecution: costMetrics.avgCostPerExecution,
        byModel: modelCostBreakdown,
      },
      usage: {
        totalTokens: costMetrics.tokenUsage.totalTokens,
        avgTokensPerExecution:
          executionStats.total > 0
            ? costMetrics.tokenUsage.totalTokens / executionStats.total
            : 0,
        topPrompts: topPromptsForUsage,
      },
    };

    // Build the combined data for the dashboard component
    const combinedData: CombinedAnalyticsData = {
      metrics: {
        totalExecutions: executionStats.total,
        successRate: executionStats.successRate / 100, // Convert to decimal
        totalCostUsd: costMetrics.totalCostUsd,
        avgCostPerExecution: costMetrics.avgCostPerExecution,
        executionsToday: todayStats.total,
        mostUsedPrompt,
      },
      costMetrics: {
        totalCostUsd: costMetrics.totalCostUsd,
        todayCostUsd: costMetrics.todayCostUsd,
        avgCostPerExecution: costMetrics.avgCostPerExecution,
        tokenUsage: costMetrics.tokenUsage,
        modelBreakdown: costMetrics.modelBreakdown,
        dailyTrend: costMetrics.dailyTrend,
      },
      topPrompts,
    };

    return NextResponse.json({
      success: true,
      data: combinedData,
      analytics: analyticsData, // Also include the structured analytics data
      meta: {
        dateRange: dateRange || {
          from: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          to: new Date(),
        },
        period: `${days} days`,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    const apiError = handleApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
}
