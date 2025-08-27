# Prompt Creation Form Feature Plan

## Executive Summary

### Feature Purpose

The Prompt Creation Form enables users to create new AI prompts with template editing, automatic variable detection, and essential configuration. This is the primary entry point for users to build reusable AI prompt templates.

### User Value

- **Intuitive Prompt Building**: Clear form for creating prompt templates
- **Automatic Variable Management**: Seamless integration with Variable Definition Editor
- **Simple Workflow**: Essential form with validation, preview, and save options
- **Template Preview**: Basic preview of how prompts will execute

### Architectural Role

Central component that orchestrates prompt creation workflow. Integrates Variable Definition Editor, template editing, and prompt metadata management. Connects user input to backend storage via `/api/prompts` endpoint.

### Implementation Priority

**Position 2** in critical path - depends on Variable Definition Editor, enables Prompt Editing Interface.

---

## Technical Specifications

### Component Architecture

```typescript
interface PromptCreationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (prompt: Prompt) => void;
  onError?: (error: string) => void;
}

interface PromptFormData {
  name: string;
  description?: string;
  template: string;
  variables: VariableDefinition[];
  tags: string[];
  status: 'DRAFT' | 'PUBLISHED';
}
```

### Data Flow

```
User Input → Form Validation → Variable Processing → API Call → Database → UI Update
```

1. **Input Phase**: User fills form fields and template
2. **Processing Phase**: Variable Definition Editor extracts and configures variables
3. **Validation Phase**: Form validation with Zod schema
4. **Submission Phase**: API call to create prompt
5. **Success Phase**: Close modal and refresh parent list

### API Integration

**Primary Endpoint**: `POST /api/prompts`

```typescript
interface CreatePromptRequest {
  name: string;
  description?: string;
  template: string;
  variables: VariableDefinition[];
  tags?: string[];
  status?: 'DRAFT' | 'PUBLISHED';
}
```

### State Management

```typescript
interface PromptCreationState {
  formData: PromptFormData;
  isSubmitting: boolean;
  errors: Record<string, string>;
}
```

---

## User Experience Design

### User Workflow

```
1. User clicks "Create Prompt" button
2. Modal opens with empty form
3. User enters prompt name and description
4. User types template in text editor
5. Variable Definition Editor automatically detects {{variables}}
6. User configures detected variables (type, required, defaults)
7. User optionally adds tags
8. User previews prompt with sample data
9. User saves as Draft or Published
10. Success message appears, modal closes, prompt list refreshes
```

### UI Components

**Modal Structure**

```typescript
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="max-w-4xl h-[90vh]">
    <DialogHeader>
      <DialogTitle>Create New Prompt</DialogTitle>
    </DialogHeader>

    <Tabs>
      <TabsList>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
      </TabsList>

      <TabsContent value="details">
        <PromptDetailsForm />
      </TabsContent>

      <TabsContent value="preview">
        <PromptPreview />
      </TabsContent>
    </Tabs>

    <DialogFooter>
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" onClick={saveDraft}>Save Draft</Button>
      <Button type="submit" onClick={savePublished}>Publish</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Details Tab Components**

1. **Basic Information Section**
   - Prompt name input (required)
   - Description textarea (optional)
   - Simple tag input with basic autocomplete

2. **Template Editor Section**
   - Basic textarea with syntax highlighting for {{variables}}
   - Character count display
   - Template validation feedback

3. **Variable Configuration Section**
   - Integrated Variable Definition Editor
   - Shows automatically detected variables
   - Variable configuration table

**Preview Tab Components**

1. **Simple Template Preview**
   - Basic template rendering with variable substitution
   - Sample data input form based on defined variables
   - Error display for validation issues

### Validation Rules

```typescript
const CreatePromptSchema = z.object({
  name: z.string().min(1, 'Prompt name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  template: z
    .string()
    .min(1, 'Template is required')
    .max(5000, 'Template too long'),
  variables: z.array(VariableDefinitionSchema),
  tags: z.array(z.string().min(1).max(30)).max(5),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});
```

### Responsive Design

**Desktop (>1024px)**

- Full modal with side-by-side layout for template and variables
- Complete variable table with all columns

**Tablet (768-1024px)**

- Stacked layout with collapsible sections
- Responsive variable table

**Mobile (<768px)**

- Full-screen modal
- Card-based layout for sections
- Touch-optimized inputs

---

## Implementation Roadmap

### Phase 1: Modal Structure & Basic Form (4 hours)

**Components to Build:**

- `PromptCreationModal` wrapper component
- `PromptDetailsForm` main form component
- Basic form structure with validation

**Functionality:**

- Modal open/close with proper state management
- Basic form inputs (name, description, template)
- Form validation with error display

**Acceptance Criteria:**

- [ ] Modal opens and closes properly
- [ ] Basic form inputs work with validation
- [ ] Error messages display correctly

### Phase 2: Template Editor Integration (4 hours)

**Components to Build:**

- `TemplateEditor` with basic syntax highlighting
- Integration with Variable Definition Editor
- Template validation

**Functionality:**

- Text editing for template
- Automatic variable detection
- Variable configuration workflow

**Acceptance Criteria:**

- [ ] Template editor highlights {{variables}}
- [ ] Variables are automatically detected and configurable
- [ ] Template validation works correctly

### Phase 3: Preview & Submission (3 hours)

**Components to Build:**

- `PromptPreview` component
- API integration for form submission
- Success/error handling

**Functionality:**

- Basic template preview with sample data
- Form submission to backend API
- Success feedback and modal cleanup

**Acceptance Criteria:**

- [ ] Preview shows template with sample variable values
- [ ] Form submits successfully to API
- [ ] Success/error states handled properly

### Phase 4: Polish & Integration (3 hours)

**Tasks:**

- Responsive design implementation
- Accessibility improvements
- Integration testing with prompt list
- Error boundary integration

**Acceptance Criteria:**

- [ ] Works on all device sizes
- [ ] Keyboard navigation functional
- [ ] Integrates with existing prompt list
- [ ] Error boundaries prevent crashes

### Dependencies

**Blocked by**: Variable Definition Editor  
**Blocks**: Prompt Editing Interface

### Estimated Effort

**Total: 2 days (14 hours)**

- Development: 12 hours
- Testing: 2 hours

---

## Technical Requirements

### TypeScript Interfaces

```typescript
// Form interfaces
interface PromptFormData {
  name: string;
  description: string;
  template: string;
  variables: VariableDefinition[];
  tags: string[];
  status: 'DRAFT' | 'PUBLISHED';
}

interface PromptCreationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (prompt: Prompt) => void;
  onError?: (error: string) => void;
}

// Template editor interfaces
interface TemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}

// Preview interfaces
interface PromptPreviewProps {
  template: string;
  variables: VariableDefinition[];
  sampleData?: Record<string, any>;
}

// API response types
interface CreatePromptResponse {
  id: string;
  name: string;
  description: string | null;
  template: string;
  variables: VariableDefinition[];
  status: PromptStatus;
  createdAt: string;
  updatedAt: string;
}
```

### Form Validation

```typescript
// Main form schema
const CreatePromptSchema = z.object({
  name: z
    .string()
    .min(1, 'Prompt name is required')
    .max(100, 'Prompt name must be less than 100 characters')
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      'Only letters, numbers, spaces, hyphens, and underscores allowed'
    ),

  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),

  template: z
    .string()
    .min(1, 'Template is required')
    .max(5000, 'Template must be less than 5,000 characters'),

  variables: z
    .array(VariableDefinitionSchema)
    .max(20, 'Maximum 20 variables allowed'),

  tags: z
    .array(
      z
        .string()
        .min(1, 'Tag name is required')
        .max(30, 'Tag name must be less than 30 characters')
        .regex(
          /^[a-zA-Z0-9\-_]+$/,
          'Tags can only contain letters, numbers, hyphens, and underscores'
        )
    )
    .max(5, 'Maximum 5 tags allowed'),

  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});

// Custom validation functions
const validateTemplateVariables = (
  template: string,
  variables: VariableDefinition[]
) => {
  const templateVars = extractVariablesFromTemplate(template);
  const definedVars = variables.map(v => v.name);

  const missingDefinitions = templateVars.filter(v => !definedVars.includes(v));

  return {
    isValid: missingDefinitions.length === 0,
    missingDefinitions,
  };
};
```

### Error Handling

```typescript
// Error types
interface FormValidationError {
  field: string;
  message: string;
}

interface APIError {
  error: string;
  code: string;
  details?: FormValidationError[];
}

// Error handling utilities
const handleCreatePromptError = (error: unknown): string => {
  if (error instanceof z.ZodError) {
    return error.errors[0]?.message || 'Validation failed';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Failed to create prompt. Please try again.';
};
```

### Testing Strategy

**Unit Tests:**

```typescript
describe('PromptCreationForm', () => {
  test('validates form data correctly', () => {
    const validData = {
      name: 'Test Prompt',
      template: 'Hello {{name}}!',
      variables: [{ name: 'name', type: 'string', required: true }],
    };

    const result = CreatePromptSchema.parse(validData);
    expect(result.name).toBe('Test Prompt');
  });

  test('handles template variable validation', () => {
    const template = 'Hello {{name}} and {{age}}!';
    const variables = [{ name: 'name', type: 'string', required: true }];

    const validation = validateTemplateVariables(template, variables);
    expect(validation.missingDefinitions).toContain('age');
  });

  test('submits form data to API', async () => {
    const mockSubmit = jest.fn().mockResolvedValue({ id: '123' });
    // Test API integration
  });
});
```

**Integration Tests:**

- Test full form workflow from open to submit
- Test integration with Variable Definition Editor
- Test modal state management
- Test error recovery scenarios

---

## Integration Points

### Existing Components to Reuse

**UI Components:**

- `Dialog`, `DialogContent`, `DialogHeader`, `DialogFooter` - Modal structure
- `Button` - Form actions and navigation
- `Input` - Text inputs for name and other fields
- `Textarea` - Description and template editing
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` - Tab interface
- `Badge` - Tag display
- `LoadingSpinner` - Loading states during submission

**Component Patterns:**

- Follow `LoginForm` pattern for form handling with react-hook-form
- Use existing validation patterns with Zod
- Follow modal patterns from `LoginModal`

### API Integration

```typescript
// API call implementation
const createPrompt = async (
  data: PromptFormData
): Promise<CreatePromptResponse> => {
  const response = await fetch('/api/prompts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create prompt');
  }

  return response.json();
};
```

### State Management Integration

```typescript
// Integration with parent component
const PromptsPage = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { prompts, refetch } = usePrompts();

  const handleCreateSuccess = (newPrompt: Prompt) => {
    setShowCreateForm(false);
    refetch(); // Refresh the prompts list
    // Show success toast
  };

  return (
    <>
      <Button onClick={() => setShowCreateForm(true)}>
        Create Prompt
      </Button>

      <PromptCreationForm
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSuccess={handleCreateSuccess}
      />
    </>
  );
};
```

### Styling Integration

**CSS Classes:**

```css
.prompt-creation-modal {
  @apply max-w-4xl h-[90vh];
}

.template-editor {
  @apply min-h-[300px] p-4 border rounded-md font-mono text-sm;
}

.variable-section {
  @apply space-y-4 border-t pt-4;
}

.form-section {
  @apply space-y-4 p-4;
}

.preview-container {
  @apply bg-muted p-4 rounded-md;
}
```

**Responsive Design:**

```css
@media (max-width: 768px) {
  .prompt-creation-modal {
    @apply h-screen max-w-none m-0 rounded-none;
  }

  .template-editor {
    @apply min-h-[200px] text-xs;
  }
}
```

---

## Success Criteria

### Functional Requirements

- [ ] Users can create prompts with all required fields
- [ ] Template editor integrates seamlessly with variable detection
- [ ] Variables are automatically configured with sensible defaults
- [ ] Form validation prevents invalid submissions
- [ ] Preview shows accurate template rendering
- [ ] Save Draft and Publish options work correctly

### Technical Requirements

- [ ] TypeScript strict mode compliant
- [ ] Form validation with comprehensive error handling
- [ ] API integration with proper error states
- [ ] No memory leaks on modal open/close
- [ ] Performance: Form submission < 2 seconds

### User Experience Requirements

- [ ] Intuitive workflow from start to finish
- [ ] Clear validation feedback and error messages
- [ ] Responsive design works on all devices
- [ ] Modal UX follows existing patterns
- [ ] Keyboard navigation and accessibility compliant

### Integration Requirements

- [ ] Integrates with existing prompt list component
- [ ] Follows established design patterns
- [ ] Uses existing API endpoints correctly
- [ ] Maintains state consistency with parent components

This Prompt Creation Form provides a balanced approach that delivers essential functionality without overengineering, focusing on core user needs and solid implementation fundamentals.
