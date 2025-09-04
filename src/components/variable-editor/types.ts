// Variable Definition Editor Types
// Following the exact specification from VARIABLE_DEFINITION_EDITOR_PLAN.md

export type VariableType = 'string' | 'number' | 'boolean' | 'array';

export interface VariableDefinition {
  name: string;
  type: VariableType;
  required: boolean;
  description?: string;
  defaultValue?: string | number | boolean | Array<string>;
  options?: string[];
}

// Core interfaces from the plan
export interface VariableDefinitionEditorProps {
  template: string;
  variables: VariableDefinition[];
  onChange: (variables: VariableDefinition[]) => void;
  disabled?: boolean;
  className?: string;
}

// Utility types
export interface ParsedVariable {
  name: string;
  fullPath: string;
  type: 'simple' | 'nested' | 'array_indexed';
  depth: number;
  position: number;
  isValid: boolean;
}

export interface VariableValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Edge case handling interfaces
export interface ParseError {
  type:
    | 'MALFORMED_SYNTAX'
    | 'INVALID_NESTING'
    | 'SPECIAL_CHARS'
    | 'EMPTY_NAME'
    | 'DUPLICATE_REFERENCE'
    | 'INVALID_STRUCTURE'
    | 'TEMPLATE_TOO_LONG';
  message: string;
  position: number;
  suggestion?: string;
}

export interface ParseWarning {
  type: 'DEEP_NESTING' | 'DYNAMIC_INDEXING';
  message: string;
  position: number;
  suggestion?: string;
}

// Advanced parsing interfaces
export interface AdvancedParseResult {
  variables: ParsedVariable[];
  errors: ParseError[];
  warnings: ParseWarning[];
}

// Component props
export interface VariableDetectionProps {
  detectedVariables: string[];
  existingVariables: string[];
  onSyncVariables: () => void;
}

export interface VariableTableProps {
  variables: VariableDefinition[];
  onUpdateVariable: (index: number, variable: VariableDefinition) => void;
  onDeleteVariable: (index: number) => void;
}

// Type conversion interfaces
export interface TypeConversionResult {
  success: boolean;
  convertedValue: string | number | boolean | Array<string>;
  error?: string;
  warning?: string;
}

export interface TypeConversionRules {
  from: VariableType;
  to: VariableType;
  converter: (
    value: string | number | boolean | Array<string>
  ) => TypeConversionResult;
  preserveOnFailure: boolean;
}

// History management interfaces
export interface HistoryState {
  variables: VariableDefinition[];
  timestamp: number;
  action: string;
}

export interface UndoRedoState {
  past: HistoryState[];
  present: HistoryState;
  future: HistoryState[];
}

// Accessibility interfaces
export interface AccessibilityProps {
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-rowindex'?: number;
  role?: string;
  tabIndex?: number;
}

// Error handling types
export interface VariableError {
  field: keyof VariableDefinition;
  message: string;
}

export interface ValidationError {
  variableIndex: number;
  errors: VariableError[];
}
