import { z } from 'zod';
import type { VariableDefinition } from '../../types/database';
import { ValidationError } from '../utils/error-handler';

export interface TemplateVariable {
  name: string;
  value: any;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
}

export interface TemplateResult {
  processedTemplate: string;
  missingVariables: string[];
  isValid: boolean;
}

// Zod schemas for validation
const VariableValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.any()),
]);

const TemplateVariableSchema = z.object({
  name: z.string().min(1),
  value: VariableValueSchema,
  type: z.enum(['string', 'number', 'boolean']),
  required: z.boolean(),
});

export class TemplateEngine {
  private static readonly VARIABLE_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
  private static readonly INVALID_CHARS = /<script|javascript:|data:/gi;

  public processTemplate(
    template: string,
    variables: Record<string, any>,
    variableDefinitions: VariableDefinition[]
  ): TemplateResult {
    try {
      // Validate template for security
      this.validateTemplate(template);

      // Extract variables from template
      const templateVariables = this.extractVariables(template);
      
      // Validate provided variables against definitions
      const validationResult = this.validateVariables(variables, variableDefinitions);
      
      if (!validationResult.isValid) {
        return {
          processedTemplate: template,
          missingVariables: validationResult.missingRequired,
          isValid: false,
        };
      }

      // Process template with variable substitution
      const processedTemplate = this.substituteVariables(template, variables, variableDefinitions);
      
      // Check for any remaining unsubstituted variables
      const remainingVariables = this.extractVariables(processedTemplate);
      const missingVariables = remainingVariables.filter(varName => 
        variableDefinitions.find(def => def.name === varName && def.required)
      );

      return {
        processedTemplate,
        missingVariables,
        isValid: missingVariables.length === 0,
      };
    } catch (error) {
      throw new ValidationError(
        `Template processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  public validateTemplate(template: string): void {
    if (!template || typeof template !== 'string') {
      throw new ValidationError('Template must be a non-empty string');
    }

    // Security check: prevent injection attacks
    if (TemplateEngine.INVALID_CHARS.test(template)) {
      throw new ValidationError('Template contains potentially dangerous content');
    }

    // Check for valid handlebars syntax
    const variableMatches = template.match(TemplateEngine.VARIABLE_PATTERN);
    if (variableMatches) {
      for (const match of variableMatches) {
        const variableName = match.replace(/\{\{\s*|\s*\}\}/g, '');
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variableName)) {
          throw new ValidationError(`Invalid variable name: ${variableName}`);
        }
      }
    }
  }

  public extractVariables(template: string): string[] {
    const variables: string[] = [];
    let match;
    
    const regex = new RegExp(TemplateEngine.VARIABLE_PATTERN);
    while ((match = regex.exec(template)) !== null) {
      const variableName = match[1].trim();
      if (!variables.includes(variableName)) {
        variables.push(variableName);
      }
    }
    
    return variables;
  }

  private validateVariables(
    variables: Record<string, any>,
    definitions: VariableDefinition[]
  ): {
    isValid: boolean;
    missingRequired: string[];
    typeErrors: Array<{ name: string; expected: string; received: string }>;
  } {
    const missingRequired: string[] = [];
    const typeErrors: Array<{ name: string; expected: string; received: string }> = [];

    for (const definition of definitions) {
      const value = variables[definition.name];
      
      // Check required variables
      if (definition.required && (value === undefined || value === null || value === '')) {
        missingRequired.push(definition.name);
        continue;
      }

      // Skip type validation for missing optional variables
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      const expectedType = definition.type;
      const actualType = this.getValueType(value);
      
      if (expectedType !== actualType) {
        // Try type coercion for common cases
        const coercedValue = this.coerceType(value, expectedType);
        if (coercedValue === null) {
          typeErrors.push({
            name: definition.name,
            expected: expectedType,
            received: actualType,
          });
        } else {
          // Update the variables object with coerced value
          variables[definition.name] = coercedValue;
        }
      }
    }

    return {
      isValid: missingRequired.length === 0 && typeErrors.length === 0,
      missingRequired,
      typeErrors,
    };
  }

  private substituteVariables(
    template: string,
    variables: Record<string, any>,
    definitions: VariableDefinition[]
  ): string {
    let processedTemplate = template;

    // First, apply default values for missing optional variables
    const definitionMap = new Map(definitions.map(def => [def.name, def]));
    
    const templateVariables = this.extractVariables(template);
    for (const varName of templateVariables) {
      const definition = definitionMap.get(varName);
      if (definition && variables[varName] === undefined && definition.defaultValue !== undefined) {
        variables[varName] = definition.defaultValue;
      }
    }

    // Substitute variables
    processedTemplate = processedTemplate.replace(
      TemplateEngine.VARIABLE_PATTERN,
      (match, variableName) => {
        const trimmedName = variableName.trim();
        const value = variables[trimmedName];
        
        if (value === undefined || value === null) {
          return match; // Keep original placeholder if no value
        }

        // Convert value to string, handling different types
        return this.valueToString(value);
      }
    );

    return processedTemplate;
  }

  private getValueType(value: any): 'string' | 'number' | 'boolean' | 'array' {
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    return 'string';
  }

  private coerceType(value: any, targetType: string): any {
    try {
      switch (targetType) {
        case 'string':
          return String(value);
        case 'number':
          const num = Number(value);
          return isNaN(num) ? null : num;
        case 'boolean':
          if (typeof value === 'string') {
            const lower = value.toLowerCase();
            if (lower === 'true' || lower === '1' || lower === 'yes') return true;
            if (lower === 'false' || lower === '0' || lower === 'no') return false;
            return null;
          }
          return Boolean(value);
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  private valueToString(value: any): string {
    if (Array.isArray(value)) {
      return value.map(v => String(v)).join(', ');
    }
    
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    
    return String(value);
  }

  public validateVariableDefinition(definition: VariableDefinition): void {
    const schema = z.object({
      name: z.string().min(1).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid variable name'),
      type: z.enum(['string', 'number', 'boolean', 'array']),
      required: z.boolean(),
      description: z.string().optional(),
      defaultValue: z.any().optional(),
      options: z.array(z.string()).optional(),
    });

    try {
      schema.parse(definition);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(e => e.message).join(', ');
        throw new ValidationError(`Variable definition validation failed: ${messages}`);
      }
      throw error;
    }

    // Additional validation
    if (definition.required && definition.defaultValue !== undefined) {
      throw new ValidationError(
        `Variable "${definition.name}" cannot be both required and have a default value`
      );
    }

    if (definition.options && definition.options.length === 0) {
      throw new ValidationError(
        `Variable "${definition.name}" options array cannot be empty`
      );
    }
  }

  public generateVariableForm(definitions: VariableDefinition[]): Array<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'checkbox' | 'select' | 'textarea';
    required: boolean;
    defaultValue?: any;
    options?: string[];
    placeholder?: string;
  }> {
    return definitions.map(def => {
      let type: 'text' | 'number' | 'checkbox' | 'select' | 'textarea' = 'text';
      let placeholder = def.description || `Enter ${def.name}`;

      // Determine form field type
      if (def.options && def.options.length > 0) {
        type = 'select';
      } else if (def.type === 'number') {
        type = 'number';
      } else if (def.type === 'boolean') {
        type = 'checkbox';
      } else if (def.type === 'string' && (!def.description || def.description.length > 50)) {
        type = 'textarea';
      }

      return {
        name: def.name,
        label: def.description || def.name.charAt(0).toUpperCase() + def.name.slice(1),
        type,
        required: def.required,
        defaultValue: def.defaultValue,
        options: def.options,
        placeholder,
      };
    });
  }

  public previewTemplate(
    template: string,
    variables: Record<string, any>,
    definitions: VariableDefinition[]
  ): {
    preview: string;
    warnings: string[];
    estimatedTokens: number;
  } {
    const result = this.processTemplate(template, variables, definitions);
    const warnings: string[] = [];

    // Add warnings for missing variables
    if (result.missingVariables.length > 0) {
      warnings.push(`Missing required variables: ${result.missingVariables.join(', ')}`);
    }

    // Estimate token count (rough approximation: 1 token ≈ 4 characters)
    const estimatedTokens = Math.ceil(result.processedTemplate.length / 4);

    // Add warnings for long templates
    if (estimatedTokens > 3000) {
      warnings.push('Template may exceed token limits for some models');
    }

    return {
      preview: result.processedTemplate,
      warnings,
      estimatedTokens,
    };
  }
}

// Create and export singleton instance
export const templateEngine = new TemplateEngine();