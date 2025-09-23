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
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { LoadingSpinner } from '../ui/loading-spinner';
import { Badge } from '../ui/badge';
import { ExecutionErrorBoundary } from './execution-error-boundary';
import type { Prompt, VariableDefinition } from '../../types/database';

// Enhanced type definitions for better type safety
type InputValue = string | number | boolean | string[] | undefined;
type FormInputs = Record<string, InputValue>;

interface EnhancedExecutionPanelProps {
  prompt: Prompt;
  onExecutionComplete?: (result: ExecutionResult) => void;
  onExecutionStart?: (executionId: string) => void;
  initialInputs?: FormInputs;
}

interface ExecutionFormData {
  inputs: FormInputs;
  model: 'gpt-3.5-turbo' | 'gpt-4';
  maxTokens: number;
  temperature: number;
}

interface ExecutionState {
  status: 'idle' | 'executing' | 'completed' | 'failed';
  executionId?: string;
  result?: ExecutionResult;
  error?: ExecutionError;
}

interface ExecutionResult {
  executionId: string;
  status: 'COMPLETED' | 'FAILED';
  output: string;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  costUsd: number;
  validationStatus: 'PASSED' | 'FAILED' | 'SKIPPED';
  validationErrors: Array<{
    path: string;
    message: string;
  }>;
  executionData?: ExecutionFormData; // Store execution parameters for history
  timestamp?: string;
}

interface ExecutionError {
  type: 'VALIDATION_ERROR' | 'API_ERROR' | 'TIMEOUT_ERROR' | 'RATE_LIMIT_ERROR';
  message: string;
  retryable: boolean;
  retryAfter?: number;
  details?: Record<string, unknown> | string | null;
}

interface ExecutionPanelState {
  // Form state
  formData: ExecutionFormData;
  formErrors: Record<string, string>;
  isFormValid: boolean;

  // Execution state
  executionState: ExecutionState;
  executionHistory: ExecutionResult[];

  // UI state
  showAdvancedOptions: boolean;
  estimatedCost: number;
  isExecuting: boolean;
}

// Dynamic validation schema creator from the plan
const createInputValidationSchema = (
  variables: VariableDefinition[]
): z.ZodObject<{
  inputs: z.ZodObject<Record<string, z.ZodSchema>>;
  model: z.ZodEnum<['gpt-3.5-turbo', 'gpt-4']>;
  maxTokens: z.ZodNumber;
  temperature: z.ZodNumber;
}> => {
  const schema: Record<string, z.ZodSchema> = {};

  variables.forEach(variable => {
    let fieldSchema: z.ZodSchema;

    switch (variable.type) {
      case 'string':
        fieldSchema = z.string().min(1, `${variable.name} is required`);
        if (variable.options) {
          fieldSchema = z.enum(variable.options as [string, ...string[]]);
        }
        break;
      case 'number':
        fieldSchema = z.coerce.number();
        break;
      case 'boolean':
        fieldSchema = z.boolean();
        break;
      case 'array':
        fieldSchema = z.array(z.string().min(1));
        break;
      default:
        fieldSchema = z.string();
    }

    if (!variable.required) {
      fieldSchema = fieldSchema.optional();
    }

    schema[variable.name] = fieldSchema;
  });

  return z.object({
    inputs: z.object(schema),
    model: z.enum(['gpt-3.5-turbo', 'gpt-4']),
    maxTokens: z.number().min(1).max(4000),
    temperature: z.number().min(0).max(2),
  });
};

// Input preprocessing for different types (from the plan) - removed unused function
// Preprocesses form input values based on variable type
const _preprocessInputValue = (value: InputValue, type: string): InputValue => {
  switch (type) {
    case 'number':
      return value === '' ? undefined : Number(value);
    case 'boolean':
      return Boolean(value);
    case 'array':
      return typeof value === 'string'
        ? value
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
        : value;
    default:
      return value;
  }
};

// Execution parameter validation from the plan - removed unused schema
// const _ExecutionParametersSchema = z.object({ ... })

// Internal component without error boundary
function EnhancedExecutionPanelInternal({
  prompt,
  onExecutionComplete,
  onExecutionStart,
  initialInputs = {},
}: EnhancedExecutionPanelProps): JSX.Element {
  // Parse variables from prompt
  const variables: VariableDefinition[] = Array.isArray(prompt.variables)
    ? (prompt.variables as unknown as VariableDefinition[])
    : [];

  // State management as per plan
  const [panelState, setPanelState] = useState<ExecutionPanelState>({
    formData: {
      inputs: initialInputs,
      model: 'gpt-3.5-turbo',
      maxTokens: 2000,
      temperature: 0.7,
    },
    formErrors: {},
    isFormValid: false,
    executionState: {
      status: 'idle',
    },
    executionHistory: [],
    showAdvancedOptions: false,
    estimatedCost: 0,
    isExecuting: false,
  });

  // Create execution schema
  const executionSchema = createInputValidationSchema(variables);
  type FormData = z.infer<typeof executionSchema>;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(executionSchema),
    defaultValues: {
      inputs: variables.reduce(
        (acc, variable) => {
          if (variable.defaultValue !== undefined) {
            acc[variable.name] = variable.defaultValue;
          }
          if (initialInputs[variable.name] !== undefined) {
            acc[variable.name] = initialInputs[variable.name];
          }
          return acc;
        },
        {} as Record<string, InputValue>
      ),
      model: 'gpt-3.5-turbo',
      maxTokens: 2000,
      temperature: 0.7,
    },
    mode: 'onChange',
  });

  // Watch form values for real-time updates
  const watchedModel = watch('model');
  const watchedMaxTokens = watch('maxTokens');
  const watchedTemperature = watch('temperature');
  const watchedInputs = watch('inputs');

  // Update panel state when form changes
  React.useEffect(() => {
    setPanelState(prev => ({
      ...prev,
      formData: {
        inputs: watchedInputs,
        model: watchedModel,
        maxTokens: watchedMaxTokens,
        temperature: watchedTemperature,
      },
      isFormValid: isValid,
    }));
  }, [
    watchedInputs,
    watchedModel,
    watchedMaxTokens,
    watchedTemperature,
    isValid,
  ]);

  // Enhanced execution with retry logic and error categorization (Phase 3)
  const executePromptWithResults = async (
    data: ExecutionFormData,
    retryCount = 0
  ): Promise<ExecutionResult> => {
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

    // Set loading state
    setPanelState(prev => ({ ...prev, isExecuting: true }));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(`/api/prompts/${prompt.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: data.inputs,
          model: data.model,
          maxTokens: data.maxTokens,
          temperature: data.temperature,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = categorizeExecutionError(
          response.status,
          errorData,
          retryCount < MAX_RETRIES
        );

        // Retry logic for retryable errors
        if (error.retryable && retryCount < MAX_RETRIES) {
          const delay = error.retryAfter
            ? error.retryAfter * 1000
            : RETRY_DELAYS[retryCount];
          await new Promise(resolve => setTimeout(resolve, delay));
          return executePromptWithResults(data, retryCount + 1);
        }

        throw error;
      }

      const result = await response.json();
      return result;
    } catch (error) {
      // Handle fetch errors (network, timeout, etc.)
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          const timeoutError: ExecutionError = {
            type: 'TIMEOUT_ERROR',
            message: 'Request timed out after 30 seconds',
            retryable: retryCount < MAX_RETRIES,
          };

          if (timeoutError.retryable && retryCount < MAX_RETRIES) {
            await new Promise(resolve =>
              setTimeout(resolve, RETRY_DELAYS[retryCount])
            );
            return executePromptWithResults(data, retryCount + 1);
          }

          throw timeoutError;
        }

        // Network or other fetch errors
        const networkError: ExecutionError = {
          type: 'API_ERROR',
          message: `Network error: ${error.message}`,
          retryable: retryCount < MAX_RETRIES,
        };

        if (networkError.retryable && retryCount < MAX_RETRIES) {
          await new Promise(resolve =>
            setTimeout(resolve, RETRY_DELAYS[retryCount])
          );
          return executePromptWithResults(data, retryCount + 1);
        }

        throw networkError;
      }

      // Re-throw if it's already an ExecutionError
      throw error;
    } finally {
      setPanelState(prev => ({ ...prev, isExecuting: false }));
    }
  };

  const onSubmit = async (data: FormData): Promise<void> => {
    try {
      const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      setPanelState(prev => ({
        ...prev,
        executionState: {
          status: 'executing',
          executionId,
        },
      }));

      onExecutionStart?.(executionId);

      const result = await executePromptWithResults(data);

      // Enhance result with execution data and timestamp for history tracking
      const enhancedResult: ExecutionResult = {
        ...result,
        executionData: data,
        timestamp: new Date().toISOString(),
        executionId: result.executionId || executionId,
      };

      setPanelState(prev => ({
        ...prev,
        executionState: {
          status: 'completed',
          result: enhancedResult,
          executionId: enhancedResult.executionId,
        },
        executionHistory: [
          enhancedResult,
          ...prev.executionHistory.slice(0, 9),
        ], // Keep max 10 items
      }));

      onExecutionComplete?.(result);
    } catch (error) {
      // Use categorized error if available, or create generic error
      const executionError: ExecutionError =
        error instanceof Object && 'type' in error
          ? (error as ExecutionError)
          : {
              type: 'API_ERROR',
              message:
                error instanceof Error
                  ? error.message
                  : 'Unknown error occurred',
              retryable: true,
            };

      setPanelState(prev => ({
        ...prev,
        executionState: {
          status: 'failed',
          error: executionError,
          executionId: prev.executionState.executionId,
        },
      }));
    }
  };

  const handleReset = (): void => {
    reset();
    setPanelState(prev => ({
      ...prev,
      executionState: { status: 'idle' },
    }));
  };

  const handleRetry = (): void => {
    if (panelState.executionState.status === 'failed') {
      handleSubmit(onSubmit)();
    }
  };

  // Ensure variables is an array to prevent runtime errors
  if (!Array.isArray(variables)) {
    console.warn('Variables is not an array, falling back to empty array');
  }

  return (
    <Card
      className="execution-panel"
      data-testid="enhanced-execution-panel"
      role="region"
      aria-labelledby="execution-panel-title"
      aria-describedby="execution-panel-description"
    >
      <CardHeader>
        <CardTitle id="execution-panel-title">Execute Prompt</CardTitle>
        <CardDescription id="execution-panel-description">
          {prompt.description || 'Configure inputs and run this prompt'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Variable Inputs Section - Phase 1 Component */}
          {variables.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Variables</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {variables.map(variable => (
                  <VariableInputField
                    key={variable.name}
                    variable={variable}
                    register={register}
                    watch={watch}
                    setValue={setValue}
                    error={errors.inputs?.[variable.name]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* AI Parameters Section - Phase 2 Component */}
          <AdvancedParametersSection
            model={watchedModel}
            temperature={watchedTemperature}
            maxTokens={watchedMaxTokens}
            onChange={(field, value) =>
              setValue(field as keyof ExecutionFormData, value)
            }
            showAdvanced={panelState.showAdvancedOptions}
            onToggleAdvanced={() =>
              setPanelState(prev => ({
                ...prev,
                showAdvancedOptions: !prev.showAdvancedOptions,
              }))
            }
            errors={errors}
          />

          {/* Cost Estimation Display */}
          <CostEstimationDisplay
            inputs={watchedInputs}
            model={watchedModel}
            maxTokens={watchedMaxTokens}
            template={prompt.template}
          />

          {/* Execution Controls */}
          <ExecutionControls
            isExecuting={panelState.isExecuting}
            isFormValid={panelState.isFormValid}
            onReset={handleReset}
          />
        </form>

        {/* Status & Results - Phase 4 Component */}
        <ExecutionStatusDisplay
          status={panelState.executionState.status}
          isExecuting={panelState.isExecuting}
          result={panelState.executionState.result}
          error={panelState.executionState.error}
          onRetry={handleRetry}
        />

        {/* Execution History - Phase 4 Component */}
        {panelState.executionHistory.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Execution History</h3>
              <div className="flex gap-2">
                <Badge variant="outline">
                  {panelState.executionHistory.length} execution
                  {panelState.executionHistory.length !== 1 ? 's' : ''}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setPanelState(prev => ({ ...prev, executionHistory: [] }))
                  }
                >
                  Clear All
                </Button>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {panelState.executionHistory.map(execution => (
                <div
                  key={execution.executionId}
                  className="rounded-md border bg-muted/30 p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={
                            execution.status === 'COMPLETED'
                              ? 'default'
                              : 'destructive'
                          }
                          className="text-xs"
                        >
                          {execution.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {execution.timestamp
                            ? new Date(execution.timestamp).toLocaleString()
                            : 'Unknown time'}
                        </span>
                        {execution.executionData && (
                          <Badge variant="outline" className="text-xs">
                            {execution.executionData.model}
                          </Badge>
                        )}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Cost:</span>
                          <span className="ml-1 font-medium text-green-600">
                            ${execution.costUsd?.toFixed(6) || '0.000000'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tokens:</span>
                          <span className="ml-1 font-medium">
                            {execution.tokenUsage?.totalTokens || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Validation:
                          </span>
                          <span
                            className={`ml-1 font-medium ${
                              execution.validationStatus === 'PASSED'
                                ? 'text-green-600'
                                : execution.validationStatus === 'FAILED'
                                  ? 'text-red-600'
                                  : 'text-gray-600'
                            }`}
                          >
                            {execution.validationStatus}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1 ml-3">
                      {execution.executionData && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Pre-fill form with previous execution parameters
                            Object.entries(
                              execution.executionData!.inputs
                            ).forEach(([key, value]) => {
                              setValue(
                                `inputs.${key}` as `inputs.${string}`,
                                value
                              );
                            });
                            setValue('model', execution.executionData!.model);
                            setValue(
                              'maxTokens',
                              execution.executionData!.maxTokens
                            );
                            setValue(
                              'temperature',
                              execution.executionData!.temperature
                            );
                          }}
                          title="Rerun with same parameters"
                        >
                          ↻
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mt-2">
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        View output
                      </summary>
                      <div className="mt-2 rounded bg-background p-2 border text-xs max-h-32 overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-mono">
                          {execution.output || 'No output available'}
                        </pre>
                      </div>
                    </details>
                  </div>
                </div>
              ))}
            </div>

            {panelState.executionHistory.length >= 10 && (
              <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                <p className="text-sm text-blue-800">
                  💡 History is limited to 10 recent executions. Older
                  executions are automatically removed.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main export with error boundary wrapper
export function EnhancedExecutionPanel(
  props: EnhancedExecutionPanelProps
): JSX.Element {
  return (
    <ExecutionErrorBoundary
      onError={(error, errorInfo) => {
        // Log error for debugging
        console.error('Enhanced Execution Panel Error:', error);
        console.error('Error Info:', errorInfo);

        // In production, report to error tracking service
        if (process.env.NODE_ENV === 'production') {
          // Example: reportError(error, errorInfo, { component: 'EnhancedExecutionPanel' });
        }
      }}
    >
      <EnhancedExecutionPanelInternal {...props} />
    </ExecutionErrorBoundary>
  );
}

// Phase 1: Variable Input Field Component
interface VariableInputFieldProps {
  variable: VariableDefinition;
  register: any;
  watch: any;
  setValue: any;
  error?: { message?: string } | string;
}

function VariableInputField({
  variable,
  register,
  watch,
  setValue,
  error,
}: VariableInputFieldProps): JSX.Element {
  const fieldName = `inputs.${variable.name}` as const;
  const fieldId = `field-${variable.name}`;
  const errorId = `error-${variable.name}`;
  const descriptionId = `desc-${variable.name}`;

  // String variables with options (dropdown)
  if (variable.options && variable.options.length > 0) {
    return (
      <div className="space-y-2">
        <label htmlFor={fieldId} className="text-sm font-medium">
          {variable.name}
          {variable.required && (
            <span className="text-destructive ml-1" aria-label="required">
              *
            </span>
          )}
        </label>
        {variable.description && (
          <p id={descriptionId} className="text-xs text-muted-foreground">
            {variable.description}
          </p>
        )}
        <select
          id={fieldId}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={watch(fieldName) || ''}
          onChange={e => setValue(fieldName, e.target.value)}
          aria-describedby={`${variable.description ? descriptionId : ''} ${error ? errorId : ''}`.trim()}
          aria-required={variable.required}
          aria-invalid={!!error}
        >
          <option value="">{`Select ${variable.name}`}</option>
          {variable.options.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {error && (
          <p id={errorId} className="text-xs text-destructive" role="alert">
            {typeof error === 'string'
              ? error
              : error && typeof error === 'object' && 'message' in error
                ? error.message || 'Invalid input'
                : 'Invalid input'}
          </p>
        )}
      </div>
    );
  }

  // Boolean variables (checkbox)
  if (variable.type === 'boolean') {
    return (
      <div className="space-y-2">
        <label
          htmlFor={fieldId}
          className="flex items-center space-x-2 cursor-pointer"
        >
          <input
            id={fieldId}
            type="checkbox"
            {...register(fieldName)}
            className="rounded border-input focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-describedby={`${variable.description ? descriptionId : ''} ${error ? errorId : ''}`.trim()}
            aria-required={variable.required}
            aria-invalid={!!error}
          />
          <span className="text-sm font-medium">
            {variable.name}
            {variable.required && (
              <span className="text-destructive ml-1" aria-label="required">
                *
              </span>
            )}
          </span>
        </label>
        {variable.description && (
          <p id={descriptionId} className="text-xs text-muted-foreground">
            {variable.description}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs text-destructive" role="alert">
            {typeof error === 'string'
              ? error
              : error && typeof error === 'object' && 'message' in error
                ? error.message || 'Invalid input'
                : 'Invalid input'}
          </p>
        )}
      </div>
    );
  }

  // Array variables (multi-value input)
  if (variable.type === 'array') {
    return (
      <div className="space-y-2">
        <label htmlFor={fieldId} className="text-sm font-medium">
          {variable.name}
          {variable.required && (
            <span className="text-destructive ml-1" aria-label="required">
              *
            </span>
          )}
        </label>
        {variable.description && (
          <p id={descriptionId} className="text-xs text-muted-foreground">
            {variable.description}
          </p>
        )}
        <input
          id={fieldId}
          type="text"
          placeholder="Enter values separated by commas"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-describedby={`${variable.description ? descriptionId : ''} ${error ? errorId : ''}`.trim()}
          aria-required={variable.required}
          aria-invalid={!!error}
          {...register(fieldName, {
            setValueAs: (value: string) =>
              value
                ? value
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean)
                : [],
          })}
        />
        {error && (
          <p id={errorId} className="text-xs text-destructive" role="alert">
            {typeof error === 'string'
              ? error
              : error && typeof error === 'object' && 'message' in error
                ? error.message || 'Invalid input'
                : 'Invalid input'}
          </p>
        )}
      </div>
    );
  }

  // Default: string or number input
  return (
    <div className="space-y-2">
      <label htmlFor={fieldId} className="text-sm font-medium">
        {variable.name}
        {variable.required && (
          <span className="text-destructive ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      {variable.description && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {variable.description}
        </p>
      )}
      <input
        id={fieldId}
        type={variable.type === 'number' ? 'number' : 'text'}
        placeholder={
          variable.defaultValue
            ? String(variable.defaultValue)
            : `Enter ${variable.name}`
        }
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        aria-describedby={`${variable.description ? descriptionId : ''} ${error ? errorId : ''}`.trim()}
        aria-required={variable.required}
        aria-invalid={!!error}
        {...register(fieldName, {
          valueAsNumber: variable.type === 'number',
        })}
      />
      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {typeof error === 'string'
            ? error
            : error?.message || 'Invalid input'}
        </p>
      )}
    </div>
  );
}

// Phase 2: Advanced Parameters Section - Enhanced Implementation

// Model capability data for cost and feature comparison
const MODEL_INFO = {
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    description: 'Fast and cost-effective for most tasks',
    costPer1KTokens: { input: 0.0005, output: 0.0015 },
    maxTokens: 4000,
    capabilities: ['Text generation', 'Basic reasoning', 'Code assistance'],
    relative_cost: 1,
  },
  'gpt-4': {
    name: 'GPT-4',
    description: 'Most capable model for complex reasoning',
    costPer1KTokens: { input: 0.03, output: 0.06 },
    maxTokens: 8000,
    capabilities: ['Advanced reasoning', 'Complex analysis', 'Creative tasks'],
    relative_cost: 20,
  },
} as const;

interface ParametersControlProps {
  model: string;
  temperature: number;
  maxTokens: number;
  onChange: (field: string, value: InputValue) => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  errors: Record<string, { message?: string } | string>;
}

function AdvancedParametersSection({
  model,
  temperature,
  maxTokens,
  onChange,
  showAdvanced,
  onToggleAdvanced,
  errors,
}: ParametersControlProps): JSX.Element {
  const currentModel = MODEL_INFO[model as keyof typeof MODEL_INFO];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">AI Parameters</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleAdvanced}
        >
          {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
        </Button>
      </div>

      {/* Model Selection with Cost Implications */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Model</label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={model}
            onChange={e => onChange('model', e.target.value)}
          >
            {Object.entries(MODEL_INFO).map(([key, info]) => (
              <option key={key} value={key}>
                {info.name} - ${info.costPer1KTokens.input * 1000}/$
                {info.costPer1KTokens.output * 1000} per 1K tokens
              </option>
            ))}
          </select>
          {currentModel && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p>{currentModel.description}</p>
              <div className="flex items-center gap-4">
                <span>
                  Input: $
                  {(currentModel.costPer1KTokens.input * 1000).toFixed(4)}/1K
                </span>
                <span>
                  Output: $
                  {(currentModel.costPer1KTokens.output * 1000).toFixed(4)}/1K
                </span>
                <Badge
                  variant={model === 'gpt-3.5-turbo' ? 'default' : 'secondary'}
                >
                  {currentModel.relative_cost}x cost
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Advanced Parameters (Collapsible) */}
        {showAdvanced && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Max Tokens
                <span className="text-xs text-muted-foreground ml-1">
                  (Output length limit)
                </span>
              </label>
              <input
                type="number"
                min={1}
                max={currentModel?.maxTokens || 4000}
                value={maxTokens}
                onChange={e => {
                  const value = parseInt(e.target.value) || 1;
                  const maxAllowed = currentModel?.maxTokens || 4000;
                  onChange('maxTokens', Math.min(value, maxAllowed));
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <div className="text-xs text-muted-foreground">
                Max: {currentModel?.maxTokens || 4000} for {currentModel?.name}
              </div>
              {errors.maxTokens && (
                <p className="text-xs text-destructive">
                  {errors.maxTokens.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Temperature
                <span className="text-xs text-muted-foreground ml-1">
                  (Creativity level)
                </span>
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={temperature}
                  onChange={e =>
                    onChange('temperature', parseFloat(e.target.value))
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 (Deterministic)</span>
                  <span className="font-medium">{temperature}</span>
                  <span>2 (Creative)</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {temperature < 0.3
                  ? 'Very focused and consistent'
                  : temperature < 0.7
                    ? 'Balanced creativity and consistency'
                    : temperature < 1.5
                      ? 'More creative and varied'
                      : 'Maximum creativity and randomness'}
              </div>
              {errors.temperature && (
                <p className="text-xs text-destructive">
                  {errors.temperature.message}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Model Capabilities Display */}
        {currentModel && (
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-sm font-medium mb-2">Model Capabilities:</p>
            <div className="flex flex-wrap gap-1">
              {currentModel.capabilities.map((capability, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {capability}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Cost calculation interfaces from the plan
interface CostEstimation {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
  model: string;
  confidence: 'low' | 'medium' | 'high';
}

// Cost calculation utilities from the plan
const estimateExecutionCost = (
  template: string,
  inputs: FormInputs,
  parameters: { model: string; maxTokens: number; temperature: number }
): CostEstimation => {
  // Process template with variables for token estimation
  const processedTemplate = processTemplate(template, inputs);
  const estimatedInputTokens = estimateTokens(processedTemplate);
  const estimatedOutputTokens = Math.min(
    parameters.maxTokens,
    Math.max(100, estimatedInputTokens * 0.75) // Conservative estimate
  );

  const modelInfo = MODEL_INFO[parameters.model as keyof typeof MODEL_INFO];
  if (!modelInfo) {
    return {
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      estimatedCostUsd: 0,
      model: parameters.model,
      confidence: 'low',
    };
  }

  const estimatedCostUsd =
    (estimatedInputTokens * modelInfo.costPer1KTokens.input +
      estimatedOutputTokens * modelInfo.costPer1KTokens.output) /
    1000;

  return {
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedCostUsd,
    model: parameters.model,
    confidence: estimatedInputTokens > 50 ? 'high' : 'medium',
  };
};

// Simple template processing for cost estimation
const processTemplate = (template: string, inputs: FormInputs): string => {
  let processed = template;
  Object.entries(inputs).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      processed = processed.replace(placeholder, String(value));
    }
  });
  return processed;
};

// Token estimation (rough approximation: ~4 chars per token for English)
const estimateTokens = (text: string): number => {
  if (!text) return 0;
  // Basic token estimation: ~4 characters per token
  const roughTokens = Math.ceil(text.length / 4);
  // Add some buffer for formatting and special tokens
  return Math.max(10, roughTokens + 50);
};

// Error categorization utility for enhanced error handling (Phase 3)
const categorizeExecutionError = (
  status: number,
  errorData: { error?: string } | null,
  canRetry: boolean
): ExecutionError => {
  switch (status) {
    case 400:
      return {
        type: 'VALIDATION_ERROR',
        message: errorData?.error || 'Invalid request parameters',
        retryable: false,
        details: errorData,
      };

    case 401:
    case 403:
      return {
        type: 'API_ERROR',
        message: 'Authentication failed. Please check your API credentials.',
        retryable: false,
      };

    case 429:
      return {
        type: 'RATE_LIMIT_ERROR',
        message: 'Rate limit exceeded. Please wait before retrying.',
        retryable: canRetry,
        retryAfter: parseInt(errorData.retryAfter) || 60, // Default 60 seconds
      };

    case 500:
    case 502:
    case 503:
    case 504:
      return {
        type: 'API_ERROR',
        message: `Server error (${status}). This may be temporary.`,
        retryable: canRetry,
      };

    default:
      return {
        type: 'API_ERROR',
        message: errorData?.error || `Request failed with status ${status}`,
        retryable: canRetry && status >= 500,
      };
  }
};

function CostEstimationDisplay({
  inputs,
  model,
  maxTokens,
  template,
}: {
  inputs: FormInputs;
  model: string;
  maxTokens: number;
  template: string;
}): JSX.Element {
  const costEstimation = estimateExecutionCost(template, inputs, {
    model,
    maxTokens,
    temperature: 0.7, // Not used in cost calculation
  });

  const confidenceColor = {
    low: 'text-red-600',
    medium: 'text-yellow-600',
    high: 'text-green-600',
  }[costEstimation.confidence];

  const confidenceText = {
    low: 'Low confidence - missing variable values',
    medium: 'Medium confidence - some variables provided',
    high: 'High confidence - all variables filled',
  }[costEstimation.confidence];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Cost Estimation</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-md bg-muted/50 p-4">
          <p className="text-sm font-medium mb-2">Estimated Cost</p>
          <p className="text-2xl font-bold text-blue-600">
            ${costEstimation.estimatedCostUsd.toFixed(6)}
          </p>
          <div className="text-xs text-muted-foreground mt-2 space-y-1">
            <p>
              Model:{' '}
              {MODEL_INFO[model as keyof typeof MODEL_INFO]?.name || model}
            </p>
            <p className={confidenceColor}>{confidenceText}</p>
          </div>
        </div>

        <div className="rounded-md bg-muted/50 p-4">
          <p className="text-sm font-medium mb-2">Token Breakdown</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Input tokens:</span>
              <span className="font-medium">
                {costEstimation.estimatedInputTokens}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Output tokens (max):
              </span>
              <span className="font-medium">
                {costEstimation.estimatedOutputTokens}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">Total tokens:</span>
              <span className="font-medium">
                {costEstimation.estimatedInputTokens +
                  costEstimation.estimatedOutputTokens}
              </span>
            </div>
          </div>
        </div>
      </div>

      {costEstimation.confidence === 'low' && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
          <p className="text-sm text-yellow-800">
            💡 Fill in variable values above for a more accurate cost estimate
          </p>
        </div>
      )}
    </div>
  );
}

interface ExecutionControlsProps {
  isExecuting: boolean;
  isFormValid: boolean;
  onReset: () => void;
}

function ExecutionControls({
  isExecuting,
  isFormValid,
  onReset,
}: ExecutionControlsProps): JSX.Element {
  return (
    <div className="flex gap-2">
      <Button
        type="submit"
        disabled={isExecuting || !isFormValid}
        className="flex-1"
        data-testid="execute-prompt-button"
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
      <Button type="button" variant="outline" onClick={onReset}>
        Reset
      </Button>
    </div>
  );
}

interface ExecutionStatusDisplayProps {
  status: 'idle' | 'executing' | 'completed' | 'failed';
  isExecuting: boolean;
  result?: ExecutionResult;
  error?: ExecutionError;
  onRetry: () => void;
}

function ExecutionStatusDisplay({
  status,
  isExecuting,
  result,
  error,
  onRetry,
}: ExecutionStatusDisplayProps): JSX.Element | null {
  if (status === 'idle') return null;

  const getStatusMessage = (): string => {
    switch (status) {
      case 'executing':
        return 'Executing prompt...';
      case 'completed':
        return 'Execution completed successfully';
      case 'failed':
        return 'Execution failed';
      default:
        return status;
    }
  };

  const getErrorIcon = (errorType: string): string => {
    switch (errorType) {
      case 'VALIDATION_ERROR':
        return '⚠️';
      case 'RATE_LIMIT_ERROR':
        return '⏱️';
      case 'TIMEOUT_ERROR':
        return '⏰';
      case 'API_ERROR':
      default:
        return '❌';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge
          variant={
            status === 'completed'
              ? 'default'
              : status === 'failed'
                ? 'destructive'
                : 'secondary'
          }
        >
          {status.toUpperCase()}
        </Badge>
        {isExecuting && <LoadingSpinner size="sm" />}
        <span className="text-sm text-muted-foreground">
          {getStatusMessage()}
        </span>
      </div>

      {result && (
        <div
          className="rounded-md border bg-muted/50 p-4"
          data-testid="execution-result"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Execution Result</p>
            <Badge
              variant={
                result.status === 'COMPLETED' ? 'default' : 'destructive'
              }
            >
              {result.status}
            </Badge>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">Output:</p>
              <div className="rounded-md bg-background p-3 border">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {result.output}
                </pre>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="text-center p-3 rounded-md bg-background border">
                <p className="text-xs text-muted-foreground mb-1">Cost</p>
                <p className="text-lg font-bold text-green-600">
                  ${result.costUsd?.toFixed(6) || '0.000000'}
                </p>
              </div>
              <div className="text-center p-3 rounded-md bg-background border">
                <p className="text-xs text-muted-foreground mb-1">
                  Tokens Used
                </p>
                <p className="text-lg font-bold text-blue-600">
                  {result.tokenUsage?.totalTokens || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.tokenUsage?.inputTokens || 0} in /{' '}
                  {result.tokenUsage?.outputTokens || 0} out
                </p>
              </div>
              <div className="text-center p-3 rounded-md bg-background border">
                <p className="text-xs text-muted-foreground mb-1">Validation</p>
                <Badge
                  variant={
                    result.validationStatus === 'PASSED'
                      ? 'default'
                      : result.validationStatus === 'FAILED'
                        ? 'destructive'
                        : 'secondary'
                  }
                  className="mt-1"
                >
                  {result.validationStatus || 'N/A'}
                </Badge>
              </div>
            </div>

            {result.validationErrors && result.validationErrors.length > 0 && (
              <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
                <p className="text-sm font-medium text-yellow-800 mb-2">
                  Validation Issues:
                </p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {result.validationErrors.map(
                    (
                      error: { path: string; message: string },
                      index: number
                    ) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-yellow-600">•</span>
                        <span>
                          <strong>{error.path}:</strong> {error.message}
                        </span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <span className="text-lg">{getErrorIcon(error.type)}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="destructive" className="text-xs">
                  {error.type.replace('_', ' ')}
                </Badge>
                {error.retryAfter && (
                  <span className="text-xs text-muted-foreground">
                    Retry in {error.retryAfter}s
                  </span>
                )}
              </div>
              <p className="text-sm text-destructive mb-3">{error.message}</p>

              {error.details && (
                <details className="text-xs text-muted-foreground mb-3">
                  <summary className="cursor-pointer hover:text-foreground">
                    Show error details
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs">
                    {JSON.stringify(error.details, null, 2)}
                  </pre>
                </details>
              )}

              <div className="flex gap-2">
                {error.retryable && (
                  <Button variant="outline" size="sm" onClick={onRetry}>
                    {error.type === 'RATE_LIMIT_ERROR'
                      ? 'Retry After Limit'
                      : 'Retry'}
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Copy error details to clipboard for debugging
                    navigator.clipboard.writeText(
                      JSON.stringify(
                        {
                          type: error.type,
                          message: error.message,
                          details: error.details,
                        },
                        null,
                        2
                      )
                    );
                  }}
                >
                  Copy Error
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
