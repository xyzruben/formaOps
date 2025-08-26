// Variable Definition Editor - Main Export
// Phase 1 Implementation from VARIABLE_DEFINITION_EDITOR_PLAN.md

export { VariableDefinitionEditor as default } from './VariableDefinitionEditor';
export { VariableDefinitionEditor } from './VariableDefinitionEditor';

// Types
export type {
  VariableType,
  VariableDefinition,
  VariableDefinitionEditorProps,
  ParsedVariable,
  AdvancedParseResult,
  ParseError,
  ParseWarning,
  VariableDetectionProps,
  VariableTableProps
} from './types';

// Components
export { VariableDetectionDisplay } from './components/VariableDetectionDisplay';
export { VariableConfigurationTable } from './components/VariableConfigurationTable';
export { VariableEditorWithHistory } from './components/VariableEditorWithHistory';
export { AccessibleVariableEditor } from './components/AccessibleVariableEditor';

// Parsers
export { AdvancedVariableParser, OptimizedTemplateParser, handleTemplateEdgeCases } from './parsers/AdvancedVariableParser';

// Validation
export {
  VariableDefinitionSchema,
  VariableDefinitionsSchema,
  validateDefaultValue,
  validateTemplateVariables,
  validateVariableName,
  validateVariableValue,
  validateVariable,
  extractVariablesFromTemplate
} from './validation';

// Phase 2: Type System & History Management
export { TypeCoercionSystem } from './utils/TypeCoercionSystem';
export { VariableHistoryManager } from './utils/VariableHistoryManager';
export { useTypeConversion } from './hooks/useTypeConversion';
export { useUndoRedo } from './hooks/useUndoRedo';

// Phase 3: Performance & Accessibility
export { useOptimizedVariableParser, VariablePerformanceMonitor } from './hooks/useOptimizedVariableParser';
export { useAccessibility, HighContrastStyles } from './hooks/useAccessibility';