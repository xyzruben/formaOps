// TypeScript interfaces from the plan
export interface PromptCreationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (prompt: Prompt) => void;
  onError?: (error: string) => void;
}

export interface PromptFormData {
  name: string;
  description?: string;
  template: string;
  variables: VariableDefinition[];
  tags: string[];
  status: 'DRAFT' | 'PUBLISHED';
}

export interface PromptCreationState {
  formData: PromptFormData;
  isSubmitting: boolean;
  errors: Record<string, string>;
}

// Template editor interfaces
export interface TemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}

// Preview interfaces
export interface PromptPreviewProps {
  template: string;
  variables: VariableDefinition[];
  sampleData?: Record<string, any>;
}

// API response types
export interface CreatePromptResponse {
  id: string;
  name: string;
  description: string | null;
  template: string;
  variables: VariableDefinition[];
  status: PromptStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromptRequest {
  name: string;
  description?: string;
  template: string;
  variables: VariableDefinition[];
  tags?: string[];
  status?: 'DRAFT' | 'PUBLISHED';
}

// Error types
export interface FormValidationError {
  field: string;
  message: string;
}

export interface APIError {
  error: string;
  code: string;
  details?: FormValidationError[];
}

// Import types from existing components
import type { VariableDefinition } from '../variable-editor/types';
export type { VariableDefinition };

// Define types that may not exist yet
export interface Prompt {
  id: string;
  name: string;
  description: string | null;
  template: string;
  variables: VariableDefinition[];
  status: PromptStatus;
  createdAt: string;
  updatedAt: string;
}

export type PromptStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
