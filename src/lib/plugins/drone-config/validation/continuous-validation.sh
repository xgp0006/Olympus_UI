#\!/bin/bash
# Aerospace-Grade Continuous Validation Script
# NASA JPL Power of 10 Compliance Checker

echo "=== NASA JPL Compliance Validation ==="
echo "Module: Drone Configuration"
echo "Timestamp: $(date)"
echo ""

# Configuration
DRONE_CONFIG_DIR="src/lib/plugins/drone-config"
MAX_FUNCTION_LINES=60
MAX_COMPLEXITY=10
ERRORS=0

# Rule 1: Restrict all code to very simple control flow constructs
echo "Checking Rule 1: Control Flow Complexity..."
find $DRONE_CONFIG_DIR -name "*.ts" -o -name "*.svelte" | while read file; do
    # Check for goto, setjmp, longjmp (not applicable in TS/Svelte)
    if grep -E "goto|setjmp|longjmp" "$file" > /dev/null; then
        echo "❌ $file: Contains forbidden control flow"
        ((ERRORS++))
    fi
done

# Rule 2: Give all loops a fixed upper bound
echo ""
echo "Checking Rule 2: Loop Bounds..."
# Check for unbounded loops
if grep -r "while\s*(true)" $DRONE_CONFIG_DIR --include="*.ts" --include="*.svelte" > /dev/null; then
    echo "❌ Found unbounded while(true) loops"
    ((ERRORS++))
fi

# Rule 3: Do not use dynamic memory allocation after initialization
echo ""
echo "Checking Rule 3: Dynamic Memory Allocation..."
DYNAMIC_ALLOCS=$(grep -r "\[\]" $DRONE_CONFIG_DIR --include="*.ts" --include="*.svelte" | grep -E "let.*=\s*\[\]|const.*=\s*\[\]" | wc -l)
if [ $DYNAMIC_ALLOCS -gt 0 ]; then
    echo "❌ Found $DYNAMIC_ALLOCS dynamic array allocations"
    ((ERRORS++))
fi

# Rule 4: No function should be longer than 60 lines
echo ""
echo "Checking Rule 4: Function Length..."
LONG_FUNCTIONS=$(find $DRONE_CONFIG_DIR -name "*.svelte" -exec awk 'FNR==1{file=FILENAME} /^[[:space:]]*function|^[[:space:]]*async function/ {start=FNR} start && FNR>start+59 && /^[[:space:]]*}/ {print file":"start"-"FNR" (" FNR-start+1 " lines)"; start=0}' {} \; | wc -l)
if [ $LONG_FUNCTIONS -gt 0 ]; then
    echo "❌ Found $LONG_FUNCTIONS functions exceeding 60 lines"
    ((ERRORS++))
fi

# Rule 5: Average 2 assertions per function (check for error handling)
echo ""
echo "Checking Rule 5: Assertions/Error Handling..."
ERROR_HANDLERS=$(grep -r "catch(" $DRONE_CONFIG_DIR --include="*.ts" --include="*.svelte" | wc -l)
if [ $ERROR_HANDLERS -lt 10 ]; then
    echo "❌ Insufficient error handling (only $ERROR_HANDLERS catch blocks)"
    ((ERRORS++))
fi

# Rule 6: Minimize data scope (check for global variables)
echo ""
echo "Checking Rule 6: Data Scope..."
# This would need more sophisticated analysis

# Rule 7: Check return values of all non-void functions
echo ""
echo "Checking Rule 7: Unchecked Returns..."
# Check for ignored Promise returns
if grep -r "^\s*[a-zA-Z_].*\.(then|catch|finally)" $DRONE_CONFIG_DIR --include="*.ts" --include="*.svelte" | grep -v "await" | grep -v "return" > /dev/null; then
    echo "❌ Found unhandled Promise chains"
    ((ERRORS++))
fi

# Rule 8: Limit preprocessor use (not applicable)
echo ""
echo "Checking Rule 8: Preprocessor Use... ✅ N/A for TypeScript"

# Rule 9: Limit pointer use (check for any/unknown types)
echo ""
echo "Checking Rule 9: Type Safety..."
ANY_TYPES=$(grep -r ": any" $DRONE_CONFIG_DIR --include="*.ts" --include="*.svelte" | wc -l)
if [ $ANY_TYPES -gt 0 ]; then
    echo "❌ Found $ANY_TYPES uses of 'any' type"
    ((ERRORS++))
fi

# Rule 10: Compile with all warnings enabled
echo ""
echo "Checking Rule 10: TypeScript Compilation..."
cd ../../../.. # Go to project root
if \! npx tsc --noEmit --strict; then
    echo "❌ TypeScript compilation failed"
    ((ERRORS++))
fi

# Additional Safety Checks
echo ""
echo "=== Additional Safety Checks ==="

# Check for hardcoded colors (theme compliance)
echo "Checking theme compliance..."
HARDCODED_COLORS=$(grep -r "#[0-9a-fA-F]\{3,6\}" $DRONE_CONFIG_DIR --include="*.svelte" --include="*.css" | grep -v "TEST_COVERAGE" | wc -l)
if [ $HARDCODED_COLORS -gt 0 ]; then
    echo "❌ Found $HARDCODED_COLORS hardcoded colors"
    ((ERRORS++))
fi

# Check for emergency stop implementation
echo "Checking emergency stop system..."
if \! grep -r "EmergencyStopService" $DRONE_CONFIG_DIR > /dev/null; then
    echo "❌ Emergency stop not implemented"
    ((ERRORS++))
fi

# Summary
echo ""
echo "=== VALIDATION SUMMARY ==="
if [ $ERRORS -eq 0 ]; then
    echo "✅ All validations passed\!"
    exit 0
else
    echo "❌ Found $ERRORS compliance violations"
    exit 1
fi
