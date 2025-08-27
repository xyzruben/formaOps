// Type Coercion System
// Implements Phase 2 specification from VARIABLE_DEFINITION_EDITOR_PLAN.md

import {
  VariableType,
  VariableDefinition,
  TypeConversionResult,
  TypeConversionRules,
} from '../types';

export class TypeCoercionSystem {
  // Define conversion rules between types as specified in the plan
  static conversionMatrix = new Map<string, TypeConversionRules>([
    // String conversions
    [
      'string->number',
      {
        from: 'string',
        to: 'number',
        converter: (value: string) => {
          if (value === '' || value === null || value === undefined) {
            return { success: true, convertedValue: undefined };
          }
          const num = Number(value);
          if (isNaN(num)) {
            return {
              success: false,
              convertedValue: value,
              error: `Cannot convert "${value}" to number`,
            };
          }
          return { success: true, convertedValue: num };
        },
        preserveOnFailure: true,
      },
    ],

    [
      'string->boolean',
      {
        from: 'string',
        to: 'boolean',
        converter: (value: string) => {
          if (value === '' || value === null || value === undefined) {
            return { success: true, convertedValue: undefined };
          }
          const lowerValue = value.toLowerCase().trim();
          const truthyValues = ['true', '1', 'yes', 'on', 'enabled'];
          const falsyValues = ['false', '0', 'no', 'off', 'disabled'];

          if (truthyValues.includes(lowerValue)) {
            return { success: true, convertedValue: true };
          }
          if (falsyValues.includes(lowerValue)) {
            return { success: true, convertedValue: false };
          }

          return {
            success: false,
            convertedValue: value,
            error: `Cannot convert "${value}" to boolean. Use: true, false, 1, 0, yes, no`,
          };
        },
        preserveOnFailure: true,
      },
    ],

    [
      'string->array',
      {
        from: 'string',
        to: 'array',
        converter: (value: string) => {
          if (value === '' || value === null || value === undefined) {
            return { success: true, convertedValue: [] };
          }

          try {
            // Try JSON parsing first
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              return { success: true, convertedValue: parsed };
            }
          } catch {
            // Fall back to comma-separated values
            const array = value
              .split(',')
              .map(item => item.trim())
              .filter(Boolean);
            return {
              success: true,
              convertedValue: array,
              warning: 'Converted comma-separated string to array',
            };
          }

          return {
            success: false,
            convertedValue: value,
            error:
              'Cannot convert to array. Use JSON array format or comma-separated values',
          };
        },
        preserveOnFailure: true,
      },
    ],

    // Number conversions
    [
      'number->string',
      {
        from: 'number',
        to: 'string',
        converter: (value: number) => ({
          success: true,
          convertedValue: value?.toString() || '',
        }),
        preserveOnFailure: false,
      },
    ],

    [
      'number->boolean',
      {
        from: 'number',
        to: 'boolean',
        converter: (value: number) => ({
          success: true,
          convertedValue: value !== 0 && !isNaN(value),
        }),
        preserveOnFailure: false,
      },
    ],

    [
      'number->array',
      {
        from: 'number',
        to: 'array',
        converter: (value: number) => ({
          success: true,
          convertedValue: [value],
        }),
        preserveOnFailure: false,
      },
    ],

    // Boolean conversions
    [
      'boolean->string',
      {
        from: 'boolean',
        to: 'string',
        converter: (value: boolean) => ({
          success: true,
          convertedValue: value?.toString() || 'false',
        }),
        preserveOnFailure: false,
      },
    ],

    [
      'boolean->number',
      {
        from: 'boolean',
        to: 'number',
        converter: (value: boolean) => ({
          success: true,
          convertedValue: value ? 1 : 0,
        }),
        preserveOnFailure: false,
      },
    ],

    [
      'boolean->array',
      {
        from: 'boolean',
        to: 'array',
        converter: (value: boolean) => ({
          success: true,
          convertedValue: [value],
        }),
        preserveOnFailure: false,
      },
    ],

    // Array conversions
    [
      'array->string',
      {
        from: 'array',
        to: 'string',
        converter: (value: any[]) => {
          if (!Array.isArray(value)) {
            return {
              success: false,
              convertedValue: value,
              error: 'Value is not an array',
            };
          }
          return {
            success: true,
            convertedValue: value.join(', '),
          };
        },
        preserveOnFailure: true,
      },
    ],

    [
      'array->number',
      {
        from: 'array',
        to: 'number',
        converter: (value: any[]) => {
          if (!Array.isArray(value)) {
            return {
              success: false,
              convertedValue: value,
              error: 'Value is not an array',
            };
          }
          if (value.length === 1 && !isNaN(Number(value[0]))) {
            return { success: true, convertedValue: Number(value[0]) };
          }
          return {
            success: false,
            convertedValue: value,
            error:
              'Cannot convert array to number. Array must contain single numeric value',
          };
        },
        preserveOnFailure: true,
      },
    ],

    [
      'array->boolean',
      {
        from: 'array',
        to: 'boolean',
        converter: (value: any[]) => ({
          success: true,
          convertedValue: Array.isArray(value) && value.length > 0,
        }),
        preserveOnFailure: false,
      },
    ],
  ]);

  // Main conversion function
  static convertVariableType(
    variable: VariableDefinition,
    newType: VariableType
  ): VariableDefinition & { conversionResult?: TypeConversionResult } {
    if (variable.type === newType) {
      return variable;
    }

    const conversionKey = `${variable.type}->${newType}`;
    const conversionRule =
      TypeCoercionSystem.conversionMatrix.get(conversionKey);

    if (!conversionRule) {
      return {
        ...variable,
        type: newType,
        defaultValue: undefined,
        conversionResult: {
          success: false,
          convertedValue: undefined,
          error: `No conversion rule from ${variable.type} to ${newType}`,
        },
      };
    }

    const conversionResult = conversionRule.converter(variable.defaultValue);

    return {
      ...variable,
      type: newType,
      defaultValue: conversionResult.success
        ? conversionResult.convertedValue
        : conversionRule.preserveOnFailure
          ? variable.defaultValue
          : undefined,
      conversionResult,
    };
  }

  // Batch conversion for multiple variables
  static convertMultipleVariables(
    variables: VariableDefinition[],
    typeChanges: Record<string, VariableType>
  ): VariableDefinition[] {
    return variables.map(variable => {
      const newType = typeChanges[variable.name];
      if (!newType) return variable;

      return TypeCoercionSystem.convertVariableType(variable, newType);
    });
  }

  // Validation for converted values
  static validateConvertedValue(value: any, type: VariableType): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string' || value === undefined;
      case 'number':
        return (
          (typeof value === 'number' && !isNaN(value)) || value === undefined
        );
      case 'boolean':
        return typeof value === 'boolean' || value === undefined;
      case 'array':
        return Array.isArray(value) || value === undefined;
      default:
        return false;
    }
  }
}
