// Variable Definition Editor - Complete Implementation (Phases 1, 2 & 3)
// Implements Advanced Variable Detection, Type System & History Management, Performance & Accessibility
// As specified in VARIABLE_DEFINITION_EDITOR_PLAN.md

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  VariableDefinitionEditorProps,
  VariableDefinition,
  AdvancedParseResult,
} from './types';
import {
  AdvancedVariableParser,
  OptimizedTemplateParser,
  handleTemplateEdgeCases,
} from './parsers/AdvancedVariableParser';
import { VariableDetectionDisplay } from './components/VariableDetectionDisplay';
import { VariableConfigurationTable } from './components/VariableConfigurationTable';
import { AccessibleVariableEditor } from './components/AccessibleVariableEditor';
import { useTypeConversion } from './hooks/useTypeConversion';
import { useUndoRedo } from './hooks/useUndoRedo';

export function VariableDefinitionEditor({
  template,
  variables,
  onChange,
  disabled = false,
  className = '',
}: VariableDefinitionEditorProps): JSX.Element {
  // Phase 3: Use enhanced accessible version with all optimizations
  const useEnhancedVersion = true; // Can be made configurable via props if needed

  if (useEnhancedVersion) {
    return (
      <AccessibleVariableEditor
        template={template}
        variables={variables}
        onChange={onChange}
        disabled={disabled}
        className={className}
      />
    );
  }

  // Original implementation (kept for backwards compatibility)
  const [parseResult, setParseResult] = useState<AdvancedParseResult>({
    variables: [],
    errors: [],
    warnings: [],
  });

  // Parse template and detect variables
  const parsedVariables = useMemo(() => {
    if (!template.trim()) {
      return { variables: [], errors: [], warnings: [] };
    }

    // Handle very long templates with chunk-based parsing
    if (template.length > 10000) {
      return {
        variables: [],
        errors: [
          {
            type: 'TEMPLATE_TOO_LONG' as const,
            message: 'Template exceeds maximum length of 10,000 characters',
            position: 10000,
            suggestion:
              'Consider breaking down your template into smaller parts',
          },
        ],
        warnings: [],
      };
    }

    // Use optimized parsing for large templates
    if (template.length > 5000) {
      return OptimizedTemplateParser.parseInChunks(template);
    }

    // Combine advanced parsing with edge case handling
    const advancedResult =
      AdvancedVariableParser.parseAdvancedTemplate(template);
    const edgeCaseResult = handleTemplateEdgeCases(template);

    // Merge results, prioritizing advanced parsing for valid variables
    const mergedVariables = [...advancedResult.variables];
    const mergedErrors = [...advancedResult.errors, ...edgeCaseResult.errors];
    const mergedWarnings = [
      ...advancedResult.warnings,
      ...edgeCaseResult.warnings,
    ];

    // Remove duplicate errors
    const uniqueErrors = mergedErrors.filter(
      (error, index, arr) =>
        arr.findIndex(
          e => e.position === error.position && e.type === error.type
        ) === index
    );

    return {
      variables: mergedVariables,
      errors: uniqueErrors,
      warnings: mergedWarnings,
    };
  }, [template]);

  // Update parse result when template changes
  useEffect(() => {
    setParseResult(parsedVariables);
  }, [parsedVariables]);

  // Extract variable names for detection display
  const detectedVariableNames = useMemo(() => {
    return parseResult.variables.map(v => v.fullPath);
  }, [parseResult.variables]);

  const existingVariableNames = useMemo(() => {
    return variables.map(v => v.name);
  }, [variables]);

  // Sync newly detected variables
  const handleSyncVariables = useCallback(() => {
    const newVariables = detectedVariableNames.filter(
      detected => !existingVariableNames.includes(detected)
    );

    if (newVariables.length === 0) return;

    const newVariableDefinitions: VariableDefinition[] = newVariables.map(
      variableName => {
        // Find the parsed variable for additional context
        const parsedVar = parseResult.variables.find(
          v => v.fullPath === variableName
        );

        return {
          name: variableName,
          type: 'string', // Default type
          required: true, // Default to required
          description:
            parsedVar?.type !== 'simple'
              ? `${parsedVar?.type === 'nested' ? 'Nested object' : 'Array-indexed'} variable`
              : undefined,
          defaultValue: undefined,
        };
      }
    );

    const updatedVariables = [...variables, ...newVariableDefinitions];
    onChange(updatedVariables);
  }, [
    detectedVariableNames,
    existingVariableNames,
    variables,
    onChange,
    parseResult.variables,
  ]);

  // Integrate Phase 2: Undo/Redo and Type Conversion
  const {
    pushToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    handleKeyDown: _handleHistoryKeyDown,
  } = useUndoRedo(variables);

  const { conversionMessages, clearConversionMessage } =
    useTypeConversion(variables);

  // Handle variable updates with history tracking
  const handleUpdateVariable = useCallback(
    (index: number, updatedVariable: VariableDefinition) => {
      const oldVariable = variables[index];
      const updatedVariables = [...variables];
      updatedVariables[index] = updatedVariable;
      onChange(updatedVariables);

      // Track in history
      const action =
        oldVariable.type !== updatedVariable.type
          ? `Changed type of "${updatedVariable.name}" from ${oldVariable.type} to ${updatedVariable.type}`
          : `Updated variable "${updatedVariable.name}"`;
      pushToHistory(updatedVariables, action);
    },
    [variables, onChange, pushToHistory]
  );

  // Handle variable deletion with history tracking
  const handleDeleteVariable = useCallback(
    (index: number) => {
      const variableToDelete = variables[index];
      const updatedVariables = variables.filter((_, i) => i !== index);
      onChange(updatedVariables);
      pushToHistory(
        updatedVariables,
        `Deleted variable "${variableToDelete.name}"`
      );
    },
    [variables, onChange, pushToHistory]
  );

  // Announcement handler for screen readers
  const handleVariableDetected = useCallback((_count: number) => {
    // This will be used by screen readers via the VariableDetectionDisplay component
  }, []);

  // Undo/redo keyboard handler
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'z':
            if (event.shiftKey && canRedo) {
              event.preventDefault();
              const nextVariables = redo();
              if (nextVariables) {
                onChange(nextVariables);
              }
            } else if (!event.shiftKey && canUndo) {
              event.preventDefault();
              const previousVariables = undo();
              if (previousVariables) {
                onChange(previousVariables);
              }
            }
            break;
          case 'y':
            if (canRedo) {
              event.preventDefault();
              const nextVariables = redo();
              if (nextVariables) {
                onChange(nextVariables);
              }
            }
            break;
        }
      }
    },
    [canUndo, canRedo, undo, redo, onChange]
  );

  return (
    <div
      className={`variable-editor space-y-4 ${className}`}
      role="region"
      aria-label="Variable Definition Editor"
      aria-describedby="variable-editor-description"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Screen reader only description */}
      <div id="variable-editor-description" className="sr-only">
        Configure variables detected in your template. Variables are
        automatically detected from your template using double brace syntax like{' '}
        {'{{variableName}}'}. Use Ctrl+Z to undo and Ctrl+Y to redo changes.
      </div>

      {/* Phase 2: Undo/Redo Controls */}
      {(canUndo || canRedo) && (
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const previousVariables = undo();
                if (previousVariables) onChange(previousVariables);
              }}
              disabled={!canUndo}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
              aria-label="Undo last action"
            >
              ↶ Undo
            </button>
            <button
              onClick={() => {
                const nextVariables = redo();
                if (nextVariables) onChange(nextVariables);
              }}
              disabled={!canRedo}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Y)"
              aria-label="Redo next action"
            >
              ↷ Redo
            </button>
          </div>
          <div className="text-xs text-muted-foreground">History available</div>
        </div>
      )}

      {/* Phase 2: Type Conversion Messages */}
      {Object.entries(conversionMessages)
        .filter(([, message]) => message)
        .map(([variableName, message]) => (
          <div
            key={variableName}
            className="p-3 bg-orange-50 border border-orange-200 rounded-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm">
                  Type conversion for {variableName}
                </p>
                <p className="text-sm text-muted-foreground">{message}</p>
              </div>
              <button
                onClick={() => clearConversionMessage(variableName)}
                className="ml-2 text-orange-600 hover:text-orange-800"
                aria-label={`Dismiss conversion message for ${variableName}`}
              >
                ×
              </button>
            </div>
          </div>
        ))}

      {/* Variable detection section */}
      <section role="status" aria-label="Variable Detection Results">
        <VariableDetectionDisplay
          detectedVariables={detectedVariableNames}
          existingVariables={existingVariableNames}
          onSyncVariables={handleSyncVariables}
          errors={parseResult.errors}
          warnings={parseResult.warnings}
          onVariableDetected={handleVariableDetected}
        />
      </section>

      {/* Variable configuration section */}
      <section aria-label="Variable Configuration">
        <VariableConfigurationTable
          variables={variables}
          onUpdateVariable={handleUpdateVariable}
          onDeleteVariable={handleDeleteVariable}
        />
      </section>

      {/* Debug information (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 p-4 bg-muted rounded-md text-sm">
          <summary className="cursor-pointer font-medium">
            Debug Information
          </summary>
          <div className="mt-2 space-y-2">
            <div>Template length: {template.length} characters</div>
            <div>Variables detected: {parseResult.variables.length}</div>
            <div>Errors found: {parseResult.errors.length}</div>
            <div>Warnings: {parseResult.warnings.length}</div>
            {parseResult.variables.length > 0 && (
              <div className="mt-2">
                <div className="font-medium">Parsed variables:</div>
                <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
                  {JSON.stringify(parseResult.variables, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

// Export default
export default VariableDefinitionEditor;
