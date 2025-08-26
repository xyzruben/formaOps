// Variable Configuration Table Component
// Implements Phase 1 basic structure from VARIABLE_DEFINITION_EDITOR_PLAN.md

import React, { useState, useCallback } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import { VariableTableProps, VariableDefinition, VariableType, AccessibilityProps } from '../types';

interface VariableRowProps {
  variable: VariableDefinition;
  index: number;
  isFocused?: boolean;
  onUpdate: (variable: VariableDefinition) => void;
  onDelete: () => void;
  accessibilityProps?: AccessibilityProps;
}

function VariableRow({ 
  variable, 
  index, 
  isFocused = false, 
  onUpdate, 
  onDelete,
  accessibilityProps 
}: VariableRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localVariable, setLocalVariable] = useState<VariableDefinition>(variable);

  const handleSave = useCallback(() => {
    onUpdate(localVariable);
    setIsEditing(false);
  }, [localVariable, onUpdate]);

  const handleCancel = useCallback(() => {
    setLocalVariable(variable);
    setIsEditing(false);
  }, [variable]);

  const handleFieldChange = useCallback((field: keyof VariableDefinition, value: any) => {
    setLocalVariable(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const typeOptions = [
    { value: 'string', label: 'String' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'array', label: 'Array' }
  ];

  return (
    <div 
      className={`variable-row border-b last:border-b-0 p-4 ${
        isFocused ? 'bg-muted ring-2 ring-primary' : ''
      }`}
      {...accessibilityProps}
    >
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
        {/* Variable Name */}
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor={`var-name-${index}`}>
            Name
          </label>
          {isEditing ? (
            <Input
              id={`var-name-${index}`}
              value={localVariable.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              className="text-sm"
              aria-label={`Variable name for ${variable.name}`}
            />
          ) : (
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="font-mono text-xs">
                {'{'}{'{'}{variable.name}{'}}'}
              </Badge>
            </div>
          )}
        </div>

        {/* Variable Type */}
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor={`var-type-${index}`}>
            Type
          </label>
          {isEditing ? (
            <select
              id={`var-type-${index}`}
              value={localVariable.type}
              onChange={(e) => handleFieldChange('type', e.target.value as VariableType)}
              className="w-full p-2 border border-input rounded-md text-sm"
              aria-label={`Variable type for ${variable.name}`}
            >
              {typeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <Badge variant="secondary" className="capitalize">
              {variable.type}
            </Badge>
          )}
        </div>

        {/* Required Toggle */}
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor={`var-required-${index}`}>
            Required
          </label>
          {isEditing ? (
            <div className="flex items-center space-x-2 pt-2">
              <input
                id={`var-required-${index}`}
                type="checkbox"
                checked={localVariable.required}
                onChange={(e) => handleFieldChange('required', e.target.checked)}
                className="rounded border-input"
                aria-label={`Required checkbox for ${variable.name}`}
              />
              <span className="text-sm">Required</span>
            </div>
          ) : (
            <Badge variant={variable.required ? "default" : "outline"}>
              {variable.required ? 'Yes' : 'No'}
            </Badge>
          )}
        </div>

        {/* Default Value */}
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor={`var-default-${index}`}>
            Default Value
          </label>
          {isEditing ? (
            <TypeSpecificInput
              id={`var-default-${index}`}
              type={localVariable.type}
              value={localVariable.defaultValue}
              onChange={(value) => handleFieldChange('defaultValue', value)}
              aria-label={`Default value for ${variable.name}`}
            />
          ) : (
            <div className="text-sm text-muted-foreground">
              {variable.defaultValue !== undefined && variable.defaultValue !== null 
                ? String(variable.defaultValue) 
                : '—'}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setIsEditing(true)}
                aria-label={`Edit ${variable.name}`}
              >
                Edit
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={onDelete}
                aria-label={`Delete ${variable.name}`}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Description field (full width when editing) */}
      {isEditing && (
        <div className="mt-4 space-y-1">
          <label className="text-sm font-medium" htmlFor={`var-description-${index}`}>
            Description (optional)
          </label>
          <Textarea
            id={`var-description-${index}`}
            value={localVariable.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Describe this variable's purpose..."
            className="text-sm"
            rows={2}
            aria-label={`Description for ${variable.name}`}
          />
        </div>
      )}
    </div>
  );
}

// Type-specific input component
function TypeSpecificInput({ 
  id, 
  type, 
  value, 
  onChange, 
  'aria-label': ariaLabel 
}: {
  id: string;
  type: VariableType;
  value: any;
  onChange: (value: any) => void;
  'aria-label'?: string;
}) {
  switch (type) {
    case 'string':
      return (
        <Input
          id={id}
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Default string value"
          className="text-sm"
          aria-label={ariaLabel}
        />
      );
    
    case 'number':
      return (
        <Input
          id={id}
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          placeholder="Default number"
          className="text-sm"
          aria-label={ariaLabel}
        />
      );
    
    case 'boolean':
      return (
        <div className="flex items-center space-x-2 pt-2">
          <input
            id={id}
            type="checkbox"
            checked={value || false}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded border-input"
            aria-label={ariaLabel}
          />
          <span className="text-sm">Default to true</span>
        </div>
      );
    
    case 'array':
      return (
        <Textarea
          id={id}
          value={Array.isArray(value) ? value.join(', ') : (value || '')}
          onChange={(e) => {
            const arrayValue = e.target.value
              .split(',')
              .map(item => item.trim())
              .filter(Boolean);
            onChange(arrayValue.length > 0 ? arrayValue : undefined);
          }}
          placeholder="item1, item2, item3"
          className="text-sm"
          rows={2}
          aria-label={ariaLabel}
        />
      );
    
    default:
      return (
        <Input
          id={id}
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm"
          aria-label={ariaLabel}
        />
      );
  }
}

// Main table component
export function VariableConfigurationTable({ 
  variables, 
  onUpdateVariable, 
  onDeleteVariable 
}: VariableTableProps) {
  const [focusedVariableIndex, setFocusedVariableIndex] = useState(-1);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedVariableIndex(prev => 
          Math.min(prev + 1, variables.length - 1)
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedVariableIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Delete':
        if (focusedVariableIndex >= 0) {
          onDeleteVariable(focusedVariableIndex);
        }
        break;
    }
  }, [focusedVariableIndex, variables.length, onDeleteVariable]);

  if (variables.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No variables detected in template</p>
        <p className="text-sm mt-1">
          Variables are automatically detected using {'{{variable}}'} syntax
        </p>
      </div>
    );
  }

  return (
    <div
      className="variable-table w-full border rounded-md"
      role="table"
      aria-label="Variable Configuration"
      aria-describedby="table-help"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Screen reader help */}
      <div id="table-help" className="sr-only">
        Configure each variable's type, requirements, and default values. 
        Use arrow keys to navigate, Delete key to remove variables.
      </div>
      
      {/* Table header */}
      <div role="rowgroup" className="bg-muted/50">
        <div role="row" className="variable-table-header grid grid-cols-1 md:grid-cols-5 gap-4 p-4 font-medium text-sm border-b">
          <div role="columnheader">Name</div>
          <div role="columnheader">Type</div>
          <div role="columnheader">Required</div>
          <div role="columnheader">Default Value</div>
          <div role="columnheader">Actions</div>
        </div>
      </div>
      
      {/* Table body */}
      <div role="rowgroup">
        {variables.map((variable, index) => (
          <VariableRow
            key={variable.name}
            variable={variable}
            index={index}
            isFocused={focusedVariableIndex === index}
            onUpdate={(updated) => onUpdateVariable(index, updated)}
            onDelete={() => onDeleteVariable(index)}
            accessibilityProps={{
              role: 'row',
              'aria-rowindex': index + 1,
              'aria-selected': focusedVariableIndex === index,
              tabIndex: focusedVariableIndex === index ? 0 : -1
            }}
          />
        ))}
      </div>
    </div>
  );
}