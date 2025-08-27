// Type Conversion Hook
// Implements Phase 2 type conversion hook from VARIABLE_DEFINITION_EDITOR_PLAN.md

import { useState, useCallback } from 'react';
import { VariableDefinition, VariableType } from '../types';
import { TypeCoercionSystem } from '../utils/TypeCoercionSystem';

export const useTypeConversion = (variables: VariableDefinition[]) => {
  const [conversionMessages, setConversionMessages] = useState<
    Record<string, string>
  >({});

  const handleTypeChange = useCallback(
    (variableName: string, newType: VariableType) => {
      const variable = variables.find(v => v.name === variableName);
      if (!variable) return variable;

      const converted = TypeCoercionSystem.convertVariableType(
        variable,
        newType
      );

      // Track conversion messages
      if (converted.conversionResult) {
        setConversionMessages(prev => ({
          ...prev,
          [variableName]:
            converted.conversionResult!.error ||
            converted.conversionResult!.warning ||
            '',
        }));
      }

      return converted;
    },
    [variables]
  );

  const clearConversionMessage = useCallback((variableName: string) => {
    setConversionMessages(prev => {
      const newMessages = { ...prev };
      delete newMessages[variableName];
      return newMessages;
    });
  }, []);

  return {
    handleTypeChange,
    conversionMessages,
    clearConversionMessage,
  };
};
