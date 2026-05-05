# Olympus_UI exemptions registry

Every gate-bypass, lint disable, type-check suppression, or rule exemption used
in this workspace must be listed here with a tracking issue and target close
date. The default rule is **zero exemptions**; an entry in this file is the
_only_ form of permitted exception.

This document exists because:

1. **Audit-trail integrity.** DAL-B compliance requires that every deviation
   from the standard is documented at the point of deviation AND in a central
   registry. A `// eslint-disable-next-line` comment by itself is not auditable;
   this registry is.
2. **Bounded precedent.** If exceptions exist without a registry, the
   no-exception rule devolves into "we did it before, we'll do it again." A
   registry forces every new exception to be a deliberate, tracked decision.
3. **Forced expiration.** Each entry has a target close date. An exception that
   outlives its date becomes its own audit finding.

## Permitted exemption types

| Type                            | Format at point of use                                             | Where allowed                               |
| ------------------------------- | ------------------------------------------------------------------ | ------------------------------------------- |
| Git hook bypass (`--no-verify`) | Documented in commit message + this registry                       | Last resort, requires written justification |
| ESLint suppression              | `// eslint-disable-next-line <rule> -- JPL-EXEMPT-NNN: <reason>`   | Production code, with tracked issue         |
| TypeScript suppression          | `// @ts-expect-error JPL-EXEMPT-NNN: <reason>`                     | Production code, with tracked issue         |
| Function length (>60 lines)     | `// JPL-EXEMPT-NNN: function-length — <reason>` above the function | Last resort; refactor preferred             |
| Prettier override               | `// prettier-ignore // JPL-EXEMPT-NNN: <reason>`                   | Cosmetic last resort                        |

`JPL-EXEMPT-NNN` IDs are issued sequentially. The next free identifier is
**JPL-EXEMPT-002** (last used: JPL-EXEMPT-001).

## How to add an exemption

1. Confirm the underlying code/process cannot be fixed within the scope of the
   current change. Document why in the tracking issue.
2. Pick the next free `JPL-EXEMPT-NNN` identifier.
3. Open a GitHub issue with:
   - Title: `JPL-EXEMPT-NNN: <one-line summary>`
   - Body: Why the exception is needed, what the close path looks like, target
     close date.
4. Add the exemption marker at the point of deviation (see formats above).
5. Add a row to the table below.
6. Reference the issue in the PR description.

## How to remove an exemption

1. Land the underlying fix.
2. Remove the in-source `JPL-EXEMPT-NNN` marker.
3. Delete the registry row in the same PR.
4. Close the tracking GitHub issue.
5. Update the "last used" identifier in this file's header if you removed the
   most recent.

## Severity classification

| Severity | Definition                                                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0**   | Bypass of a safety-critical gate (e.g., `--no-verify` on a release-bound commit). Requires post-merge follow-up PR before any further work proceeds in the affected area. |
| **P1**   | Bypass of a quality gate that masks a real-but-non-safety issue (e.g., suppressing a lint that flags a real code smell).                                                  |
| **P2**   | Bypass of a cosmetic gate (e.g., prettier-ignore for a generated file).                                                                                                   |
| **P3**   | Bypass justified by external constraint (e.g., third-party type definitions are wrong).                                                                                   |

## Active exemptions

| ID             | Severity | Type                     | Location                                                  | Reason                                                                                                                                                                                                                                                                                                                                                                                                            | Tracking issue | Target close                                                                                          |
| -------------- | -------- | ------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------- |
| JPL-EXEMPT-001 | P0       | `--no-verify` git commit | commit `a4913ef` on `fix/install-reproducibility` (PR #1) | Pre-existing pre-commit hook on master invoked `prettier --write . --check` (a flag conflict that silently rewrote 332 files) and ran ESLint + tsc on the entire codebase, which had 559 lint errors and 87 TypeScript errors. The PR fixes install reproducibility — making the hook itself runnable required first landing the lockfile. PR description discloses the bypass. The repaired hooks land in PR #2. | (open issue)   | Closed when PR #2 (hook repair) lands, since it makes the bypass non-recurring by repairing the hook. |

## Closed exemptions

(none yet)

## CI enforcement (future)

A future CI gate will reject any PR that:

- Adds a new `// eslint-disable*` comment without a matching `JPL-EXEMPT-NNN`
  reference in this file
- Adds a new `// @ts-expect-error` or `// @ts-ignore` comment without a matching
  reference
- Contains a commit message indicating `--no-verify` was used
  (`grep -E '\bno-verify\b'`) without a matching entry

Until that gate exists, the registry is enforced by code review.
