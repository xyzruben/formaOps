import { CostTracker } from '../cost-tracker';
import type { TokenUsage } from '../../../types/database';

jest.mock('../../database/client', () => ({
  prisma: {
    execution: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    prompt: {
      findUnique: jest.fn(),
    },
  },
}));

// Get mock reference
const { prisma } = require('../../database/client');
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('CostTracker', () => {
  let costTracker: CostTracker;

  beforeEach(() => {
    costTracker = new CostTracker();
    jest.clearAllMocks();
  });

  describe('Cost Calculation', () => {
    it('should calculate execution cost for GPT-3.5 Turbo', () => {
      const tokenUsage: TokenUsage = {
        model: 'gpt-3.5-turbo',
        input: 1000,
        output: 500,
        total: 1500,
      };

      const cost = costTracker.calculateExecutionCost(tokenUsage);
      
      // (1000 * 0.0015 / 1000) + (500 * 0.002 / 1000) = 0.0015 + 0.001 = 0.0025
      expect(cost).toBeCloseTo(0.0025, 4);
    });

    it('should calculate execution cost for GPT-4', () => {
      const tokenUsage: TokenUsage = {
        model: 'gpt-4',
        input: 1000,
        output: 500,
        total: 1500,
      };

      const cost = costTracker.calculateExecutionCost(tokenUsage);
      
      // (1000 * 0.03 / 1000) + (500 * 0.06 / 1000) = 0.03 + 0.03 = 0.06
      expect(cost).toBeCloseTo(0.06, 4);
    });

    it('should default to GPT-3.5 pricing for unknown models', () => {
      const tokenUsage: TokenUsage = {
        model: 'unknown-model',
        input: 1000,
        output: 500,
        total: 1500,
      };

      const cost = costTracker.calculateExecutionCost(tokenUsage);
      
      // Should use GPT-3.5 pricing
      expect(cost).toBeCloseTo(0.0025, 4);
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate execution cost based on template length', () => {
      const templateLength = 400; // characters
      const expectedOutputLength = 200; // characters
      
      const estimate = costTracker.estimateExecutionCost(templateLength, expectedOutputLength);
      
      expect(estimate.estimatedInputTokens).toBe(100); // 400/4
      expect(estimate.estimatedOutputTokens).toBe(50); // 200/4
      expect(estimate.estimatedCost).toBeCloseTo(0.00025, 5); // Based on GPT-3.5 pricing
    });

    it('should estimate cost for different models', () => {
      const estimate = costTracker.estimateExecutionCost(400, 200, 'gpt-4');
      
      expect(estimate.estimatedInputTokens).toBe(100);
      expect(estimate.estimatedOutputTokens).toBe(50);
      expect(estimate.estimatedCost).toBeCloseTo(0.006, 4); // GPT-4 pricing
    });
  });

  describe('User Cost Metrics', () => {
    beforeEach(() => {
      const mockExecutions = [
        {
          costUsd: { toNumber: () => 0.01 },
          tokenUsage: { model: 'gpt-3.5-turbo', input: 100, output: 50, total: 150 },
          createdAt: new Date('2024-01-01'),
        },
        {
          costUsd: { toNumber: () => 0.05 },
          tokenUsage: { model: 'gpt-4', input: 200, output: 100, total: 300 },
          createdAt: new Date('2024-01-02'),
        },
      ];

      mockPrisma.execution.findMany.mockResolvedValue(mockExecutions);
    });

    it('should calculate user cost metrics correctly', async () => {
      const metrics = await costTracker.getUserCostMetrics('user-1');
      
      expect(metrics.totalCostUsd).toBeCloseTo(0.06, 2);
      expect(metrics.avgCostPerExecution).toBe(0.03);
      expect(metrics.tokenUsage.totalInput).toBe(300);
      expect(metrics.tokenUsage.totalOutput).toBe(150);
      expect(metrics.tokenUsage.totalTokens).toBe(450);
    });

    it('should calculate model breakdown correctly', async () => {
      const metrics = await costTracker.getUserCostMetrics('user-1');
      
      expect(metrics.modelBreakdown['gpt-3.5-turbo']).toEqual({
        executions: 1,
        costUsd: 0.01,
        inputTokens: 100,
        outputTokens: 50,
      });
      
      expect(metrics.modelBreakdown['gpt-4']).toEqual({
        executions: 1,
        costUsd: 0.05,
        inputTokens: 200,
        outputTokens: 100,
      });
    });

    it('should generate daily trend data', async () => {
      const metrics = await costTracker.getUserCostMetrics('user-1');
      
      expect(metrics.dailyTrend).toHaveLength(7); // Last 7 days
      expect(metrics.dailyTrend[0]).toMatchObject({
        date: expect.any(String),
        executions: expect.any(Number),
        costUsd: expect.any(Number),
      });
    });
  });

  describe('Budget Alerts', () => {
    beforeEach(() => {
      const mockTodayExecutions = [
        { costUsd: { toNumber: () => 0.08 } },
      ];
      
      const mockMonthExecutions = [
        { costUsd: { toNumber: () => 0.08 } },
        { costUsd: { toNumber: () => 0.12 } },
      ];

      mockPrisma.execution.findMany
        .mockResolvedValueOnce(mockTodayExecutions) // Daily check
        .mockResolvedValueOnce(mockMonthExecutions); // Monthly check
    });

    it('should generate daily budget alerts', async () => {
      const budgets = { dailyLimit: 0.10 };
      const alerts = await costTracker.checkBudgetAlerts('user-1', budgets);
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        type: 'daily',
        threshold: 0.10,
        current: 0.08,
        percentage: 80,
        message: expect.stringContaining('Daily budget 80.0% used'),
      });
    });

    it('should generate monthly budget alerts', async () => {
      const budgets = { monthlyLimit: 0.25 };
      const alerts = await costTracker.checkBudgetAlerts('user-1', budgets);
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        type: 'monthly',
        threshold: 0.25,
        current: 0.20,
        percentage: 80,
        message: expect.stringContaining('Monthly budget 80.0% used'),
      });
    });

    it('should not generate alerts below 80% threshold', async () => {
      const budgets = { dailyLimit: 1.00 }; // High limit
      const alerts = await costTracker.checkBudgetAlerts('user-1', budgets);
      
      expect(alerts).toHaveLength(0);
    });
  });

  describe('Top Expensive Prompts', () => {
    beforeEach(() => {
      const mockGroupedResults = [
        {
          promptId: 'prompt-1',
          _count: { id: 5 },
          _sum: { costUsd: { toNumber: () => 0.25 } },
        },
        {
          promptId: 'prompt-2',
          _count: { id: 2 },
          _sum: { costUsd: { toNumber: () => 0.10 } },
        },
      ];

      mockPrisma.execution.groupBy.mockResolvedValue(mockGroupedResults);
      
      mockPrisma.prompt.findUnique
        .mockResolvedValueOnce({ name: 'Expensive Prompt' })
        .mockResolvedValueOnce({ name: 'Cheap Prompt' });

      const mockExecutionsForTokens = [
        [
          { tokenUsage: { total: 1000 } },
          { tokenUsage: { total: 1500 } },
        ],
        [
          { tokenUsage: { total: 500 } },
        ],
      ];

      mockPrisma.execution.findMany
        .mockResolvedValueOnce(mockExecutionsForTokens[0])
        .mockResolvedValueOnce(mockExecutionsForTokens[1]);
    });

    it('should return top expensive prompts', async () => {
      const results = await costTracker.getTopExpensivePrompts('user-1', 10);
      
      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        promptId: 'prompt-1',
        promptName: 'Expensive Prompt',
        executions: 5,
        totalCost: 0.25,
        avgCost: 0.05,
        totalTokens: 2500,
      });
      
      expect(results[1]).toMatchObject({
        promptId: 'prompt-2',
        promptName: 'Cheap Prompt',
        executions: 2,
        totalCost: 0.10,
        avgCost: 0.05,
        totalTokens: 500,
      });
    });

    it('should sort results by total cost descending', async () => {
      const results = await costTracker.getTopExpensivePrompts('user-1');
      
      expect(results[0].totalCost).toBeGreaterThanOrEqual(results[1].totalCost);
    });
  });
});