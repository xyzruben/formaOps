'use client';

import { useState, useMemo } from 'react';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import type { PromptPreviewProps, VariableDefinition } from '../types';

export function PromptPreview({
  template,
  variables,
  sampleData = {},
}: PromptPreviewProps): JSX.Element {
  const [currentSampleData, setCurrentSampleData] =
    useState<Record<string, string | number | boolean | string[]>>(sampleData);

  // Generate default sample data for variables
  const defaultSampleData = useMemo(() => {
    const defaults: Record<string, string | number | boolean | string[]> = {};

    variables.forEach(variable => {
      if (variable.defaultValue !== undefined) {
        defaults[variable.name] = variable.defaultValue;
      } else {
        // Generate sample data based on type
        switch (variable.type) {
          case 'string':
            defaults[variable.name] =
              variable.options?.[0] || `sample_${variable.name}`;
            break;
          case 'number':
            defaults[variable.name] = 42;
            break;
          case 'boolean':
            defaults[variable.name] = true;
            break;
          case 'array':
            defaults[variable.name] = ['item1', 'item2'];
            break;
          default:
            defaults[variable.name] = `sample_${variable.name}`;
        }
      }
    });

    return defaults;
  }, [variables]);

  // Merge default sample data with current sample data
  const effectiveSampleData = useMemo(
    () => ({
      ...defaultSampleData,
      ...currentSampleData,
    }),
    [defaultSampleData, currentSampleData]
  );

  // Render template with variables
  const renderTemplate = useMemo(() => {
    if (!template) return '';

    let rendered = template;

    // Replace all variables with sample data
    variables.forEach(variable => {
      const value = effectiveSampleData[variable.name];
      const regex = new RegExp(`\\{\\{\\s*${variable.name}\\s*\\}\\}`, 'g');

      if (value !== undefined) {
        const displayValue = Array.isArray(value)
          ? value.join(', ')
          : String(value);
        rendered = rendered.replace(regex, displayValue);
      }
    });

    return rendered;
  }, [template, variables, effectiveSampleData]);

  const handleSampleDataChange = (
    variableName: string,
    value: string | number | boolean | string[]
  ): void => {
    setCurrentSampleData(
      (prev: Record<string, string | number | boolean | string[]>) => ({
        ...prev,
        [variableName]: value,
      })
    );
  };

  const parseInputValue = (
    value: string,
    type: VariableDefinition['type']
  ): string | number | boolean | string[] => {
    switch (type) {
      case 'number': {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
      }
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'array':
        return value
          .split(',')
          .map(item => item.trim())
          .filter(Boolean);
      default:
        return value;
    }
  };

  // Check for template validation issues
  const hasErrors =
    template && variables.length === 0 && template.includes('{{');
  const missingVariables = useMemo(() => {
    const templateVars = (template.match(/\{\{([^}]+)\}\}/g) || []).map(match =>
      match.slice(2, -2).trim()
    );
    const definedVars = variables.map(v => v.name);
    return templateVars.filter(v => !definedVars.includes(v));
  }, [template, variables]);

  if (!template.trim()) {
    return (
      <div className="preview-container bg-muted p-4 rounded-md">
        <p className="text-gray-500 text-center">
          Enter a template to see the preview
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sample Data Input Form */}
      {variables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sample Data</CardTitle>
            <p className="text-sm text-gray-600">
              Enter sample values to preview how your template will render
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {variables.map(variable => (
              <div key={variable.name} className="space-y-2">
                <label className="text-sm font-medium">
                  {variable.name}
                  {variable.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                  <span className="text-xs text-gray-500 ml-2">
                    ({variable.type})
                  </span>
                </label>

                {variable.options ? (
                  <select
                    value={String(effectiveSampleData[variable.name] || '')}
                    onChange={e =>
                      handleSampleDataChange(variable.name, e.target.value)
                    }
                    className="w-full p-2 border rounded-md text-sm"
                  >
                    {variable.options.map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={String(effectiveSampleData[variable.name] || '')}
                    onChange={e => {
                      const parsedValue = parseInputValue(
                        e.target.value,
                        variable.type
                      );
                      handleSampleDataChange(variable.name, parsedValue);
                    }}
                    placeholder={`Sample ${variable.type} value`}
                    className="text-sm"
                  />
                )}

                {variable.description && (
                  <p className="text-xs text-gray-500">
                    {variable.description}
                  </p>
                )}
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentSampleData(
                  defaultSampleData as Record<
                    string,
                    string | number | boolean | string[]
                  >
                )
              }
              className="mt-4"
            >
              Reset to Defaults
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Template Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Template Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Error Display */}
          {hasErrors && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">
                Template contains variables but no variables are configured.
              </p>
            </div>
          )}

          {missingVariables.length > 0 && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-sm text-orange-800">
                Missing variable definitions:{' '}
                <code className="bg-orange-100 px-1 rounded">
                  {missingVariables.join(', ')}
                </code>
              </p>
            </div>
          )}

          {/* Rendered Template */}
          <div className="preview-container bg-gray-50 p-4 rounded-md border">
            <div className="text-sm text-gray-600 mb-2">Rendered Output:</div>
            <div className="whitespace-pre-wrap font-mono text-sm bg-white p-3 rounded border">
              {renderTemplate || 'Template is empty'}
            </div>
          </div>

          {/* Template Statistics */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
            <div>
              <span className="font-medium">Characters:</span> {template.length}
            </div>
            <div>
              <span className="font-medium">Variables:</span> {variables.length}
            </div>
            <div>
              <span className="font-medium">Words:</span>{' '}
              {template.split(/\s+/).filter(Boolean).length}
            </div>
            <div>
              <span className="font-medium">Lines:</span>{' '}
              {template.split('\n').length}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
