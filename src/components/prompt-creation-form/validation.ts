import { z } from 'zod';
import type { VariableDefinition } from './types';

// Main form schema from the plan
export const CreatePromptSchema = z.object({
  name: z.string()
    .min(1, 'Prompt name is required')
    .max(100, 'Prompt name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Only letters, numbers, spaces, hyphens, and underscores allowed'),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  
  template: z.string()
    .min(1, 'Template is required')
    .max(5000, 'Template must be less than 5,000 characters'),
  
  variables: z.array(z.any()) // Will use VariableDefinitionSchema from Variable Editor
    .max(20, 'Maximum 20 variables allowed'),
  
  tags: z.array(z.string()
    .min(1, 'Tag name is required')
    .max(30, 'Tag name must be less than 30 characters')
    .regex(/^[a-zA-Z0-9\-_]+$/, 'Tags can only contain letters, numbers, hyphens, and underscores'))
    .max(5, 'Maximum 5 tags allowed'),
  
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT')
});

// Custom validation functions
export const validateTemplateVariables = (template: string, variables: VariableDefinition[]) => {
  const templateVars = extractVariablesFromTemplate(template);
  const definedVars = variables.map(v => v.name);
  
  const missingDefinitions = templateVars.filter(v => !definedVars.includes(v));
  
  return {
    isValid: missingDefinitions.length === 0,
    missingDefinitions
  };
};

// Extract variables from template helper
export const extractVariablesFromTemplate = (template: string): string[] => {
  const regex = /\{\{([^}]+)\}\}/g;
  const variables: string[] = [];
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    const variableName = match[1].trim();
    if (variableName && !variables.includes(variableName)) {
      variables.push(variableName);
    }
  }
  
  return variables;
};

// Error handling utilities
export const handleCreatePromptError = (error: unknown): string => {
  if (error instanceof z.ZodError) {
    return error.errors[0]?.message || 'Validation failed';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Failed to create prompt. Please try again.';
};