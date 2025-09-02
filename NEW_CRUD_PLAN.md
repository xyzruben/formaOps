# NEW CRUD PLAN - E2E Test Fixes

## Problem Statement
CI/CD failing with 26/30 E2E tests because core prompt management UI components don't exist. Tests validate CRUD operations on non-existent components.

## Analysis Results
- Authentication components exist and work (minor selector fixes needed)
- Dashboard page exists but has placeholder cards only
- API endpoints exist: `/api/prompts`, `/api/executions`
- Missing: Actual UI components that tests are validating against

## Required Components (Based on Failing Tests)

### 1. Prompt List Component
**File**: `src/components/prompts/PromptList.tsx`
**Purpose**: Display prompts from API
**Required Elements**:
- Renders prompt name and template preview
- "Create Prompt" button
- Edit/Delete buttons per prompt
- Search input field

**Test Validations**:
- `page.getByText('Welcome Message')`
- `page.getByRole('button', { name: /create prompt/i })`
- `page.getByPlaceholder(/search prompts/i)`

### 2. Create/Edit Prompt Modal
**File**: `src/components/prompts/PromptModal.tsx`
**Purpose**: Form for creating/editing prompts
**Required Elements**:
- Name input field
- Template textarea
- Variable detection display
- Create/Update button

**Test Validations**:
- `page.getByPlaceholder(/prompt name/i)`
- `page.getByPlaceholder(/enter your prompt template/i)`
- `page.getByText('name')` (detected variable)
- `page.getByRole('button', { name: /create/i })`

### 3. Execute Prompt Modal
**File**: `src/components/prompts/ExecuteModal.tsx`
**Purpose**: Execute prompt with variable inputs
**Required Elements**:
- Dynamic input fields for variables
- Execute button
- Result display area
- Basic metrics display

**Test Validations**:
- `page.getByPlaceholder(/tone/i)` (dynamic based on variables)
- `page.getByRole('button', { name: /execute prompt/i })`
- `page.getByText(/hello john/i)` (result display)

### 4. Updated Dashboard Page
**File**: `src/app/(dashboard)/dashboard/page.tsx`
**Purpose**: Integrate prompt management
**Changes**:
- Replace placeholder cards with PromptList component
- Add modal state management

## Implementation Schedule

### Day 1: Data Layer & List Component
1. Create PromptList component that fetches from `/api/prompts`
2. Implement basic rendering (name, template preview)
3. Add Create button (opens modal - can be non-functional stub)
4. Update dashboard page to use PromptList

**Success Criteria**: 
- `prompt-management.spec.ts:45` passes (displays prompts list)
- `prompt-management.spec.ts:50` passes (create button exists)

### Day 2: Create Prompt Modal
1. Create PromptModal component with form fields
2. Implement variable detection regex: `/\{\{(\w+)\}\}/g`
3. Wire up POST to `/api/prompts`
4. Add success/error handling

**Success Criteria**:
- `prompt-management.spec.ts:60` passes (create new prompt)
- `prompt-management.spec.ts:106` passes (auto-detect variables)

### Day 3: Execute Prompt Modal
1. Create ExecuteModal component
2. Generate input fields based on prompt variables
3. Wire up POST to `/api/executions`
4. Display execution result

**Success Criteria**:
- `prompt-execution.spec.ts:43` passes (open execution modal)
- `prompt-execution.spec.ts:79` passes (execute prompt successfully)

### Day 4: Polish & Validation
1. Add edit/delete functionality to PromptList
2. Fix remaining test selector issues
3. Add loading states and error handling
4. Run full test suite

**Success Criteria**:
- All 26 currently failing tests pass
- CI/CD pipeline succeeds

## Technical Specifications

### Variable Detection
```typescript
const detectVariables = (template: string): string[] => {
  const matches = template.match(/\{\{(\w+)\}\}/g);
  return matches ? matches.map(m => m.slice(2, -2)) : [];
};
```

### Component Structure
- Use existing UI components (`@/components/ui/*`)
- Follow existing patterns in `LoginForm.tsx`
- Use React Hook Form + Zod validation
- Implement proper TypeScript types

### Error Handling
- Display errors in `.bg-destructive/10` containers (match test expectations)
- Use existing error patterns from LoginForm

## What We're NOT Building
- Advanced analytics beyond basic token/cost display
- Complex validation rules
- Version control features
- Multi-model selection
- Real-time execution streaming
- Advanced search/filtering

## Success Metrics
- CI/CD passes with 30/30 tests
- No overengineered features beyond test requirements
- Functional CRUD operations for prompts
- Basic execution capability with result display

## Risk Mitigation
- Test each component immediately after building
- Use existing API contracts (no backend changes)
- Follow established UI patterns from codebase
- Implement minimal viable functionality first