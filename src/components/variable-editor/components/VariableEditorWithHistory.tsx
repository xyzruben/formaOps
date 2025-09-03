// Enhanced Variable Editor with History
// Implements Phase 2 integration from VARIABLE_DEFINITION_EDITOR_PLAN.md

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Alert } from '../../ui/alert';
import { VariableDefinition, VariableType } from '../types';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { useTypeConversion } from '../hooks/useTypeConversion';
import { TypeCoercionSystem } from '../utils/TypeCoercionSystem';

interface VariableEditorWithHistoryProps {
  variables: VariableDefinition[];
  onChange: (variables: VariableDefinition[]) => void;
  onVariableDetected?: (count: number) => void;
}

export const VariableEditorWithHistory: React.FC<
  VariableEditorWithHistoryProps
> = ({
  variables: initialVariables,
  onChange,
  onVariableDetected: _onVariableDetected,
}) => {
  const [variables, setVariables] =
    useState<VariableDefinition[]>(initialVariables);
  const prevInitialVariablesRef =
    useRef<VariableDefinition[]>(initialVariables);

  const { pushToHistory, undo, redo, canUndo, canRedo, handleKeyDown } =
    useUndoRedo(variables);

  const { conversionMessages, clearConversionMessage } =
    useTypeConversion(variables);

  // Sync with parent component
  useEffect(() => {
    onChange(variables);
  }, [variables, onChange]);

  // Sync with external changes
  useEffect(() => {
    const prevInitialVariables = prevInitialVariablesRef.current;
    if (
      JSON.stringify(initialVariables) !== JSON.stringify(prevInitialVariables)
    ) {
      setVariables(initialVariables);
      prevInitialVariablesRef.current = initialVariables;
    }
  }, [initialVariables]);

  // Wrapper functions that include history tracking
  const addVariable = useCallback(
    (variable: VariableDefinition) => {
      const newVariables = [...variables, variable];
      setVariables(newVariables);
      pushToHistory(newVariables, `Added variable "${variable.name}"`);
    },
    [variables, pushToHistory]
  );

  const updateVariable = useCallback(
    (index: number, updatedVariable: VariableDefinition) => {
      const oldVariable = variables[index];

      // Check if this is a type change and handle conversion
      if (oldVariable.type !== updatedVariable.type) {
        const converted = TypeCoercionSystem.convertVariableType(
          oldVariable,
          updatedVariable.type
        );
        updatedVariable = { ...updatedVariable, ...converted };

        // Show conversion message if there's an error or warning
        if (
          converted.conversionResult &&
          (converted.conversionResult.error ||
            converted.conversionResult.warning)
        ) {
          // The message will be handled by useTypeConversion hook
        }
      }

      const newVariables = [...variables];
      newVariables[index] = updatedVariable;
      setVariables(newVariables);
      pushToHistory(newVariables, `Updated variable "${updatedVariable.name}"`);
    },
    [variables, pushToHistory]
  );

  const deleteVariable = useCallback(
    (index: number) => {
      const variableToDelete = variables[index];
      const newVariables = variables.filter((_, i) => i !== index);
      setVariables(newVariables);
      pushToHistory(
        newVariables,
        `Deleted variable "${variableToDelete.name}"`
      );
    },
    [variables, pushToHistory]
  );

  // Type change handler with conversion
  const handleVariableTypeChange = useCallback(
    (index: number, newType: VariableType) => {
      const variable = variables[index];
      const converted = TypeCoercionSystem.convertVariableType(
        variable,
        newType
      );
      updateVariable(index, converted);
    },
    [variables, updateVariable]
  );

  // Undo/redo handlers that update component state
  const handleUndo = useCallback(() => {
    const previousVariables = undo();
    if (previousVariables) {
      setVariables(previousVariables);
    }
  }, [undo]);

  const handleRedo = useCallback(() => {
    const nextVariables = redo();
    if (nextVariables) {
      setVariables(nextVariables);
    }
  }, [redo]);

  return (
    <div
      className="variable-editor-with-history space-y-4"
      onKeyDown={e => handleKeyDown(e.nativeEvent)}
      tabIndex={0}
    >
      {/* Undo/Redo Controls */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo last action"
          >
            ↶ Undo
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            aria-label="Redo next action"
          >
            ↷ Redo
          </Button>
        </div>

        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <span>
            {variables.length} variable{variables.length !== 1 ? 's' : ''}
          </span>
          {(canUndo || canRedo) && (
            <Badge variant="outline" className="text-xs">
              History: {canUndo ? '•' : ''} {canRedo ? '→' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Conversion Messages */}
      {Object.entries(conversionMessages)
        .filter(([, message]) => message)
        .map(([variableName, message]) => (
          <Alert key={variableName} variant="default" className="relative">
            <div className="pr-8">
              <p className="font-medium">Type Conversion: {variableName}</p>
              <p className="text-sm">{message}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2 h-6 w-6 p-0"
              onClick={() => clearConversionMessage(variableName)}
              aria-label={`Dismiss conversion message for ${variableName}`}
            >
              ×
            </Button>
          </Alert>
        ))}

      {/* Variable Management Actions */}
      <div className="flex items-center space-x-2">
        <Button
          size="sm"
          onClick={() => {
            const newVariable: VariableDefinition = {
              name: `variable${variables.length + 1}`,
              type: 'string',
              required: false,
              description: 'New variable',
            };
            addVariable(newVariable);
          }}
        >
          Add Variable
        </Button>

        {variables.length > 0 && (
          <span className="text-sm text-muted-foreground">
            Use Ctrl+Z to undo, Ctrl+Y to redo
          </span>
        )}
      </div>

      {/* Variables List */}
      <div className="space-y-2">
        {variables.map((variable, index) => (
          <VariableRowWithHistory
            key={`${variable.name}-${index}`}
            variable={variable}
            index={index}
            onUpdate={updated => updateVariable(index, updated)}
            onDelete={() => deleteVariable(index)}
            onTypeChange={newType => handleVariableTypeChange(index, newType)}
            conversionMessage={conversionMessages[variable.name]}
          />
        ))}
      </div>

      {/* Debug Info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 p-3 bg-muted rounded-md text-sm">
          <summary className="cursor-pointer font-medium">
            History Debug
          </summary>
          <div className="mt-2 space-y-1">
            <div>Can Undo: {canUndo ? 'Yes' : 'No'}</div>
            <div>Can Redo: {canRedo ? 'Yes' : 'No'}</div>
            <div>
              Conversion Messages: {Object.keys(conversionMessages).length}
            </div>
          </div>
        </details>
      )}
    </div>
  );
};

// Variable Row with History Integration
interface VariableRowWithHistoryProps {
  variable: VariableDefinition;
  index: number;
  onUpdate: (variable: VariableDefinition) => void;
  onDelete: () => void;
  onTypeChange: (newType: VariableType) => void;
  conversionMessage?: string;
}

const VariableRowWithHistory: React.FC<VariableRowWithHistoryProps> = ({
  variable,
  index: _index,
  onUpdate,
  onDelete,
  onTypeChange,
  conversionMessage,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localVariable, setLocalVariable] = useState(variable);

  // Sync with prop changes
  useEffect(() => {
    setLocalVariable(variable);
  }, [variable]);

  const handleSave = useCallback(() => {
    onUpdate(localVariable);
    setIsEditing(false);
  }, [localVariable, onUpdate]);

  const _handleCancel = useCallback(() => {
    setLocalVariable(variable);
    setIsEditing(false);
  }, [variable]);

  const handleTypeChangeLocal = useCallback(
    (newType: VariableType) => {
      setLocalVariable(prev => ({ ...prev, type: newType }));
      // Trigger conversion immediately
      onTypeChange(newType);
    },
    [onTypeChange]
  );

  const typeOptions: { value: VariableType; label: string }[] = [
    { value: 'string', label: 'String' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'array', label: 'Array' },
  ];

  return (
    <div
      className={`border rounded-md p-3 space-y-3 ${
        conversionMessage ? 'border-orange-200 bg-orange-50' : ''
      }`}
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>

      {isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={localVariable.name}
              onChange={e =>
                setLocalVariable(prev => ({ ...prev, name: e.target.value }))
              }
              className="w-full p-2 border rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={localVariable.type}
              onChange={e =>
                handleTypeChangeLocal(e.target.value as VariableType)
              }
              className="w-full p-2 border rounded-md text-sm"
            >
              {typeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              value={localVariable.description || ''}
              onChange={e =>
                setLocalVariable(prev => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full p-2 border rounded-md text-sm"
              rows={2}
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-end space-x-2">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={localVariable.required}
                onChange={e =>
                  setLocalVariable(prev => ({
                    ...prev,
                    required: e.target.checked,
                  }))
                }
              />
              <span>Required</span>
            </label>

            <Button size="sm" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      )}

      {conversionMessage && (
        <div className="p-2 bg-orange-100 border border-orange-200 rounded text-sm text-orange-800">
          {conversionMessage}
        </div>
      )}
    </div>
  );
};
