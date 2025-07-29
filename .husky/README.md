# Aerospace-Grade Git Hooks

This directory contains NASA JPL-compliant git hooks that enforce aerospace-grade code quality standards.

## ⚠️ CRITICAL: ZERO TOLERANCE POLICY

These hooks implement a **ZERO TOLERANCE** policy for code quality violations. There are:

- **NO BYPASSES** allowed
- **NO EXCEPTIONS** permitted
- **NO NEGOTIATIONS** on standards
- **IMMEDIATE STOP** on any failure

## 🚀 Quality Gates

### Gate 1: Pre-commit (LOCAL)

Executes on every commit attempt:

- ✓ Code formatting check
- ✓ Linting with zero warnings
- ✓ TypeScript type checking
- ✓ No console.log in production
- ✓ TODO/FIXME warnings

### Gate 2: Pre-push (NETWORK)

Executes before pushing to remote:

- ✓ All Gate 1 checks
- ✓ Full test suite
- ✓ Build validation
- ✓ Security audit
- ✓ Bundle size analysis
- ✓ Memory pattern validation

### Commit Message Validation

Enforces conventional commit format:

```
<type>(<scope>): <subject>
```

## 🛑 Enforcement Rules

1. **NEVER** use `--no-verify` to bypass hooks
2. **ALWAYS** fix issues before committing
3. **NO** suppression of warnings allowed
4. **ALL** tests must pass (100%)
5. **ZERO** TypeScript errors permitted

## 📋 NASA JPL Rule 10 Compliance

These hooks enforce the NASA JPL "Power of 10" rules:

1. Simple control flow (complexity ≤ 10)
2. Bounded loops only
3. Fixed memory allocation
4. Functions ≤ 60 lines
5. All inputs validated
6. Minimal variable scope
7. All returns checked
8. Simple preprocessor use only
9. Single pointer dereference
10. Zero warnings policy

## 🔧 Manual Testing

Test individual gates:

```bash
npm run aerospace:gate1  # Pre-commit checks
npm run aerospace:gate2  # Pre-push checks
npm run aerospace:full   # All validations
```

## ⚡ Troubleshooting

If hooks fail:

1. Read the error message carefully
2. Fix ALL reported issues
3. Run validation manually: `npm run aerospace:validate`
4. Commit only when all checks pass

**Remember**: These standards exist to ensure mission-critical software reliability. There are no shortcuts in aerospace engineering.
