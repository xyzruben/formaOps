import { prisma } from '../database/client';
import { Prisma } from '@prisma/client';
import { openAIConfig } from '../config/openai';
import type { TokenUsage } from '../../types/database';

export interface CostMetrics {
  totalCostUsd: number;
  todayCostUsd: number;
  avgCostPerExecution: number;
  tokenUsage: {
    totalInput: number;
    totalOutput: number;
    totalTokens: number;
  };
  modelBreakdown: Record<string, {
    executions: number;
    costUsd: number;
    inputTokens: number;
    outputTokens: number;
  }>;
  dailyTrend: Array<{
    date: string;
    executions: number;
    costUsd: number;
  }>;
}

export interface BudgetAlert {
  type: 'daily' | 'monthly' | 'execution';
  threshold: number;
  current: number;
  percentage: number;
  message: string;
}

export interface TokenCosts {
  inputCostPer1k: number;
  outputCostPer1k: number;
  model: string;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface CostSummary {
  totalCost: number;
  totalExecutions: number;
  avgCostPerExecution: number;
  modelBreakdown: Record<string, {
    executions: number;
    costUsd: number;
    inputTokens: number;
    outputTokens: number;
  }>;
  dateRange: DateRange;
}

export class CostTracker {
  /**
   * Get model costs from configuration
   * Falls back to hardcoded values if config is not available
   */
  private getConfiguredModelCosts(): Record<string, { input: number; output: number }> {
    try {
      // Try to get costs from configuration
      const config = openAIConfig.getConfig();
      return config.costConfig;
    } catch (error) {
      // Fallback to hardcoded costs if config fails
      console.warn('Failed to load cost configuration, using fallback values:', error);
      return {
        'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
      };
    }
  }

  public calculateExecutionCost(tokenUsage: TokenUsage): number {
    const modelCosts = this.getConfiguredModelCosts();
    const costs = modelCosts[tokenUsage.model || 'gpt-3.5-turbo'] || modelCosts['gpt-3.5-turbo'];
    
    return (
      (tokenUsage.input * costs.input / 1000) +
      (tokenUsage.output * costs.output / 1000)
    );
  }

  // New methods for Task 5
  public calculateOpenAICost(tokens: { inputTokens: number; outputTokens: number; totalTokens: number }, model: string): number {
    const modelCosts = this.getConfiguredModelCosts();
    const costs = modelCosts[model] || modelCosts['gpt-3.5-turbo'];
    
    return (
      (tokens.inputTokens * costs.input / 1000) +
      (tokens.outputTokens * costs.output / 1000)
    );
  }

  public async trackExecution(executionId: string, cost: number, tokens: { inputTokens: number; outputTokens: number; totalTokens: number }): Promise<void> {
    // Update the execution record with cost information
    await prisma.execution.update({
      where: { id: executionId },
      data: {
        costUsd: cost,
        tokenUsage: {
          input: tokens.inputTokens,
          output: tokens.outputTokens,
          total: tokens.totalTokens,
        },
      },
    });

    // Create execution result record for detailed tracking
    await prisma.executionResult.create({
      data: {
        executionId,
        rawOutput: '', // This will be filled by the execution endpoint
        tokenUsage: {
          inputTokens: tokens.inputTokens,
          outputTokens: tokens.outputTokens,
          totalTokens: tokens.totalTokens,
        },
        costUsd: cost,
      },
    });
  }

  public async getExecutionCosts(userId: string, dateRange?: DateRange): Promise<CostSummary> {
    const fromDate = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
    const toDate = dateRange?.to || new Date();

    // Get executions within date range
    const executions = await prisma.execution.findMany({
      where: {
        userId,
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
        costUsd: { not: null },
      },
      select: {
        id: true,
        costUsd: true,
        tokenUsage: true,
        createdAt: true,
      },
    });

    // Calculate totals
    const totalCost = executions.reduce((sum, exec) => sum + (exec.costUsd?.toNumber() || 0), 0);
    const totalExecutions = executions.length;
    const avgCostPerExecution = totalExecutions > 0 ? totalCost / totalExecutions : 0;

    // Group by model for breakdown
    const modelBreakdown: Record<string, any> = {};
    
    for (const exec of executions) {
      const tokenData = exec.tokenUsage as any;
      const model = tokenData?.model || 'unknown';
      
      if (!modelBreakdown[model]) {
        modelBreakdown[model] = {
          executions: 0,
          costUsd: 0,
          inputTokens: 0,
          outputTokens: 0,
        };
      }
      
      modelBreakdown[model].executions += 1;
      modelBreakdown[model].costUsd += exec.costUsd?.toNumber() || 0;
      modelBreakdown[model].inputTokens += tokenData?.input || 0;
      modelBreakdown[model].outputTokens += tokenData?.output || 0;
    }

    return {
      totalCost,
      totalExecutions,
      avgCostPerExecution,
      modelBreakdown,
      dateRange: { from: fromDate, to: toDate },
    };
  }

  public getModelCosts(model: string): TokenCosts {
    const modelCosts = this.getConfiguredModelCosts();
    const costs = modelCosts[model] || modelCosts['gpt-3.5-turbo'];
    
    return {
      model,
      inputCostPer1k: costs.input,
      outputCostPer1k: costs.output,
    };
  }

  public async getDailyCostTrend(userId: string, days: number = 7): Promise<Array<{
    date: string;
    executions: number;
    costUsd: number;
    inputTokens: number;
    outputTokens: number;
  }>> {
    const trend = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayExecutions = await prisma.execution.findMany({
        where: {
          userId,
          createdAt: {
            gte: date,
            lt: nextDate,
          },
          costUsd: { not: null },
        },
        select: {
          costUsd: true,
          tokenUsage: true,
        },
      });
      
      const dayStats = dayExecutions.reduce(
        (acc, exec) => {
          const tokenData = exec.tokenUsage as any;
          acc.executions += 1;
          acc.costUsd += exec.costUsd?.toNumber() || 0;
          acc.inputTokens += tokenData?.input || 0;
          acc.outputTokens += tokenData?.output || 0;
          return acc;
        },
        { executions: 0, costUsd: 0, inputTokens: 0, outputTokens: 0 }
      );
      
      trend.push({
        date: date.toISOString().split('T')[0],
        ...dayStats,
      });
    }
    
    return trend;
  }

  public async getTopCostlyPrompts(userId: string, limit: number = 10): Promise<Array<{
    promptId: string;
    promptName: string;
    executions: number;
    totalCost: number;
    avgCost: number;
    totalInputTokens: number;
    totalOutputTokens: number;
  }>> {
    const results = await prisma.execution.groupBy({
      by: ['promptId'],
      where: {
        userId,
        costUsd: { not: null },
      },
      _count: { id: true },
      _sum: { costUsd: true },
    });

    // Get detailed information for each prompt
    const promptDetails = await Promise.all(
      results.map(async (result) => {
        const prompt = await prisma.prompt.findUnique({
          where: { id: result.promptId },
          select: { name: true },
        });

        // Get token usage details
        const executions = await prisma.execution.findMany({
          where: {
            userId,
            promptId: result.promptId,
            tokenUsage: { not: Prisma.JsonNull },
          },
          select: { tokenUsage: true },
        });

        const tokenTotals = executions.reduce(
          (acc, exec) => {
            const tokenData = exec.tokenUsage as any;
            acc.inputTokens += tokenData?.input || 0;
            acc.outputTokens += tokenData?.output || 0;
            return acc;
          },
          { inputTokens: 0, outputTokens: 0 }
        );

        return {
          promptId: result.promptId,
          promptName: prompt?.name || 'Unknown',
          executions: result._count.id,
          totalCost: result._sum.costUsd?.toNumber() || 0,
          avgCost: (result._sum.costUsd?.toNumber() || 0) / result._count.id,
          totalInputTokens: tokenTotals.inputTokens,
          totalOutputTokens: tokenTotals.outputTokens,
        };
      })
    );

    return promptDetails
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, limit);
  }

  public async getUserCostMetrics(userId: string, days = 30): Promise<CostMetrics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all executions with costs
    const executions = await prisma.execution.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
        costUsd: { not: null },
      },
      select: {
        costUsd: true,
        tokenUsage: true,
        createdAt: true,
      },
    });

    // Calculate total metrics
    const totalCostUsd = executions.reduce((sum, exec) => 
      sum + (exec.costUsd?.toNumber() || 0), 0
    );

    const todayCostUsd = executions
      .filter(exec => exec.createdAt >= today)
      .reduce((sum, exec) => sum + (exec.costUsd?.toNumber() || 0), 0);

    const avgCostPerExecution = executions.length > 0 ? totalCostUsd / executions.length : 0;

    // Calculate token usage
    const tokenUsage = executions.reduce(
      (acc, exec) => {
        const usage = exec.tokenUsage as any;
        if (usage) {
          acc.totalInput += usage.input || 0;
          acc.totalOutput += usage.output || 0;
          acc.totalTokens += usage.total || 0;
        }
        return acc;
      },
      { totalInput: 0, totalOutput: 0, totalTokens: 0 }
    );

    // Model breakdown
    const modelBreakdown: Record<string, any> = {};
    executions.forEach(exec => {
      const usage = exec.tokenUsage as any;
      const model = usage?.model || 'unknown';
      
      if (!modelBreakdown[model]) {
        modelBreakdown[model] = {
          executions: 0,
          costUsd: 0,
          inputTokens: 0,
          outputTokens: 0,
        };
      }
      
      modelBreakdown[model].executions += 1;
      modelBreakdown[model].costUsd += exec.costUsd?.toNumber() || 0;
      modelBreakdown[model].inputTokens += usage?.input || 0;
      modelBreakdown[model].outputTokens += usage?.output || 0;
    });

    // Daily trend (last 7 days)
    const dailyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayExecutions = executions.filter(exec => 
        exec.createdAt >= date && exec.createdAt < nextDate
      );
      
      dailyTrend.push({
        date: date.toISOString().split('T')[0],
        executions: dayExecutions.length,
        costUsd: dayExecutions.reduce((sum, exec) => sum + (exec.costUsd?.toNumber() || 0), 0),
      });
    }

    return {
      totalCostUsd,
      todayCostUsd,
      avgCostPerExecution,
      tokenUsage,
      modelBreakdown,
      dailyTrend,
    };
  }

  public async checkBudgetAlerts(userId: string, budgets: {
    dailyLimit?: number;
    monthlyLimit?: number;
    executionLimit?: number;
  }): Promise<BudgetAlert[]> {
    const alerts: BudgetAlert[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Daily budget check
    if (budgets.dailyLimit) {
      const todayExecutions = await prisma.execution.findMany({
        where: {
          userId,
          createdAt: { gte: today },
          costUsd: { not: null },
        },
        select: { costUsd: true },
      });

      const todayCost = todayExecutions.reduce((sum, exec) => 
        sum + (exec.costUsd?.toNumber() || 0), 0
      );

      const percentage = (todayCost / budgets.dailyLimit) * 100;

      if (percentage >= 80) {
        alerts.push({
          type: 'daily',
          threshold: budgets.dailyLimit,
          current: todayCost,
          percentage,
          message: `Daily budget ${percentage.toFixed(1)}% used ($${todayCost.toFixed(3)} of $${budgets.dailyLimit})`,
        });
      }
    }

    // Monthly budget check
    if (budgets.monthlyLimit) {
      const monthExecutions = await prisma.execution.findMany({
        where: {
          userId,
          createdAt: { gte: monthStart },
          costUsd: { not: null },
        },
        select: { costUsd: true },
      });

      const monthCost = monthExecutions.reduce((sum, exec) => 
        sum + (exec.costUsd?.toNumber() || 0), 0
      );

      const percentage = (monthCost / budgets.monthlyLimit) * 100;

      if (percentage >= 80) {
        alerts.push({
          type: 'monthly',
          threshold: budgets.monthlyLimit,
          current: monthCost,
          percentage,
          message: `Monthly budget ${percentage.toFixed(1)}% used ($${monthCost.toFixed(2)} of $${budgets.monthlyLimit})`,
        });
      }
    }

    return alerts;
  }

  public async getTopExpensivePrompts(userId: string, limit = 10): Promise<Array<{
    promptId: string;
    promptName: string;
    executions: number;
    totalCost: number;
    avgCost: number;
    totalTokens: number;
  }>> {
    const results = await prisma.execution.groupBy({
      by: ['promptId'],
      where: {
        userId,
        costUsd: { not: null },
      },
      _count: { id: true },
      _sum: { costUsd: true },
    });

    // Get prompt names and calculate averages
    const promptsWithDetails = await Promise.all(
      results.map(async (result) => {
        const prompt = await prisma.prompt.findUnique({
          where: { id: result.promptId },
          select: { name: true },
        });

        const executions = await prisma.execution.findMany({
          where: {
            userId,
            promptId: result.promptId,
            tokenUsage: { not: Prisma.JsonNull },
          },
          select: { tokenUsage: true },
        });

        const totalTokens = executions.reduce((sum, exec) => {
          const usage = exec.tokenUsage as any;
          return sum + (usage?.total || 0);
        }, 0);

        return {
          promptId: result.promptId,
          promptName: prompt?.name || 'Unknown',
          executions: result._count.id,
          totalCost: result._sum.costUsd?.toNumber() || 0,
          avgCost: (result._sum.costUsd?.toNumber() || 0) / result._count.id,
          totalTokens,
        };
      })
    );

    return promptsWithDetails
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, limit);
  }

  public estimateExecutionCost(
    templateLength: number, 
    expectedOutputLength: number,
    model = 'gpt-3.5-turbo'
  ): {
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
    estimatedCost: number;
  } {
    // Rough token estimation (1 token ≈ 4 characters for English text)
    const estimatedInputTokens = Math.ceil(templateLength / 4);
    const estimatedOutputTokens = Math.ceil(expectedOutputLength / 4);

    const modelCosts = this.getConfiguredModelCosts();
    const costs = modelCosts[model] || modelCosts['gpt-3.5-turbo'];
    
    const estimatedCost = (
      (estimatedInputTokens * costs.input / 1000) +
      (estimatedOutputTokens * costs.output / 1000)
    );

    return {
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedCost,
    };
  }
}

// Singleton instance
export const costTracker = new CostTracker();