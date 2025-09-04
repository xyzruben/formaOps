# TypeScript Refactoring Plan - Phase 1

## Executive Summary

**Root Cause Identified**: Type system cascade failure due to retrofitting strict types onto untyped code without aligning implementations.

**Strategy**: Systematic type-driven refactoring using incremental typing approach, not individual error fixes.

**Timeline**: 4-6 hours total across 4 phases to eliminate all 45+ TypeScript errors systematically.

---

## Root Cause Analysis

### **Primary Issue: Type System Cascade Failure**

Our Phase 2 ESLint fixes created a **type definition vs. implementation mismatch**:

1. **State Type Misalignment**: All React state declared as `null` but used as complex objects
2. **Interface Contract Violations**: Defined interfaces that implementations don't fulfill
3. **Database Query Mismatches**: Prisma results don't match our custom type definitions
4. **Type Conversion Incompatibility**: Changed function signatures without updating implementations

**Result**: 45+ TypeScript errors that are symptoms of architectural type misalignment, not individual bugs.

---

## Strategic Approach

### **Phase 1: Stabilize Core State Types (90 minutes)**

**Target**: Fix `dashboard/page.tsx` state type cascade (15 errors)

#### **1.1 Define Component Interfaces**

```typescript
// Add to top of dashboard/page.tsx
interface MockPrompt {
  id: string;
  name: string;
  template: string;
  variables: Variable[];
  description: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

interface Variable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
}

interface ExecutionResult {
  result: string;
  tokens: number;
  cost: number;
  latency: number;
  executionId: string;
}

interface FormValues {
  [key: string]: string;
}

interface ValidationErrors {
  [key: string]: string;
}
```

#### **1.2 Update State Declarations**

```typescript
// Replace existing state with proper types
const [selectedPrompt, setSelectedPrompt] = useState<MockPrompt | null>(null);
const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(
  null
);
const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
const [formValues, setFormValues] = useState<FormValues>({});
```

#### **1.3 Update Function Parameters**

```typescript
// Add proper parameter types
const handleInputChange = (variableName: string, value: string): void => {
  // Implementation stays the same
};

const validateForm = (prompt: MockPrompt): boolean => {
  // Implementation stays the same
};
```

#### **Success Criteria**

- [ ] All dashboard/page.tsx TypeScript errors eliminated
- [ ] Component compiles without type errors
- [ ] State typing is consistent and safe

---

### **Phase 2: Align Interface Contracts (60 minutes)**

**Target**: Fix `useAccessibility.ts` interface mismatches (12 errors)

#### **2.1 Audit Current Implementation**

- Review what methods are actually implemented in useAccessibility hook
- Identify which interface methods are missing implementations

#### **2.2 Pragmatic Interface Reduction**

```typescript
// Reduce UseAccessibilityReturn to only implemented methods
interface UseAccessibilityReturn {
  announcementText: string;
  focusedVariableIndex: number;
  highContrastMode: boolean;
  announceChange: (message: string) => void;
  handleKeyboardNavigation: (event: React.KeyboardEvent) => boolean;
  getAriaLabel: (variable: VariableDefinition, index: number) => string;
  getAriaDescribedBy: (variable: VariableDefinition) => string;
  styles: Record<string, string>;
  // Remove all unimplemented methods temporarily
}
```

#### **2.3 Update Component Dependencies**

- Update `AccessibleVariableEditor.tsx` to only use implemented methods
- Add TODO comments for missing functionality

#### **Success Criteria**

- [ ] useAccessibility interface matches implementation
- [ ] No missing method errors in AccessibleVariableEditor
- [ ] Hook compiles and exports correctly

---

### **Phase 3: Fix Database Type Alignment (90 minutes)**

**Target**: Fix `queries.ts` and test database type mismatches (8 errors)

#### **3.1 Analyze Prisma Query Results**

```typescript
// Examine actual Prisma query shape vs our PromptResult type
// Update PromptResult to match what Prisma actually returns
type PromptResult = {
  id: string;
  name: string;
  description: string | null;
  template: string;
  variables: JsonValue; // Prisma's JSON type
  version: number;
  status: PromptStatus;
  tags: string[];
  publishedAt: Date | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  _count: { executions: number };
};
```

#### **3.2 Update Query Return Types**

```typescript
// Align function return types with actual Prisma results
export const getUserPrompts = async (
  userId: string,
  options: GetPromptsOptions = {}
): Promise<{
  prompts: PromptResult[];
  totalCount: number;
  pagination: PaginationInfo; // Add this back if tests expect it
}> => {
  // Implementation stays the same, types now match reality
};
```

#### **3.3 Fix Test Type Expectations**

- Update test files to match new database query return shapes
- Ensure mock data structures align with type definitions

#### **Success Criteria**

- [ ] All database queries have correct return types
- [ ] Prisma results match TypeScript type definitions
- [ ] Test files compile without database type errors

---

### **Phase 4: Rollback Type Conversion System (60 minutes)**

**Target**: Fix `TypeCoercionSystem.ts` converter signature conflicts (10 errors)

#### **4.1 Temporary Rollback Strategy**

```typescript
// Revert converter signatures to what implementations expect
export interface TypeConversionRules {
  from: VariableType;
  to: VariableType;
  converter: (value: any) => TypeConversionResult; // Rollback to any for now
  preserveOnFailure: boolean;
}

export interface TypeConversionResult {
  success: boolean;
  convertedValue: any; // Rollback to any for now
  error?: string;
  warning?: string;
}
```

#### **4.2 Update Dependent Types**

```typescript
// Update VariableDefinition to use any temporarily
export interface VariableDefinition {
  name: string;
  type: VariableType;
  required: boolean;
  description?: string;
  defaultValue?: any; // Rollback to any
  options?: string[];
}
```

#### **4.3 Add Future Typing TODOs**

- Add comprehensive TODO comments for proper type implementation
- Document the proper type-driven approach for future implementation

#### **Success Criteria**

- [ ] TypeCoercionSystem compiles without errors
- [ ] All converter implementations work with relaxed types
- [ ] System is stable for continued development

---

## Implementation Timeline

### **Day 1: Core Stabilization (3 hours)**

- **Hours 1-1.5**: Phase 1 - Dashboard state types
- **Hours 1.5-2.5**: Phase 2 - Interface alignment
- **Hour 3**: Phase 3 start - Database type analysis

### **Day 2: Database & System Fixes (3 hours)**

- **Hours 1-2**: Phase 3 completion - Database alignment
- **Hour 3**: Phase 4 - Type conversion rollback
- **Final 30min**: Comprehensive testing

## Success Criteria

### **Technical Metrics**

- ✅ **0 TypeScript compilation errors**
- ✅ **All tests pass** without type-related failures
- ✅ **CI/CD pipeline passes** TypeScript check step
- ✅ **No runtime type errors** during development

### **Code Quality Metrics**

- ✅ **Type safety preserved** where it adds value
- ✅ **Interface contracts fulfilled** by implementations
- ✅ **Database types aligned** with Prisma reality
- ✅ **State management type-safe** for React components

### **Development Experience**

- ✅ **IntelliSense working** for all major components
- ✅ **Refactoring safety** with proper type checking
- ✅ **Clear error messages** when types are violated

---

## Risk Mitigation

### **Rollback Plan**

If refactoring introduces breaking changes:

1. **Immediate**: Revert to `any` types for problematic areas
2. **Short-term**: Focus on critical path types (state, props, API)
3. **Long-term**: Implement incremental typing as features are built

### **Testing Strategy**

- **Unit tests**: Run after each phase to ensure no regressions
- **E2E tests**: Verify UI functionality remains intact
- **Type tests**: Use `tsc --noEmit` frequently during refactoring

### **Incremental Approach**

- **Phase isolation**: Complete each phase fully before moving to next
- **Validation points**: TypeScript check + tests after each phase
- **Rollback triggers**: More than 2 hours stuck on any single phase

---

## Long-term Type Strategy

### **Going Forward**

1. **Interface-First Development**: Define TypeScript interfaces before implementation
2. **Incremental Typing**: Add types as features are built, not retrofitted
3. **Type-Driven Testing**: Use TypeScript to catch errors before runtime
4. **Progressive Enhancement**: Start with `any`, gradually add specific types

### **Architecture Principles**

- **Type safety where it matters**: API boundaries, state management, data flow
- **Pragmatic typing**: Use `any` temporarily rather than fight TypeScript
- **Documentation through types**: Let types serve as living documentation
- **Maintainable over perfect**: Prefer working code with some `any` over broken strict types

This refactoring plan addresses the **root architectural cause** rather than individual symptoms, ensuring we don't get stuck in the same TypeScript error cycle again.
