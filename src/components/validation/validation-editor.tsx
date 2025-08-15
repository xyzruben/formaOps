'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  commonSchemas,
  commonPatterns,
  commonFunctions,
} from '@/lib/validation/validator';
import type { ValidationRule } from '@/lib/validation/validator';
import type { ValidationType } from '@prisma/client';

interface ValidationEditorProps {
  rule?: Partial<ValidationRule>;
  onSave: (rule: ValidationRule) => void;
  onCancel: () => void;
  onTest?: (rule: ValidationRule, testInput: string) => Promise<any>;
}

export function ValidationEditor({
  rule,
  onSave,
  onCancel,
  onTest,
}: ValidationEditorProps): JSX.Element {
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [type, setType] = useState<ValidationType>(rule?.type || 'SCHEMA');
  const [config, setConfig] = useState<string>(
    rule?.config ? JSON.stringify(rule.config, null, 2) : ''
  );
  const [isActive, setIsActive] = useState(rule?.isActive ?? true);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreset = useCallback(
    (presetKey: string) => {
      let preset: any;

      switch (type) {
        case 'SCHEMA':
          preset = commonSchemas[presetKey as keyof typeof commonSchemas];
          break;
        case 'REGEX':
          preset = commonPatterns[presetKey as keyof typeof commonPatterns];
          break;
        case 'FUNCTION':
          preset = commonFunctions[presetKey as keyof typeof commonFunctions];
          break;
      }

      if (preset) {
        setConfig(JSON.stringify(preset, null, 2));
        if (!name) {
          setName(
            presetKey
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase())
          );
        }
      }
    },
    [type, name]
  );

  const handleSave = useCallback(() => {
    try {
      const parsedConfig = JSON.parse(config);

      const newRule: ValidationRule = {
        id: rule?.id || crypto.randomUUID(),
        name: name.trim(),
        type,
        config: parsedConfig,
        isActive,
        description: description.trim() || undefined,
      };

      onSave(newRule);
    } catch (err) {
      setError('Invalid JSON configuration');
    }
  }, [rule?.id, name, type, config, isActive, description, onSave]);

  const handleTest = useCallback(async () => {
    if (!onTest || !testInput.trim()) return;

    try {
      setTesting(true);
      setError(null);

      const testRule: ValidationRule = {
        id: 'test',
        name: name || 'Test Rule',
        type,
        config: JSON.parse(config),
        isActive: true,
        description,
      };

      const result = await onTest(testRule, testInput);
      setTestResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  }, [onTest, testInput, name, type, config, description]);

  const getPresetOptions = () => {
    switch (type) {
      case 'SCHEMA':
        return Object.keys(commonSchemas);
      case 'REGEX':
        return Object.keys(commonPatterns);
      case 'FUNCTION':
        return Object.keys(commonFunctions);
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {rule?.id ? 'Edit Validation Rule' : 'Create Validation Rule'}
          </CardTitle>
          <CardDescription>
            Define how to validate AI output for quality and correctness.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Email Format Validator"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={type}
                onValueChange={(value: ValidationType) => {
                  setType(value);
                  setConfig('');
                  setTestResult(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCHEMA">Schema Validation</SelectItem>
                  <SelectItem value="REGEX">Regex Pattern</SelectItem>
                  <SelectItem value="FUNCTION">Custom Function</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of what this rule validates"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Configuration</label>
              <div className="flex items-center gap-2">
                <Select onValueChange={loadPreset}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Load preset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getPresetOptions().map(preset => (
                      <SelectItem key={preset} value={preset}>
                        {preset
                          .replace(/([A-Z])/g, ' $1')
                          .replace(/^./, str => str.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsActive(!isActive)}
                >
                  <Badge variant={isActive ? 'default' : 'secondary'}>
                    {isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </Button>
              </div>
            </div>
            <Textarea
              value={config}
              onChange={e => setConfig(e.target.value)}
              placeholder={`Enter ${type.toLowerCase()} configuration as JSON...`}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Test Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test Validation</CardTitle>
          <CardDescription>
            Test your validation rule with sample input to ensure it works
            correctly.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Test Input</label>
            <Textarea
              value={testInput}
              onChange={e => setTestInput(e.target.value)}
              placeholder="Enter sample output to test validation against..."
              className="min-h-[100px]"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleTest}
              disabled={!testInput.trim() || !config.trim() || testing}
            >
              {testing ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              Test Validation
            </Button>
          </div>

          {testResult && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Test Result</label>
              <div
                className={`p-3 rounded border ${
                  testResult.isValid
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant={testResult.isValid ? 'default' : 'destructive'}
                  >
                    {testResult.isValid ? 'PASSED' : 'FAILED'}
                  </Badge>
                  {testResult.executionTime && (
                    <span className="text-xs text-muted-foreground">
                      {testResult.executionTime}ms
                    </span>
                  )}
                </div>

                {testResult.errors && testResult.errors.length > 0 && (
                  <div className="space-y-1">
                    {testResult.errors.map((error: any, index: number) => (
                      <div key={index} className="text-sm">
                        {error.path && (
                          <span className="font-medium">{error.path}: </span>
                        )}
                        {error.message}
                      </div>
                    ))}
                  </div>
                )}

                {testResult.result && (
                  <div className="mt-2">
                    <span className="text-xs text-muted-foreground">
                      Result:
                    </span>
                    <pre className="text-xs mt-1 p-2 bg-white/50 rounded">
                      {JSON.stringify(testResult.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!name.trim() || !config.trim()}>
          Save Validation Rule
        </Button>
      </div>
    </div>
  );
}
