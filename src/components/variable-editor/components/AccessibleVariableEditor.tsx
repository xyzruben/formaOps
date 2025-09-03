// Accessible Variable Editor Component
// Implements Phase 3 accessibility from VARIABLE_DEFINITION_EDITOR_PLAN.md

import React, { useCallback, useEffect } from 'react';
import {
  VariableDefinition,
  VariableDefinitionEditorProps,
  ParsedVariable,
} from '../types';
import { useOptimizedVariableParser } from '../hooks/useOptimizedVariableParser';
import { useAccessibility } from '../hooks/useAccessibility';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { useTypeConversion } from '../hooks/useTypeConversion';
import { VariableDetectionDisplay } from './VariableDetectionDisplay';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';

export const AccessibleVariableEditor: React.FC<
  VariableDefinitionEditorProps
> = ({
  template,
  variables,
  onChange,
  disabled: _disabled = false,
  className = '',
}) => {
  // Phase 3: Performance optimization
  const {
    variables: detectedVariables,
    allVariables: allDetectedVariables,
    errors,
    warnings,
    hasMore,
    isDebouncing,
    loadMore,
    resetVisibleCount: _resetVisibleCount,
  } = useOptimizedVariableParser(template);

  // Phase 3: Accessibility
  const {
    announcementText,
    announceVariableDetection,
    announceVariableUpdate,
    announceTypeConversion,
    announceHistoryAction,
    focusedVariableIndex,
    handleKeyDown: handleAccessibilityKeyDown,
    setFocusedVariable,
    clearFocus: _clearFocus,
    getVariableAriaProps,
    getTableAriaProps,
    getAnnouncementAriaProps,
    highContrastMode,
    highContrastStyles,
  } = useAccessibility(variables);

  // Phase 2: History management
  const { pushToHistory, undo, redo, canUndo, canRedo } =
    useUndoRedo(variables);

  // Phase 2: Type conversion
  const {
    conversionMessages: _conversionMessages,
    clearConversionMessage: _clearConversionMessage,
  } = useTypeConversion(variables);

  // Extract variable names for detection display
  const detectedVariableNames = allDetectedVariables.map(
    (v: ParsedVariable) => v.fullPath
  );
  const existingVariableNames = variables.map(
    (v: VariableDefinition) => v.name
  );

  // Sync newly detected variables
  const handleSyncVariables = useCallback(() => {
    const newVariables = detectedVariableNames.filter(
      (detected: string) => !existingVariableNames.includes(detected)
    );

    if (newVariables.length === 0) return;

    const newVariableDefinitions: VariableDefinition[] = newVariables.map(
      (variableName: string) => {
        const parsedVar = allDetectedVariables.find(
          (v: ParsedVariable) => v.fullPath === variableName
        );

        return {
          name: variableName,
          type: 'string',
          required: true,
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
    pushToHistory(
      updatedVariables,
      `Added ${newVariables.length} new variable(s)`
    );

    // Announce to screen readers
    announceVariableUpdate(
      'template',
      `${newVariables.length} new variables added`
    );
  }, [
    detectedVariableNames,
    existingVariableNames,
    variables,
    onChange,
    allDetectedVariables,
    pushToHistory,
    announceVariableUpdate,
  ]);

  // Handle variable updates with accessibility announcements
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

      // Accessibility announcements
      if (oldVariable.type !== updatedVariable.type) {
        announceTypeConversion(
          updatedVariable.name,
          oldVariable.type,
          updatedVariable.type
        );
      } else {
        announceVariableUpdate(updatedVariable.name, 'configuration');
      }
    },
    [
      variables,
      onChange,
      pushToHistory,
      announceTypeConversion,
      announceVariableUpdate,
    ]
  );

  // Handle variable deletion with accessibility
  const handleDeleteVariable = useCallback(
    (index: number) => {
      const variableToDelete = variables[index];
      const updatedVariables = variables.filter((_, i) => i !== index);
      onChange(updatedVariables);
      pushToHistory(
        updatedVariables,
        `Deleted variable "${variableToDelete.name}"`
      );

      // Announce deletion
      announceVariableUpdate(variableToDelete.name, 'deleted');

      // Adjust focus if necessary
      if (focusedVariableIndex === index) {
        setFocusedVariable(Math.max(0, index - 1));
      } else if (focusedVariableIndex > index) {
        setFocusedVariable(focusedVariableIndex - 1);
      }
    },
    [
      variables,
      onChange,
      pushToHistory,
      announceVariableUpdate,
      focusedVariableIndex,
      setFocusedVariable,
    ]
  );

  // Enhanced keyboard handling
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Handle accessibility navigation first
      const accessibilityResult = handleAccessibilityKeyDown(event.nativeEvent);

      if (accessibilityResult) {
        switch (accessibilityResult.action) {
          case 'edit':
            // Implementation would trigger edit mode for focused variable
            break;
          case 'duplicate':
            if (
              accessibilityResult.index >= 0 &&
              accessibilityResult.index < variables.length
            ) {
              const variableToDuplicate = variables[accessibilityResult.index];
              const duplicatedVariable: VariableDefinition = {
                ...variableToDuplicate,
                name: `${variableToDuplicate.name}_copy`,
              };
              const updatedVariables = [...variables, duplicatedVariable];
              onChange(updatedVariables);
              pushToHistory(
                updatedVariables,
                `Duplicated variable "${variableToDuplicate.name}"`
              );
              announceVariableUpdate(duplicatedVariable.name, 'duplicated');
            }
            break;
          case 'delete':
            if (
              accessibilityResult.index >= 0 &&
              accessibilityResult.index < variables.length
            ) {
              handleDeleteVariable(accessibilityResult.index);
            }
            break;
        }
        return;
      }

      // Handle undo/redo
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'z':
            if (event.shiftKey && canRedo) {
              event.preventDefault();
              const nextVariables = redo();
              if (nextVariables) {
                onChange(nextVariables);
                announceHistoryAction('redo', 'last action');
              }
            } else if (!event.shiftKey && canUndo) {
              event.preventDefault();
              const previousVariables = undo();
              if (previousVariables) {
                onChange(previousVariables);
                announceHistoryAction('undo', 'last action');
              }
            }
            break;
          case 'y':
            if (canRedo) {
              event.preventDefault();
              const nextVariables = redo();
              if (nextVariables) {
                onChange(nextVariables);
                announceHistoryAction('redo', 'last action');
              }
            }
            break;
        }
      }
    },
    [
      handleAccessibilityKeyDown,
      variables,
      onChange,
      pushToHistory,
      announceVariableUpdate,
      handleDeleteVariable,
      canUndo,
      canRedo,
      undo,
      redo,
      announceHistoryAction,
    ]
  );

  // Announce variable detection
  useEffect(() => {
    if (allDetectedVariables.length > 0) {
      announceVariableDetection(allDetectedVariables.length);
    }
  }, [allDetectedVariables.length, announceVariableDetection]);

  return (
    <div
      className={`variable-editor ${className}`}
      style={highContrastMode ? highContrastStyles : undefined}
      role="region"
      aria-label="Variable Definition Editor"
      aria-describedby="variable-editor-description"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Screen reader description */}
      <div id="variable-editor-description" className="sr-only">
        Configure variables detected in your template. Use arrow keys to
        navigate, Enter to edit, Delete to remove variables. Press Ctrl+Z to
        undo, Ctrl+Y to redo, Ctrl+D to duplicate focused variable.
      </div>

      {/* Live announcements */}
      <div {...getAnnouncementAriaProps()}>{announcementText}</div>

      {/* Performance indicator */}
      {isDebouncing && (
        <div className="flex items-center space-x-2 p-2 bg-blue-50 border border-blue-200 rounded-md text-sm">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Analyzing template...</span>
        </div>
      )}

      {/* Undo/Redo controls */}
      {(canUndo || canRedo) && (
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const previousVariables = undo();
                if (previousVariables) {
                  onChange(previousVariables);
                  announceHistoryAction('undo', 'last action');
                }
              }}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              aria-label="Undo last action"
            >
              ↶ Undo
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const nextVariables = redo();
                if (nextVariables) {
                  onChange(nextVariables);
                  announceHistoryAction('redo', 'last action');
                }
              }}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              aria-label="Redo next action"
            >
              ↷ Redo
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            {canUndo ? 'History available' : ''}{' '}
            {canRedo ? '• Redo available' : ''}
          </div>
        </div>
      )}

      {/* Variable detection section */}
      <section role="status" aria-label="Variable Detection Results">
        <VariableDetectionDisplay
          detectedVariables={detectedVariableNames}
          existingVariables={existingVariableNames}
          onSyncVariables={handleSyncVariables}
          errors={errors}
          warnings={warnings}
          onVariableDetected={announceVariableDetection}
        />
      </section>

      {/* Lazy loading for large lists */}
      {hasMore && (
        <div className="text-center p-4">
          <Button
            size="sm"
            variant="outline"
            onClick={loadMore}
            aria-label={`Load more variables. Showing ${detectedVariables.length} of ${allDetectedVariables.length}`}
          >
            Load More Variables ({detectedVariables.length} of{' '}
            {allDetectedVariables.length})
          </Button>
        </div>
      )}

      {/* Variable configuration table */}
      <section aria-label="Variable Configuration">
        <div {...getTableAriaProps()}>
          <div id="table-help" className="sr-only">
            Configure each variable's type, requirements, and default values.
            Use keyboard shortcuts: Arrow keys to navigate, Enter to edit,
            Delete to remove, Ctrl+D to duplicate.
          </div>

          {variables.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No variables configured</p>
              <p className="text-sm mt-1">
                Variables will appear here when detected in your template
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {variables.map((variable, index) => (
                <AccessibleVariableRow
                  key={`${variable.name}-${index}`}
                  variable={variable}
                  index={index}
                  isFocused={focusedVariableIndex === index}
                  onUpdate={updated => handleUpdateVariable(index, updated)}
                  onDelete={() => handleDeleteVariable(index)}
                  onFocus={() => setFocusedVariable(index)}
                  ariaProps={getVariableAriaProps(variable, index)}
                  highContrastMode={highContrastMode}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Keyboard shortcuts help */}
      <details className="mt-4 p-3 bg-muted/50 rounded-md">
        <summary className="cursor-pointer text-sm font-medium">
          Keyboard Shortcuts
        </summary>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <div>
            <kbd>↑/↓</kbd> Navigate variables
          </div>
          <div>
            <kbd>Enter</kbd> Edit focused variable
          </div>
          <div>
            <kbd>Delete</kbd> Remove focused variable
          </div>
          <div>
            <kbd>Ctrl+D</kbd> Duplicate variable
          </div>
          <div>
            <kbd>Ctrl+Z</kbd> Undo last action
          </div>
          <div>
            <kbd>Ctrl+Y</kbd> Redo next action
          </div>
        </div>
      </details>

      {/* Debug information (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 p-3 bg-muted rounded-md text-sm">
          <summary className="cursor-pointer font-medium">
            Accessibility Debug
          </summary>
          <div className="mt-2 space-y-1">
            <div>High Contrast Mode: {highContrastMode ? 'Yes' : 'No'}</div>
            <div>
              Focused Variable:{' '}
              {focusedVariableIndex >= 0
                ? variables[focusedVariableIndex]?.name
                : 'None'}
            </div>
            <div>
              Visible Variables: {detectedVariables.length} of{' '}
              {allDetectedVariables.length}
            </div>
            <div>Is Debouncing: {isDebouncing ? 'Yes' : 'No'}</div>
            <div>Announcement: {announcementText || 'None'}</div>
          </div>
        </details>
      )}
    </div>
  );
};

// Accessible Variable Row Component
interface AccessibleVariableRowProps {
  variable: VariableDefinition;
  index: number;
  isFocused: boolean;
  onUpdate: (variable: VariableDefinition) => void;
  onDelete: () => void;
  onFocus: () => void;
  ariaProps: Record<string, any>;
  highContrastMode: boolean;
}

const AccessibleVariableRow: React.FC<AccessibleVariableRowProps> = ({
  variable,
  index,
  isFocused,
  onUpdate: _onUpdate,
  onDelete,
  onFocus,
  ariaProps,
  highContrastMode,
}) => {
  return (
    <div
      className={`border rounded-md p-3 ${
        isFocused ? 'ring-2 ring-primary bg-primary/5' : ''
      } ${highContrastMode ? 'border-2' : ''}`}
      {...ariaProps}
      onClick={onFocus}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="font-mono text-xs">
            {'{'}
            {'{'}
            {variable.name}
            {'}}'}
          </Badge>
          <Badge variant="secondary" className="capitalize">
            {variable.type}
          </Badge>
          {variable.required && (
            <Badge variant="destructive" className="text-xs">
              Required
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline">
            Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>

      {variable.description && (
        <p
          className="mt-2 text-sm text-muted-foreground"
          id={`var-desc-${index}`}
        >
          {variable.description}
        </p>
      )}
    </div>
  );
};
