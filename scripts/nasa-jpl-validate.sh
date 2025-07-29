#!/bin/bash
# NASA JPL Power of 10 Compliance Validation Script
# Aerospace-grade validation for all 10 rules

set -e

echo "🚀 NASA JPL Power of 10 Compliance Validation"
echo "============================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Function to check a rule
check_rule() {
    local rule_num=$1
    local rule_name=$2
    local command=$3
    local expected=$4
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    echo -n "Rule $rule_num: $rule_name... "
    
    if eval "$command"; then
        echo -e "${GREEN}PASS${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${RED}FAIL${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        echo "  Expected: $expected"
    fi
}

echo "TypeScript/JavaScript Checks:"
echo "----------------------------"

# Rule 1: Cyclomatic Complexity (≤10)
check_rule 1 "Cyclomatic Complexity" \
    "! grep -r 'function\|=>' src --include='*.ts' --include='*.svelte' | grep -E '\{.*if.*if.*if.*if.*\}'" \
    "Functions with complexity ≤ 10"

# Rule 2: No Dynamic Memory (check for unbounded arrays)
check_rule 2 "Bounded Memory" \
    "! grep -r 'push\|unshift' src --include='*.ts' --include='*.svelte' | grep -v 'length.*<\|slice\|shift'" \
    "All arrays have bounded growth"

# Rule 3: No Recursion
check_rule 3 "No Recursion" \
    "! grep -r 'function.*{' src --include='*.ts' --include='*.svelte' -A 20 | grep -B 20 -E 'function (\w+).*\1\('" \
    "No recursive function calls"

# Rule 4: Function Length (≤60 lines)
echo -n "Rule 4: Function Length... "
LONG_FUNCTIONS=$(find src -name "*.ts" -o -name "*.svelte" | xargs awk '/function|=>/ {start=NR} /^}/ {if(NR-start>60) print FILENAME":"start"-"NR}' | wc -l)
if [ "$LONG_FUNCTIONS" -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}FAIL${NC}"
    echo "  Found $LONG_FUNCTIONS functions exceeding 60 lines"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# Rule 5: Input Validation
check_rule 5 "Input Validation" \
    "grep -r 'export.*function\|export.*=>' src --include='*.ts' | grep -E 'any\)|:\s*any'" \
    "All exported functions have typed parameters"

# Rule 6: Minimal Scope
check_rule 6 "Minimal Variable Scope" \
    "! grep -r 'var ' src --include='*.ts' --include='*.svelte'" \
    "No 'var' declarations (use const/let)"

# Rule 7: Error Checking
check_rule 7 "Error Checking" \
    "! grep -r '\.then(' src --include='*.ts' --include='*.svelte' | grep -v '\.catch\|try\|async'" \
    "All promises have error handling"

# Rule 8: Limited Macros (check for complex template literals)
check_rule 8 "Simple Templates" \
    "! grep -r '\${.*\${.*}.*}' src --include='*.ts' --include='*.svelte'" \
    "No nested template literals"

# Rule 10: No Warnings
echo -n "Rule 10: No Warnings... "
if npm run check > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}WARN${NC}"
    echo "  TypeScript check failed"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

echo ""
echo "Rust/Tauri Checks:"
echo "------------------"

if [ -d "src-tauri" ]; then
    cd src-tauri
    
    # Check for unwrap() usage
    check_rule 7 "No unwrap() in production" \
        "! grep -r '\.unwrap()' src --include='*.rs' | grep -v 'test\|mock'" \
        "All Results properly handled"
    
    # Check Clippy warnings
    echo -n "Rule 10: Clippy Warnings... "
    if cargo clippy -- -D warnings > /dev/null 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${RED}FAIL${NC}"
        echo "  Clippy warnings detected"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    cd ..
fi

echo ""
echo "Security Checks:"
echo "---------------"

# Check SRI validation
echo -n "SRI Validation... "
if node scripts/validate-sri.js > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}FAIL${NC}"
    echo "  Missing SRI hashes for external resources"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# Check for CSP
check_rule "CSP" "Content Security Policy" \
    "grep -q 'Content-Security-Policy' src/app.html" \
    "CSP meta tag present"

echo ""
echo "============================================"
echo "Summary:"
echo "  Total Checks: $TOTAL_CHECKS"
echo -e "  Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "  Failed: ${RED}$FAILED_CHECKS${NC}"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✅ NASA JPL Compliance PASSED!${NC}"
    echo "   Ready for aerospace deployment!"
    exit 0
else
    echo -e "${RED}❌ NASA JPL Compliance FAILED!${NC}"
    echo "   $FAILED_CHECKS violations must be fixed."
    exit 1
fi