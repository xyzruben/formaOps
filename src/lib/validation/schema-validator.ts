import { z } from 'zod';
import { prisma } from '../database/client';
import { ValidationError } from '../utils/error-handler';

export interface SchemaValidationRule {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  required?: string[];
  properties?: Record<string, SchemaValidationRule>;
  items?: SchemaValidationRule;
  enum?: (string | number)[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrorDetail[];
  validatedData?: unknown;
}

export interface ValidationErrorDetail {
  path: string;
  message: string;
  value?: unknown;
}

export interface ValidationRule {
  id: string;
  promptId: string;
  name: string;
  type: 'SCHEMA' | 'REGEX' | 'FUNCTION';
  config: SchemaValidationRule | { pattern: string } | { code: string };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class SchemaValidator {
  public validate(
    data: unknown,
    schema: SchemaValidationRule
  ): ValidationResult {
    try {
      const zodSchema = this.convertToZodSchema(schema);
      const result = zodSchema.safeParse(data);

      if (result.success) {
        return {
          isValid: true,
          errors: [],
          validatedData: result.data,
        };
      }

      return {
        isValid: false,
        errors: result.error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          value: err.code === 'invalid_type' ? data : undefined,
        })),
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            path: 'root',
            message:
              error instanceof Error
                ? error.message
                : 'Schema validation error',
          },
        ],
      };
    }
  }

  public generateExample(schema: SchemaValidationRule): unknown {
    switch (schema.type) {
      case 'string':
        if (schema.enum) return schema.enum[0];
        return schema.pattern ? 'example' : 'string_value';

      case 'number':
        if (schema.enum) return schema.enum[0] as number;
        return schema.minimum || 0;

      case 'boolean':
        return true;

      case 'array':
        if (!schema.items) return [];
        return [this.generateExample(schema.items)];

      case 'object':
        if (!schema.properties) return {};

        const example: Record<string, unknown> = {};
        Object.entries(schema.properties).forEach(([key, prop]) => {
          if (schema.required?.includes(key)) {
            example[key] = this.generateExample(prop);
          }
        });

        return example;

      default:
        return null;
    }
  }

  private convertToZodSchema(rule: SchemaValidationRule): z.ZodSchema {
    switch (rule.type) {
      case 'string':
        let stringSchema = z.string();

        if (rule.minLength) stringSchema = stringSchema.min(rule.minLength);
        if (rule.maxLength) stringSchema = stringSchema.max(rule.maxLength);
        if (rule.pattern)
          stringSchema = stringSchema.regex(new RegExp(rule.pattern));
        if (rule.enum) {
          const stringEnums = rule.enum.filter(
            v => typeof v === 'string'
          ) as string[];
          if (stringEnums.length > 0) {
            return z.enum(stringEnums as [string, ...string[]]);
          }
        }

        return stringSchema;

      case 'number':
        let numberSchema = z.number();

        if (rule.minimum !== undefined)
          numberSchema = numberSchema.min(rule.minimum);
        if (rule.maximum !== undefined)
          numberSchema = numberSchema.max(rule.maximum);
        if (rule.enum) {
          const numericEnum = rule.enum.filter(
            v => typeof v === 'number'
          ) as number[];
          if (numericEnum.length > 0) {
            return z.number().refine(val => numericEnum.includes(val), {
              message: `Must be one of: ${numericEnum.join(', ')}`,
            });
          }
        }

        return numberSchema;

      case 'boolean':
        return z.boolean();

      case 'array':
        if (!rule.items) return z.array(z.unknown());
        return z.array(this.convertToZodSchema(rule.items));

      case 'object':
        if (!rule.properties) return z.object({});

        const shape: Record<string, z.ZodSchema> = {};

        Object.entries(rule.properties).forEach(([key, prop]) => {
          let schema = this.convertToZodSchema(prop);

          // Make optional if not required
          if (!rule.required?.includes(key)) {
            schema = schema.optional();
          }

          shape[key] = schema;
        });

        return z.object(shape);

      default:
        return z.unknown();
    }
  }

  // Task 7: Database integration methods
  public async validateOutput(
    output: string,
    rules: ValidationRule[]
  ): Promise<ValidationResult> {
    const errors: ValidationErrorDetail[] = [];
    let validatedData: any = null;

    try {
      // Parse output as JSON first
      let parsedOutput: unknown;
      try {
        parsedOutput = JSON.parse(output);
      } catch {
        // If not JSON, treat as plain string
        parsedOutput = output;
      }

      // Validate against each active rule
      for (const rule of rules.filter(r => r.isActive)) {
        let result: ValidationResult;

        if (rule.type === 'SCHEMA') {
          result = this.validate(
            parsedOutput,
            rule.config as SchemaValidationRule
          );
        } else if (rule.type === 'REGEX') {
          const pattern = (rule.config as { pattern: string }).pattern;
          const regex = new RegExp(pattern);
          const isValid =
            typeof parsedOutput === 'string' && regex.test(parsedOutput);
          result = {
            isValid,
            errors: isValid
              ? []
              : [
                  {
                    path: 'root',
                    message: `Does not match pattern: ${pattern}`,
                  },
                ],
            validatedData: isValid ? parsedOutput : undefined,
          };
        } else {
          // For now, skip FUNCTION type validations as they need runtime evaluation
          continue;
        }

        if (!result.isValid) {
          errors.push(
            ...result.errors.map(err => ({
              ...err,
              path: `${rule.name}.${err.path}`,
              message: `${rule.name}: ${err.message}`,
            }))
          );
        } else if (validatedData === null) {
          validatedData = result.validatedData;
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        validatedData: validatedData || parsedOutput,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            path: 'root',
            message:
              error instanceof Error ? error.message : 'Validation failed',
          },
        ],
      };
    }
  }

  public async createValidationRule(
    promptId: string,
    rule: Omit<ValidationRule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ValidationRule> {
    try {
      // Create validation rule in database
      const createdRule = await prisma.validation.create({
        data: {
          promptId,
          name: rule.name,
          type: rule.type,
          config: rule.config as any,
          isActive: rule.isActive,
        },
      });

      return {
        id: createdRule.id,
        promptId: createdRule.promptId,
        name: createdRule.name,
        type: createdRule.type as 'SCHEMA' | 'REGEX' | 'FUNCTION',
        config: createdRule.config as
          | SchemaValidationRule
          | { pattern: string }
          | { code: string },
        isActive: createdRule.isActive,
        createdAt: createdRule.createdAt,
        updatedAt: createdRule.updatedAt,
      };
    } catch (error) {
      throw new ValidationError(
        `Failed to create validation rule: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  public async getValidationRules(promptId: string): Promise<ValidationRule[]> {
    try {
      const rules = await prisma.validation.findMany({
        where: { promptId },
        orderBy: { createdAt: 'asc' },
      });

      return rules.map(rule => ({
        id: rule.id,
        promptId: rule.promptId,
        name: rule.name,
        type: rule.type as 'SCHEMA' | 'REGEX' | 'FUNCTION',
        config: rule.config as
          | SchemaValidationRule
          | { pattern: string }
          | { code: string },
        isActive: rule.isActive,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      }));
    } catch (error) {
      throw new ValidationError(
        `Failed to get validation rules: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  public async updateValidationRule(
    ruleId: string,
    updates: Partial<
      Pick<ValidationRule, 'name' | 'type' | 'config' | 'isActive'>
    >
  ): Promise<ValidationRule> {
    try {
      const updatedRule = await prisma.validation.update({
        where: { id: ruleId },
        data: {
          ...updates,
          config: updates.config as any,
          updatedAt: new Date(),
        },
      });

      return {
        id: updatedRule.id,
        promptId: updatedRule.promptId,
        name: updatedRule.name,
        type: updatedRule.type as 'SCHEMA' | 'REGEX' | 'FUNCTION',
        config: updatedRule.config as
          | SchemaValidationRule
          | { pattern: string }
          | { code: string },
        isActive: updatedRule.isActive,
        createdAt: updatedRule.createdAt,
        updatedAt: updatedRule.updatedAt,
      };
    } catch (error) {
      throw new ValidationError(
        `Failed to update validation rule: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  public async deleteValidationRule(ruleId: string): Promise<void> {
    try {
      await prisma.validation.delete({
        where: { id: ruleId },
      });
    } catch (error) {
      throw new ValidationError(
        `Failed to delete validation rule: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  public async validateExecutionOutput(
    executionId: string,
    output: string
  ): Promise<{
    isValid: boolean;
    errors: ValidationErrorDetail[];
    validationStatus: 'PASSED' | 'FAILED';
  }> {
    try {
      // Get execution and its prompt's validation rules
      const execution = await prisma.execution.findUnique({
        where: { id: executionId },
        include: {
          prompt: {
            include: {
              validations: true,
            },
          },
        },
      });

      if (!execution) {
        throw new ValidationError('Execution not found');
      }

      // Convert database validation rules to ValidationRule format
      const rules: ValidationRule[] = execution.prompt.validations.map(
        rule => ({
          id: rule.id,
          promptId: rule.promptId,
          name: rule.name,
          type: rule.type as 'SCHEMA' | 'REGEX' | 'FUNCTION',
          config: rule.config as
            | SchemaValidationRule
            | { pattern: string }
            | { code: string },
          isActive: rule.isActive,
          createdAt: rule.createdAt,
          updatedAt: rule.updatedAt,
        })
      );

      // Validate output against rules
      const result = await this.validateOutput(output, rules);

      // Update execution with validation results
      await prisma.execution.update({
        where: { id: executionId },
        data: {
          validationStatus: result.isValid ? 'PASSED' : 'FAILED',
          validatedOutput: result.validatedData as any,
        },
      });

      return {
        isValid: result.isValid,
        errors: result.errors,
        validationStatus: result.isValid ? 'PASSED' : 'FAILED',
      };
    } catch (error) {
      throw new ValidationError(
        `Failed to validate execution output: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Create singleton instance
export const schemaValidator = new SchemaValidator();

// Predefined common schemas
export const commonSchemas = {
  codeReview: {
    type: 'object' as const,
    required: ['issues', 'overall_rating', 'summary'],
    properties: {
      issues: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          required: ['type', 'severity', 'description'],
          properties: {
            type: {
              type: 'string' as const,
              enum: [
                'security',
                'performance',
                'style',
                'bug',
                'maintainability',
              ],
            },
            severity: {
              type: 'string' as const,
              enum: ['low', 'medium', 'high', 'critical'],
            },
            description: { type: 'string' as const },
            suggestion: { type: 'string' as const },
            line_number: { type: 'number' as const, minimum: 1 },
          },
        },
      },
      overall_rating: {
        type: 'number' as const,
        minimum: 1,
        maximum: 10,
      },
      summary: {
        type: 'string' as const,
        minLength: 10,
        maxLength: 500,
      },
    },
  },

  emailStructure: {
    type: 'object' as const,
    required: ['subject', 'greeting', 'body', 'closing'],
    properties: {
      subject: { type: 'string' as const, minLength: 5, maxLength: 100 },
      greeting: { type: 'string' as const },
      body: { type: 'string' as const, minLength: 20 },
      closing: { type: 'string' as const },
      call_to_action: { type: 'string' as const },
    },
  },

  dataInsights: {
    type: 'object' as const,
    required: ['key_findings', 'recommendations', 'data_quality'],
    properties: {
      key_findings: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
      recommendations: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          required: ['action', 'impact', 'priority'],
          properties: {
            action: { type: 'string' as const },
            impact: {
              type: 'string' as const,
              enum: ['low', 'medium', 'high'],
            },
            priority: {
              type: 'string' as const,
              enum: ['low', 'medium', 'high'],
            },
          },
        },
      },
      data_quality: {
        type: 'object' as const,
        required: ['completeness', 'accuracy'],
        properties: {
          completeness: { type: 'number' as const, minimum: 0, maximum: 100 },
          accuracy: { type: 'number' as const, minimum: 0, maximum: 100 },
          issues: {
            type: 'array' as const,
            items: { type: 'string' as const },
          },
        },
      },
    },
  },
};
