// Variable Detection Display Component
// Implements Phase 1 specification from VARIABLE_DEFINITION_EDITOR_PLAN.md

import React from 'react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Alert } from '../../ui/alert';
import { VariableDetectionProps, ParseError, ParseWarning } from '../types';

interface EnhancedVariableDetectionProps extends VariableDetectionProps {
  errors?: ParseError[];
  warnings?: ParseWarning[];
  onVariableDetected?: (count: number) => void;
}

export function VariableDetectionDisplay({
  detectedVariables,
  existingVariables,
  onSyncVariables,
  errors = [],
  warnings = [],
  onVariableDetected,
}: EnhancedVariableDetectionProps): JSX.Element {
  // Calculate new variables that aren't in existing definitions
  const newVariables = detectedVariables.filter(
    variable => !existingVariables.includes(variable)
  );

  // Notify about variable detection
  React.useEffect(() => {
    if (onVariableDetected && detectedVariables.length > 0) {
      onVariableDetected(detectedVariables.length);
    }
  }, [detectedVariables.length, onVariableDetected]);

  const hasNewVariables = newVariables.length > 0;
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  return (
    <div className="space-y-4">
      {/* Error display */}
      {hasErrors && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <Alert key={index} variant="destructive">
              <div className="space-y-1">
                <p className="font-medium">{error.message}</p>
                {error.suggestion && (
                  <p className="text-sm text-muted-foreground">
                    Suggestion: {error.suggestion}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Position: {error.position}
                </p>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Warning display */}
      {hasWarnings && (
        <div className="space-y-2">
          {warnings.map((warning, index) => (
            <Alert key={index} variant="default">
              <div className="space-y-1">
                <p className="font-medium">{warning.message}</p>
                {warning.suggestion && (
                  <p className="text-sm text-muted-foreground">
                    Suggestion: {warning.suggestion}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Position: {warning.position}
                </p>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Detected variables display */}
      {detectedVariables.length > 0 && (
        <div
          className="detected-variables flex flex-wrap gap-2 p-3 bg-muted rounded-md"
          role="status"
          aria-label="Detected Variables"
          aria-describedby="detection-help"
        >
          <div className="w-full mb-2">
            <h4 className="text-sm font-medium">
              Detected Variables ({detectedVariables.length})
            </h4>
          </div>

          {detectedVariables.map((variable, index) => (
            <Badge
              key={`${variable}-${index}`}
              variant={
                existingVariables.includes(variable) ? 'default' : 'secondary'
              }
              className="text-xs"
            >
              {variable}
              {!existingVariables.includes(variable) && (
                <span className="ml-1 text-orange-600">•</span>
              )}
            </Badge>
          ))}

          {hasNewVariables && (
            <div className="w-full mt-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {newVariables.length} new variable
                  {newVariables.length !== 1 ? 's' : ''} detected
                </p>
                <Button size="sm" onClick={onSyncVariables} className="ml-2">
                  Sync Variables
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Warning for variables in template but not defined */}
      {existingVariables.some(
        existing => !detectedVariables.includes(existing)
      ) && (
        <Alert variant="default">
          <p className="font-medium">
            Some configured variables not found in template
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            The following variables are configured but not present in the
            current template:
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {existingVariables
              .filter(existing => !detectedVariables.includes(existing))
              .map(variable => (
                <Badge key={variable} variant="outline" className="text-xs">
                  {variable}
                </Badge>
              ))}
          </div>
        </Alert>
      )}

      {/* Screen reader only description */}
      <div id="detection-help" className="sr-only">
        Variables are automatically detected from your template using double
        brace syntax like {'{'}
        {'{'}variableName{'}}'}. Orange dots indicate newly detected variables
        that need configuration.
      </div>
    </div>
  );
}
