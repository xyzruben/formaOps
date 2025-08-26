# Prompt Creation Form

A React component for creating AI prompts with template editing, automatic variable detection, and preview functionality.

## Features

- **Modal-based Interface**: Clean modal form with tabbed navigation
- **Template Editor**: Text editor with variable syntax highlighting
- **Automatic Variable Detection**: Detects `{{variable}}` patterns in templates
- **Variable Definition Integration**: Seamless integration with Variable Definition Editor
- **Live Preview**: Real-time preview of rendered templates with sample data
- **Form Validation**: Comprehensive validation using Zod schemas
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Accessibility**: Keyboard navigation, ARIA labels, and screen reader support
- **API Integration**: Handles prompt creation via `/api/prompts` endpoint

## Usage

```tsx
import { PromptCreationModal } from '../components/prompt-creation-form';

function PromptsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const handleCreateSuccess = (newPrompt: Prompt) => {
    setShowCreateForm(false);
    // Refresh prompts list
    console.log('Created prompt:', newPrompt);
  };

  const handleCreateError = (error: string) => {
    console.error('Error creating prompt:', error);
  };

  return (
    <>
      <Button onClick={() => setShowCreateForm(true)}>
        Create Prompt
      </Button>
      
      <PromptCreationModal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSuccess={handleCreateSuccess}
        onError={handleCreateError}
      />
    </>
  );
}
```

## Props

```tsx
interface PromptCreationFormProps {
  isOpen: boolean;                    // Whether modal is open
  onClose: () => void;               // Called when modal closes
  onSuccess: (prompt: Prompt) => void; // Called when prompt is created
  onError?: (error: string) => void; // Called on error (optional)
}
```

## Keyboard Shortcuts

- **Escape**: Close modal
- **Ctrl/Cmd + 1**: Switch to Details tab
- **Ctrl/Cmd + 2**: Switch to Preview tab  
- **Ctrl/Cmd + S**: Save as Draft
- **Ctrl/Cmd + Shift + Enter**: Publish prompt

## Form Fields

### Basic Information
- **Name** (required): Prompt name (max 100 characters)
- **Description** (optional): Prompt description (max 500 characters)
- **Tags** (optional): Up to 5 tags for categorization

### Template
- **Template** (required): Prompt template with `{{variable}}` syntax (max 5,000 characters)
- **Variables**: Automatically detected from template, configured via Variable Definition Editor

### Status Options
- **Save Draft**: Saves prompt with `DRAFT` status
- **Publish**: Saves prompt with `PUBLISHED` status

## Validation

The component uses Zod schemas for validation:

- Name: Required, 1-100 characters, alphanumeric with spaces, hyphens, underscores
- Description: Optional, max 500 characters
- Template: Required, 1-5,000 characters
- Variables: Max 20 variables, each with proper configuration
- Tags: Optional, max 5 tags, each 1-30 characters, alphanumeric with hyphens/underscores

## API Integration

The component calls `POST /api/prompts` with the following payload:

```tsx
interface CreatePromptRequest {
  name: string;
  description?: string;
  template: string;
  variables: VariableDefinition[];
  tags?: string[];
  status: 'DRAFT' | 'PUBLISHED';
}
```

## File Structure

```
src/components/prompt-creation-form/
├── index.ts                    # Main exports
├── types.ts                    # TypeScript interfaces
├── validation.ts               # Zod schemas and validation
├── api.ts                      # API integration
├── styles.css                  # Component styles
├── PromptCreationModal.tsx     # Main modal component
├── components/
│   ├── PromptDetailsForm.tsx   # Details tab form
│   ├── TemplateEditor.tsx      # Template editing component
│   └── PromptPreview.tsx       # Preview tab component
└── README.md                   # This file
```

## Dependencies

- Variable Definition Editor (already implemented)
- UI Components: Dialog, Tabs, Button, Input, Textarea, Badge, Card
- Validation: Zod schema validation
- API: Fetch-based API calls

## Accessibility Features

- **ARIA Labels**: All interactive elements properly labeled
- **Keyboard Navigation**: Full keyboard support including shortcuts
- **Focus Management**: Proper focus indicators and tab order
- **Screen Reader Support**: Compatible with assistive technologies
- **High Contrast**: Supports high contrast mode preferences

## Responsive Design

- **Desktop**: Full modal with side-by-side layout
- **Tablet**: Stacked layout with responsive components
- **Mobile**: Full-screen modal with touch-optimized inputs

This component follows the exact specification from `PROMPT_CREATION_FORM_PLAN.md` and provides essential functionality without overengineering.