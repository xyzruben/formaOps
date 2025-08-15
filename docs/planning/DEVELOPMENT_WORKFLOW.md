# Development Workflow & Code Quality

## Development Environment Setup

### Prerequisites

```bash
- Node.js 18+
- npm 9+
- Docker Desktop
- Git
```

### One-Command Setup

```bash
# Clone and setup
git clone <repo>
cd formaOps
npm run setup
```

**Setup Script** (`package.json`):

```json
{
  "scripts": {
    "setup": "npm install && npm run env:setup && npm run db:setup",
    "env:setup": "cp .env.example .env.local",
    "db:setup": "docker-compose up -d && npx prisma db push && npx prisma db seed",
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

### Local Environment Stack

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: formaops
    ports:
      - '5432:5432'

  redis:
    image: redis:7
    ports:
      - '6379:6379'
```

## Git Workflow Strategy

### Branch Naming Convention

```
feature/prompt-editor-ui
fix/validation-error-handling
refactor/database-queries
docs/api-documentation
```

### Commit Message Format

```
type(scope): description

feat(prompts): add variable validation
fix(api): handle OpenAI timeout errors
refactor(db): optimize execution queries
docs(readme): add setup instructions
```

### PR Template

```markdown
## Changes

- [ ] Feature implementation
- [ ] Tests added/updated
- [ ] Documentation updated

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots

[Add screenshots for UI changes]
```

## Code Standards & Linting

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### ESLint Configuration

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### Prettier Configuration

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 80
}
```

## File Organization Patterns

### Component Structure

```typescript
// components/prompts/PromptEditor.tsx
interface PromptEditorProps {
  prompt?: Prompt;
  onSave: (prompt: Prompt) => void;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({
  prompt,
  onSave,
}) => {
  // Component implementation
};

export default PromptEditor;
```

### API Route Pattern

```typescript
// app/api/prompts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const CreatePromptSchema = z.object({
  name: z.string().min(1),
  template: z.string().min(1),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const data = CreatePromptSchema.parse(body);

    // Implementation

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

### Custom Hook Pattern

```typescript
// hooks/use-prompts.ts
export const usePrompts = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  const createPrompt = useCallback(async (data: CreatePromptData) => {
    // Implementation with error handling
  }, []);

  return { prompts, loading, createPrompt };
};
```

## Testing Strategy

### Test Structure

```
tests/
├── unit/
│   ├── components/
│   ├── hooks/
│   └── utils/
├── integration/
│   ├── api/
│   └── database/
└── e2e/
    └── user-flows/
```

### Unit Test Example

```typescript
// tests/unit/components/PromptEditor.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptEditor } from '@/components/prompts/PromptEditor';

describe('PromptEditor', () => {
  it('validates required fields', async () => {
    const onSave = jest.fn();
    render(<PromptEditor onSave={onSave} />);

    fireEvent.click(screen.getByText('Save'));

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
```

### API Test Example

```typescript
// tests/integration/api/prompts.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/app/api/prompts/route';

describe('/api/prompts', () => {
  it('creates a new prompt', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        name: 'Test Prompt',
        template: 'Hello {{name}}',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
  });
});
```

## Development Commands

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "db:migrate": "prisma db push",
    "db:seed": "prisma db seed",
    "db:reset": "prisma migrate reset --force"
  }
}
```

## Code Review Checklist

**Before Submitting PR:**

- [ ] All tests pass (`npm test`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Code follows style guide (`npm run lint`)
- [ ] Components have proper TypeScript interfaces
- [ ] Error handling implemented
- [ ] Performance considerations addressed

**Review Criteria:**

- Code readability and maintainability
- Proper error boundaries and loading states
- Accessibility considerations (ARIA labels, keyboard navigation)
- Security best practices (input validation, sanitization)
- Performance optimizations (memoization, lazy loading)

This workflow ensures consistent, high-quality code while remaining practical for solo development.
