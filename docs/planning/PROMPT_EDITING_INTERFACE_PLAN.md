# Prompt Editing Interface Feature Plan

## Executive Summary

### Feature Purpose

The Prompt Editing Interface enables users to modify existing prompts with data pre-population, change tracking, and status management. It extends the Prompt Creation Form with edit-specific functionality while maintaining data integrity and handling concurrent edits.

### User Value

- **Seamless Editing**: Pre-populated form with existing prompt data for quick modifications
- **Status Management**: Control prompt lifecycle (Draft → Published → Archived)
- **Change Tracking**: Visual indicators for modified fields and unsaved changes
- **Data Safety**: Conflict resolution and validation to prevent data loss

### Architectural Role

Builds upon Prompt Creation Form architecture, adding edit-specific logic for data loading, change tracking, and update operations. Integrates with existing prompt detail views and manages prompt lifecycle states.

### Implementation Priority

**Position 3** in critical path - depends on Prompt Creation Form and Variable Definition Editor.

---

## Technical Specifications

### Component Architecture

```typescript
interface PromptEditingInterfaceProps {
  promptId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedPrompt: Prompt) => void;
  onError?: (error: string) => void;
}

interface EditPromptFormData extends PromptFormData {
  id: string;
  version: number; // For optimistic concurrency control
  originalData: PromptFormData; // For change detection
}

interface PromptEditState {
  loading: boolean;
  prompt: Prompt | null;
  hasUnsavedChanges: boolean;
  isSubmitting: boolean;
  error: string | null;
}
```

### Data Flow

```
Load Existing Data → Pre-populate Form → User Edits → Change Detection → Validation → Update API → UI Refresh
```

1. **Load Phase**: Fetch existing prompt data via `/api/prompts/[id]`
2. **Initialize Phase**: Pre-populate form with existing values
3. **Edit Phase**: User modifies fields with real-time change detection
4. **Validation Phase**: Continuous validation with unsaved change warnings
5. **Update Phase**: Submit changes via `PUT /api/prompts/[id]`
6. **Sync Phase**: Update parent components and close modal

### API Integration

**Primary Endpoints:**

```typescript
// Load existing prompt
GET / api / prompts / [id];

// Update prompt
PUT / api / prompts / [id];
```

**Request/Response Types:**

```typescript
interface UpdatePromptRequest {
  name?: string;
  description?: string;
  template?: string;
  variables?: VariableDefinition[];
  tags?: string[];
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  version: number; // For optimistic locking
}

interface UpdatePromptResponse {
  id: string;
  version: number;
  // ... updated prompt data
}
```

### State Management

```typescript
interface EditFormState {
  // Form state
  formData: EditPromptFormData;
  originalData: PromptFormData;
  hasUnsavedChanges: boolean;

  // Loading states
  loading: boolean;
  isSubmitting: boolean;

  // Error states
  error: string | null;
  fieldErrors: Record<string, string>;

  // Edit-specific states
  conflictData?: Prompt; // For concurrent edit handling
  showConflictResolution: boolean;
}
```

---

## User Experience Design

### User Workflow

```
1. User clicks "Edit" on existing prompt
2. Edit modal opens with loading indicator
3. Existing prompt data loads and populates form
4. User modifies fields (name, description, template, variables)
5. Change indicators appear for modified fields
6. User sees "Unsaved changes" warning if attempting to close
7. User clicks save or publish
8. System validates changes and checks for conflicts
9. If conflicts exist, show resolution interface
10. Save successful, modal closes, parent view updates
```

### UI Components

**Modal Structure** (extends Prompt Creation Form)

```typescript
<Dialog open={isOpen} onOpenChange={handleClose}>
  <DialogContent className="max-w-4xl h-[90vh]">
    <DialogHeader>
      <DialogTitle>
        Edit Prompt: {prompt?.name}
        {hasUnsavedChanges && <Badge variant="outline">Unsaved Changes</Badge>}
      </DialogTitle>
    </DialogHeader>

    {loading ? <LoadingState /> : (
      <Tabs>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <EditPromptDetailsForm />
        </TabsContent>

        <TabsContent value="preview">
          <PromptPreview />
        </TabsContent>

        <TabsContent value="history">
          <PromptVersionHistory />
        </TabsContent>
      </Tabs>
    )}

    <DialogFooter>
      <StatusControls />
      <Button variant="outline" onClick={handleClose}>
        {hasUnsavedChanges ? 'Cancel' : 'Close'}
      </Button>
      <Button onClick={saveDraft} disabled={!hasUnsavedChanges}>
        Save Draft
      </Button>
      <Button onClick={savePublished}>
        {prompt?.status === 'PUBLISHED' ? 'Update' : 'Publish'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Edit-Specific Components**

1. **Change Detection Indicators**
   - Modified field highlighting
   - Unsaved changes badge in header
   - Change summary in footer

2. **Status Management Controls**

   ```typescript
   interface StatusControlsProps {
     currentStatus: PromptStatus;
     onStatusChange: (status: PromptStatus) => void;
     disabled?: boolean;
   }
   ```

   - Status transition buttons (Draft ↔ Published ↔ Archived)
   - Status change confirmation dialogs
   - Status history display

3. **Conflict Resolution Interface**

   ```typescript
   interface ConflictResolutionProps {
     localChanges: PromptFormData;
     serverVersion: Prompt;
     onResolve: (resolution: 'keep_local' | 'keep_server' | 'merge') => void;
   }
   ```

   - Side-by-side comparison of changes
   - Field-by-field merge options
   - "Keep mine", "Keep theirs", "Merge" buttons

4. **Version History Tab**
   - List of prompt versions with timestamps
   - Diff view for version comparisons
   - Restore to previous version option

### Validation Rules

**Edit-Specific Validation:**

```typescript
const EditPromptSchema = CreatePromptSchema.extend({
  id: z.string().uuid(),
  version: z.number().min(1),
}).refine(data => {
  // Ensure at least one field has changed
  // Add business logic validation for status transitions
  return true;
});

// Status transition validation
const validateStatusTransition = (
  currentStatus: PromptStatus,
  newStatus: PromptStatus
): boolean => {
  const validTransitions: Record<PromptStatus, PromptStatus[]> = {
    DRAFT: ['PUBLISHED', 'ARCHIVED'],
    PUBLISHED: ['ARCHIVED', 'DRAFT'], // Allow unpublishing
    ARCHIVED: ['DRAFT'], // Allow restoration
  };

  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
};
```

### Responsive Design

**Desktop Enhancements:**

- Split view for before/after comparison
- Expanded version history with detailed diffs
- Full conflict resolution interface

**Mobile Adaptations:**

- Simplified conflict resolution (step-by-step)
- Collapsed version history
- Touch-optimized status controls

---

## Implementation Roadmap

### Phase 1: Data Loading & Pre-population (6 hours)

**Components to Build:**

- `PromptEditingModal` wrapper
- Data loading logic with error handling
- Form pre-population system

**Functionality:**

- Load existing prompt data from API
- Pre-populate all form fields
- Handle loading states and errors

**Acceptance Criteria:**

- [ ] Modal loads existing prompt data correctly
- [ ] All form fields pre-populated with current values
- [ ] Loading and error states handled gracefully

### Phase 2: Change Detection & Tracking (4 hours)

**Components to Build:**

- Change detection utilities
- Unsaved changes warning system
- Visual change indicators

**Functionality:**

- Real-time change detection
- Unsaved changes warning on close
- Visual indicators for modified fields

**Acceptance Criteria:**

- [ ] Changes detected accurately in real-time
- [ ] Warning shown when closing with unsaved changes
- [ ] Modified fields clearly indicated

### Phase 3: Status Management (4 hours)

**Components to Build:**

- `StatusControls` component
- Status transition validation
- Confirmation dialogs for status changes

**Functionality:**

- Status change controls and validation
- Confirmation dialogs for critical transitions
- Status history tracking

**Acceptance Criteria:**

- [ ] Status transitions work correctly
- [ ] Invalid transitions are blocked
- [ ] Confirmation dialogs for destructive actions

### Phase 4: Update API Integration (4 hours)

**Components to Build:**

- Update API integration
- Optimistic concurrency handling
- Success/error feedback

**Functionality:**

- Submit updates to backend API
- Handle version conflicts
- Success and error feedback

**Acceptance Criteria:**

- [ ] Updates submitted successfully to API
- [ ] Version conflicts detected and handled
- [ ] Clear feedback on success/failure

### Phase 5: Conflict Resolution (6 hours)

**Components to Build:**

- `ConflictResolutionDialog`
- Diff visualization
- Merge conflict handling

**Functionality:**

- Detect concurrent edits
- Show conflict resolution interface
- Enable manual conflict resolution

**Acceptance Criteria:**

- [ ] Concurrent edits detected correctly
- [ ] Conflict resolution UI is intuitive
- [ ] Resolved conflicts save correctly

### Dependencies

**Blocked by**: Prompt Creation Form, Variable Definition Editor  
**Blocks**: None (terminal node in critical path)

### Estimated Effort

**Total: 1.5 days (24 hours)**

- Development: 20 hours
- Testing: 4 hours

---

## Technical Requirements

### TypeScript Interfaces

```typescript
// Edit-specific interfaces
interface EditPromptFormData extends PromptFormData {
  id: string;
  version: number;
  originalData: PromptFormData;
}

interface PromptEditingInterfaceProps {
  promptId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedPrompt: Prompt) => void;
  onError?: (error: string) => void;
}

// Change detection interfaces
interface FieldChange {
  field: keyof PromptFormData;
  oldValue: any;
  newValue: any;
  timestamp: Date;
}

interface ChangeSet {
  changes: FieldChange[];
  hasChanges: boolean;
  modifiedFields: string[];
}

// Conflict resolution interfaces
interface ConflictData {
  field: string;
  localValue: any;
  serverValue: any;
  baseValue?: any;
}

interface ConflictResolution {
  strategy: 'keep_local' | 'keep_server' | 'merge';
  resolvedValue?: any;
}
```

### Form Validation

```typescript
// Edit-specific validation schema
const EditPromptSchema = CreatePromptSchema.extend({
  id: z.string().uuid('Invalid prompt ID'),
  version: z.number().min(1, 'Invalid version number'),
});

// Change detection utilities
const detectChanges = (
  original: PromptFormData,
  current: PromptFormData
): ChangeSet => {
  const changes: FieldChange[] = [];

  for (const field of Object.keys(original) as Array<keyof PromptFormData>) {
    if (!isEqual(original[field], current[field])) {
      changes.push({
        field,
        oldValue: original[field],
        newValue: current[field],
        timestamp: new Date(),
      });
    }
  }

  return {
    changes,
    hasChanges: changes.length > 0,
    modifiedFields: changes.map(c => c.field),
  };
};

// Status transition validation
const StatusTransitionSchema = z
  .object({
    currentStatus: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
    newStatus: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  })
  .refine(({ currentStatus, newStatus }) => {
    return validateStatusTransition(currentStatus, newStatus);
  }, 'Invalid status transition');
```

### Error Handling

```typescript
// Edit-specific error types
interface EditError extends Error {
  type: 'LOAD_ERROR' | 'UPDATE_ERROR' | 'CONFLICT_ERROR' | 'VALIDATION_ERROR';
  details?: any;
}

interface ConflictError extends EditError {
  type: 'CONFLICT_ERROR';
  conflictData: Prompt;
  clientVersion: number;
  serverVersion: number;
}

// Error handling utilities
const handleEditError = (error: unknown): EditError => {
  if (error instanceof Response) {
    if (error.status === 409) {
      return {
        name: 'ConflictError',
        message: 'This prompt has been modified by another user',
        type: 'CONFLICT_ERROR',
      } as ConflictError;
    }
  }

  return {
    name: 'EditError',
    message: 'Failed to update prompt',
    type: 'UPDATE_ERROR',
  } as EditError;
};
```

### Testing Strategy

**Unit Tests:**

```typescript
describe('PromptEditingInterface', () => {
  test('loads existing prompt data', async () => {
    const mockPrompt = createMockPrompt();
    const { getByDisplayValue } = render(
      <PromptEditingInterface promptId={mockPrompt.id} isOpen={true} />
    );

    await waitFor(() => {
      expect(getByDisplayValue(mockPrompt.name)).toBeInTheDocument();
    });
  });

  test('detects changes correctly', () => {
    const original = { name: 'Original', template: 'Hello {{name}}' };
    const modified = { name: 'Modified', template: 'Hello {{name}}' };

    const changeSet = detectChanges(original, modified);
    expect(changeSet.hasChanges).toBe(true);
    expect(changeSet.modifiedFields).toContain('name');
  });

  test('handles concurrent edit conflicts', async () => {
    // Mock conflict scenario
    const conflictResponse = {
      status: 409,
      json: () => Promise.resolve({ conflictData: mockUpdatedPrompt })
    };

    // Test conflict detection and resolution
  });
});
```

**Integration Tests:**

- Test full edit workflow from load to save
- Test conflict resolution scenarios
- Test status transition workflows
- Test integration with parent components

---

## Integration Points

### Existing Components to Reuse

**Base Components:**

- Extends `PromptCreationForm` architecture
- Reuses all UI components from creation form
- Uses same `VariableDefinitionEditor`

**Additional Components:**

- `LoadingState` - For data loading
- `Badge` - For unsaved changes indicator
- `ConfirmDialog` - For status change confirmations

### API Integration

```typescript
// Load prompt data
const loadPrompt = async (promptId: string): Promise<Prompt> => {
  const response = await fetch(`/api/prompts/${promptId}`);
  if (!response.ok) {
    throw new Error('Failed to load prompt');
  }
  return response.json();
};

// Update prompt data
const updatePrompt = async (
  promptId: string,
  data: UpdatePromptRequest
): Promise<UpdatePromptResponse> => {
  const response = await fetch(`/api/prompts/${promptId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 409) {
      const conflictData = await response.json();
      throw new ConflictError(conflictData);
    }
    throw new Error('Failed to update prompt');
  }

  return response.json();
};
```

### State Management Integration

```typescript
// Integration with prompt detail page
const PromptDetailPage = () => {
  const [showEditForm, setShowEditForm] = useState(false);
  const [prompt, setPrompt] = useState<Prompt | null>(null);

  const handleEditSuccess = (updatedPrompt: Prompt) => {
    setPrompt(updatedPrompt);
    setShowEditForm(false);
    // Show success toast
  };

  return (
    <>
      <Button onClick={() => setShowEditForm(true)}>
        Edit Prompt
      </Button>

      <PromptEditingInterface
        promptId={prompt.id}
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSuccess={handleEditSuccess}
      />
    </>
  );
};
```

---

## Success Criteria

### Functional Requirements

- [ ] Loads existing prompt data and pre-populates form
- [ ] Detects and tracks changes in real-time
- [ ] Manages prompt status transitions correctly
- [ ] Handles concurrent edit conflicts gracefully
- [ ] Updates prompt data successfully via API

### Technical Requirements

- [ ] TypeScript strict mode compliant
- [ ] Optimistic concurrency control implemented
- [ ] Change detection with no false positives/negatives
- [ ] Version conflict handling without data loss
- [ ] Performance: Load time < 1 second, save time < 2 seconds

### User Experience Requirements

- [ ] Intuitive edit workflow with clear visual feedback
- [ ] Unsaved changes warning prevents accidental data loss
- [ ] Conflict resolution is understandable and actionable
- [ ] Status management is clear and safe
- [ ] Responsive design works on all devices

### Integration Requirements

- [ ] Seamlessly extends Prompt Creation Form
- [ ] Integrates with existing prompt detail views
- [ ] Maintains consistency with design system
- [ ] Updates parent components correctly after edits

This Prompt Editing Interface will complete the prompt management workflow, enabling users to maintain and evolve their AI prompts while ensuring data integrity and providing a professional editing experience.
