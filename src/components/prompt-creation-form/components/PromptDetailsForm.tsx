'use client';

import { useState } from 'react';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import { TemplateEditor } from './TemplateEditor';
import { VariableDefinitionEditor } from '../../variable-editor/VariableDefinitionEditor';
import { validateTemplateVariables } from '../validation';
import type { PromptFormData } from '../types';

interface PromptDetailsFormProps {
  formData: PromptFormData;
  onChange: (data: Partial<PromptFormData>) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

export function PromptDetailsForm({
  formData,
  onChange,
  errors,
  disabled = false,
}: PromptDetailsFormProps): JSX.Element {
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = tagInput.trim();
      if (tag && !formData.tags.includes(tag) && formData.tags.length < 5) {
        onChange({
          tags: [...formData.tags, tag],
        });
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string): void => {
    onChange({
      tags: formData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  // Validate template variables
  const templateValidation = validateTemplateVariables(
    formData.template,
    formData.variables
  );

  return (
    <div className="form-section space-y-6">
      {/* Basic Information Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Information</h3>

        {/* Prompt Name */}
        <div className="space-y-2">
          <label htmlFor="prompt-name" className="text-sm font-medium">
            Prompt Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="prompt-name"
            value={formData.name}
            onChange={e => onChange({ name: e.target.value })}
            placeholder="Enter prompt name"
            disabled={disabled}
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="prompt-description" className="text-sm font-medium">
            Description
          </label>
          <Textarea
            id="prompt-description"
            value={formData.description || ''}
            onChange={e => onChange({ description: e.target.value })}
            placeholder="Describe what this prompt does (optional)"
            rows={3}
            disabled={disabled}
            className={errors.description ? 'border-red-500' : ''}
          />
          {errors.description && (
            <p className="text-sm text-red-500">{errors.description}</p>
          )}
        </div>

        {/* Simple Tag Input */}
        <div className="space-y-2">
          <label htmlFor="prompt-tags" className="text-sm font-medium">
            Tags
          </label>
          <Input
            id="prompt-tags"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="Add tags (press Enter or comma to add)"
            disabled={disabled || formData.tags.length >= 5}
          />
          <p className="text-xs text-gray-500">
            Press Enter or comma to add tags. Maximum 5 tags allowed.
          </p>

          {/* Display Tags */}
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map(tag => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer hover:bg-red-100"
                  onClick={() => handleRemoveTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
          )}

          {errors.tags && <p className="text-sm text-red-500">{errors.tags}</p>}
        </div>
      </div>

      {/* Template Editor Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Template Editor</h3>

        <TemplateEditor
          value={formData.template}
          onChange={template => onChange({ template })}
          disabled={disabled}
        />

        {errors.template && (
          <p className="text-sm text-red-500">{errors.template}</p>
        )}

        {/* Template validation feedback */}
        {!templateValidation.isValid &&
          templateValidation.missingDefinitions.length > 0 && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-sm text-orange-800">
                The following variables are used in the template but not
                configured:{' '}
                <code className="bg-orange-100 px-1 rounded">
                  {templateValidation.missingDefinitions.join(', ')}
                </code>
              </p>
            </div>
          )}
      </div>

      {/* Variable Configuration Section */}
      <div className="variable-section space-y-4 border-t pt-4">
        <h3 className="text-lg font-medium">Variable Configuration</h3>

        <VariableDefinitionEditor
          template={formData.template}
          variables={formData.variables}
          onChange={variables => onChange({ variables })}
          disabled={disabled}
        />

        {errors.variables && (
          <p className="text-sm text-red-500">{errors.variables}</p>
        )}
      </div>
    </div>
  );
}
