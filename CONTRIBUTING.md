# Contributing to FormaOps

Thank you for your interest in contributing to FormaOps! This document provides guidelines and information for contributors.

## 🌟 How to Contribute

### Types of Contributions

We welcome many types of contributions:

- **Bug Reports**: Help us identify and fix issues
- **Feature Requests**: Suggest new features or improvements
- **Code Contributions**: Submit bug fixes or new features
- **Documentation**: Improve our documentation
- **Testing**: Help improve test coverage
- **Design**: UI/UX improvements and suggestions

## 🚀 Getting Started

### Prerequisites

Before contributing, make sure you have:

- Node.js 18.0.0 or later
- Git knowledge
- Basic understanding of TypeScript and React
- Familiarity with our tech stack (Next.js, Prisma, etc.)

### Setting Up Your Development Environment

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/formaops.git
   cd formaops
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Fill in your environment variables
   ```

4. **Set up the database**
   ```bash
   npm run db:setup
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Run tests to ensure everything works**
   ```bash
   npm test
   ```

## 📝 Contribution Workflow

### 1. Create an Issue (Optional but Recommended)

For significant changes, please create an issue first to discuss:

- **Bug Reports**: Use the bug report template
- **Feature Requests**: Use the feature request template
- **Questions**: Use the discussion board

### 2. Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally
3. Add the original repository as upstream:
   ```bash
   git remote add upstream https://github.com/original-owner/formaops.git
   ```

### 3. Create a Branch

Create a descriptive branch name:

```bash
git checkout -b feature/prompt-templates
git checkout -b fix/validation-bug
git checkout -b docs/api-examples
```

### 4. Make Your Changes

#### Code Guidelines

- **TypeScript**: Use strict TypeScript. All code should be properly typed
- **Testing**: Write tests for new features and bug fixes
- **Linting**: Follow our ESLint and Prettier configurations
- **Commits**: Use conventional commit messages

#### Code Style

```typescript
// ✅ Good: Proper typing and naming
interface PromptExecutionRequest {
  promptId: string;
  inputs: Record<string, unknown>;
  model?: SupportedModel;
}

export async function executePrompt(
  request: PromptExecutionRequest
): Promise<ExecutionResult> {
  // Implementation
}

// ❌ Bad: No typing, unclear naming
function exec(data: any): any {
  // Implementation
}
```

#### Testing Requirements

All contributions should include appropriate tests:

```typescript
// Unit test example
describe('InputValidator', () => {
  it('should validate email format correctly', () => {
    expect(() => InputValidator.validateEmail('invalid-email'))
      .toThrow('Invalid email format');
    
    expect(InputValidator.validateEmail('test@example.com'))
      .toBe('test@example.com');
  });
});
```

### 5. Run Quality Checks

Before submitting, run our quality checks:

```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Tests
npm test

# E2E tests (if relevant)
npm run test:e2e
```

### 6. Commit Your Changes

We use conventional commits. Format your commit messages like:

```bash
git commit -m "feat: add prompt template validation"
git commit -m "fix: resolve execution timeout issue"
git commit -m "docs: update API documentation"
git commit -m "test: add integration tests for auth"
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### 7. Push and Create Pull Request

```bash
git push origin your-branch-name
```

Then create a Pull Request on GitHub with:

- **Clear title**: Describe what the PR does
- **Detailed description**: Explain the changes and why
- **Screenshots**: For UI changes
- **Testing notes**: How to test the changes
- **Breaking changes**: If any, explain them

## 🧪 Testing Guidelines

### Test Types

1. **Unit Tests** (`*.test.ts`)
   - Test individual functions and components
   - Mock external dependencies
   - Fast and isolated

2. **Integration Tests** (`*.integration.test.ts`)
   - Test API endpoints with real database
   - Test component integration
   - Use test database

3. **E2E Tests** (`tests/e2e/*.spec.ts`)
   - Test complete user flows
   - Use Playwright
   - Run against real application

### Test Structure

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  describe('specific functionality', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test input';
      
      // Act
      const result = functionUnderTest(input);
      
      // Assert
      expect(result).toBe('expected output');
    });
  });
});
```

## 📋 Pull Request Guidelines

### PR Checklist

Before submitting your PR, ensure:

- [ ] Code follows our style guidelines
- [ ] Tests pass locally (`npm test`)
- [ ] New code has appropriate test coverage
- [ ] Documentation is updated if needed
- [ ] Commit messages follow conventional format
- [ ] No console.log or debugging code left behind
- [ ] No sensitive information in code
- [ ] Breaking changes are documented

### PR Template

```markdown
## Description
Brief description of the changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes.

## Additional Notes
Any additional information for reviewers.
```

## 🐛 Bug Reports

When reporting bugs, please include:

### Bug Report Template

```markdown
## Bug Description
Clear and concise description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- OS: [e.g. macOS, Windows, Linux]
- Browser: [e.g. Chrome, Firefox, Safari]
- Version: [e.g. 1.0.0]

## Additional Context
- Screenshots
- Console errors
- Network requests
- Any other relevant information
```

## 💡 Feature Requests

For feature requests, please include:

### Feature Request Template

```markdown
## Feature Summary
Brief description of the feature.

## Problem Statement
What problem does this solve?

## Proposed Solution
Detailed description of the proposed feature.

## Alternative Solutions
Any alternative approaches considered.

## Additional Context
- Use cases
- Examples
- Mockups/wireframes
- Related issues
```

## 📚 Documentation Guidelines

### Documentation Standards

- **Clear and Concise**: Write for developers of all skill levels
- **Examples**: Include code examples and use cases
- **Up-to-date**: Keep documentation synchronized with code
- **Searchable**: Use clear headings and structure

### API Documentation

When documenting APIs:

```typescript
/**
 * Executes a prompt with the specified inputs
 * 
 * @param promptId - UUID of the prompt to execute
 * @param inputs - Input variables for the prompt
 * @param options - Optional execution parameters
 * @returns Promise resolving to execution result
 * 
 * @example
 * ```typescript
 * const result = await executePrompt('uuid', {
 *   name: 'John',
 *   company: 'TechCorp'
 * });
 * ```
 */
export async function executePrompt(
  promptId: string,
  inputs: Record<string, unknown>,
  options?: ExecutionOptions
): Promise<ExecutionResult>
```

## 🏗️ Architecture Decisions

### When Making Architecture Changes

For significant architectural changes:

1. **Create an RFC**: Open an issue with "RFC:" prefix
2. **Discuss**: Engage with maintainers and community
3. **Prototype**: Create a small proof of concept
4. **Document**: Update architecture documentation
5. **Migrate**: Provide migration path if breaking

### Design Principles

Follow these principles:

- **Maintainability**: Code should be easy to understand and modify
- **Performance**: Optimize for user experience
- **Security**: Security by default
- **Accessibility**: Inclusive design
- **Testing**: Testable code architecture

## 🎨 UI/UX Contributions

### Design Guidelines

- **Consistency**: Follow existing design patterns
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Optimize images and animations
- **Mobile-first**: Responsive design approach

### UI Component Guidelines

```tsx
// ✅ Good component structure
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), props.className)}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && <Spinner />}
        {children}
      </button>
    );
  }
);
```

## 🔍 Code Review Process

### What We Look For

1. **Correctness**: Does the code work as intended?
2. **Performance**: Are there any performance implications?
3. **Security**: Are there security vulnerabilities?
4. **Maintainability**: Is the code readable and maintainable?
5. **Testing**: Is there adequate test coverage?
6. **Documentation**: Is the code properly documented?

### Review Timeline

- **Small PRs** (< 100 lines): 1-2 days
- **Medium PRs** (100-500 lines): 3-5 days
- **Large PRs** (> 500 lines): 5-10 days

### Addressing Review Feedback

1. **Read carefully**: Understand all feedback
2. **Ask questions**: If unclear, ask for clarification
3. **Make changes**: Address all valid concerns
4. **Respond**: Comment on what you changed
5. **Re-request review**: After making changes

## 🏆 Recognition

### Contributors

All contributors are recognized in:

- Repository contributors list
- Release notes
- Website contributors page

### Becoming a Maintainer

Regular contributors may be invited to become maintainers based on:

- Consistent quality contributions
- Good understanding of the codebase
- Helpful code reviews
- Community engagement

## ❓ Questions?

If you have questions:

- **General Questions**: [GitHub Discussions](https://github.com/username/formaops/discussions)
- **Bug Reports**: [GitHub Issues](https://github.com/username/formaops/issues)
- **Security Issues**: security@formaops.com
- **Private Questions**: contribute@formaops.com

## 📄 License

By contributing to FormaOps, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to FormaOps! Your efforts help make this project better for everyone. 🙏