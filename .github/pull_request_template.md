# Pull Request

## Summary

<!-- Brief description of changes -->

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Dependency change
- [ ] Refactoring (no functional changes)

## Testing

- [ ] I have tested these changes locally
- [ ] I have added appropriate unit/integration tests
- [ ] All existing tests pass

## Code Quality

- [ ] Code follows the project's style guidelines
- [ ] Self-review of my own code completed
- [ ] Code has been commented, particularly in hard-to-understand areas
- [ ] No debugging/console statements left in code

## Dependency Changes Checklist (if applicable)

<!-- Only fill out if your PR adds, removes, or moves dependencies -->

- [ ] New dependencies classified using decision tree from [Dependency Classification Guide](./docs/deployment/Dependency%20Classification%20Guide.md)
- [ ] Tested with `npm ci --omit=dev && npm run build` (production-only build)
- [ ] Classification rationale documented for unusual cases
- [ ] No CSS/asset processing tools accidentally in devDependencies
- [ ] Build tools that generate runtime code/assets are in dependencies (not devDependencies)

### Dependency Classification Details

<!-- If you added/moved dependencies, explain your classification decisions -->

```
New dependency: [name]
Classification: [dependencies/devDependencies]
Rationale: [explain using decision tree from guide]
```

## Deployment Validation

- [ ] `npm run type-check` passes with no errors
- [ ] `npm run lint` passes with no blocking violations
- [ ] `npm run test` passes all tests
- [ ] Production build validated locally
- [ ] No emergency bypasses introduced (typescript.ignoreBuildErrors, eslint.ignoreDuringBuilds)

## Documentation

- [ ] Documentation updated (if applicable)
- [ ] README updated (if applicable)
- [ ] API documentation updated (if applicable)

## Security

- [ ] No sensitive information (keys, passwords, tokens) exposed
- [ ] Security implications considered and addressed
- [ ] Dependencies from trusted sources only

## Reviewer Guidelines

For reviewers, please check:

- [ ] Dependency classifications justified using our decision tree
- [ ] Developer tested production-only build for dependency changes
- [ ] No emergency bypasses introduced without explicit P0 justification
- [ ] Code follows established patterns and conventions
