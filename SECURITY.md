# Security Policy

## Supported Versions
We support the latest mainline branch and current sprint branches.

## Reporting a Vulnerability
Please report security issues via GitHub Issues with the `security` label, or email the maintainer if sensitive.

## Automated Security
- Dependabot weekly updates for npm dependencies
- `npm audit` used locally and in CI (fail on critical severity)

## Best Practices in Code
- Strict TypeScript configuration
- ESLint rules forbidding dangerous constructs (eval, implied eval)
- Input validation with Zod
- HTTP security headers via Fastify plugins

## Containers
- Multi-stage Docker builds
- Non-root user in runtime image
- Minimal attack surface

