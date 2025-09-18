# Contributing to MediaOS

Thank you for your interest in contributing to MediaOS! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Process](#contributing-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm 8+ (package manager)
- Git
- Docker (for containerized development)

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/MediaOS.git
   cd MediaOS
   ```

2. **Install Dependencies**
   ```bash
   corepack enable
   pnpm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Database Setup**
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

5. **Start Development Server**
   ```bash
   pnpm dev
   ```

## Contributing Process

### Branch Strategy

- **Main branches:** `main` (production), `develop` (integration)
- **Feature branches:** Create from `feature/2.2` (latest feature branch)
- **Hotfix branches:** Create from `main` for critical fixes
- **Release branches:** Create from `develop` for releases

### Branch Naming Convention

- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `hotfix/description` - Critical production fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(api): add user authentication endpoint
fix(web): resolve artwork modal display issue
docs(readme): update installation instructions
```

## Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use explicit return types for public methods
- Avoid `any` type - use proper typing

### Code Style

- **ESLint:** Enforced via configuration
- **Prettier:** Automatic code formatting
- **Import Order:** Alphabetical with grouping
- **Naming:** camelCase for variables, PascalCase for classes

### File Organization

```
packages/
  api/
    src/
      routes/          # API route handlers
      services/        # Business logic
      models/          # Data models
      utils/           # Utility functions
      types/           # TypeScript type definitions
  web/
    src/
      components/      # React components
      pages/           # Page components
      hooks/           # Custom React hooks
      utils/           # Utility functions
      types/           # TypeScript type definitions
```

### API Design

- RESTful API design
- Consistent error handling
- Proper HTTP status codes
- Input validation with Zod
- Comprehensive API documentation

## Testing Guidelines

### Test Structure

- **Unit Tests:** Test individual functions/components
- **Integration Tests:** Test API endpoints
- **E2E Tests:** Test complete user workflows
- **Coverage:** Minimum 80% coverage required

### Writing Tests

```typescript
// Unit test example
describe('MediaService', () => {
  it('should create a new media item', async () => {
    const mediaItem = await mediaService.create({
      title: 'Test Movie',
      year: 2024,
      type: 'movie'
    });
    
    expect(mediaItem).toBeDefined();
    expect(mediaItem.title).toBe('Test Movie');
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e
```

## Pull Request Process

### Before Submitting

1. **Run Quality Checks**
   ```bash
   pnpm lint
   pnpm format:check
   pnpm type-check
   pnpm test
   ```

2. **Update Documentation**
   - Update relevant documentation
   - Add/update API documentation
   - Update README if needed

3. **Test Your Changes**
   - Test locally
   - Ensure all tests pass
   - Test edge cases

### PR Requirements

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
- [ ] Commit messages follow conventional format

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.log statements
```

## Issue Reporting

### Bug Reports

When reporting bugs, please include:

1. **Environment Information**
   - OS and version
   - Node.js version
   - MediaOS version
   - Browser (if web-related)

2. **Steps to Reproduce**
   - Clear, numbered steps
   - Expected vs actual behavior
   - Screenshots if applicable

3. **Additional Context**
   - Error messages/logs
   - Related issues
   - Workarounds if any

### Feature Requests

For feature requests, please include:

1. **Problem Description**
   - What problem does this solve?
   - Why is this important?

2. **Proposed Solution**
   - How should this work?
   - Any alternatives considered?

3. **Additional Context**
   - Use cases
   - Mockups/wireframes
   - Related features

## Development Workflow

### Daily Development

1. **Start Development**
   ```bash
   pnpm dev
   ```

2. **Make Changes**
   - Follow coding standards
   - Write tests for new code
   - Update documentation

3. **Quality Checks**
   ```bash
   pnpm lint:fix
   pnpm format
   pnpm test
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

### Release Process

1. **Version Bumping**
   - Update version in package.json
   - Update changelog.md
   - Create release PR

2. **Testing**
   - Run full test suite
   - Manual testing
   - Performance testing

3. **Release**
   - Merge to main
   - Create GitHub release
   - Deploy to production

## Getting Help

- **Documentation:** Check existing docs first
- **Issues:** Search existing issues
- **Discussions:** Use GitHub Discussions for questions
- **Discord:** Join our community Discord (if available)

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project documentation

Thank you for contributing to MediaOS! 🎬

---

**Document Version:** 1.0  
**Last Updated:** September 17, 2025  
**Next Review:** Q4 2025
