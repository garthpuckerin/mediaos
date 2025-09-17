# MediaOS Branch Protection Configuration

This document outlines the GitHub branch protection rules and settings for the MediaOS project.

## Branch Protection Rules

### Main Branch (`main`)
- **Protect matching branches**: `main`
- **Require a pull request before merging**: ✅
  - Required number of reviewers: 2
  - Dismiss stale PR approvals when new commits are pushed: ✅
  - Require review from code owners: ✅
- **Require status checks to pass before merging**: ✅
  - Require branches to be up to date before merging: ✅
  - Required status checks:
    - `ci/lint-and-format`
    - `ci/test`
    - `ci/e2e-tests`
    - `ci/security-scan`
    - `ci/docker-build`
- **Require conversation resolution before merging**: ✅
- **Require signed commits**: ✅
- **Require linear history**: ✅
- **Include administrators**: ✅
- **Restrict pushes that create files**: ✅
- **Allow force pushes**: ❌
- **Allow deletions**: ❌

### Develop Branch (`develop`)
- **Protect matching branches**: `develop`
- **Require a pull request before merging**: ✅
  - Required number of reviewers: 1
  - Dismiss stale PR approvals when new commits are pushed: ✅
  - Require review from code owners: ✅
- **Require status checks to pass before merging**: ✅
  - Require branches to be up to date before merging: ✅
  - Required status checks:
    - `ci/lint-and-format`
    - `ci/test`
    - `ci/type-check`
- **Require conversation resolution before merging**: ✅
- **Require signed commits**: ✅
- **Require linear history**: ❌
- **Include administrators**: ❌
- **Restrict pushes that create files**: ❌
- **Allow force pushes**: ❌
- **Allow deletions**: ❌

### Feature Branch (`feature/2.2`)
- **Protect matching branches**: `feature/2.2`
- **Require a pull request before merging**: ✅
  - Required number of reviewers: 1
  - Dismiss stale PR approvals when new commits are pushed: ✅
- **Require status checks to pass before merging**: ✅
  - Require branches to be up to date before merging: ✅
  - Required status checks:
    - `ci/lint-and-format`
    - `ci/test`
- **Require conversation resolution before merging**: ✅
- **Require signed commits**: ❌
- **Require linear history**: ❌
- **Include administrators**: ❌
- **Restrict pushes that create files**: ❌
- **Allow force pushes**: ✅ (for rebasing)
- **Allow deletions**: ❌

## Required Status Checks

### CI/CD Pipeline Checks
1. **Lint and Format Check**
   - ESLint compliance
   - Prettier formatting
   - TypeScript compilation

2. **Test Suite**
   - Unit tests (Vitest)
   - Integration tests
   - Test coverage (minimum 80%)

3. **E2E Tests** (main branch only)
   - Playwright tests
   - Cross-browser compatibility

4. **Security Scan** (main branch only)
   - Trivy vulnerability scanning
   - Dependency security audit

5. **Docker Build** (main branch only)
   - Multi-stage build verification
   - Container security scan

## Code Owner Requirements

### CODEOWNERS File
```
# Global owners
* @mediaos-team

# API package
packages/api/ @api-team

# Web package
packages/web/ @frontend-team

# Workers package
packages/workers/ @backend-team

# Adapters package
packages/adapters/ @integration-team

# Documentation
*.md @docs-team

# CI/CD
.github/ @devops-team

# Database
db/ @database-team
```

## Pull Request Templates

### Feature Pull Request Template
```markdown
## Description
Brief description of the feature

## Type of Change
- [ ] New feature
- [ ] Enhancement
- [ ] Refactoring

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated (if applicable)
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Performance impact assessed
- [ ] Security implications reviewed

## Related Issues
Closes #(issue number)

## Screenshots (if applicable)
<!-- Add screenshots for UI changes -->
```

### Bug Fix Pull Request Template
```markdown
## Description
Brief description of the bug fix

## Type of Change
- [ ] Bug fix
- [ ] Hotfix

## Root Cause Analysis
<!-- Describe the root cause of the issue -->

## Solution
<!-- Describe how the issue was resolved -->

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Regression tests added
- [ ] Manual testing completed

## Checklist
- [ ] Root cause identified
- [ ] Solution properly tested
- [ ] No regression introduced
- [ ] Documentation updated
- [ ] Performance impact assessed

## Related Issues
Fixes #(issue number)

## Additional Notes
<!-- Any additional information -->
```

## Branch Naming Rules

### Allowed Patterns
- `feature/*` - Feature branches
- `bugfix/*` - Bug fix branches
- `hotfix/*` - Hotfix branches
- `release/*` - Release branches
- `docs/*` - Documentation branches

### Prohibited Patterns
- `main` - Reserved for production
- `develop` - Reserved for integration
- `feature/2.2` - Reserved for current active feature branch
- Branches with special characters
- Branches longer than 50 characters

## Merge Restrictions

### Merge Methods
- **Squash and Merge**: Default for feature branches
- **Rebase and Merge**: For bug fixes
- **Merge Commit**: For release branches

### Merge Requirements
- All status checks must pass
- Required approvals received
- No merge conflicts
- Branch up-to-date
- Conversation resolved

## Emergency Procedures

### Critical Hotfix Process
1. Create hotfix branch from `main`
2. Implement minimal fix with tests
3. Create emergency pull request
4. Fast-track review (security team approval)
5. Deploy immediately after merge
6. Merge hotfix back to `develop`
7. Post-incident review

### Emergency Override
- Only available to administrators
- Requires security team approval
- Must be documented and reviewed
- Post-incident analysis required

## Monitoring and Alerts

### Branch Health Monitoring
- Stale branches (> 7 days)
- Failed status checks
- Merge conflicts
- Security vulnerabilities
- Performance regressions

### Automated Actions
- Auto-delete merged branches
- Auto-close stale pull requests
- Auto-assign reviewers
- Auto-label pull requests

## Compliance and Auditing

### Audit Requirements
- Monthly branch protection compliance review
- Quarterly process effectiveness assessment
- Annual security and compliance audit
- Continuous improvement implementation

### Reporting
- Branch management metrics
- Merge success rates
- Review turnaround times
- Security incident reports
- Performance impact analysis

---

**This configuration ensures systematic, secure, and high-quality development workflows while maintaining code integrity and release stability.**
