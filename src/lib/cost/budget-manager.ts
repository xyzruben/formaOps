/**
 * User Budget Manager
 *
 * Section 5.2: security_dog.md - Implement cost quotas per user
 *
 * Prevents runaway OpenAI costs by enforcing budget limits per user.
 * Tracks monthly spending and prevents executions when quota is exceeded.
 */

import { prisma } from '@/lib/database/client';
import { startOfMonth } from 'date-fns';

/**
 * User plan types with associated monthly budgets (in USD)
 */
export enum UserPlan {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

/**
 * Monthly budget limits per plan (in USD)
 */
const BUDGET_LIMITS: Record<UserPlan, number> = {
  [UserPlan.FREE]: 10.0, // $10/month for free tier
  [UserPlan.PRO]: 100.0, // $100/month for pro tier
  [UserPlan.ENTERPRISE]: 1000.0, // $1000/month for enterprise tier
};

/**
 * Custom error for budget exceeded scenarios
 */
export class QuotaExceededError extends Error {
  constructor(
    message: string,
    public currentSpend: number,
    public limit: number
  ) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

/**
 * Budget usage information
 */
export interface BudgetUsage {
  userId: string;
  currentSpend: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Budget Manager for tracking and enforcing user spending limits
 */
export class BudgetManager {
  /**
   * Get user's plan (defaults to FREE if not set)
   * In a production app, this would come from a User.plan field in the database
   */
  private async getUserPlan(_userId: string): Promise<UserPlan> {
    // TODO: Implement actual plan lookup from database
    // For now, default to FREE tier
    // In production, add a 'plan' field to User model:
    // const user = await prisma.user.findUnique({ where: { id: userId } });
    // return user?.plan || UserPlan.FREE;

    return UserPlan.FREE;
  }

  /**
   * Get monthly spending limit for a user based on their plan
   */
  async getUserLimit(userId: string): Promise<number> {
    const plan = await this.getUserPlan(userId);
    return BUDGET_LIMITS[plan];
  }

  /**
   * Get current month's spending for a user
   */
  async getCurrentMonthSpending(userId: string): Promise<number> {
    const monthStart = startOfMonth(new Date());

    const result = await prisma.execution.aggregate({
      where: {
        userId,
        createdAt: {
          gte: monthStart,
        },
      },
      _sum: {
        costUsd: true,
      },
    });

    return result._sum.costUsd?.toNumber() || 0;
  }

  /**
   * Get budget usage information for a user
   */
  async getBudgetUsage(userId: string): Promise<BudgetUsage> {
    const limit = await this.getUserLimit(userId);
    const currentSpend = await this.getCurrentMonthSpending(userId);
    const remaining = Math.max(0, limit - currentSpend);
    const percentUsed = (currentSpend / limit) * 100;

    const now = new Date();
    const periodStart = startOfMonth(now);
    const periodEnd = new Date(
      periodStart.getFullYear(),
      periodStart.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    return {
      userId,
      currentSpend,
      limit,
      remaining,
      percentUsed,
      periodStart,
      periodEnd,
    };
  }

  /**
   * Check if user has budget available for estimated cost
   * Throws QuotaExceededError if budget would be exceeded
   *
   * @param userId - User ID to check
   * @param estimatedCost - Estimated cost of operation in USD
   * @throws QuotaExceededError if budget is exceeded
   */
  async checkUserBudget(userId: string, estimatedCost: number): Promise<void> {
    const limit = await this.getUserLimit(userId);
    const currentSpend = await this.getCurrentMonthSpending(userId);

    const projectedSpend = currentSpend + estimatedCost;

    if (projectedSpend > limit) {
      throw new QuotaExceededError(
        `Monthly budget exceeded. Current: $${currentSpend.toFixed(2)}, Limit: $${limit.toFixed(2)}, Estimated cost: $${estimatedCost.toFixed(2)}`,
        currentSpend,
        limit
      );
    }

    // Warning threshold: 90% of budget
    if (projectedSpend > limit * 0.9) {
      console.warn(
        `[Budget] User ${userId} approaching budget limit: ${((projectedSpend / limit) * 100).toFixed(1)}% used`
      );
    }
  }

  /**
   * Check if user has reached budget without throwing
   * Useful for displaying warnings in UI
   */
  async isBudgetExceeded(userId: string): Promise<boolean> {
    const limit = await this.getUserLimit(userId);
    const currentSpend = await this.getCurrentMonthSpending(userId);

    return currentSpend >= limit;
  }

  /**
   * Get remaining budget for user
   */
  async getRemainingBudget(userId: string): Promise<number> {
    const limit = await this.getUserLimit(userId);
    const currentSpend = await this.getCurrentMonthSpending(userId);

    return Math.max(0, limit - currentSpend);
  }

  /**
   * Estimate cost for a prompt execution
   * Uses approximate token estimation: 1 token ≈ 4 characters
   *
   * @param promptLength - Length of prompt in characters
   * @param estimatedOutputTokens - Estimated output tokens (default 500)
   * @param model - Model name (gpt-3.5-turbo or gpt-4)
   * @returns Estimated cost in USD
   */
  estimateCost(
    promptLength: number,
    estimatedOutputTokens: number = 500,
    model: string = 'gpt-3.5-turbo'
  ): number {
    // Rough estimation: 1 token ≈ 4 characters
    const inputTokens = Math.ceil(promptLength / 4);

    // Pricing as of 2024 (should be configurable via env vars)
    const pricing = {
      'gpt-3.5-turbo': {
        inputCostPer1k: 0.0015,
        outputCostPer1k: 0.002,
      },
      'gpt-4': {
        inputCostPer1k: 0.03,
        outputCostPer1k: 0.06,
      },
      'gpt-4-turbo': {
        inputCostPer1k: 0.01,
        outputCostPer1k: 0.03,
      },
    };

    const modelPricing =
      pricing[model as keyof typeof pricing] || pricing['gpt-3.5-turbo'];

    const inputCost = (inputTokens / 1000) * modelPricing.inputCostPer1k;
    const outputCost =
      (estimatedOutputTokens / 1000) * modelPricing.outputCostPer1k;

    return inputCost + outputCost;
  }

  /**
   * Record actual cost after execution
   * This is called by the execution handler after OpenAI returns usage data
   */
  async recordActualCost(
    executionId: string,
    actualCost: number
  ): Promise<void> {
    await prisma.execution.update({
      where: { id: executionId },
      data: { costUsd: actualCost },
    });
  }

  /**
   * Get user's spending history (last 12 months)
   */
  async getSpendingHistory(
    userId: string,
    months: number = 12
  ): Promise<Array<{ month: string; spend: number }>> {
    const history: Array<{ month: string; spend: number }> = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const monthStart = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1,
        0,
        0,
        0,
        0
      );
      const monthEnd = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59,
        999
      );

      const result = await prisma.execution.aggregate({
        where: {
          userId,
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _sum: {
          costUsd: true,
        },
      });

      const spend = result._sum.costUsd?.toNumber() || 0;
      const monthStr = monthStart.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      });

      history.unshift({ month: monthStr, spend });
    }

    return history;
  }
}

// Export singleton instance
export const budgetManager = new BudgetManager();
