import { ValidationEngine, type ValidationRule } from '../validator';
import { z } from 'zod';

// Local enum for testing - matches Prisma schema
enum ValidationType {
  SCHEMA = 'SCHEMA',
  REGEX = 'REGEX',  
  FUNCTION = 'FUNCTION'
}

describe('ValidationEngine', () => {
  let engine: ValidationEngine;

  beforeEach(() => {
    engine = new ValidationEngine();
  });

  describe('Schema Validation', () => {
    it('should validate JSON against Zod schema', async () => {
      const rule: ValidationRule = {
        id: 'user-schema',
        name: 'User Schema Validation',
        type: ValidationType.SCHEMA,
        config: {
          zodSchema: z.object({
            name: z.string().min(1),
            age: z.number().min(0),
          }),
        },
        isActive: true,
      };

      const validJson = JSON.stringify({ name: 'John', age: 25 });
      const result = await engine.validateSingleRule(validJson, rule);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle schema validation errors gracefully', async () => {
      const rule: ValidationRule = {
        id: 'string-schema',
        name: 'String Schema',
        type: ValidationType.SCHEMA,
        config: {
          zodSchema: z.string(),
        },
        isActive: true,
      };

      const invalidJson = JSON.stringify(123);
      const result = await engine.validateSingleRule(invalidJson, rule);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle invalid JSON', async () => {
      const rule: ValidationRule = {
        id: 'json-rule',
        name: 'JSON Rule',
        type: ValidationType.SCHEMA,
        config: {
          zodSchema: z.object({ test: z.string() }),
        },
        isActive: true,
      };

      const invalidJson = 'not json';
      const result = await engine.validateSingleRule(invalidJson, rule);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('not valid JSON');
    });
  });

  describe('Regex Validation', () => {
    it('should validate against regex patterns', async () => {
      const rule: ValidationRule = {
        id: 'email-regex',
        name: 'Email Validation',
        type: ValidationType.REGEX,
        config: {
          pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
          flags: 'i',
        },
        isActive: true,
      };

      const validEmail = 'test@example.com';
      const result = await engine.validateSingleRule(validEmail, rule);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail invalid regex patterns', async () => {
      const rule: ValidationRule = {
        id: 'email-regex',
        name: 'Email Validation',
        type: ValidationType.REGEX,
        config: {
          pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
          flags: 'i',
        },
        isActive: true,
      };

      const invalidEmail = 'not-an-email';
      const result = await engine.validateSingleRule(invalidEmail, rule);
      
      expect(result.isValid).toBe(false);
    });
  });

  describe('Function Validation', () => {
    it('should validate using custom functions', async () => {
      const rule: ValidationRule = {
        id: 'positive-check',
        name: 'Positive Number Check',
        type: ValidationType.FUNCTION,
        config: {
          functionCode: `
            function validate(input) {
              const num = parseFloat(input);
              return !isNaN(num) && num > 0;
            }
          `,
          timeout: 5000,
        },
        isActive: true,
      };

      const validInput = '5.5';
      const result = await engine.validateSingleRule(validInput, rule);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      
      const invalidInput = '-1';
      const invalidResult = await engine.validateSingleRule(invalidInput, rule);
      
      expect(invalidResult.isValid).toBe(false);
    });

    it('should handle function validation errors', async () => {
      const rule: ValidationRule = {
        id: 'throwing-function',
        name: 'Function That Throws',
        type: ValidationType.FUNCTION,
        config: {
          functionCode: `
            function validate(input) {
              throw new Error('Validation error');
            }
          `,
          timeout: 5000,
        },
        isActive: true,
      };

      const result = await engine.validateSingleRule('test', rule);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('Validation error');
    });
  });

  describe('Multiple Rules Validation', () => {
    it('should validate against multiple rules and return summary', async () => {
      const rules: ValidationRule[] = [
        {
          id: 'schema-rule',
          name: 'Schema Rule',
          type: ValidationType.SCHEMA,
          config: {
            zodSchema: z.object({ value: z.number() }),
          },
          isActive: true,
        },
        {
          id: 'positive-rule',
          name: 'Positive Rule',
          type: ValidationType.FUNCTION,
          config: {
            functionCode: `
              function validate(input) {
                const data = JSON.parse(input);
                return data.value > 0;
              }
            `,
            timeout: 5000,
          },
          isActive: true,
        },
      ];

      const validInput = JSON.stringify({ value: 5 });
      const result = await engine.validateOutput(validInput, rules);
      
      expect(result.overallValid).toBe(true);
      expect(result.passedCount).toBe(2);
      expect(result.failedCount).toBe(0);

      const invalidInput = JSON.stringify({ value: -1 });
      const invalidResult = await engine.validateOutput(invalidInput, rules);
      
      expect(invalidResult.overallValid).toBe(false);
      expect(invalidResult.passedCount).toBe(1);
      expect(invalidResult.failedCount).toBe(1);
    });

    it('should skip inactive rules', async () => {
      const rules: ValidationRule[] = [
        {
          id: 'active-rule',
          name: 'Active Rule',
          type: ValidationType.REGEX,
          config: { pattern: '.*', flags: '' },
          isActive: true,
        },
        {
          id: 'inactive-rule',
          name: 'Inactive Rule',
          type: ValidationType.REGEX,
          config: { pattern: 'fail', flags: '' },
          isActive: false,
        },
      ];

      const result = await engine.validateOutput('test', rules);
      
      expect(result.passedCount).toBe(1);
      expect(result.skippedCount).toBe(1);
      expect(result.results).toHaveLength(1);
    });
  });

  describe('Test Rule Functionality', () => {
    it('should test a rule against multiple test cases', async () => {
      const rule: ValidationRule = {
        id: 'email-test',
        name: 'Email Test',
        type: ValidationType.REGEX,
        config: {
          pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
          flags: 'i',
        },
        isActive: true,
      };

      const testCases = [
        {
          input: 'valid@example.com',
          expectedValid: true,
          description: 'Valid email',
        },
        {
          input: 'invalid-email',
          expectedValid: false,
          description: 'Invalid email',
        },
        {
          input: 'another@test.co.uk',
          expectedValid: true,
          description: 'Valid UK email',
        },
      ];

      const testResult = await engine.testRule(rule, testCases);
      
      expect(testResult.passed).toBe(2);
      expect(testResult.failed).toBe(1);
      expect(testResult.results).toHaveLength(3);
      expect(testResult.results[0].passed).toBe(true);
      expect(testResult.results[1].passed).toBe(true);
      expect(testResult.results[2].passed).toBe(true);
    });
  });
});