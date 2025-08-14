import { SchemaValidator, type SchemaValidationRule } from './schema-validator';
import { RegexValidator, type RegexValidationRule } from './regex-validator';
import { FunctionValidator, type FunctionValidationRule, type ValidationContext } from './function-validator';
import type { ValidationType } from '@prisma/client';

export interface ValidationRule {
  id: string;
  name: string;
  type: ValidationType;
  config: SchemaValidationRule | RegexValidationRule | FunctionValidationRule;
  isActive: boolean;
  description?: string;
}

export interface ValidationResult {
  ruleId: string;
  ruleName: string;
  type: ValidationType;
  isValid: boolean;
  errors: Array<{
    path?: string;
    message: string;
    value?: unknown;
  }>;
  result?: unknown;
  executionTime: number;
}

export interface ValidationSummary {
  overallValid: boolean;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  results: ValidationResult[];
  totalExecutionTime: number;
}

export class ValidationEngine {
  private schemaValidator = new SchemaValidator();
  private regexValidator = new RegexValidator();
  private functionValidator = new FunctionValidator();

  public async validateOutput(
    output: string,
    rules: ValidationRule[],
    context?: Partial<ValidationContext>
  ): Promise<ValidationSummary> {
    const startTime = Date.now();
    const results: ValidationResult[] = [];
    
    const activeRules = rules.filter(rule => rule.isActive);

    for (const rule of activeRules) {
      const ruleStartTime = Date.now();
      
      try {
        const result = await this.validateSingleRule(output, rule, context);
        results.push({
          ...result,
          executionTime: Date.now() - ruleStartTime,
        });
      } catch (error) {
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          type: rule.type,
          isValid: false,
          errors: [{
            message: error instanceof Error ? error.message : 'Validation error',
          }],
          executionTime: Date.now() - ruleStartTime,
        });
      }
    }

    const passedCount = results.filter(r => r.isValid).length;
    const failedCount = results.filter(r => !r.isValid).length;
    const skippedCount = rules.length - activeRules.length;

    return {
      overallValid: failedCount === 0 && activeRules.length > 0,
      passedCount,
      failedCount,
      skippedCount,
      results,
      totalExecutionTime: Date.now() - startTime,
    };
  }

  public async validateSingleRule(
    output: string,
    rule: ValidationRule,
    context?: Partial<ValidationContext>
  ): Promise<Omit<ValidationResult, 'executionTime'>> {
    switch (rule.type) {
      case 'SCHEMA':
        return this.validateWithSchema(output, rule);
      
      case 'REGEX':
        return this.validateWithRegex(output, rule);
      
      case 'FUNCTION':
        return await this.validateWithFunction(output, rule, context);
      
      default:
        throw new Error(`Unsupported validation type: ${rule.type}`);
    }
  }

  public async testRule(
    rule: ValidationRule,
    testCases: Array<{
      input: string;
      context?: Partial<ValidationContext>;
      expectedValid: boolean;
      description: string;
    }>
  ): Promise<{
    passed: number;
    failed: number;
    results: Array<{
      description: string;
      input: string;
      expected: boolean;
      actual: boolean;
      passed: boolean;
      errors?: string[];
    }>;
  }> {
    const results = await Promise.all(
      testCases.map(async testCase => {
        try {
          const result = await this.validateSingleRule(testCase.input, rule, testCase.context);
          
          return {
            description: testCase.description,
            input: testCase.input,
            expected: testCase.expectedValid,
            actual: result.isValid,
            passed: result.isValid === testCase.expectedValid,
            errors: result.errors.map(e => e.message),
          };
        } catch (error) {
          return {
            description: testCase.description,
            input: testCase.input,
            expected: testCase.expectedValid,
            actual: false,
            passed: false,
            errors: [error instanceof Error ? error.message : 'Test error'],
          };
        }
      })
    );

    return {
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      results,
    };
  }

  private validateWithSchema(output: string, rule: ValidationRule): Omit<ValidationResult, 'executionTime'> {
    let data: unknown;
    
    try {
      data = JSON.parse(output);
    } catch {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        type: 'SCHEMA',
        isValid: false,
        errors: [{ message: 'Output is not valid JSON' }],
      };
    }

    const result = this.schemaValidator.validate(data, rule.config as SchemaValidationRule);
    
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      type: 'SCHEMA',
      isValid: result.isValid,
      errors: result.errors.map(error => ({
        path: error.path,
        message: error.message,
        value: error.value,
      })),
      result: result.validatedData,
    };
  }

  private validateWithRegex(output: string, rule: ValidationRule): Omit<ValidationResult, 'executionTime'> {
    const result = this.regexValidator.validate(output, rule.config as RegexValidationRule);
    
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      type: 'REGEX',
      isValid: result.isValid,
      errors: result.error ? [{ message: result.error }] : [],
      result: result.matches,
    };
  }

  private async validateWithFunction(
    output: string, 
    rule: ValidationRule,
    context?: Partial<ValidationContext>
  ): Promise<Omit<ValidationResult, 'executionTime'>> {
    const result = await this.functionValidator.validate(
      output, 
      rule.config as FunctionValidationRule,
      context
    );
    
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      type: 'FUNCTION',
      isValid: result.isValid,
      errors: result.error ? [{ message: result.error }] : [],
      result: result.result,
    };
  }
}

// Export validators for direct use
export { SchemaValidator, RegexValidator, FunctionValidator };
export { commonSchemas } from './schema-validator';
export { commonPatterns } from './regex-validator';
export { commonFunctions } from './function-validator';

// Singleton instance
export const validationEngine = new ValidationEngine();