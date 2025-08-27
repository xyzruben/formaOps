'use client';

import { useState, useEffect } from 'react';
import { Textarea } from '../../ui/textarea';
import type { TemplateEditorProps } from '../types';

export function TemplateEditor({
  value,
  onChange,
  placeholder = 'Enter your prompt template here. Use {{variableName}} for variables.',
  disabled = false,
  maxLength = 5000
}: TemplateEditorProps): JSX.Element {
  const [charCount, setCharCount] = useState(value.length);

  useEffect(() => {
    setCharCount(value.length);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      onChange(newValue);
      setCharCount(newValue.length);
    }
  };

  // Basic syntax highlighting effect (visual feedback for variables)
  const highlightVariables = (text: string) => {
    // This creates visual feedback by detecting variables
    const variableCount = (text.match(/\{\{[^}]+\}\}/g) || []).length;
    return variableCount;
  };

  const variableCount = highlightVariables(value);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label htmlFor="template-editor" className="text-sm font-medium">
          Template <span className="text-red-500">*</span>
        </label>
        <div className="text-xs text-gray-500 space-x-4">
          <span>{variableCount} variable{variableCount !== 1 ? 's' : ''} detected</span>
          <span>{charCount}/{maxLength} characters</span>
        </div>
      </div>
      
      <div className="relative">
        <Textarea
          id="template-editor"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className="template-editor min-h-[300px] p-4 border rounded-md font-mono text-sm resize-none"
          rows={12}
        />
        
        {/* Character limit warning */}
        {charCount > maxLength * 0.9 && (
          <div className="absolute bottom-2 right-2 text-xs text-orange-500 bg-white px-2 py-1 rounded shadow">
            Approaching character limit
          </div>
        )}
      </div>
      
      <div className="text-xs text-gray-500">
        <p>Use double curly braces to define variables: <code className="bg-gray-100 px-1 rounded">{'{{variableName}}'}</code></p>
        <p>Variables will be automatically detected and available for configuration.</p>
      </div>
    </div>
  );
}