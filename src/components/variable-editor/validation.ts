// Variable Definition Validation
// Implements validation schemas from VARIABLE_DEFINITION_EDITOR_PLAN.md

import { z } from 'zod';
import { VariableType, VariableDefinition } from './types';

// Main variable definition schema as specified in the plan
export const VariableDefinitionSchema = z.object({
  name: z
    .string()
    .min(1, 'Variable name is required')
    .regex(
      /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      'Variable name must be a valid identifier'
    )
    .max(50, 'Variable name too long'),
  type: z.enum(['string', 'number', 'boolean', 'array']),
  required: z.boolean(),
  description: z.string().max(200, 'Description too long').optional(),
  defaultValue: z.any().optional(),
  options: z.array(z.string().min(1)).optional(),
});

// Array schema with uniqueness validation
export const VariableDefinitionsSchema = z
  .array(VariableDefinitionSchema)
  .refine(variables => {
    const names = variables.map(v => v.name);
    return names.length === new Set(names).size;
  }, 'Variable names must be unique');

// Custom validation for default values
export const validateDefaultValue = (
  value: any,
  type: VariableType
): boolean => {
  switch (type) {
    case 'string':
      return typeof value === 'string' || value === undefined;
    case 'number':
      return typeof value === 'number' || value === undefined;
    case 'boolean':
      return typeof value === 'boolean' || value === undefined;
    case 'array':
      return Array.isArray(value) || value === undefined;
    default:
      return false;
  }
};

// Template variable validation (supports nested and array-indexed)
export const validateTemplateVariables = (
  template: string,
  variables: VariableDefinition[]
) => {
  const templateVars = extractVariablesFromTemplate(template);
  const definedVars = variables.map(v => v.name);

  const missingDefinitions = templateVars.filter(v => !definedVars.includes(v));
  const unusedDefinitions = definedVars.filter(v => !templateVars.includes(v));

  return {
    isValid: missingDefinitions.length === 0,
    missingDefinitions,
    unusedDefinitions,
  };
};

// Extract variables from template using enhanced patterns
export const extractVariablesFromTemplate = (template: string): string[] => {
  const variablePattern =
    /\{\{([a-zA-Z_][a-zA-Z0-9_-]*(?:\[[a-zA-Z0-9_]+\])?(?:\.[a-zA-Z_][a-zA-Z0-9_-]*)*)\}\}/g;
  const matches: string[] = [];
  let match;

  while ((match = variablePattern.exec(template)) !== null) {
    matches.push(match[1]);
  }

  // Return unique variables
  return [...new Set(matches)];
};

// Variable name validation with enhanced support
export const validateVariableName = (
  name: string
): { isValid: boolean; error?: string } => {
  if (!name || name.length === 0) {
    return { isValid: false, error: 'Variable name cannot be empty' };
  }

  if (name.length > 50) {
    return {
      isValid: false,
      error: 'Variable name too long (max 50 characters)',
    };
  }

  // Support for nested variables and array indexing
  const nestedPattern =
    /^[a-zA-Z_][a-zA-Z0-9_-]*(?:\[[a-zA-Z0-9_]+\])?(?:\.[a-zA-Z_][a-zA-Z0-9_-]*)*$/;

  if (!nestedPattern.test(name)) {
    return {
      isValid: false,
      error:
        'Variable name must be a valid identifier (letters, numbers, underscores, dots for nesting, brackets for arrays)',
    };
  }

  // Check nesting depth (max 5 levels as specified in the plan)
  const parts = name.split('.');
  if (parts.length > 5) {
    return {
      isValid: false,
      error: 'Variable nesting too deep (maximum 5 levels)',
    };
  }

  return { isValid: true };
};

// Type-specific validation
export const validateVariableValue = (
  value: any,
  type: VariableType,
  options?: string[]
): { isValid: boolean; error?: string } => {
  if (value === undefined || value === null) {
    return { isValid: true }; // Allow empty values
  }

  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        return { isValid: false, error: 'Value must be a string' };
      }
      if (options && options.length > 0 && !options.includes(value)) {
        return {
          isValid: false,
          error: `Value must be one of: ${options.join(', ')}`,
        };
      }
      return { isValid: true };

    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return { isValid: false, error: 'Value must be a valid number' };
      }
      return { isValid: true };

    case 'boolean':
      if (typeof value !== 'boolean') {
        return { isValid: false, error: 'Value must be true or false' };
      }
      return { isValid: true };

    case 'array':
      if (!Array.isArray(value)) {
        return { isValid: false, error: 'Value must be an array' };
      }
      return { isValid: true };

    default:
      return { isValid: false, error: 'Unknown variable type' };
  }
};

// Comprehensive variable validation
export const validateVariable = (
  variable: VariableDefinition
): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  // Validate name
  const nameValidation = validateVariableName(variable.name);
  if (!nameValidation.isValid && nameValidation.error) {
    errors.push(nameValidation.error);
  }

  // Validate default value against type
  if (variable.defaultValue !== undefined) {
    const valueValidation = validateVariableValue(
      variable.defaultValue,
      variable.type,
      variable.options
    );
    if (!valueValidation.isValid && valueValidation.error) {
      errors.push(valueValidation.error);
    }
  }

  // Validate options (only for string type)
  if (variable.options && variable.options.length > 0) {
    if (variable.type !== 'string') {
      errors.push('Options are only supported for string variables');
    } else {
      const uniqueOptions = new Set(variable.options);
      if (uniqueOptions.size !== variable.options.length) {
        errors.push('Options must be unique');
      }
    }
  }

  // Validate description length
  if (variable.description && variable.description.length > 200) {
    errors.push('Description too long (max 200 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
