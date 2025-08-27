# Enhanced Execution Panel Feature Plan

## Executive Summary

### Feature Purpose

The Enhanced Execution Panel transforms the existing basic execution functionality into a comprehensive AI execution interface with dynamic form generation, real-time status tracking, model selection, and parameter controls. It bridges prompt templates with AI execution results.

### User Value

- **Dynamic Input Forms**: Automatically generates input forms based on prompt variable definitions
- **Model Selection**: Choose between GPT models with cost estimation and capability insights
- **Real-time Execution**: Live status updates with progress indicators and streaming responses
- **Parameter Control**: Fine-tune AI behavior with temperature, token limits, and other settings

### Architectural Role

Central execution engine that connects prompt templates with OpenAI API through FormaOps' backend. Integrates with Variable Definition Editor outputs and feeds results to AI Results Viewer. Handles the complete execution lifecycle from input to output.

### Implementation Priority

**Position 4** in critical path - depends on Variable Definition Editor, enables AI Results Viewer.

---

## Technical Specifications

### Component Architecture

```typescript
interface EnhancedExecutionPanelProps {
  prompt: Prompt;
  onExecutionComplete?: (result: ExecutionResult) => void;
  onExecutionStart?: (executionId: string) => void;
  initialInputs?: Record<string, any>;
}

interface ExecutionFormData {
  inputs: Record<string, any>;
  model: 'gpt-3.5-turbo' | 'gpt-4';
  maxTokens: number;
  temperature: number;
}

interface ExecutionState {
  status: 'idle' | 'executing' | 'completed' | 'failed';
  executionId?: string;
  progress?: number;
  result?: ExecutionResult;
  error?: ExecutionError;
}
```

### Data Flow

```
Prompt Variables → Generate Form → User Input → Validate → Execute API → Real-time Updates → Results
```

1. **Form Generation**: Create dynamic form from prompt variable definitions
2. **Input Validation**: Validate user inputs against variable types and constraints
3. **Execution Request**: Submit to `/api/prompts/[id]/execute` with inputs and parameters
4. **Status Tracking**: Monitor execution status with periodic polling or WebSocket
5. **Result Handling**: Process successful results or error states
6. **Callback Triggers**: Notify parent components of execution completion

### API Integration

**Primary Endpoint**: `POST /api/prompts/[id]/execute`

```typescript
interface ExecutePromptRequest {
  inputs: Record<string, any>;
  model?: 'gpt-3.5-turbo' | 'gpt-4';
  maxTokens?: number;
  temperature?: number;
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
}
```

**Secondary Endpoints:**

```typescript
// For execution status polling
GET / api / executions / [id];

// For execution retry
POST / api / executions / [id] / retry;
```

### State Management

```typescript
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

  // Real-time updates
  statusPollingInterval?: NodeJS.Timeout;
  lastStatusCheck: Date;
}
```

---

## User Experience Design

### User Workflow

```
1. User opens prompt and clicks "Execute" tab
2. Execution panel loads with form generated from prompt variables
3. User fills required variables (with type-appropriate inputs)
4. User optionally adjusts AI parameters (model, temperature, tokens)
5. User sees cost estimation before execution
6. User clicks "Execute" button
7. Execution starts with real-time status indicator
8. User sees progress updates and can cancel if needed
9. Results appear with token usage, cost, and validation status
10. User can retry, modify inputs, or view detailed results
```

### UI Components

**Main Panel Structure**

```typescript
<Card className="execution-panel">
  <CardHeader>
    <CardTitle>Execute Prompt</CardTitle>
    <CardDescription>
      {prompt.description || 'Configure inputs and run this prompt'}
    </CardDescription>
  </CardHeader>

  <CardContent className="space-y-6">
    {/* Variable Inputs Section */}
    <VariableInputsForm />

    {/* AI Parameters Section */}
    <AdvancedParametersSection />

    {/* Cost Estimation */}
    <CostEstimationDisplay />

    {/* Execution Controls */}
    <ExecutionControls />

    {/* Status & Results */}
    <ExecutionStatusDisplay />
  </CardContent>
</Card>
```

**Variable Inputs Form**

```typescript
interface VariableInputsFormProps {
  variables: VariableDefinition[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}
```

Dynamic form generation based on variable types:

- **String Variables**: Text input or select dropdown (with options)
- **Number Variables**: Number input with min/max validation
- **Boolean Variables**: Checkbox or toggle switch
- **Array Variables**: Multi-value input with add/remove functionality

**Advanced Parameters Section**

```typescript
interface ParametersControlProps {
  model: string;
  temperature: number;
  maxTokens: number;
  onChange: (params: Partial<ExecutionParameters>) => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
}
```

- Model selection with capability descriptions and cost differences
- Temperature slider with explanation (0 = deterministic, 2 = creative)
- Max tokens input with output length estimation
- Advanced options collapse/expand

**Real-time Status Display**

```typescript
interface StatusDisplayProps {
  status: ExecutionStatus;
  progress?: number;
  executionId?: string;
  startTime?: Date;
  onCancel?: () => void;
}
```

- Status badge with color coding (idle/running/success/error)
- Progress bar with estimated completion time
- Execution timer and cancel button
- Token usage and cost updates during execution

### Validation Rules

```typescript
// Dynamic form validation based on variable definitions
const createInputValidationSchema = (variables: VariableDefinition[]) => {
  const schema: Record<string, z.ZodSchema> = {};

  variables.forEach(variable => {
    let fieldSchema: z.ZodSchema;

    switch (variable.type) {
      case 'string':
        fieldSchema = z.string();
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

// Execution parameter validation
const ExecutionParametersSchema = z.object({
  model: z.enum(['gpt-3.5-turbo', 'gpt-4']).default('gpt-3.5-turbo'),
  maxTokens: z.number().min(1).max(4000).default(2000),
  temperature: z.number().min(0).max(2).step(0.1).default(0.7),
});
```

### Responsive Design

**Desktop (>1024px)**

- Side-by-side layout: inputs on left, parameters and status on right
- Full parameter controls visible
- Real-time status with detailed progress

**Tablet (768-1024px)**

- Stacked layout with collapsible sections
- Simplified parameter controls
- Compact status display

**Mobile (<768px)**

- Full-width stacked layout
- Touch-optimized input controls
- Minimized advanced options
- Swipe gestures for parameter adjustment

---

## Implementation Roadmap

### Phase 1: Dynamic Form Generation (6 hours)

**Components to Build:**

- `VariableInputsForm` with dynamic field generation
- Type-specific input components
- Form validation with real-time feedback

**Functionality:**

- Generate form fields from variable definitions
- Handle different input types appropriately
- Validate inputs against variable constraints

**Acceptance Criteria:**

- [ ] Form generates correctly for all variable types
- [ ] Input validation works for each type
- [ ] Error messages are clear and helpful

### Phase 2: Parameter Controls (4 hours)

**Components to Build:**

- `AdvancedParametersSection`
- Model selection with descriptions
- Parameter sliders and inputs

**Functionality:**

- Model selection with cost implications
- Temperature and token controls
- Cost estimation calculator

**Acceptance Criteria:**

- [ ] Model selection works with cost display
- [ ] Parameter controls function smoothly
- [ ] Cost estimation is accurate

### Phase 3: Execution Engine (6 hours)

**Components to Build:**

- Execution submission logic
- Real-time status tracking
- Error handling and retry logic

**Functionality:**

- Submit execution requests to API
- Poll for status updates
- Handle execution errors gracefully

**Acceptance Criteria:**

- [ ] Executions submit successfully
- [ ] Status updates work in real-time
- [ ] Error states handled properly

### Phase 4: Results Integration (4 hours)

**Components to Build:**

- Results display integration
- Execution history tracking
- Success/failure feedback

**Functionality:**

- Display execution results inline
- Track execution history
- Provide clear success/failure feedback

**Acceptance Criteria:**

- [ ] Results display correctly
- [ ] History tracking works
- [ ] User feedback is clear

### Dependencies

**Blocked by**: Variable Definition Editor  
**Blocks**: AI Results Viewer

### Estimated Effort

**Total: 1 day (20 hours)**

- Development: 16 hours
- Testing: 4 hours

---

## Technical Requirements

### TypeScript Interfaces

```typescript
// Core execution interfaces
interface ExecutionParameters {
  model: 'gpt-3.5-turbo' | 'gpt-4';
  maxTokens: number;
  temperature: number;
}

interface ExecutionFormData {
  inputs: Record<string, any>;
  parameters: ExecutionParameters;
}

interface ExecutionStatus {
  status:
    | 'idle'
    | 'validating'
    | 'queued'
    | 'executing'
    | 'completed'
    | 'failed'
    | 'cancelled';
  executionId?: string;
  progress?: number;
  estimatedTimeRemaining?: number;
  message?: string;
}

// Dynamic form interfaces
interface DynamicFormField {
  name: string;
  type: VariableType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: z.ZodSchema;
}

// Cost calculation interfaces
interface CostEstimation {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
  model: string;
  confidence: 'low' | 'medium' | 'high';
}
```

### Form Validation

```typescript
// Dynamic validation schema creator
const createExecutionSchema = (variables: VariableDefinition[]) => {
  const inputSchema = createInputValidationSchema(variables);

  return z.object({
    inputs: inputSchema,
    parameters: ExecutionParametersSchema,
  });
};

// Input preprocessing for different types
const preprocessInputValue = (value: any, type: VariableType): any => {
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

// Cost calculation utilities
const estimateExecutionCost = (
  template: string,
  inputs: Record<string, any>,
  parameters: ExecutionParameters
): CostEstimation => {
  const processedTemplate = processTemplate(template, inputs);
  const estimatedInputTokens = estimateTokens(processedTemplate);
  const estimatedOutputTokens = Math.min(
    parameters.maxTokens,
    estimatedInputTokens * 2
  );

  const costPerInputToken = MODEL_COSTS[parameters.model].input;
  const costPerOutputToken = MODEL_COSTS[parameters.model].output;

  const estimatedCostUsd =
    (estimatedInputTokens * costPerInputToken +
      estimatedOutputTokens * costPerOutputToken) /
    1000;

  return {
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedCostUsd,
    model: parameters.model,
    confidence: estimatedInputTokens > 100 ? 'high' : 'medium',
  };
};
```

### Error Handling

```typescript
// Execution-specific error types
interface ExecutionError {
  type: 'VALIDATION_ERROR' | 'API_ERROR' | 'TIMEOUT_ERROR' | 'RATE_LIMIT_ERROR';
  message: string;
  retryable: boolean;
  retryAfter?: number;
  details?: any;
}

// Error handling utilities
const handleExecutionError = (error: unknown): ExecutionError => {
  if (error instanceof Response) {
    switch (error.status) {
      case 400:
        return {
          type: 'VALIDATION_ERROR',
          message: 'Invalid input parameters',
          retryable: true,
        };
      case 429:
        return {
          type: 'RATE_LIMIT_ERROR',
          message: 'Rate limit exceeded. Please try again later.',
          retryable: true,
          retryAfter: 60,
        };
      case 408:
        return {
          type: 'TIMEOUT_ERROR',
          message: 'Execution timed out. Try reducing complexity.',
          retryable: true,
        };
      default:
        return {
          type: 'API_ERROR',
          message: 'Execution failed. Please try again.',
          retryable: true,
        };
    }
  }

  return {
    type: 'API_ERROR',
    message: 'An unexpected error occurred',
    retryable: true,
  };
};
```

### Testing Strategy

**Unit Tests:**

```typescript
describe('EnhancedExecutionPanel', () => {
  test('generates form fields from variable definitions', () => {
    const variables: VariableDefinition[] = [
      { name: 'name', type: 'string', required: true },
      { name: 'age', type: 'number', required: false }
    ];

    const { getByLabelText } = render(
      <EnhancedExecutionPanel prompt={{ variables }} />
    );

    expect(getByLabelText(/name/i)).toBeInTheDocument();
    expect(getByLabelText(/age/i)).toBeInTheDocument();
  });

  test('validates inputs correctly', () => {
    const variables = [
      { name: 'email', type: 'string', required: true }
    ];

    const schema = createExecutionSchema(variables);
    const result = schema.safeParse({
      inputs: { email: 'invalid-email' },
      parameters: { model: 'gpt-3.5-turbo', maxTokens: 100, temperature: 0.7 }
    });

    expect(result.success).toBe(false);
  });

  test('calculates cost estimation accurately', () => {
    const template = 'Hello {{name}}, how are you?';
    const inputs = { name: 'John' };
    const parameters = { model: 'gpt-3.5-turbo', maxTokens: 100, temperature: 0.7 };

    const cost = estimateExecutionCost(template, inputs, parameters);
    expect(cost.estimatedCostUsd).toBeGreaterThan(0);
  });

  test('handles execution states correctly', async () => {
    // Test execution flow from start to completion
  });
});
```

**Integration Tests:**

- Test full execution workflow with API
- Test real-time status updates
- Test error handling and recovery
- Test cost calculation accuracy

---

## Integration Points

### Existing Components to Reuse

**UI Components:**

- `Card`, `CardHeader`, `CardContent` - Panel structure
- `Input`, `Textarea`, `Select` - Form inputs
- `Button` - Execution controls
- `Badge` - Status indicators
- `LoadingSpinner` - Loading states
- `Slider` (if available) - Parameter controls

**Integration with Existing Code:**

```typescript
// Reuse existing execution panel structure
import { ExecutionPanel as BaseExecutionPanel } from '@/components/execution/execution-panel';

// Extend with enhanced functionality
export const EnhancedExecutionPanel = ({ prompt, ...props }) => {
  // Enhanced implementation building on existing patterns
};
```

### API Integration

```typescript
// Execute prompt with enhanced parameters
const executePrompt = async (
  promptId: string,
  data: ExecutionFormData
): Promise<ExecutionResult> => {
  const response = await fetch(`/api/prompts/${promptId}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: data.inputs,
      model: data.parameters.model,
      maxTokens: data.parameters.maxTokens,
      temperature: data.parameters.temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`Execution failed: ${response.status}`);
  }

  return response.json();
};

// Poll for execution status
const pollExecutionStatus = async (
  executionId: string
): Promise<ExecutionStatus> => {
  const response = await fetch(`/api/executions/${executionId}`);
  return response.json();
};
```

### State Management Integration

```typescript
// Integration with prompt detail page
const PromptDetailPage = () => {
  const [activeTab, setActiveTab] = useState('details');
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([]);

  const handleExecutionComplete = (result: ExecutionResult) => {
    setExecutionResults(prev => [result, ...prev]);
    setActiveTab('history'); // Switch to show results
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsContent value="execute">
        <EnhancedExecutionPanel
          prompt={prompt}
          onExecutionComplete={handleExecutionComplete}
        />
      </TabsContent>
    </Tabs>
  );
};
```

---

## Success Criteria

### Functional Requirements

- [ ] Generates dynamic forms from variable definitions
- [ ] Validates inputs according to variable types and constraints
- [ ] Provides model selection with cost implications
- [ ] Executes prompts successfully via API
- [ ] Tracks execution status in real-time
- [ ] Handles errors gracefully with retry options

### Technical Requirements

- [ ] TypeScript strict mode compliant
- [ ] Dynamic form generation without runtime errors
- [ ] Cost estimation within 10% accuracy
- [ ] Real-time updates with < 1 second latency
- [ ] Proper error boundaries and recovery

### User Experience Requirements

- [ ] Intuitive form interface for all variable types
- [ ] Clear parameter controls with helpful descriptions
- [ ] Real-time feedback during execution
- [ ] Responsive design on all devices
- [ ] Accessible with keyboard navigation

### Integration Requirements

- [ ] Seamlessly integrates with prompt detail views
- [ ] Connects properly with AI Results Viewer
- [ ] Follows existing API patterns and error handling
- [ ] Maintains design consistency with other components

This Enhanced Execution Panel will serve as the core interface for running AI prompts, providing users with professional-grade execution controls while maintaining simplicity and ease of use.
