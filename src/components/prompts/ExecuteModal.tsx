'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Prompt, VariableDefinition } from '@/types/database';

interface ExecutionResult {
  id: string;
  result: string;
  tokenUsage?: {
    input?: number;
    output?: number;
    total: number;
  };
  costUsd?: number;
  latencyMs?: number;
}

interface ExecuteModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: Prompt | null;
  onSuccess?: (result: ExecutionResult) => void;
}

export function ExecuteModal({
  isOpen,
  onOpenChange,
  prompt,
  onSuccess,
}: ExecuteModalProps): JSX.Element {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] =
    useState<ExecutionResult | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Create dynamic schema based on prompt variables
  const createValidationSchema = (
    variables: VariableDefinition[]
  ): z.ZodObject<Record<string, z.ZodTypeAny>> => {
    const schemaFields: Record<string, z.ZodTypeAny> = {};

    variables.forEach(variable => {
      let fieldSchema: z.ZodTypeAny;

      switch (variable.type) {
        case 'number':
          fieldSchema = variable.required
            ? z.coerce.number().min(0, `${variable.name} must be a number`)
            : z.coerce.number().min(0).optional();
          break;
        case 'boolean':
          fieldSchema = variable.required
            ? z.boolean()
            : z.boolean().optional();
          break;
        default: // 'string' or any other type
          fieldSchema = variable.required
            ? z.string().min(1, `${variable.name} is required`)
            : z.string().optional();
      }

      schemaFields[variable.name] = fieldSchema;
    });

    return z.object(schemaFields);
  };

  const variables = prompt?.variables
    ? JSON.parse(prompt.variables as string)
    : [];
  const validationSchema = createValidationSchema(variables);
  type FormData = z.infer<typeof validationSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(validationSchema),
  });

  const onSubmit = async (data: FormData): Promise<void> => {
    if (!prompt) return;

    try {
      setIsExecuting(true);
      setExecutionError(null);
      setExecutionResult(null);

      const response = await fetch(`/api/prompts/${prompt.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: data,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Execution failed');
      }

      const result = await response.json();

      // Handle both direct result and wrapped response
      const executionData = result.execution || result;

      setExecutionResult(executionData);
      onSuccess?.(executionData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Execution failed';
      setExecutionError(errorMessage);
      setError('root', {
        type: 'manual',
        message: errorMessage,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClose = (): void => {
    if (!isExecuting) {
      reset();
      setExecutionResult(null);
      setExecutionError(null);
      onOpenChange(false);
    }
  };

  if (!prompt) return <></>;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Execute Prompt</DialogTitle>
          <DialogDescription>{prompt.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Show template */}
          <div className="rounded-md bg-muted/50 p-4">
            <p className="text-sm font-medium mb-2">Template:</p>
            <p className="text-sm text-muted-foreground">{prompt.template}</p>
          </div>

          {!executionResult ? (
            /* Input Form */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {variables.map((variable: VariableDefinition) => (
                <div key={variable.name} className="space-y-2">
                  <label
                    htmlFor={variable.name}
                    className="text-sm font-medium"
                  >
                    {variable.name}
                    {variable.required && (
                      <span className="text-destructive"> *</span>
                    )}
                  </label>
                  <Input
                    id={variable.name}
                    placeholder={variable.name}
                    type={variable.type === 'number' ? 'number' : 'text'}
                    {...register(variable.name)}
                    disabled={isExecuting}
                    className={
                      errors[variable.name] ? 'border-destructive' : ''
                    }
                  />
                  {errors[variable.name] && (
                    <p className="text-sm text-destructive">
                      {errors[variable.name]?.message?.toString()}
                    </p>
                  )}
                </div>
              ))}

              {/* Error Display */}
              {executionError && (
                <div className="rounded-md bg-destructive/10 p-3">
                  <p className="text-sm text-destructive">{executionError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isExecuting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isExecuting}>
                  {isExecuting ? 'Executing...' : 'Execute Prompt'}
                </Button>
              </div>
            </form>
          ) : (
            /* Results Display */
            <div className="space-y-4">
              <div className="rounded-md bg-green-50 border border-green-200 p-4">
                <p className="text-sm font-medium text-green-800 mb-2">
                  Result:
                </p>
                <p className="text-sm text-green-700 whitespace-pre-wrap">
                  {executionResult.result}
                </p>
              </div>

              {/* Metrics */}
              {(executionResult.tokenUsage ||
                executionResult.costUsd ||
                executionResult.latencyMs) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {executionResult.tokenUsage && (
                    <div className="rounded-md bg-muted/50 p-3">
                      <p className="text-xs font-medium">
                        Tokens: {executionResult.tokenUsage.total}
                      </p>
                      {executionResult.tokenUsage.input && (
                        <p className="text-xs text-muted-foreground">
                          Input: {executionResult.tokenUsage.input}, Output:{' '}
                          {executionResult.tokenUsage.output}
                        </p>
                      )}
                    </div>
                  )}
                  {executionResult.costUsd && (
                    <div className="rounded-md bg-muted/50 p-3">
                      <p className="text-xs font-medium">
                        Cost: ${executionResult.costUsd.toFixed(4)}
                      </p>
                    </div>
                  )}
                  {executionResult.latencyMs && (
                    <div className="rounded-md bg-muted/50 p-3">
                      <p className="text-xs font-medium">
                        Latency: {(executionResult.latencyMs / 1000).toFixed(1)}
                        s
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setExecutionResult(null);
                    setExecutionError(null);
                    reset();
                  }}
                >
                  Execute Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
