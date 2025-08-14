'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
// Note: Using native select to avoid Radix dependency
import { LoadingSpinner } from '../ui/loading-spinner';
import { Badge } from '../ui/badge';
import type { Prompt, VariableDefinition } from '../../types/database';

interface ExecutionPanelProps {
  prompt: Prompt;
  onExecutionComplete?: (result: ExecutionResult) => void;
}

interface ExecutionError {
  error: string;
  code: string;
  retryable?: boolean;
  retryAfter?: number;
  executionId?: string;
}

interface ExecutionResult {
  executionId: string;
  status: string;
  output: string;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  costUsd: number;
  validationStatus: string;
  validationErrors: Array<{
    path: string;
    message: string;
  }>;
}

// Dynamic form schema based on prompt variables
const createExecutionSchema = (variables: VariableDefinition[]) => {
  const inputsSchema: Record<string, z.ZodSchema> = {};
  
  variables.forEach(variable => {
    let schema: z.ZodSchema;
    
    switch (variable.type) {
      case 'string':
        schema = z.string();
        if (variable.options && variable.options.length > 0) {
          schema = z.enum(variable.options as [string, ...string[]]);
        }
        break;
      case 'number':
        schema = z.coerce.number();
        break;
      case 'boolean':
        schema = z.boolean();
        break;
      case 'array':
        schema = z.array(z.string());
        break;
      default:
        schema = z.string();
    }
    
    if (!variable.required) {
      schema = schema.optional();
    }
    
    inputsSchema[variable.name] = schema;
  });

  return z.object({
    inputs: z.object(inputsSchema),
    model: z.enum(['gpt-3.5-turbo', 'gpt-4']).default('gpt-3.5-turbo'),
    maxTokens: z.number().min(1).max(4000).default(2000),
    temperature: z.number().min(0).max(2).default(0.7),
  });
};

export function ExecutionPanel({ prompt, onExecutionComplete }: ExecutionPanelProps): JSX.Element {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<ExecutionError | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number>(0);

  // Parse variables from prompt (assuming they're stored as JSON)
  const variables: VariableDefinition[] = Array.isArray(prompt.variables) 
    ? prompt.variables as unknown as VariableDefinition[]
    : [];

  const executionSchema = createExecutionSchema(variables);
  type ExecutionFormData = z.infer<typeof executionSchema>;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<ExecutionFormData>({
    resolver: zodResolver(executionSchema),
    defaultValues: {
      inputs: variables.reduce((acc, variable) => {
        if (variable.defaultValue !== undefined) {
          acc[variable.name] = variable.defaultValue;
        }
        return acc;
      }, {} as Record<string, any>),
      model: 'gpt-3.5-turbo',
      maxTokens: 2000,
      temperature: 0.7,
    },
  });

  const watchedModel = watch('model');
  const watchedMaxTokens = watch('maxTokens');
  const watchedTemperature = watch('temperature');

  const onSubmit = async (data: ExecutionFormData) => {
    try {
      setIsExecuting(true);
      setError(null);
      setExecutionResult(null);

      const response = await fetch(`/api/prompts/${prompt.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: data.inputs,
          model: data.model,
          maxTokens: data.maxTokens,
          temperature: data.temperature,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const executionError: ExecutionError = {
          error: errorData.error || 'Failed to execute prompt',
          code: errorData.code || 'UNKNOWN_ERROR',
          retryable: errorData.retryable || false,
          retryAfter: errorData.retryAfter,
          executionId: errorData.executionId
        };
        
        // Start countdown for rate limit errors
        if (executionError.code === 'RATE_LIMIT' && executionError.retryAfter) {
          setRetryCountdown(executionError.retryAfter);
          const interval = setInterval(() => {
            setRetryCountdown(prev => {
              if (prev <= 1) {
                clearInterval(interval);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
        
        setError(executionError);
        return;
      }

      const result = await response.json();
      setExecutionResult(result);
      onExecutionComplete?.(result);
    } catch (err) {
      const executionError: ExecutionError = {
        error: err instanceof Error ? err.message : 'Unknown error occurred',
        code: 'CLIENT_ERROR',
        retryable: true
      };
      setError(executionError);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReset = () => {
    reset();
    setExecutionResult(null);
    setError(null);
  };

  const renderVariableInput = (variable: VariableDefinition) => {
    const fieldName = `inputs.${variable.name}` as const;
    const fieldError = errors.inputs?.[variable.name];

    if (variable.options && variable.options.length > 0) {
      return (
        <div key={variable.name} className="space-y-2">
          <label className="text-sm font-medium">
            {variable.name}
            {variable.required && <span className="text-destructive ml-1">*</span>}
          </label>
          {variable.description && (
            <p className="text-xs text-muted-foreground">{variable.description}</p>
          )}
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={watch(`inputs.${variable.name}`) || ''}
            onChange={(e) => setValue(`inputs.${variable.name}`, e.target.value)}
          >
            <option value="">{`Select ${variable.name}`}</option>
            {variable.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {fieldError && (
            <p className="text-xs text-destructive">{fieldError.message}</p>
          )}
        </div>
      );
    }

    if (variable.type === 'boolean') {
      return (
        <div key={variable.name} className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              {...register(fieldName)}
              className="rounded border-input"
            />
            <span className="text-sm font-medium">
              {variable.name}
              {variable.required && <span className="text-destructive ml-1">*</span>}
            </span>
          </label>
          {variable.description && (
            <p className="text-xs text-muted-foreground">{variable.description}</p>
          )}
          {fieldError && (
            <p className="text-xs text-destructive">{fieldError.message}</p>
          )}
        </div>
      );
    }

    return (
      <div key={variable.name} className="space-y-2">
        <label className="text-sm font-medium">
          {variable.name}
          {variable.required && <span className="text-destructive ml-1">*</span>}
        </label>
        {variable.description && (
          <p className="text-xs text-muted-foreground">{variable.description}</p>
        )}
        <Input
          type={variable.type === 'number' ? 'number' : 'text'}
          placeholder={variable.defaultValue ? String(variable.defaultValue) : `Enter ${variable.name}`}
          {...register(fieldName, { 
            valueAsNumber: variable.type === 'number' 
          })}
        />
        {fieldError && (
          <p className="text-xs text-destructive">{fieldError.message}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Execute Prompt
            <Badge variant="outline">{prompt.status}</Badge>
          </CardTitle>
          <CardDescription>
            {prompt.description || 'Configure variables and execute this prompt'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Variables Section */}
            {variables.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Variables</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {variables.map(renderVariableInput)}
                </div>
              </div>
            )}

            {/* Model Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Model Configuration</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Model</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={watchedModel}
                    onChange={(e) => setValue('model', e.target.value as 'gpt-3.5-turbo' | 'gpt-4')}
                  >
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="gpt-4">GPT-4</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Tokens</label>
                  <Input
                    type="number"
                    min={1}
                    max={4000}
                    value={watchedMaxTokens}
                    onChange={(e) => setValue('maxTokens', parseInt(e.target.value) || 2000)}
                  />
                  {errors.maxTokens && (
                    <p className="text-xs text-destructive">{errors.maxTokens.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Temperature</label>
                  <Input
                    type="number"
                    step={0.1}
                    min={0}
                    max={2}
                    value={watchedTemperature}
                    onChange={(e) => setValue('temperature', parseFloat(e.target.value) || 0.7)}
                  />
                  {errors.temperature && (
                    <p className="text-xs text-destructive">{errors.temperature.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={isExecuting}
                className="flex-1"
              >
                {isExecuting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Executing...
                  </>
                ) : (
                  'Execute Prompt'
                )}
              </Button>
              <Button type="button" variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              Execution Failed
              <Badge variant="destructive">{error.code}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-destructive">{error.error}</p>
            
            {/* Rate limit specific messaging */}
            {error.code === 'RATE_LIMIT' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  API rate limit exceeded. Please wait before retrying.
                </p>
                {retryCountdown > 0 && (
                  <p className="text-sm font-medium">
                    Retry available in: {retryCountdown} seconds
                  </p>
                )}
              </div>
            )}
            
            {/* Timeout specific messaging */}
            {error.code === 'TIMEOUT' && (
              <p className="text-sm text-muted-foreground">
                The request timed out. This usually resolves itself - try again.
              </p>
            )}
            
            {/* API error specific messaging */}
            {error.code === 'API_ERROR' && (
              <p className="text-sm text-muted-foreground">
                Temporary API issue. Please try again in a moment.
              </p>
            )}
            
            {/* Validation error specific messaging */}
            {error.code === 'VALIDATION_ERROR' && (
              <p className="text-sm text-muted-foreground">
                Please check your inputs and try again. Validation errors cannot be retried.
              </p>
            )}
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setError(null)}
              >
                Dismiss
              </Button>
              
              {error.retryable && retryCountdown === 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    // Re-submit the form with current values
                    handleSubmit(onSubmit)();
                  }}
                >
                  Retry
                </Button>
              )}
              
              {error.retryable && retryCountdown > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  disabled
                >
                  Retry in {retryCountdown}s
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {executionResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Execution Result
              <Badge 
                variant={executionResult.status === 'COMPLETED' ? 'default' : 'destructive'}
              >
                {executionResult.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Output */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Output</label>
              <div className="rounded-md border bg-muted p-4">
                <pre className="whitespace-pre-wrap text-sm">{executionResult.output}</pre>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Cost</label>
                <div className="text-sm font-medium">
                  ${executionResult.costUsd.toFixed(6)}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tokens</label>
                <div className="text-sm font-medium">
                  {executionResult.tokenUsage.totalTokens}
                  <span className="text-muted-foreground ml-1">
                    ({executionResult.tokenUsage.inputTokens}+{executionResult.tokenUsage.outputTokens})
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Validation</label>
                <Badge 
                  variant={executionResult.validationStatus === 'PASSED' ? 'default' : 
                          executionResult.validationStatus === 'FAILED' ? 'destructive' : 'secondary'}
                >
                  {executionResult.validationStatus}
                </Badge>
              </div>
            </div>

            {/* Validation Errors */}
            {executionResult.validationErrors && executionResult.validationErrors.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-destructive">Validation Errors</label>
                <div className="rounded-md border border-destructive bg-destructive/5 p-4">
                  <ul className="space-y-1">
                    {executionResult.validationErrors.map((error, index) => (
                      <li key={index} className="text-sm">
                        <span className="font-medium">{error.path}:</span> {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}