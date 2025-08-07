import { z } from 'zod';

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
  errors: ValidationError[];
  validatedData?: unknown;
}

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
}

export class SchemaValidator {
  public validate(data: unknown, schema: SchemaValidationRule): ValidationResult {
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
        errors: [{
          path: 'root',
          message: error instanceof Error ? error.message : 'Schema validation error',
        }],
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
        if (rule.pattern) stringSchema = stringSchema.regex(new RegExp(rule.pattern));
        if (rule.enum) stringSchema = z.enum(rule.enum as [string, ...string[]]);
        
        return stringSchema;
      
      case 'number':
        let numberSchema = z.number();
        
        if (rule.minimum !== undefined) numberSchema = numberSchema.min(rule.minimum);
        if (rule.maximum !== undefined) numberSchema = numberSchema.max(rule.maximum);
        if (rule.enum) {
          const numericEnum = rule.enum.filter(v => typeof v === 'number') as number[];
          if (numericEnum.length > 0) {
            return z.enum(numericEnum as [number, ...number[]]);
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
}

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
              enum: ['security', 'performance', 'style', 'bug', 'maintainability'],
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
            impact: { type: 'string' as const, enum: ['low', 'medium', 'high'] },
            priority: { type: 'string' as const, enum: ['low', 'medium', 'high'] },
          },
        },
      },
      data_quality: {
        type: 'object' as const,
        required: ['completeness', 'accuracy'],
        properties: {
          completeness: { type: 'number' as const, minimum: 0, maximum: 100 },
          accuracy: { type: 'number' as const, minimum: 0, maximum: 100 },
          issues: { type: 'array' as const, items: { type: 'string' as const } },
        },
      },
    },
  },
};