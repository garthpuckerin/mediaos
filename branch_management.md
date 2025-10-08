# MediaOS Branch Management Strategy

**Document Version:** 1.0  
**Last Updated:** September 17, 2025  
**Next Review:** Q4 2025

## Overview

This document establishes comprehensive branch management protocols for the MediaOS project, ensuring systematic development workflows, code quality, and release management.

### Incident Log

- **2025-09-23 – Cross-repo scaffold push**: `feature/db-integration-tests` briefly picked up files from an unrelated project. The branch was reset to `origin/feature/db-integration-tests` (`git reset --hard && git clean -fd`). Action items:
  - Record recovery details in sprint notes.
  - Enable branch protection + required CI on `main`, `develop`, and active sprint branches to block direct pushes.
  - Re-run quality gates (`npm install && npm run lint && npm test`) after any force-reset.

## 1. Branch Structure

### 1.1 Primary Branches

**MAIN BRANCHES:**

- `main` - Production-ready code, stable releases
- `develop` - Integration branch for features, pre-release testing
- `feature/2.2` - Current active feature branch (latest stable feature branch)

**PROTECTION RULES:**

- `main` and `develop` require pull request reviews
- `main` requires status checks to pass
- `main` requires up-to-date branches before merging
- `main` restricts pushes to administrators only

### 1.2 Branch Hierarchy

```
main (production)
├── develop (integration)
│   ├── feature/2.2 (current active)
│   │   ├── feature/description (new features)
│   │   ├── bugfix/description (bug fixes)
│   │   └── hotfix/description (critical fixes)
│   └── release/v1.0.0 (release preparation)
└── hotfix/critical (emergency fixes)
```

## 2. Branch Naming Conventions

### 2.1 Feature Branches

**FORMAT:** `feature/description`
**EXAMPLES:**

- `feature/user-authentication`
- `feature/artwork-management`
- `feature/ai-quality-profiles`
- `feature/subtitle-integration`

**REQUIREMENTS:**

- Use kebab-case (lowercase with hyphens)
- Be descriptive but concise
- Include component/module name when applicable
- Maximum 50 characters

### 2.2 Bug Fix Branches

**FORMAT:** `bugfix/description`
**EXAMPLES:**

- `bugfix/artwork-modal-display`
- `bugfix/api-rate-limiting`
- `bugfix/database-migration-error`
- `bugfix/docker-build-failure`

### 2.3 Hotfix Branches

**FORMAT:** `hotfix/description`
**EXAMPLES:**

- `hotfix/security-vulnerability`
- `hotfix/critical-api-failure`
- `hotfix/data-corruption-issue`
- `hotfix/performance-degradation`

### 2.4 Release Branches

**FORMAT:** `release/version`
**EXAMPLES:**

- `release/v1.0.0`
- `release/v1.1.0`
- `release/v2.0.0-beta`

### 2.5 Documentation Branches

**FORMAT:** `docs/description`
**EXAMPLES:**

- `docs/api-documentation`
- `docs/deployment-guide`
- `docs/architecture-update`

## 3. Branch Creation Protocol

### 3.1 Feature Branch Creation

**MANDATORY STEPS:**

1. **Source Branch**: Always create from `feature/2.2` (latest feature branch)
2. **Naming**: Follow naming conventions
3. **Description**: Include clear description in commit message
4. **Issue Reference**: Link to GitHub issue if applicable

**COMMANDS:**

```bash
# Ensure up-to-date with latest feature branch
git checkout feature/2.2
git pull origin feature/2.2

# Create and switch to new feature branch
git checkout -b feature/user-authentication

# Push new branch to remote
git push -u origin feature/user-authentication
```

### 3.2 Bug Fix Branch Creation

**MANDATORY STEPS:**

1. **Source Branch**: Create from `develop` for non-critical bugs
2. **Critical Bugs**: Create from `main` for critical production issues
3. **Issue Reference**: Must link to bug report
4. **Testing**: Include test cases for the fix

**COMMANDS:**

```bash
# For non-critical bugs
git checkout develop
git pull origin develop
git checkout -b bugfix/artwork-modal-display

# For critical bugs
git checkout main
git pull origin main
git checkout -b hotfix/critical-api-failure
```

## 4. Branch Protection Rules

### 4.1 Main Branch Protection

**REQUIRED SETTINGS:**

- Require pull request reviews (2 reviewers minimum)
- Require status checks to pass
- Require branches to be up-to-date before merging
- Restrict pushes to administrators
- Require linear history
- Include administrators in restrictions

**STATUS CHECKS:**

- CI/CD Pipeline (lint, test, build)
- Code coverage (minimum 80%)
- Security scanning
- TypeScript compilation
- Docker build verification

### 4.2 Develop Branch Protection

**REQUIRED SETTINGS:**

- Require pull request reviews (1 reviewer minimum)
- Require status checks to pass
- Require branches to be up-to-date before merging
- Allow force pushes (for rebasing)

**STATUS CHECKS:**

- CI/CD Pipeline (lint, test, build)
- Code coverage (minimum 80%)
- TypeScript compilation

### 4.3 Feature Branch Protection

**REQUIRED SETTINGS:**

- Require status checks to pass
- Allow force pushes (for rebasing)
- Require up-to-date branches before merging

**STATUS CHECKS:**

- Linting and formatting
- TypeScript compilation
- Unit tests

## 5. Merge Strategies

### 5.1 Merge Methods

**PREFERRED METHODS:**

- **Squash and Merge**: For feature branches (clean history)
- **Rebase and Merge**: For bug fixes (preserve individual commits)
- **Merge Commit**: For release branches (preserve branch history)

**PROHIBITED METHODS:**

- Direct pushes to protected branches
- Force pushes to shared branches
- Merging without required approvals

### 5.2 Merge Requirements

**MANDATORY REQUIREMENTS:**

- All status checks must pass
- Required number of approvals received
- Branch must be up-to-date
- No merge conflicts
- All tests must pass
- Code coverage requirements met

## 6. Pull Request Process

### 6.1 Pull Request Creation

**REQUIRED ELEMENTS:**

- Clear, descriptive title
- Detailed description of changes
- Link to related issues
- Testing instructions
- Screenshots (for UI changes)
- Breaking changes documentation

**TEMPLATE:**

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

### 6.2 Review Process

**REVIEW REQUIREMENTS:**

- Minimum 1 reviewer for develop branch
- Minimum 2 reviewers for main branch
- All requested reviewers must approve
- No self-approval allowed
- Review must be thorough and constructive

**REVIEW CHECKLIST:**

- [ ] Code quality and style
- [ ] Test coverage adequacy
- [ ] Documentation completeness
- [ ] Security considerations
- [ ] Performance implications
- [ ] Breaking changes identified

## 7. Release Management

### 7.1 Release Branch Creation

**RELEASE PROCESS:**

1. Create release branch from `develop`
2. Update version numbers
3. Update changelog
4. Run full test suite
5. Create release pull request to `main`
6. Deploy to staging environment
7. Perform final testing
8. Merge to `main` and tag release

**COMMANDS:**

```bash
# Create release branch
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0

# Update version and changelog
# Run tests
# Create pull request to main
```

### 7.2 Hotfix Process

**HOTFIX WORKFLOW:**

1. Create hotfix branch from `main`
2. Implement fix with tests
3. Create pull request to `main`
4. Merge to `main` and tag hotfix
5. Merge hotfix back to `develop`
6. Deploy immediately

**COMMANDS:**

```bash
# Create hotfix branch
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-fix

# Implement fix and tests
# Create pull request to main
# After merge, update develop
git checkout develop
git merge main
```

## 8. Branch Cleanup

### 8.1 Automatic Cleanup

**CLEANUP RULES:**

- Delete feature branches after merge
- Delete bug fix branches after merge
- Keep release branches for reference
- Archive old hotfix branches

**AUTOMATION:**

- GitHub Actions for automatic branch deletion
- Scheduled cleanup of stale branches
- Notification system for branch status

### 8.2 Manual Cleanup

**MANUAL PROCESS:**

- Review merged branches monthly
- Delete branches older than 30 days
- Archive important branches
- Update documentation

## 9. Branch Monitoring

### 9.1 Branch Health Monitoring

**MONITORING METRICS:**

- Number of open branches
- Average branch lifetime
- Merge frequency
- Failed merge attempts
- Branch divergence

**ALERTS:**

- Stale branches (> 7 days)
- Failed status checks
- Merge conflicts
- Security vulnerabilities

### 9.2 Branch Analytics

**ANALYTICS TRACKING:**

- Branch creation frequency
- Merge success rate
- Review turnaround time
- Code coverage trends
- Performance metrics

## 10. Emergency Procedures

### 10.1 Critical Issue Response

**EMERGENCY WORKFLOW:**

1. Create hotfix branch from `main`
2. Implement minimal fix
3. Create emergency pull request
4. Fast-track review process
5. Deploy immediately
6. Post-incident review

**FAST-TRACK REQUIREMENTS:**

- Security team approval
- Minimal change scope
- Comprehensive testing
- Rollback plan

### 10.2 Branch Recovery

**RECOVERY PROCEDURES:**

- Branch corruption recovery
- Lost commit recovery
- Merge conflict resolution
- Force push recovery

## 11. Training and Documentation

### 11.1 Team Training

**TRAINING REQUIREMENTS:**

- Git workflow training
- Branch management protocols
- Pull request best practices
- Code review guidelines
- Emergency procedures

### 11.2 Documentation Maintenance

**DOCUMENTATION REQUIREMENTS:**

- Keep branch management docs current
- Update procedures as needed
- Document lessons learned
- Share best practices

## 12. Compliance and Auditing

### 12.1 Compliance Monitoring

**MONITORING REQUIREMENTS:**

- Branch protection compliance
- Review process compliance
- Merge requirement compliance
- Security requirement compliance

### 12.2 Audit Procedures

**AUDIT PROCESS:**

- Monthly branch management audits
- Quarterly process reviews
- Annual compliance assessments
- Continuous improvement implementation

---

## Implementation Checklist

### Initial Setup

- [ ] Configure branch protection rules
- [ ] Set up status checks
- [ ] Create branch templates
- [ ] Establish review processes
- [ ] Configure automation

### Ongoing Management

- [ ] Monitor branch health
- [ ] Conduct regular audits
- [ ] Update procedures as needed
- [ ] Train team members
- [ ] Maintain documentation

### Emergency Preparedness

- [ ] Document emergency procedures
- [ ] Train emergency response team
- [ ] Test recovery procedures
- [ ] Maintain emergency contacts

---

**This branch management strategy ensures systematic, high-quality development workflows while maintaining code integrity and release stability.**

## 13. Protection Checklist

- Branches requiring protection: `main`, `develop`, active sprint branches (e.g. `feature/db-integration-tests`).
- Required status checks: `npm run lint`, `npm test`.
- Require pull request reviews (minimum 1) before merge.
- Enforce up-to-date branches before merging; block direct pushes to protected branches.
- Enable branch deletion on merge to avoid stale remote heads.

## 14. Using GitHub Copilot for PRs & Conflicts

> Team: currently maintained by a small crew (you + Codex + Copilot). This section shows how to use Copilot in GitHub’s web UI to speed up reviews and conflict resolution. No repo code changes are required beyond enabling Copilot in GitHub settings.

### 14.1 Enablement

- Organization/Repository Settings (admin required):
  - Turn on “Copilot in GitHub.com (Chat)” and “Copilot for Pull Requests”.
  - Assign Copilot seats (Copilot Business/Enterprise).
  - Optional: Enable “Code referencing” and set data/telemetry controls per org policy.
- Repository settings: Ensure the repo inherits org Copilot settings or explicitly enables PR features.

### 14.2 How to use in PRs

- Open a PR in GitHub.com and use “Ask Copilot” in the right panel to:
  - Summarize the PR, list risky areas and breaking changes.
  - Suggest review comments, tests, or safer refactors.
  - Explain complex diffs or specific files.
  - Generate release notes from the diff.

Helpful prompts:

- “Summarize this PR and point out potential risks.”
- “Explain changes in packages/api/src/routes/downloads.ts and suggest improvements.”
- “Propose unit test cases that cover new branches and error handling.”

### 14.3 Resolve merge conflicts with Copilot

- Click “Resolve conflicts” in the PR.
- If Copilot for PRs is enabled, accept/swap suggested resolutions inline.
- For complex conflicts, open the web editor (press `.` for github.dev) or a Codespace and use Copilot Chat:
  - “Resolve conflicts in packages/api/src/routes/downloads.ts keeping HEAD’s validation but preserving the new provider stats.”
  - “Reconcile differing job payload shapes so /api/downloads stays backward compatible.”

### 14.4 Guardrails

- Copilot suggestions are just proposals — maintainers must review.
- Do not paste secrets or proprietary data in prompts.
- Ensure required checks (lint, type‑check, tests) pass; Copilot does not bypass CI gates defined in this repo.

### 14.5 Quick Start (2 minutes)

1. Enable Copilot PR features in Org/Repo settings and assign a seat.
2. Open any PR → “Ask Copilot” → request a summary and tests.
3. Use conflict resolution suggestions or Chat in github.dev/Codespaces for complex merges.
4. Finish with our CI: lint, type‑check, tests must be green.
