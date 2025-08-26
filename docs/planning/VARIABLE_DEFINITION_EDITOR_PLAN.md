# Variable Definition Editor Feature Plan

## Executive Summary

### Feature Purpose
The Variable Definition Editor automatically detects template variables from prompt text and provides a user interface for configuring variable types, validation rules, and default values. This is the foundational component that enables dynamic prompt templating and execution.

### User Value
- **Automatic Variable Detection**: Users don't need to manually define variables - the system detects `{{variable}}` patterns
- **Type Safety**: Ensures proper variable typing (string, number, boolean, array) for reliable AI execution
- **Default Values**: Reduces execution friction by providing sensible defaults
- **Validation Rules**: Prevents execution errors with proper input validation

### Architectural Role
Core dependency for Prompt Creation Form and Execution Panel. Serves as the bridge between static template text and dynamic execution inputs. Enables type-safe variable handling throughout the platform.

### Implementation Priority
**Position 1** in critical path - must be completed first as other features depend on it.

---

## Technical Specifications

### Component Architecture

```typescript
interface VariableDefinitionEditorProps {
  template: string;                    // Template text with {{variable}} patterns
  variables: VariableDefinition[];     // Current variable definitions
  onChange: (variables: VariableDefinition[]) => void;
  disabled?: boolean;                  // For read-only mode
}

interface VariableDefinition {
  name: string;                        // Variable name from template
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  description?: string;
  defaultValue?: any;
  options?: string[];                  // For enum-type variables
}
```

### Data Flow

```
Template Text → Parse Variables → Compare with Existing → UI Update → User Changes → Validation → onChange Callback
```

1. **Parse Phase**: Extract `{{variable}}` patterns using regex
2. **Reconcile Phase**: Compare detected variables with existing definitions
3. **Display Phase**: Show variable table with configuration options  
4. **Update Phase**: User modifies variable settings, trigger onChange

### API Integration
- **No Direct API**: This component manages local state only
- **Integration Point**: Data flows to Prompt Creation/Edit forms which save via `/api/prompts`

### State Management
- **Internal State**: Variable parsing results and UI state
- **Parent State**: Variable definitions managed by parent form
- **No Global State**: Keeps state management simple and contained

---

## User Experience Design

### User Workflow

```
1. User types template: "Hello {{name}}, your order {{orderId}} is {{status}}"
2. Component detects variables: name, orderId, status
3. Variable table appears with detected variables
4. User configures each variable:
   - name: type=string, required=true
   - orderId: type=number, required=true  
   - status: type=string, required=true, options=["pending", "shipped", "delivered"]
5. Changes automatically save to parent form
```

### UI Components

**Variable Detection Display**
```typescript
interface VariableDetectionProps {
  detectedVariables: string[];
  existingVariables: string[];
  onSyncVariables: () => void;
}
```
- Shows newly detected variables in badge format
- "Sync Variables" button to add new detections
- Warning for variables in template but not defined

**Variable Configuration Table**
```typescript
interface VariableTableProps {
  variables: VariableDefinition[];
  onUpdateVariable: (index: number, variable: VariableDefinition) => void;
  onDeleteVariable: (index: number) => void;
}
```
- Editable table with inline controls
- Type selection dropdown
- Required/optional toggle
- Default value input (type-specific)
- Options editor for enum types
- Delete button for unused variables

**Type-Specific Inputs**
- **String**: Text input + optional enum options
- **Number**: Number input with min/max validation
- **Boolean**: Checkbox with default state
- **Array**: Textarea for comma-separated values

### Validation Rules

```typescript
const VariableDefinitionSchema = z.object({
  name: z.string()
    .min(1, 'Variable name required')
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid variable name'),
  type: z.enum(['string', 'number', 'boolean', 'array']),
  required: z.boolean(),
  description: z.string().optional(),
  defaultValue: z.any().optional(),
  options: z.array(z.string()).optional()
});
```

**Validation Logic:**
- Variable names must be valid identifiers
- Default values must match selected type
- Options array only valid for string types
- No duplicate variable names allowed

### Edge Case Handling

```typescript
// Edge case handling utilities
interface ParseError {
  type: 'MALFORMED_SYNTAX' | 'INVALID_NESTING' | 'SPECIAL_CHARS' | 'EMPTY_NAME' | 'DUPLICATE_REFERENCE';
  message: string;
  position: number;
  suggestion?: string;
}

const handleTemplateEdgeCases = (template: string): ParseResult => {
  const errors: ParseError[] = [];
  const variables: string[] = [];
  
  // Handle malformed syntax
  const malformedPatterns = template.match(/\{\{[^}]*(?:\{|$)/g) || [];
  malformedPatterns.forEach((match, index) => {
    const position = template.indexOf(match);
    errors.push({
      type: 'MALFORMED_SYNTAX',
      message: 'Unclosed variable bracket',
      position,
      suggestion: 'Add closing }} to complete the variable'
    });
  });
  
  // Handle deeply nested variables (support dot notation)
  const nestedVariables = template.match(/\{\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g) || [];
  nestedVariables.forEach(match => {
    const variableName = match.slice(2, -2);
    if (variableName.includes('.') && variableName.split('.').length > 5) {
      errors.push({
        type: 'INVALID_NESTING',
        message: 'Variable nesting too deep (max 5 levels)',
        position: template.indexOf(match),
        suggestion: 'Consider flattening the data structure'
      });
    }
    variables.push(variableName);
  });
  
  // Handle special characters in variable names
  const specialCharPattern = /\{\{([^a-zA-Z0-9_.].*?)\}\}/g;
  let specialMatch;
  while ((specialMatch = specialCharPattern.exec(template)) !== null) {
    errors.push({
      type: 'SPECIAL_CHARS',
      message: 'Variable names can only contain letters, numbers, underscores, and dots',
      position: specialMatch.index,
      suggestion: 'Use alphanumeric characters and underscores only'
    });
  }
  
  // Handle empty variable names
  const emptyVariables = template.match(/\{\{\s*\}\}/g) || [];
  emptyVariables.forEach(match => {
    errors.push({
      type: 'EMPTY_NAME',
      message: 'Variable name cannot be empty',
      position: template.indexOf(match),
      suggestion: 'Provide a meaningful variable name'
    });
  });
  
  // Handle duplicate variable references
  const uniqueVariables = [...new Set(variables)];
  const duplicateCount = variables.length - uniqueVariables.length;
  if (duplicateCount > 0) {
    // This is informational, not an error
    console.info(`Template contains ${duplicateCount} duplicate variable references`);
  }
  
  return { variables: uniqueVariables, errors };
};
```

**Edge Case Recovery Strategies:**
- **Malformed Syntax**: Highlight problematic areas with fix suggestions
- **Deep Nesting**: Support up to 5 levels, warn beyond that
- **Special Characters**: Auto-suggest valid alternatives
- **Empty Names**: Prompt user for meaningful names
- **Duplicates**: Show reference count, allow intentional duplicates

### Advanced Template Parsing

```typescript
// Enhanced regex patterns for complex variable structures
interface AdvancedParseResult {
  variables: ParsedVariable[];
  errors: ParseError[];
  warnings: ParseWarning[];
}

interface ParsedVariable {
  name: string;
  fullPath: string;
  type: 'simple' | 'nested' | 'array_indexed';
  depth: number;
  position: number;
  isValid: boolean;
}

const AdvancedVariableParser = {
  // Enhanced regex patterns
  patterns: {
    // Simple variables: {{name}}
    simple: /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g,
    
    // Nested variables: {{user.profile.firstName}}
    nested: /\{\{([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\}\}/g,
    
    // Array indexed: {{users[0].name}} or {{items[index].value}}
    arrayIndexed: /\{\{([a-zA-Z_][a-zA-Z0-9_]*(?:\[[a-zA-Z0-9_]+\])?(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\}\}/g,
    
    // Special characters in paths: {{user-data.profile.first_name}}
    specialChars: /\{\{([a-zA-Z_][a-zA-Z0-9_-]*(?:\.[a-zA-Z_][a-zA-Z0-9_-]*)*)\}\}/g,
    
    // Performance-optimized combined pattern
    combined: /\{\{([a-zA-Z_][a-zA-Z0-9_-]*(?:\[[a-zA-Z0-9_]+\])?(?:\.[a-zA-Z_][a-zA-Z0-9_-]*)*)\}\}/g
  },

  parseAdvancedTemplate: (template: string): AdvancedParseResult => {
    const variables: ParsedVariable[] = [];
    const errors: ParseError[] = [];
    const warnings: ParseWarning[] = [];
    
    // Use single optimized regex pass for performance
    let match;
    const combinedPattern = new RegExp(AdvancedVariableParser.patterns.combined.source, 'g');
    
    while ((match = combinedPattern.exec(template)) !== null) {
      const fullMatch = match[0];
      const variablePath = match[1];
      const position = match.index;
      
      // Analyze variable structure
      const analysis = AdvancedVariableParser.analyzeVariableStructure(variablePath);
      
      if (analysis.isValid) {
        variables.push({
          name: analysis.baseName,
          fullPath: variablePath,
          type: analysis.type,
          depth: analysis.depth,
          position,
          isValid: true
        });
        
        // Add warnings for complex structures
        if (analysis.depth > 3) {
          warnings.push({
            type: 'DEEP_NESTING',
            message: `Variable "${variablePath}" has deep nesting (${analysis.depth} levels)`,
            position,
            suggestion: 'Consider flattening data structure for better performance'
          });
        }
        
        if (analysis.hasArrayIndexing && analysis.usesStringIndex) {
          warnings.push({
            type: 'DYNAMIC_INDEXING',
            message: `Variable "${variablePath}" uses dynamic array indexing`,
            position,
            suggestion: 'Ensure the index variable is defined and valid'
          });
        }
      } else {
        errors.push({
          type: 'INVALID_STRUCTURE',
          message: analysis.error || `Invalid variable structure: "${variablePath}"`,
          position,
          suggestion: 'Use alphanumeric characters, underscores, dots, and brackets only'
        });
      }
    }
    
    return { variables, errors, warnings };
  },

  analyzeVariableStructure: (path: string) => {
    // Split path into components
    const parts = path.split('.');
    const baseName = parts[0];
    
    // Check for array indexing in base name
    const arrayMatch = baseName.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\[([a-zA-Z0-9_]+)\]$/);
    const hasArrayIndexing = !!arrayMatch;
    const usesStringIndex = arrayMatch ? !/^\d+$/.test(arrayMatch[2]) : false;
    
    // Determine type
    let type: 'simple' | 'nested' | 'array_indexed';
    if (hasArrayIndexing) {
      type = 'array_indexed';
    } else if (parts.length > 1) {
      type = 'nested';
    } else {
      type = 'simple';
    }
    
    // Validate each part
    const isValid = parts.every(part => {
      if (part.includes('[') && part.includes(']')) {
        // Validate array indexed part
        return /^[a-zA-Z_][a-zA-Z0-9_-]*\[[a-zA-Z0-9_]+\]$/.test(part);
      } else {
        // Validate simple part
        return /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(part);
      }
    });
    
    return {
      baseName: arrayMatch ? arrayMatch[1] : baseName,
      depth: parts.length,
      type,
      hasArrayIndexing,
      usesStringIndex,
      isValid,
      error: isValid ? null : 'Invalid characters in variable path'
    };
  }
};

// Performance optimization for large templates
const OptimizedTemplateParser = {
  // Chunk-based parsing for very large templates
  parseInChunks: (template: string, chunkSize = 5000): AdvancedParseResult => {
    if (template.length <= chunkSize) {
      return AdvancedVariableParser.parseAdvancedTemplate(template);
    }
    
    const chunks = [];
    const results: AdvancedParseResult = { variables: [], errors: [], warnings: [] };
    let offset = 0;
    
    // Split into overlapping chunks to handle variables at boundaries
    while (offset < template.length) {
      const end = Math.min(offset + chunkSize, template.length);
      const chunk = template.slice(offset, end);
      
      // Find safe break point (avoid breaking within variables)
      const safeEnd = chunk.lastIndexOf('}}') + 2;
      const safeChunk = safeEnd > 0 ? chunk.slice(0, safeEnd) : chunk;
      
      const chunkResult = AdvancedVariableParser.parseAdvancedTemplate(safeChunk);
      
      // Adjust positions for global offset
      chunkResult.variables.forEach(v => v.position += offset);
      chunkResult.errors.forEach(e => e.position += offset);
      chunkResult.warnings.forEach(w => w.position += offset);
      
      results.variables.push(...chunkResult.variables);
      results.errors.push(...chunkResult.errors);
      results.warnings.push(...chunkResult.warnings);
      
      offset += safeEnd || chunkSize;
    }
    
    // Remove duplicates (from overlapping chunks)
    results.variables = results.variables.filter((v, i, arr) => 
      arr.findIndex(x => x.fullPath === v.fullPath && x.position === v.position) === i
    );
    
    return results;
  }
};
```

**Advanced Parsing Test Cases:**
```typescript
const testComplexTemplates = [
  // Nested object access
  "Hello {{user.profile.firstName}} {{user.profile.lastName}}",
  
  // Array indexing with numeric indices
  "First item: {{items[0].name}}, Second: {{items[1].value}}",
  
  // Array indexing with variable indices
  "Current user: {{users[currentIndex].profile.displayName}}",
  
  // Special characters in property names
  "Data: {{user-data.profile.first_name}} - {{api_response.user-id}}",
  
  // Mixed complexity
  "Order {{orders[0].id}} for {{orders[0].customer.profile.name}} costs {{orders[0].total_amount}}",
  
  // Edge cases
  "{{deeply.nested.object.with.many.levels.of.depth.that.exceeds.normal.usage}}",
  "{{items[dynamicIndex].nested.property}}"
];
```

### Type Coercion & Conversion

```typescript
// Type conversion system for variable definitions
interface TypeConversionResult {
  success: boolean;
  convertedValue: any;
  error?: string;
  warning?: string;
}

interface TypeConversionRules {
  from: VariableType;
  to: VariableType;
  converter: (value: any) => TypeConversionResult;
  preserveOnFailure: boolean;
}

const TypeCoercionSystem = {
  // Define conversion rules between types
  conversionMatrix: new Map<string, TypeConversionRules>([
    // String conversions
    ['string->number', {
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
            error: `Cannot convert "${value}" to number`
          };
        }
        return { success: true, convertedValue: num };
      },
      preserveOnFailure: true
    }],
    
    ['string->boolean', {
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
          error: `Cannot convert "${value}" to boolean. Use: true, false, 1, 0, yes, no`
        };
      },
      preserveOnFailure: true
    }],
    
    ['string->array', {
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
          const array = value.split(',').map(item => item.trim()).filter(Boolean);
          return {
            success: true,
            convertedValue: array,
            warning: 'Converted comma-separated string to array'
          };
        }
        
        return {
          success: false,
          convertedValue: value,
          error: 'Cannot convert to array. Use JSON array format or comma-separated values'
        };
      },
      preserveOnFailure: true
    }],
    
    // Number conversions
    ['number->string', {
      from: 'number',
      to: 'string',
      converter: (value: number) => ({
        success: true,
        convertedValue: value?.toString() || ''
      }),
      preserveOnFailure: false
    }],
    
    ['number->boolean', {
      from: 'number',
      to: 'boolean',
      converter: (value: number) => ({
        success: true,
        convertedValue: value !== 0 && !isNaN(value)
      }),
      preserveOnFailure: false
    }],
    
    ['number->array', {
      from: 'number',
      to: 'array',
      converter: (value: number) => ({
        success: true,
        convertedValue: [value]
      }),
      preserveOnFailure: false
    }],
    
    // Boolean conversions
    ['boolean->string', {
      from: 'boolean',
      to: 'string',
      converter: (value: boolean) => ({
        success: true,
        convertedValue: value?.toString() || 'false'
      }),
      preserveOnFailure: false
    }],
    
    ['boolean->number', {
      from: 'boolean',
      to: 'number',
      converter: (value: boolean) => ({
        success: true,
        convertedValue: value ? 1 : 0
      }),
      preserveOnFailure: false
    }],
    
    ['boolean->array', {
      from: 'boolean',
      to: 'array',
      converter: (value: boolean) => ({
        success: true,
        convertedValue: [value]
      }),
      preserveOnFailure: false
    }],
    
    // Array conversions
    ['array->string', {
      from: 'array',
      to: 'string',
      converter: (value: any[]) => {
        if (!Array.isArray(value)) {
          return {
            success: false,
            convertedValue: value,
            error: 'Value is not an array'
          };
        }
        return {
          success: true,
          convertedValue: value.join(', ')
        };
      },
      preserveOnFailure: true
    }],
    
    ['array->number', {
      from: 'array',
      to: 'number',
      converter: (value: any[]) => {
        if (!Array.isArray(value)) {
          return {
            success: false,
            convertedValue: value,
            error: 'Value is not an array'
          };
        }
        if (value.length === 1 && !isNaN(Number(value[0]))) {
          return { success: true, convertedValue: Number(value[0]) };
        }
        return {
          success: false,
          convertedValue: value,
          error: 'Cannot convert array to number. Array must contain single numeric value'
        };
      },
      preserveOnFailure: true
    }],
    
    ['array->boolean', {
      from: 'array',
      to: 'boolean',
      converter: (value: any[]) => ({
        success: true,
        convertedValue: Array.isArray(value) && value.length > 0
      }),
      preserveOnFailure: false
    }]
  ]),

  // Main conversion function
  convertVariableType: (
    variable: VariableDefinition, 
    newType: VariableType
  ): VariableDefinition & { conversionResult?: TypeConversionResult } => {
    if (variable.type === newType) {
      return variable;
    }

    const conversionKey = `${variable.type}->${newType}`;
    const conversionRule = TypeCoercionSystem.conversionMatrix.get(conversionKey);
    
    if (!conversionRule) {
      return {
        ...variable,
        type: newType,
        defaultValue: undefined,
        conversionResult: {
          success: false,
          convertedValue: undefined,
          error: `No conversion rule from ${variable.type} to ${newType}`
        }
      };
    }

    const conversionResult = conversionRule.converter(variable.defaultValue);
    
    return {
      ...variable,
      type: newType,
      defaultValue: conversionResult.success ? conversionResult.convertedValue : 
                   (conversionRule.preserveOnFailure ? variable.defaultValue : undefined),
      conversionResult
    };
  },

  // Batch conversion for multiple variables
  convertMultipleVariables: (
    variables: VariableDefinition[],
    typeChanges: Record<string, VariableType>
  ): VariableDefinition[] => {
    return variables.map(variable => {
      const newType = typeChanges[variable.name];
      if (!newType) return variable;
      
      return TypeCoercionSystem.convertVariableType(variable, newType);
    });
  },

  // Validation for converted values
  validateConvertedValue: (value: any, type: VariableType): boolean => {
    switch (type) {
      case 'string':
        return typeof value === 'string' || value === undefined;
      case 'number':
        return typeof value === 'number' && !isNaN(value) || value === undefined;
      case 'boolean':
        return typeof value === 'boolean' || value === undefined;
      case 'array':
        return Array.isArray(value) || value === undefined;
      default:
        return false;
    }
  }
};

// Hook for managing type conversions in the component
const useTypeConversion = (variables: VariableDefinition[]) => {
  const [conversionMessages, setConversionMessages] = useState<Record<string, string>>({});

  const handleTypeChange = useCallback((variableName: string, newType: VariableType) => {
    const variable = variables.find(v => v.name === variableName);
    if (!variable) return variable;

    const converted = TypeCoercionSystem.convertVariableType(variable, newType);
    
    // Track conversion messages
    if (converted.conversionResult) {
      setConversionMessages(prev => ({
        ...prev,
        [variableName]: converted.conversionResult.error || 
                       converted.conversionResult.warning || ''
      }));
    }

    return converted;
  }, [variables]);

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
    clearConversionMessage
  };
};
```

### Undo/Redo System

```typescript
// State history management for undo/redo functionality
interface HistoryState {
  variables: VariableDefinition[];
  timestamp: number;
  action: string;
}

interface UndoRedoState {
  past: HistoryState[];
  present: HistoryState;
  future: HistoryState[];
}

class VariableHistoryManager {
  private maxHistorySize = 50;
  
  constructor(initialVariables: VariableDefinition[]) {
    this.state = {
      past: [],
      present: {
        variables: initialVariables,
        timestamp: Date.now(),
        action: 'initial'
      },
      future: []
    };
  }

  private state: UndoRedoState;

  // Add new state to history
  pushState(variables: VariableDefinition[], action: string): void {
    const newState: HistoryState = {
      variables: JSON.parse(JSON.stringify(variables)), // Deep clone
      timestamp: Date.now(),
      action
    };

    // Don't add if no changes
    if (this.deepEqual(this.state.present.variables, variables)) {
      return;
    }

    this.state = {
      past: [...this.state.past, this.state.present].slice(-this.maxHistorySize),
      present: newState,
      future: [] // Clear future when new action is performed
    };
  }

  // Undo last action
  undo(): HistoryState | null {
    if (this.state.past.length === 0) {
      return null;
    }

    const previous = this.state.past[this.state.past.length - 1];
    const newPast = this.state.past.slice(0, -1);

    this.state = {
      past: newPast,
      present: previous,
      future: [this.state.present, ...this.state.future]
    };

    return this.state.present;
  }

  // Redo next action
  redo(): HistoryState | null {
    if (this.state.future.length === 0) {
      return null;
    }

    const next = this.state.future[0];
    const newFuture = this.state.future.slice(1);

    this.state = {
      past: [...this.state.past, this.state.present],
      present: next,
      future: newFuture
    };

    return this.state.present;
  }

  // Get current state
  getCurrentState(): HistoryState {
    return this.state.present;
  }

  // Check if undo is possible
  canUndo(): boolean {
    return this.state.past.length > 0;
  }

  // Check if redo is possible
  canRedo(): boolean {
    return this.state.future.length > 0;
  }

  // Get history summary for debugging
  getHistorySummary(): { past: number; present: string; future: number } {
    return {
      past: this.state.past.length,
      present: this.state.present.action,
      future: this.state.future.length
    };
  }

  // Clear all history
  clearHistory(): void {
    this.state = {
      past: [],
      present: this.state.present,
      future: []
    };
  }

  // Deep equality check for variables
  private deepEqual(a: VariableDefinition[], b: VariableDefinition[]): boolean {
    if (a.length !== b.length) return false;
    
    return a.every((varA, index) => {
      const varB = b[index];
      return varA.name === varB.name &&
             varA.type === varB.type &&
             varA.required === varB.required &&
             varA.description === varB.description &&
             JSON.stringify(varA.defaultValue) === JSON.stringify(varB.defaultValue) &&
             JSON.stringify(varA.options) === JSON.stringify(varB.options);
    });
  }
}

// Hook for undo/redo functionality
const useUndoRedo = (initialVariables: VariableDefinition[]) => {
  const historyManager = useRef(new VariableHistoryManager(initialVariables));
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  // Update undo/redo availability
  const updateUndoRedoState = useCallback(() => {
    setCanUndo(historyManager.current.canUndo());
    setCanRedo(historyManager.current.canRedo());
  }, []);

  // Add state to history
  const pushToHistory = useCallback((variables: VariableDefinition[], action: string) => {
    historyManager.current.pushState(variables, action);
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  // Undo action
  const undo = useCallback((): VariableDefinition[] | null => {
    const previousState = historyManager.current.undo();
    updateUndoRedoState();
    return previousState?.variables || null;
  }, [updateUndoRedoState]);

  // Redo action
  const redo = useCallback((): VariableDefinition[] | null => {
    const nextState = historyManager.current.redo();
    updateUndoRedoState();
    return nextState?.variables || null;
  }, [updateUndoRedoState]);

  // Keyboard event handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'z':
          if (event.shiftKey && canRedo) {
            event.preventDefault();
            redo();
          } else if (!event.shiftKey && canUndo) {
            event.preventDefault();
            undo();
          }
          break;
        case 'y':
          if (canRedo) {
            event.preventDefault();
            redo();
          }
          break;
      }
    }
  }, [canUndo, canRedo, undo, redo]);

  // Attach keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Get current state
  const getCurrentState = useCallback(() => {
    return historyManager.current.getCurrentState();
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    historyManager.current.clearHistory();
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  return {
    pushToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    getCurrentState,
    clearHistory,
    handleKeyDown
  };
};

// Enhanced variable editor with undo/redo integration
const VariableEditorWithHistory = () => {
  const [variables, setVariables] = useState<VariableDefinition[]>([]);
  const {
    pushToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    handleKeyDown
  } = useUndoRedo(variables);

  // Wrapper functions that include history tracking
  const addVariable = useCallback((variable: VariableDefinition) => {
    const newVariables = [...variables, variable];
    setVariables(newVariables);
    pushToHistory(newVariables, `Added variable "${variable.name}"`);
  }, [variables, pushToHistory]);

  const updateVariable = useCallback((index: number, updatedVariable: VariableDefinition) => {
    const newVariables = [...variables];
    newVariables[index] = updatedVariable;
    setVariables(newVariables);
    pushToHistory(newVariables, `Updated variable "${updatedVariable.name}"`);
  }, [variables, pushToHistory]);

  const deleteVariable = useCallback((index: number) => {
    const variableToDelete = variables[index];
    const newVariables = variables.filter((_, i) => i !== index);
    setVariables(newVariables);
    pushToHistory(newVariables, `Deleted variable "${variableToDelete.name}"`);
  }, [variables, pushToHistory]);

  // Undo/redo handlers that update component state
  const handleUndo = useCallback(() => {
    const previousVariables = undo();
    if (previousVariables) {
      setVariables(previousVariables);
    }
  }, [undo]);

  const handleRedo = useCallback(() => {
    const nextVariables = redo();
    if (nextVariables) {
      setVariables(nextVariables);
    }
  }, [redo]);

  return {
    variables,
    setVariables,
    addVariable,
    updateVariable,
    deleteVariable,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    handleKeyDown
  };
};
```

**Undo/Redo Features:**
- **State Persistence**: Maintains up to 50 history states with deep cloning
- **Action Tracking**: Records specific actions for better user feedback
- **Keyboard Shortcuts**: Standard Ctrl+Z (undo) and Ctrl+Y/Ctrl+Shift+Z (redo)
- **Smart State Management**: Prevents duplicate states and clears future on new actions
- **Memory Optimization**: Limits history size to prevent memory bloat

### Performance Optimization

```typescript
// Performance optimization patterns
const useOptimizedVariableParser = (template: string) => {
  // Debounce template changes to prevent excessive parsing
  const debouncedTemplate = useDebounce(template, 300);
  
  // Memoize parsing results to avoid redundant computation
  const parsedVariables = useMemo(() => {
    if (!debouncedTemplate) return { variables: [], errors: [] };
    
    // Early return for very long templates
    if (debouncedTemplate.length > 10000) {
      return {
        variables: [],
        errors: [{
          type: 'TEMPLATE_TOO_LONG' as const,
          message: 'Template exceeds maximum length of 10,000 characters',
          position: 10000
        }]
      };
    }
    
    return handleTemplateEdgeCases(debouncedTemplate);
  }, [debouncedTemplate]);
  
  // Lazy loading for large variable lists
  const [visibleVariableCount, setVisibleVariableCount] = useState(20);
  const visibleVariables = useMemo(() => 
    parsedVariables.variables.slice(0, visibleVariableCount),
    [parsedVariables.variables, visibleVariableCount]
  );
  
  const loadMoreVariables = useCallback(() => {
    setVisibleVariableCount(prev => prev + 20);
  }, []);
  
  return {
    variables: visibleVariables,
    errors: parsedVariables.errors,
    hasMore: parsedVariables.variables.length > visibleVariableCount,
    loadMore: loadMoreVariables
  };
};

// Debounce utility hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};

// Performance monitoring
const VariablePerformanceMonitor = {
  // Target performance benchmarks
  PARSE_TIME_TARGET: 50, // ms
  RENDER_TIME_TARGET: 100, // ms
  MEMORY_THRESHOLD: 10, // MB
  
  measureParseTime: (template: string): number => {
    const start = performance.now();
    handleTemplateEdgeCases(template);
    const end = performance.now();
    return end - start;
  },
  
  trackMemoryUsage: (): number => {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  },
  
  shouldOptimize: (parseTime: number, memoryUsage: number): boolean => {
    return parseTime > VariablePerformanceMonitor.PARSE_TIME_TARGET ||
           memoryUsage > VariablePerformanceMonitor.MEMORY_THRESHOLD;
  }
};
```

**Performance Targets:**
- **Parse Time**: < 50ms for templates up to 1,000 characters
- **Render Time**: < 100ms for variable lists up to 50 items
- **Memory Usage**: < 10MB for component lifecycle
- **Debounce Delay**: 300ms for optimal UX/performance balance
- **Lazy Loading**: 20 items initially, load 20 more on demand

### Accessibility Implementation

```typescript
// Accessibility configuration
interface AccessibilityProps {
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  role?: string;
  tabIndex?: number;
}

const AccessibleVariableEditor = () => {
  const [announcementText, setAnnouncementText] = useState('');
  const [focusedVariableIndex, setFocusedVariableIndex] = useState(-1);
  
  // Screen reader announcements
  const announceVariableDetection = useCallback((count: number) => {
    const message = count === 1 
      ? '1 variable detected in template'
      : `${count} variables detected in template`;
    setAnnouncementText(message);
  }, []);
  
  const announceVariableUpdate = useCallback((variableName: string, property: string) => {
    setAnnouncementText(`Updated ${property} for variable ${variableName}`);
  }, []);
  
  // Keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedVariableIndex(prev => 
          Math.min(prev + 1, variables.length - 1)
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedVariableIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedVariableIndex >= 0) {
          // Enter edit mode for focused variable
          enterEditMode(focusedVariableIndex);
        }
        break;
      case 'Escape':
        exitEditMode();
        break;
      case 'd':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          duplicateVariable(focusedVariableIndex);
        }
        break;
      case 'Delete':
        if (focusedVariableIndex >= 0) {
          deleteVariable(focusedVariableIndex);
        }
        break;
    }
  }, [focusedVariableIndex, variables.length]);
  
  return (
    <div
      className="variable-editor"
      role="region"
      aria-label="Variable Definition Editor"
      aria-describedby="variable-editor-description"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Screen reader only description */}
      <div id="variable-editor-description" className="sr-only">
        Configure variables detected in your template. Use arrow keys to navigate, Enter to edit, and Delete to remove variables.
      </div>
      
      {/* Live announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {announcementText}
      </div>
      
      {/* Variable detection section */}
      <section
        role="status"
        aria-label="Detected Variables"
        aria-describedby="detection-help"
      >
        <VariableDetectionDisplay 
          detectedVariables={detectedVariables}
          onVariableDetected={announceVariableDetection}
        />
        <div id="detection-help" className="sr-only">
          Variables are automatically detected from your template using double brace syntax like {{variableName}}
        </div>
      </section>
      
      {/* Variable configuration table */}
      <div
        role="table"
        aria-label="Variable Configuration"
        aria-describedby="table-help"
      >
        <div id="table-help" className="sr-only">
          Configure each variable's type, requirements, and default values. Use keyboard shortcuts: Ctrl+D to duplicate, Delete to remove.
        </div>
        
        {/* Table header */}
        <div role="rowgroup">
          <div role="row" className="variable-table-header">
            <div role="columnheader" aria-sort="none">Name</div>
            <div role="columnheader">Type</div>
            <div role="columnheader">Required</div>
            <div role="columnheader">Default Value</div>
            <div role="columnheader">Actions</div>
          </div>
        </div>
        
        {/* Table body */}
        <div role="rowgroup">
          {variables.map((variable, index) => (
            <VariableRow
              key={variable.name}
              variable={variable}
              index={index}
              isFocused={focusedVariableIndex === index}
              onUpdate={(updated) => {
                updateVariable(index, updated);
                announceVariableUpdate(variable.name, 'configuration');
              }}
              accessibilityProps={{
                role: 'row',
                'aria-rowindex': index + 1,
                'aria-selected': focusedVariableIndex === index,
                tabIndex: focusedVariableIndex === index ? 0 : -1
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// High contrast mode support
const HighContrastStyles = {
  detectHighContrast: (): boolean => {
    return window.matchMedia('(prefers-contrast: high)').matches ||
           window.matchMedia('(-ms-high-contrast: active)').matches;
  },
  
  applyHighContrastStyles: () => ({
    '--variable-border-color': 'currentColor',
    '--variable-bg-color': 'transparent',
    '--variable-text-color': 'currentColor',
    '--variable-focus-color': 'Highlight',
    '--variable-focus-bg': 'HighlightText'
  })
};
```

**Accessibility Features:**
- **ARIA Labels**: Comprehensive labeling for all interactive elements
- **Keyboard Navigation**: Full keyboard support with standard patterns
- **Screen Reader Support**: Live announcements for dynamic changes
- **High Contrast**: Automatic detection and style adaptation
- **Focus Management**: Proper focus indicators and logical tab order

**Keyboard Shortcuts:**
- `↑/↓ Arrow Keys`: Navigate between variables
- `Enter/Space`: Edit focused variable
- `Escape`: Exit edit mode
- `Ctrl/Cmd + D`: Duplicate variable
- `Delete`: Remove focused variable
- `Tab`: Move between form controls

### Responsive Design
- **Desktop**: Full table layout with all controls visible
- **Tablet**: Responsive table with horizontal scroll if needed
- **Mobile**: Card-based layout with collapsible variable details

---

## Implementation Roadmap

### Phase 1: Advanced Variable Detection (5 hours)

**Components to Build:**
- Enhanced `AdvancedVariableParser` with regex optimization
- `VariableDetectionDisplay` component with warning system
- Basic variable table structure
- Error and warning display components
- Chunk-based parsing for large templates

**Functionality:**
- Parse complex variables: nested objects, array indexing, special characters
- Handle malformed syntax with detailed error reporting
- Support for `{{user.profile.name}}`, `{{items[0].value}}`, `{{user-data.api_key}}`
- Performance optimization for templates up to 10,000 characters
- Display detected variables with warnings for complex structures

**Acceptance Criteria:**
- [ ] Correctly detects simple, nested, and array-indexed variables
- [ ] Handles malformed syntax gracefully with helpful error messages
- [ ] Supports complex nesting with performance warnings
- [ ] Shows newly detected variables with structure analysis
- [ ] Chunk-based parsing for very large templates
- [ ] Single-pass regex optimization for performance

### Phase 2: Type System & History Management (8 hours)

**Components to Build:**
- `VariableConfigurationTable` with type conversion system
- `TypeCoercionSystem` with comprehensive conversion matrix
- `VariableHistoryManager` class for undo/redo functionality
- Type-specific input components with smart conversion
- Undo/redo UI controls and keyboard shortcuts

**Functionality:**
- Smart type conversion (string "123" → number 123, "true" → boolean true)
- Comprehensive conversion rules between all types (12 conversion paths)
- Full undo/redo system with 50-state history
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y) for history navigation
- Type-specific default value inputs with validation
- Conversion error handling with user-friendly messages

**Acceptance Criteria:**
- [ ] Users can change variable types with intelligent value conversion
- [ ] All type conversions handle edge cases (empty, null, invalid values)
- [ ] Undo/redo works for all variable operations (add, edit, delete, type change)
- [ ] Keyboard shortcuts function correctly across the component
- [ ] Conversion errors show helpful suggestions
- [ ] History state persists during component lifecycle
- [ ] Type validation prevents invalid default values

### Phase 3: Performance & Accessibility (4.5 hours)

**Components to Build:**
- Debounced template parsing with useMemo optimization
- Lazy loading system for large variable lists
- Comprehensive ARIA labeling and keyboard navigation
- Screen reader announcement system
- High contrast mode support with performance monitoring

**Functionality:**
- 300ms debouncing for template changes to optimize parsing
- Lazy loading of variables (20 at a time) for large lists
- Complete keyboard navigation with focus management
- Screen reader announcements for all dynamic changes
- Performance benchmarking with target compliance
- Accessibility compliance with WCAG 2.1 AA standards

**Acceptance Criteria:**
- [ ] Template parsing completes in <50ms for typical templates
- [ ] Large variable lists (50+) load smoothly with lazy loading
- [ ] Memory usage stays under 10MB throughout lifecycle
- [ ] All interactive elements have proper ARIA labels
- [ ] Keyboard navigation works for all actions including undo/redo
- [ ] Screen reader announces variable detection, updates, and type changes
- [ ] High contrast mode automatically detected and supported
- [ ] Performance targets met consistently across different template sizes

### Dependencies
**Blocked by**: None (foundational component)  
**Blocks**: Prompt Creation Form, Prompt Editing Interface, Enhanced Execution Panel

### Estimated Effort
**Total: 2.5 days (18.5 hours)**
- Development: 15.5 hours
- Testing: 3 hours

**Updated Time Breakdown:**
- Advanced template parsing: +1 hour (complex regex patterns and chunk parsing)
- Type coercion system: +2.5 hours (comprehensive conversion matrix and smart handling)
- Undo/redo system: +1.5 hours (history management and keyboard integration)
- Performance optimization: +1 hour (debouncing, memoization, lazy loading)
- Enhanced accessibility: +1 hour (comprehensive ARIA, screen reader support)
- Additional testing: +1 hour (edge cases, type conversions, undo/redo scenarios)

---

## Technical Requirements

### TypeScript Interfaces

```typescript
// Core interfaces
interface VariableDefinition {
  name: string;
  type: VariableType;
  required: boolean;
  description?: string;
  defaultValue?: any;
  options?: string[];
}

type VariableType = 'string' | 'number' | 'boolean' | 'array';

// Component props
interface VariableDefinitionEditorProps {
  template: string;
  variables: VariableDefinition[];
  onChange: (variables: VariableDefinition[]) => void;
  disabled?: boolean;
  className?: string;
}

// Utility types
interface ParsedVariable {
  name: string;
  positions: number[];  // Positions in template for highlighting
}

interface VariableValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}
```

### Form Validation

```typescript
// Zod schemas
const VariableDefinitionSchema = z.object({
  name: z.string()
    .min(1, 'Variable name is required')
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Variable name must be a valid identifier')
    .max(50, 'Variable name too long'),
  type: z.enum(['string', 'number', 'boolean', 'array']),
  required: z.boolean(),
  description: z.string().max(200, 'Description too long').optional(),
  defaultValue: z.any().optional(),
  options: z.array(z.string().min(1)).optional()
});

const VariableDefinitionsSchema = z.array(VariableDefinitionSchema)
  .refine(variables => {
    const names = variables.map(v => v.name);
    return names.length === new Set(names).size;
  }, 'Variable names must be unique');

// Custom validation for default values
const validateDefaultValue = (value: any, type: VariableType): boolean => {
  switch (type) {
    case 'string': return typeof value === 'string' || value === undefined;
    case 'number': return typeof value === 'number' || value === undefined;
    case 'boolean': return typeof value === 'boolean' || value === undefined;
    case 'array': return Array.isArray(value) || value === undefined;
    default: return false;
  }
};
```

### Error Handling

```typescript
// Error types
interface VariableError {
  field: keyof VariableDefinition;
  message: string;
}

interface ValidationError {
  variableIndex: number;
  errors: VariableError[];
}

// Error handling patterns
const handleVariableError = (error: ValidationError) => {
  // Display inline errors in the table
  // Use toast notifications for critical errors
  // Prevent form submission until resolved
};
```

### Testing Strategy

**Unit Tests:**
```typescript
describe('VariableParser', () => {
  test('extracts variables from template', () => {
    const template = 'Hello {{name}}, your {{order}} is ready!';
    const variables = parseTemplate(template);
    expect(variables).toEqual(['name', 'order']);
  });

  test('handles nested braces correctly', () => {
    const template = 'Process {{data.user.name}} and {{settings}}';
    const variables = parseTemplate(template);
    expect(variables).toEqual(['data.user.name', 'settings']);
  });
});

describe('VariableDefinitionEditor', () => {
  test('syncs detected variables with existing', () => {
    // Test variable reconciliation logic
  });

  test('validates variable configuration', () => {
    // Test validation rules
  });
});
```

**Integration Tests:**
- Test with Prompt Creation Form integration
- Test variable detection with complex templates
- Test error handling and recovery

---

## Integration Points

### Existing Components to Reuse

**UI Components:**
- `Button` - For sync and delete actions
- `Input` - For text inputs and numbers
- `Select` - For type selection (if available, otherwise use native select)
- `Checkbox` - For boolean toggles
- `Textarea` - For array input and descriptions
- `Badge` - For displaying detected variables

**Patterns to Follow:**
- Form handling pattern from `LoginForm`
- Error display pattern from existing forms
- Loading states from existing components

### API Endpoints
**No direct API usage** - this component manages local state only

### State Management Integration

```typescript
// Parent component integration
const PromptCreationForm = () => {
  const [template, setTemplate] = useState('');
  const [variables, setVariables] = useState<VariableDefinition[]>([]);

  return (
    <form>
      <TemplateEditor value={template} onChange={setTemplate} />
      <VariableDefinitionEditor
        template={template}
        variables={variables}
        onChange={setVariables}
      />
    </form>
  );
};
```

### Styling Integration

**CSS Classes:**
```css
/* Follow existing component patterns */
.variable-editor {
  @apply space-y-4;
}

.variable-table {
  @apply w-full border rounded-md;
}

.variable-row {
  @apply border-b last:border-b-0;
}

.detected-variables {
  @apply flex flex-wrap gap-2 p-3 bg-muted rounded-md;
}
```

**Responsive Breakpoints:**
- Follow existing breakpoint patterns from other components
- Use same spacing and sizing conventions
- Maintain consistent typography hierarchy

---

## Success Criteria

### Functional Requirements
- [ ] Automatically detects complex variables: nested objects, array indexing, special characters
- [ ] Provides UI for configuring variable properties with smart type conversion
- [ ] Validates variable configuration in real-time with detailed error messages
- [ ] Syncs new variables without losing existing configuration
- [ ] Handles all supported variable types with intelligent conversion between types
- [ ] Supports undo/redo functionality for all variable operations
- [ ] Processes very large templates (up to 10,000 characters) efficiently

### Technical Requirements
- [ ] TypeScript strict mode compliant
- [ ] No runtime type errors
- [ ] Proper error boundary integration
- [ ] Performance: < 50ms for template parsing up to 1,000 characters
- [ ] Performance: < 100ms for rendering variable lists up to 50 items
- [ ] Memory: < 10MB usage throughout component lifecycle
- [ ] Edge cases: Handles malformed syntax, nested variables, special characters
- [ ] Debouncing: 300ms delay for template changes to optimize performance

### User Experience Requirements
- [ ] Intuitive variable configuration interface with type conversion hints
- [ ] Clear error messages and validation feedback with actionable suggestions
- [ ] Smart type conversion with user-friendly warnings and confirmations
- [ ] Undo/redo functionality with keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- [ ] Responsive design works on all devices with optimized performance
- [ ] Keyboard navigation fully functional including undo/redo operations
- [ ] Screen reader accessible with live announcements for all changes
- [ ] High contrast mode support with automatic detection
- [ ] WCAG 2.1 AA compliance for accessibility standards
- [ ] Lazy loading for large variable lists with smooth performance
- [ ] History state persistence during component lifecycle

### Integration Requirements
- [ ] Seamlessly integrates with Prompt Creation Form
- [ ] Follows existing component patterns
- [ ] Consistent styling with design system
- [ ] No conflicts with existing state management

This Variable Definition Editor will serve as the foundation for dynamic prompt templating throughout FormaOps, enabling users to create sophisticated, reusable AI prompts with proper variable handling.