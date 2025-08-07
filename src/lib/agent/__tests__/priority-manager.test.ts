import { CPUPriorityManager } from '../priority-manager';

describe('CPUPriorityManager', () => {
  let manager: CPUPriorityManager;

  beforeEach(() => {
    manager = new CPUPriorityManager();
  });

  afterEach(() => {
    manager.resetSystem();
  });

  describe('Priority Management', () => {
    it('should boost CPU priority for AI operations', () => {
      const result = manager.boostPriorityForAI();
      expect(result.success).toBe(true);
      expect(result.previousPriority).toBeDefined();
      expect(result.newPriority).toBe('HIGH_PRIORITY');
    });

    it('should restore original priority', () => {
      manager.boostPriorityForAI();
      const result = manager.restoreOriginalPriority();
      expect(result.success).toBe(true);
      expect(result.restoredPriority).toBe('NORMAL');
    });

    it('should handle priority boost when already boosted', () => {
      manager.boostPriorityForAI();
      const result = manager.boostPriorityForAI();
      expect(result.success).toBe(false);
      expect(result.error).toContain('already boosted');
    });
  });

  describe('Resource Allocation', () => {
    it('should allocate CPU resources for AI operations', () => {
      const allocation = manager.allocateResourcesForAI();
      expect(allocation.cpuCores).toBeGreaterThan(0);
      expect(allocation.memoryMB).toBeGreaterThan(0);
      expect(allocation.priority).toBe('HIGH');
    });

    it('should respect maximum CPU allocation limits', () => {
      const allocation = manager.allocateResourcesForAI();
      expect(allocation.cpuCores).toBeLessThanOrEqual(4); // Max 4 cores for AI
    });
  });

  describe('Circuit Breaker', () => {
    it('should track system overload', () => {
      // Simulate overload by making multiple requests
      for (let i = 0; i < 10; i++) {
        manager.recordExecutionFailure();
      }
      
      const status = manager.getSystemStatus();
      expect(status.isOverloaded).toBe(true);
      expect(status.circuitBreakerOpen).toBe(true);
    });

    it('should prevent operations when circuit breaker is open', () => {
      // Force circuit breaker open
      for (let i = 0; i < 10; i++) {
        manager.recordExecutionFailure();
      }
      
      const result = manager.boostPriorityForAI();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Circuit breaker');
    });

    it('should record successful executions', () => {
      manager.recordExecutionSuccess();
      const status = manager.getSystemStatus();
      expect(status.totalExecutions).toBe(1);
      expect(status.successfulExecutions).toBe(1);
    });

    it('should calculate success rate correctly', () => {
      manager.recordExecutionSuccess();
      manager.recordExecutionSuccess();
      manager.recordExecutionFailure();
      
      const status = manager.getSystemStatus();
      expect(status.successRate).toBeCloseTo(0.67, 2);
    });
  });

  describe('System Reset', () => {
    it('should reset system state', () => {
      manager.boostPriorityForAI();
      manager.recordExecutionFailure();
      
      manager.resetSystem();
      
      const status = manager.getSystemStatus();
      expect(status.isPriorityBoosted).toBe(false);
      expect(status.totalExecutions).toBe(0);
      expect(status.circuitBreakerOpen).toBe(false);
    });
  });

  describe('System Status', () => {
    it('should provide comprehensive system status', () => {
      const status = manager.getSystemStatus();
      
      expect(status).toMatchObject({
        isPriorityBoosted: false,
        currentPriority: 'NORMAL',
        isOverloaded: false,
        circuitBreakerOpen: false,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        successRate: 0,
      });
    });
  });
});