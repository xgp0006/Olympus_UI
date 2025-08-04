# TypeScript Mass Fix Strategy

## Phase 1: Import Type Fixes (Automated - 15 minutes)

### Files to Fix:

1. src/lib/map-features/shared/aerospace-context.ts
2. src/lib/map-features/crosshair/renderers/ring-renderer.ts
3. src/lib/plugins/drone-config/**tests**/utils/mockDroneData.ts

### Mass Fix Commands:

```bash
# Fix RenderErrorType imports
find src/lib/map-features -name "*.ts" -type f -exec sed -i.bak \
  's/import type { RenderErrorType }/import { RenderErrorType }/g' {} \;

# Fix DroneErrorType imports
find src/lib/plugins/drone-config -name "*.ts" -type f -exec sed -i.bak \
  's/import type { DroneErrorType }/import { DroneErrorType }/g' {} \;

# Alternative for Windows PowerShell:
Get-ChildItem -Path "src/lib/map-features" -Filter "*.ts" -Recurse | ForEach-Object {
    (Get-Content $_.FullName) -replace 'import type { RenderErrorType }', 'import { RenderErrorType }' |
    Set-Content $_.FullName
}
```

## Phase 2: Service Method Fixes (Semi-automated - 30 minutes)

### Files to Fix:

1. src/lib/plugins/drone-config/**tests**/services/mavlink-service.test.ts
2. src/lib/plugins/drone-config/**tests**/services/parameter-service.test.ts

### Strategy:

1. Add missing error methods to service interfaces
2. Update test expectations to match actual implementation

### Mass Fix Pattern:

```typescript
// Add to MAVLinkService interface:
getError(): Error | null;
getErrorType(): string | null;

// Add to ParameterService interface:
getErrorType(): string | null;
```

## Phase 3: Test Utility Type Fixes (Manual - 45 minutes)

### File to Fix:

1. src/lib/plugins/drone-config/**tests**/utils/testUtils.ts

### Fix Strategy:

```typescript
// Change from:
context: new Map([...array]);

// To:
context: new Map<string, any>([...array] as const);
```

## Phase 4: Validation & Cleanup (15 minutes)

### Commands:

```bash
# Remove backup files after verification
find . -name "*.bak" -type f -delete

# Run TypeScript check
npx tsc --noEmit

# Run svelte-check
npx svelte-check
```

## File Locking Strategy

To prevent concurrent edits:

### Team Assignments:

- **Agent 1**: Phase 1 - map-features directory ONLY
- **Agent 2**: Phase 1 - drone-config directory ONLY
- **Agent 3**: Phase 2 - Test files ONLY
- **Agent 4**: Phase 3 - testUtils.ts ONLY

### Lock File Implementation:

```bash
# Before editing:
touch .editing-${AGENT_ID}-${FILE_NAME}.lock

# After editing:
rm .editing-${AGENT_ID}-${FILE_NAME}.lock
```

## Automated Fix Script

```bash
#!/bin/bash
# typescript-mass-fix.sh

echo "Starting TypeScript mass fix..."

# Phase 1: Import fixes
echo "Phase 1: Fixing import type issues..."
find src/lib -name "*.ts" -type f | while read file; do
  if grep -q "import type.*ErrorType" "$file"; then
    echo "Fixing: $file"
    sed -i.bak 's/import type \({[^}]*ErrorType[^}]*}\)/import \1/g' "$file"
  fi
done

# Count remaining errors
echo "Checking remaining errors..."
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

## Expected Results

- **Phase 1**: ~200 errors fixed automatically
- **Phase 2**: ~150 errors fixed semi-automatically
- **Phase 3**: ~100 errors fixed manually
- **Phase 4**: ~50 errors remaining for manual review

Total time: ~2 hours with parallel execution
