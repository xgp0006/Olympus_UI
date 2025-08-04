# Code Consistency Enforcement

This document summarizes the automated tools and configurations created to enforce code consistency standards across the Modular C2 Frontend project.

## Overview

We've implemented a comprehensive suite of automated tools to maintain the project's exceptional code cohesion score and aerospace-grade quality standards.

## 1. ESLint Configuration (`.eslintrc.cjs`)

Enhanced ESLint configuration with:

### NASA JPL Power of 10 Compliance
- **Function size limit**: 60 lines maximum
- **Nesting depth**: Maximum 4 levels
- **Cyclomatic complexity**: Maximum 10
- **Parameter count**: Maximum 4 parameters per function
- **No dynamic code execution**: Blocks eval, Function constructor, etc.

### Import Ordering Rules
- Enforces consistent import ordering:
  1. Built-in modules
  2. External modules
  3. Internal modules ($app, $lib)
  4. Relative imports
  5. Type imports
- Alphabetical sorting within groups
- Newlines between groups

### Naming Conventions
- **Variables**: camelCase or UPPER_CASE (constants)
- **Types/Interfaces**: PascalCase
- **Methods**: camelCase
- **Enum members**: UPPER_CASE

### Code Quality Rules
- Prefer `const` over `let`
- No `var` declarations
- No explicit `any` types
- Strict boolean expressions
- No floating promises
- Require assertion messages

### Svelte-Specific Rules
- Component validation
- Event handler consistency
- Reactive statement checks
- Attribute ordering
- No inline styles (with exceptions)

## 2. Prettier Configuration (`.prettierrc`)

Consistent code formatting with:
- 2-space indentation
- Single quotes for JS/TS
- Trailing commas (ES5)
- 100-character line width
- Consistent bracket spacing
- Svelte-specific formatting rules

## 3. Pre-commit Hooks (`.husky/pre-commit`)

Automated validation on every commit:
1. **Format check** - Prettier validation
2. **Lint check** - ESLint with zero warnings
3. **Type check** - TypeScript compilation
4. **Consistency check** - Custom consistency validations
5. **NASA JPL compliance** - Function size and complexity
6. **Console.log detection** - No console statements in production
7. **CSS consistency** - Warns about hardcoded colors/spacing

## 4. Custom Consistency Scripts

### `scripts/consistency-check.js`
Main consistency validation script that checks:
- Import style consistency (no mixed require/import)
- Event naming conventions (camelCase)
- Const vs let usage
- Function size limits
- File naming conventions

### `scripts/check-css-consistency.js`
CSS-specific validations:
- No hardcoded colors (use CSS variables)
- No hardcoded spacing (use spacing scale)
- Validates both .css and <style> blocks in Svelte

### `scripts/check-function-size.js`
NASA JPL compliance for function sizes:
- Scans all TypeScript/JavaScript files
- Reports functions exceeding 60 lines
- Provides refactoring suggestions

### `scripts/eslint-plugin-aerospace/index.js`
Custom ESLint rules for aerospace-grade quality:
- `no-hardcoded-colors`: Enforce CSS variable usage
- `no-hardcoded-spacing`: Enforce spacing scale usage
- `require-assertion-messages`: Ensure descriptive assertions
- `bounded-loops`: Ensure loops have clear bounds
- `consistent-error-handling`: Enforce error patterns
- `no-magic-numbers`: Require named constants

## 5. Package.json Scripts

New scripts for consistency enforcement:

```json
// Consistency checks
"consistency:check": "node scripts/consistency-check.js"
"consistency:imports": "eslint . --rule 'import/order: error'"
"consistency:naming": "eslint . --rule '@typescript-eslint/naming-convention: error'"
"consistency:css": "node scripts/check-css-consistency.js"
"consistency:all": "npm run consistency:check && npm run format -- --check && npm run lint"

// NASA JPL compliance
"nasa-jpl:functions": "node scripts/check-function-size.js"
"nasa-jpl:complexity": "eslint . --rule 'complexity: [error, 10]'"

// Fix commands
"fix:imports": "eslint . --fix --rule 'import/order: error'"
"fix:formatting": "npm run format"
"fix:all": "npm run fix:formatting && npm run lint:fix"
```

## 6. VS Code Configuration

### `.vscode/settings.json`
- Format on save enabled
- ESLint auto-fix on save
- Proper formatter associations
- Consistent indentation (2 spaces)
- Trim trailing whitespace
- CSS linting rules
- Svelte a11y warnings as errors

### `.vscode/extensions.json`
Recommended extensions:
- Svelte for VS Code
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Error Lens
- Better Comments
- Pretty TypeScript Errors

## 7. Contributing Guide (`CONTRIBUTING.md`)

Comprehensive documentation covering:
- Development environment setup
- Code style standards with examples
- NASA JPL compliance requirements
- Pre-commit check explanations
- Pull request process
- Common patterns and best practices

## Usage

### For Developers

1. **Install dependencies**: `pnpm install`
2. **VS Code**: Install recommended extensions when prompted
3. **Before committing**: Code will be automatically validated
4. **Manual checks**:
   ```bash
   pnpm consistency:all     # Run all consistency checks
   pnpm nasa-jpl:validate   # Check NASA JPL compliance
   pnpm fix:all            # Auto-fix what's possible
   ```

### For CI/CD

The same checks run in CI pipelines:
```bash
pnpm aerospace:gate1    # Format, lint, and type checks
pnpm aerospace:gate2    # Full validation including tests
```

## Benefits

1. **Automated Enforcement**: No manual review needed for basic standards
2. **Early Detection**: Issues caught before commit, not in PR review
3. **Consistent Codebase**: All code follows the same patterns
4. **NASA JPL Compliance**: Aerospace-grade quality standards
5. **Developer Experience**: Clear error messages and auto-fix capabilities
6. **Documentation**: Standards are well-documented and discoverable

## Maintenance

To update consistency rules:

1. **ESLint rules**: Edit `.eslintrc.cjs`
2. **Formatting**: Edit `.prettierrc`
3. **Custom checks**: Edit scripts in `scripts/`
4. **Pre-commit hooks**: Edit `.husky/pre-commit`
5. **Documentation**: Update `CONTRIBUTING.md`

All changes to enforcement rules should be discussed with the team and documented in pull requests.