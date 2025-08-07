import { ValidationEngine, createValidator } from '../validator';
import { z } from 'zod';

describe('ValidationEngine', () => {
  let engine: ValidationEngine;

  beforeEach(() => {
    engine = new ValidationEngine();
  });

  describe('Schema Validation', () => {
    it('should validate against Zod schema', async () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().min(0),
      });

      engine.addRule('user-schema', 'schema', schema);
      
      const validResult = await engine.validate({ name: 'John', age: 25 });
      expect(validResult.isValid).toBe(true);
      expect(validResult.passedRules).toHaveLength(1);

      const invalidResult = await engine.validate({ name: '', age: -1 });
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.failedRules).toHaveLength(1);
    });

    it('should handle schema validation errors gracefully', async () => {
      const schema = z.string();
      engine.addRule('string-only', 'schema', schema);
      
      const result = await engine.validate(123);
      expect(result.isValid).toBe(false);
      expect(result.failedRules[0].error).toContain('Expected string');
    });
  });

  describe('Regex Validation', () => {
    it('should validate against regex patterns', async () => {
      engine.addRule('email', 'regex', /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      
      const validResult = await engine.validate('test@example.com');
      expect(validResult.isValid).toBe(true);

      const invalidResult = await engine.validate('invalid-email');
      expect(invalidResult.isValid).toBe(false);
    });

    it('should handle regex validation for objects', async () => {
      engine.addRule('email-field', 'regex', /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'email');
      
      const validResult = await engine.validate({ email: 'test@example.com', name: 'John' });
      expect(validResult.isValid).toBe(true);

      const invalidResult = await engine.validate({ email: 'invalid', name: 'John' });
      expect(invalidResult.isValid).toBe(false);
    });
  });

  describe('Function Validation', () => {
    it('should validate using custom functions', async () => {
      const isPositive = (value: number) => value > 0;
      engine.addRule('positive', 'function', isPositive);
      
      const validResult = await engine.validate(5);
      expect(validResult.isValid).toBe(true);

      const invalidResult = await engine.validate(-1);
      expect(invalidResult.isValid).toBe(false);
    });

    it('should handle function validation errors', async () => {
      const throwingFunction = () => { throw new Error('Validation error'); };
      engine.addRule('throws', 'function', throwingFunction);
      
      const result = await engine.validate('test');
      expect(result.isValid).toBe(false);
      expect(result.failedRules[0].error).toContain('Validation error');
    });

    it('should timeout long-running validation functions', async () => {
      const slowFunction = () => new Promise(resolve => setTimeout(resolve, 6000));
      engine.addRule('slow', 'function', slowFunction);
      
      const result = await engine.validate('test');
      expect(result.isValid).toBe(false);
      expect(result.failedRules[0].error).toContain('timeout');
    }, 10000);
  });

  describe('Multiple Rules', () => {
    it('should validate against multiple rules', async () => {
      const schema = z.object({ value: z.number() });
      const isPositive = (data: { value: number }) => data.value > 0;
      
      engine.addRule('schema', 'schema', schema);
      engine.addRule('positive', 'function', isPositive);
      
      const validResult = await engine.validate({ value: 5 });
      expect(validResult.isValid).toBe(true);
      expect(validResult.passedRules).toHaveLength(2);

      const invalidResult = await engine.validate({ value: -1 });
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.passedRules).toHaveLength(1); // Schema passes
      expect(invalidResult.failedRules).toHaveLength(1); // Function fails
    });
  });

  describe('Rule Management', () => {
    it('should add and remove rules', () => {
      engine.addRule('test', 'regex', /test/);
      expect(engine.getRules()).toHaveLength(1);
      
      engine.removeRule('test');
      expect(engine.getRules()).toHaveLength(0);
    });

    it('should clear all rules', () => {
      engine.addRule('rule1', 'regex', /test1/);
      engine.addRule('rule2', 'regex', /test2/);
      expect(engine.getRules()).toHaveLength(2);
      
      engine.clearRules();
      expect(engine.getRules()).toHaveLength(0);
    });
  });
});

describe('createValidator utility', () => {
  it('should create validator with predefined rules', async () => {
    const validator = createValidator([
      { name: 'email', type: 'regex', rule: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      { name: 'required', type: 'function', rule: (value: any) => value != null && value !== '' },
    ]);

    const result = await validator.validate('test@example.com');
    expect(result.isValid).toBe(true);
    expect(result.passedRules).toHaveLength(2);
  });
});