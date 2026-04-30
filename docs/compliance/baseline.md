# Olympus_UI — NASA JPL compliance baseline

**Snapshot date**: 2026-04-30 **Branch measured**: `master` @ HEAD (with
`fix/install-reproducibility` and `fix/pre-commit-hooks` applied to make tools
runnable) **Measured by**: initial baseline pass per
`~/.claude/plans/lets-pull-olympus-olympusui-ticklish-pike.md` (Phase 1.2)

This document is the **starting point** for driving every gate to zero. Every
future PR is measured against these numbers, and the numbers must monotonically
decrease. New violations introduced in a PR are not allowed; they must be fixed
before merge.

## Foundational principle

NASA JPL Power of 10 Rules apply to all production code in this workspace,
adapted for TypeScript/Svelte where the rule's spirit applies (function length,
type discipline, error checking). Violations are tech debt, not "best effort."

## Current violation counts

| Gate                                         | Tool / command                     | Count                                 | Target close                 | Notes                                                                                                                                                      |
| -------------------------------------------- | ---------------------------------- | ------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------------------------- |
| Format compliance                            | `pnpm exec prettier --check .`     | **331 files**                         | Phase 2.3 (week 3)           | Big — most files need formatting. `pnpm format` (prettier --write) is a one-shot fix                                                                       |
| ESLint errors                                | `pnpm exec eslint .` errors only   | **4408**                              | Phase 2.3 (week 3)           | Of the 6132 total problems, 1456 are auto-fixable via `pnpm exec eslint . --fix`                                                                           |
| ESLint warnings                              | `pnpm exec eslint .` warnings only | **1724**                              | Phase 2.3 (week 3)           | Should drop substantially after auto-fix sweep                                                                                                             |
| TypeScript strict                            | `pnpm check` (svelte-check)        | **87 errors / 8 warnings / 24 files** | Phase 2.4 (week 3)           | `--fail-on-warnings` enabled; each file may need targeted fixes                                                                                            |
| Build (vite)                                 | `pnpm build`                       | **fails**                             | Phase 2 (priority)           | `App.svelte` imports `../ui/ConnectionStatus.svelte` which doesn't exist anywhere in the repo. Cannot ship until restored. See Known build blockers below. |
| Test compile                                 | `pnpm test`                        | unknown — needs first run             | Phase 2                      | Tests may have similar drift to source                                                                                                                     |
| Test coverage                                | `pnpm test:coverage`               | unknown                               | Phase 4 baseline; ratchet up | Repo declares 80% threshold in `vitest.config.ts`                                                                                                          |
| Tauri build                                  | `pnpm tauri build`                 | unknown                               | Phase 4 (release pipeline)   | Heavy; not a per-push gate                                                                                                                                 |
| Function length (NASA JPL Rule 4: ≤60 lines) | needs custom eslint rule           | TBD                                   | Phase 2.6                    | Add `max-lines-per-function: { max: 60 }` to `.eslintrc.cjs`, measure, fix                                                                                 |
| `console.log` in production                  | `grep`                             | TBD                                   | Phase 2                      | Old hook had this gate; will reactivate in CI once eslint base is clean                                                                                    |
| Hardcoded colors in CSS/Svelte               | `grep` for `#hex                   | rgb(                                  | hsl(` outside theme tokens   | TBD                                                                                                                                                        | Phase 2 | Old hook had this gate too |
| `npm audit`                                  | `pnpm audit --prod`                | TBD                                   | Phase 3                      | Run, document advisories, address                                                                                                                          |

## How to update this file

When a count changes, update both the row's number AND the date in the snapshot
header. Counts must monotonically decrease except for new categories being added
(which start at the new measurement).

For temporary exemptions (last resort, must be justified per occurrence):

- Add a `// JPL-EXEMPT-NNN: <reason>` (or
  `// eslint-disable-next-line <rule> -- JPL-EXEMPT-NNN: <reason>`) comment in
  source
- Where `NNN` is the GitHub issue number tracking the exemption with a target
  close date
- Add a row to the Active Exemptions table

## Known build blockers (must resolve before any release)

| Symptom                                                                                                    | File / location                                   | Root cause                                                                                                                                                                                                                                                                                    | Resolution path                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RollupError: Could not resolve "../ui/ConnectionStatus.svelte" from "src/lib/components/core/App.svelte"` | `src/lib/components/core/App.svelte:17, 166, 201` | The component is imported and used three times but the file does not exist anywhere under `src/`. Either the file was deleted or never created. Other `ui/` siblings (`NotificationCenter`, `PerformanceDashboard`, `VirtualScrollList`, etc.) are present, so this is a single missing file. | Restore the real `ConnectionStatus.svelte` component (subscribes to drone connection state from `src/lib/plugins/drone-config/stores/drone-connection.ts` or equivalent and renders connected/connecting/disconnected status). Do NOT stub with a placeholder render — that violates the no-fake-code rule. If the feature is genuinely not in scope, remove all three call sites in `App.svelte` instead. |

## Active exemptions

None. Add as needed using the format:

```markdown
| Issue | File:Line           | Rule                 | Reason                        | Target close |
| ----- | ------------------- | -------------------- | ----------------------------- | ------------ |
| #N    | `src/lib/foo.ts:42` | TS strict null check | <why this can't be fixed now> | YYYY-MM-DD   |
```

## Verification

To re-measure all numbers in this document:

```bash
# Format
pnpm exec prettier --check .

# ESLint (reports both errors and warnings)
pnpm exec eslint .

# TypeScript / Svelte check
pnpm check

# Build
pnpm build

# Tests + coverage
pnpm test
pnpm test:coverage

# Audit
pnpm audit --prod
```

A future `scripts/measure-baseline.sh` will automate this and update the table
in place.
