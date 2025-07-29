# Debug Command (DB) - Aerospace-Grade Systematic Debugging

**CRITICAL: Execute with ZERO errors, ZERO warnings, and PERFECT codebase coherence**

## Pre-Debug Initialization

### Phase 0: Context & Style Analysis

**MANDATORY BEFORE ANY CHANGES:**

- [ ] **Read CLAUDE.md COMPLETELY** - Essential Code Coherence and Consistency section for maintaining architectural patterns, naming conventions, error handling consistency, and codebase synchronization during debugging
- [ ] **Analyze existing code style** in affected modules (spacing, naming, patterns)
- [ ] **Document current architecture patterns** (error handling, async patterns, etc.)
- [ ] **Identify codebase-specific conventions** (Result types, logging, testing)
- [ ] **Map dependency relationships** to understand impact scope

## Phase 1: Research & Intelligence Gathering

### 1.1 External Research (Sequential - Wait for Completion)

**Agent Assignment: RESEARCH_AGENT_1**

- [ ] **WebSearch**: Research error type, symptoms, and aerospace-grade solutions
- [ ] **WebFetch**: Gather official documentation and best practices
- [ ] **GitHub Search**: Find reference implementations and community solutions
- [ ] **Context7**: Research library-specific debugging approaches
- [ ] **STATUS**: Report findings in standardized format before proceeding

### 1.2 Codebase Pattern Analysis (Wait for 1.1 Completion)

**Agent Assignment: ANALYSIS_AGENT_1**

- [ ] **Scan affected crates** for existing error handling patterns
- [ ] **Document function signatures** and return types in scope
- [ ] **Identify testing patterns** used in similar code
- [ ] **Map integration points** that could be affected
- [ ] **STATUS**: Document patterns before proceeding to fixes

**FOR EACH CODE SECTION AUDITED, COMPLETE ENTIRE CHECKLIST:**

### NASA JPL Power of 10 Rules Compliance

#### Rule 1: Cyclomatic Complexity (≤10 per function)

- [ ] **Measure**: Use `cargo clippy -- -D clippy::cognitive_complexity`
- [ ] **Verify**: Functions have single responsibility
- [ ] **Check**: Nested conditions are minimized (≤3 levels)
- [ ] **Validate**: Complex logic extracted to helper functions
- [ ] **Ensure**: Early returns reduce nesting depth
- [ ] **Confirm**: Switch statements have ≤7 cases
- [ ] **Test**: Boolean expressions are simplified

#### Rule 2: Dynamic Memory Allocation

- [ ] **Scan**: No dynamic allocation after initialization
- [ ] **Verify**: No `Box::new`, `Vec::new`, `HashMap::new` in hot paths
- [ ] **Check**: Object pools used for reusable resources
- [ ] **Validate**: Arrays pre-allocated with `heapless` collections
- [ ] **Ensure**: Bounded capacity on all collections
- [ ] **Confirm**: Stack-based allocation preferred
- [ ] **Document**: Memory usage patterns and limits

#### Rule 3: Recursion

- [ ] **Scan**: Zero recursive function calls
- [ ] **Verify**: Iterative solutions implemented
- [ ] **Check**: Loop bounds are explicit and finite
- [ ] **Validate**: Stack-based tree traversal only
- [ ] **Ensure**: Tail recursion converted to loops
- [ ] **Confirm**: Mutual recursion eliminated
- [ ] **Test**: Stack overflow scenarios impossible

#### Rule 4: Function Length (≤60 lines)

- [ ] **Measure**: Line count per function (excluding docs)
- [ ] **Verify**: Functions ≤60 lines including braces
- [ ] **Check**: Complex operations decomposed appropriately
- [ ] **Validate**: Single responsibility principle followed
- [ ] **Ensure**: Helper functions created for repeated logic
- [ ] **Confirm**: Blank lines minimized for clarity
- [ ] **Refactor**: Extract functions exceeding limit

#### Rule 5: Assertions

- [ ] **Verify**: All function parameters validated
- [ ] **Check**: Return values verified before use
- [ ] **Validate**: Boundary conditions checked with assertions
- [ ] **Ensure**: Type assumptions explicitly validated
- [ ] **Confirm**: Array bounds verified before access
- [ ] **Test**: Null/undefined checks performed
- [ ] **Document**: Assertion failure handling

#### Rule 6: Minimal Scope

- [ ] **Verify**: Variables declared at point of use
- [ ] **Check**: `const` used for all immutable values
- [ ] **Validate**: Variable scope minimized appropriately
- [ ] **Ensure**: No broad-scope variables
- [ ] **Confirm**: Loop variables scoped to loops
- [ ] **Optimize**: Function parameters minimal and necessary

#### Rule 7: Return Value Checking

- [ ] **Scan**: All function calls handle return values
- [ ] **Verify**: No ignored `Result` types
- [ ] **Check**: Error conditions properly handled
- [ ] **Validate**: Resource cleanup on failure paths
- [ ] **Ensure**: `Result<T, E>` used for fallible operations
- [ ] **Confirm**: No panicking code in production paths
- [ ] **Test**: Error propagation works correctly

#### Rule 8: Preprocessor Use (Rust: Macros)

- [ ] **Verify**: No complex procedural macros
- [ ] **Check**: Simple declarative macros only
- [ ] **Validate**: No function-like macros for logic
- [ ] **Ensure**: Conditional compilation minimized
- [ ] **Confirm**: No macro concatenation complexity
- [ ] **Simplify**: Replace macros with functions where possible

#### Rule 9: Pointer Use (Rust: References & Raw Pointers)

- [ ] **Verify**: Maximum one level of dereferencing
- [ ] **Check**: No function pointers in critical paths
- [ ] **Validate**: Slice indexing preferred over pointer arithmetic
- [ ] **Ensure**: Null pointer checks before dereferencing
- [ ] **Confirm**: No double-pointer patterns
- [ ] **Prefer**: References over raw pointers always

#### Rule 10: Compiler Warnings

- [ ] **Run**: `cargo clippy --workspace --all-targets -- -D warnings`
- [ ] **Verify**: Zero warnings in production builds
- [ ] **Check**: `cargo fmt --all --check` passes
- [ ] **Validate**: Clean compilation at highest warning levels
- [ ] **Ensure**: No `#[allow(warnings)]` in production code
- [ ] **Confirm**: Type conversion warnings resolved

### Aerospace Extensions Compliance

#### Memory Safety

- [ ] **Verify**: Bounded collections (`heapless`) used throughout
- [ ] **Check**: Stack usage predictable and documented
- [ ] **Validate**: No unbounded recursion or loops possible
- [ ] **Ensure**: Memory pools pre-allocated at startup
- [ ] **Confirm**: No memory leaks in long-running processes
- [ ] **Test**: Memory usage under stress conditions

#### Real-Time Constraints

- [ ] **Verify**: Functions have deterministic execution time
- [ ] **Check**: No blocking operations in critical paths
- [ ] **Validate**: Interrupt handlers minimal (if applicable)
- [ ] **Ensure**: Priority inversion scenarios avoided
- [ ] **Confirm**: Async operations properly bounded
- [ ] **Benchmark**: Performance meets requirements

#### Error Handling

- [ ] **Verify**: All error paths tested and documented
- [ ] **Check**: Graceful degradation implemented
- [ ] **Validate**: Critical failures trigger safe shutdown
- [ ] **Ensure**: Error states are logged and recoverable
- [ ] **Confirm**: No panic paths in production code
- [ ] **Test**: Fault injection scenarios

#### Documentation

- [ ] **Verify**: All public APIs have complete documentation
- [ ] **Check**: Safety-critical sections clearly marked
- [ ] **Validate**: Assumptions explicitly stated in comments
- [ ] **Ensure**: Performance characteristics documented
- [ ] **Confirm**: Error conditions documented
- [ ] **Update**: Documentation matches implementation

**GATE CHECKPOINT**: All compliance agents must report completion status

## Phase 2.5: PRE-Downstream Effects Analysis

### 2.5.1 Git-Based Impact Analysis (Sequential)

**Agent Assignment: IMPACT_ANALYSIS_AGENT_1**
**CRITICAL: Must complete before any changes are made**

#### Git Tooling for Impact Assessment

- [ ] **Create analysis branch**: `git checkout -b debug-impact-analysis-$(date +%s)`
- [ ] **Baseline commit**: `git add . && git commit -m "BASELINE: Pre-debug state"`
- [ ] **Generate dependency graph**: `cargo tree --workspace --format "{p} -> {d}"`
- [ ] **Map function call graph**: Use `cargo expand` for macro analysis
- [ ] **Document current state**: `git log --oneline -10` for recent changes context

#### Symbol Dependency Mapping

- [ ] **Extract symbols**: `rg --type rust "pub fn|pub struct|pub enum|pub trait" --line-number`
- [ ] **Find all callers**: For each function to be modified, run `rg "function_name\(" --type rust`
- [ ] **Map cross-crate usage**: `cargo tree --workspace --invert [crate-name]`
- [ ] **Identify FFI boundaries**: `rg "extern|unsafe" --type rust`
- [ ] **Document trait implementations**: `rg "impl.*for" --type rust`

#### Change Simulation Protocol

```bash
# For each planned change, create simulation commits
git checkout -b simulation-branch-[change-id]
# Make MINIMAL test change to target function signature/behavior
# Run full workspace analysis
cargo check --workspace 2>&1 | tee impact-log-[change-id].txt
cargo test --workspace --no-run 2>&1 | tee test-impact-[change-id].txt
git checkout debug-impact-analysis-[timestamp]
git branch -D simulation-branch-[change-id]
```

### 2.5.2 Ripple Effect Analysis

**Agent Assignment: RIPPLE_ANALYSIS_AGENT_1**

#### Compilation Dependency Chain

- [ ] **Run**: `cargo check --workspace --message-format=json | jq '.reason'`
- [ ] **Map build order**: Document which crates depend on target crates
- [ ] **Identify rebuild triggers**: Which changes force full workspace rebuilds
- [ ] **Performance impact zones**: Map hot path functions that could be affected

#### API Surface Analysis

- [ ] **Document public interfaces**: All `pub` items in target modules
- [ ] **Find external consumers**: `rg "use.*target_module" --type rust`
- [ ] **Macro usage tracking**: `rg "target_macro!" --type rust`
- [ ] **Feature flag dependencies**: `rg "#\[cfg\(" --type rust` in affected areas

#### Integration Point Mapping

```bash
# Create comprehensive integration map
echo "=== INTEGRATION POINTS ===" > integration-map.md
echo "## MAVLink Integration" >> integration-map.md
rg "mavlink" --type rust -A 2 -B 2 >> integration-map.md
echo "## ROS2 Integration" >> integration-map.md
rg "ros2" --type rust -A 2 -B 2 >> integration-map.md
echo "## GPS Integration" >> integration-map.md
rg "gps" --type rust -A 2 -B 2 >> integration-map.md
echo "## Core Message Bus" >> integration-map.md
rg "message_bus" --type rust -A 2 -B 2 >> integration-map.md
```

### 2.5.3 Historical Change Impact Analysis

**Agent Assignment: HISTORY_ANALYSIS_AGENT_1**

#### Git History Intelligence

- [ ] **Recent changes to target files**: `git log --oneline -20 -- [target-files]`
- [ ] **Identify change patterns**: `git log --stat --since="1 month ago" -- [target-files]`
- [ ] **Find related commits**: `git log --grep="[function-name|module-name]" --oneline`
- [ ] **Blame analysis**: `git blame [target-files]` to understand change frequency

#### Change Correlation Analysis

```bash
# Find files that commonly change together
git log --name-only --pretty=format: | sort | uniq -c | sort -nr > change-frequency.txt
# Identify coupling between modules
git log --name-only --pretty=format:"---" | awk '/---/{f=""}/\.rs/{f=f" "$0}END{print f}' > coupling-analysis.txt
```

### 2.5.4 Comprehensive Risk Assessment

**Agent Assignment: RISK_ASSESSMENT_AGENT_1**

#### Create Risk Matrix

```markdown
# Risk Assessment Matrix - [Timestamp]

## High-Risk Changes (Mission Critical)

| File   | Function | Risk Level | Downstream Count | Critical Path |
| ------ | -------- | ---------- | ---------------- | ------------- |
| [file] | [func]   | HIGH       | [count]          | ✅ YES        |

## Medium-Risk Changes (Performance Impact)

| File | Function | Risk Level | Downstream Count | Critical Path |
| ---- | -------- | ---------- | ---------------- | ------------- |

## Low-Risk Changes (Isolated)

| File | Function | Risk Level | Downstream Count | Critical Path |
| ---- | -------- | ---------- | ---------------- | ------------- |
```

#### Blast Radius Calculation

- [ ] **Direct dependencies**: Count immediate callers/users
- [ ] **Transitive dependencies**: Count all downstream effects
- [ ] **Cross-crate impact**: How many crates could be affected
- [ ] **Performance-critical paths**: Mission-critical 50Hz telemetry paths
- [ ] **Safety-critical paths**: Aerospace compliance violation potential

### 2.5.5 Change Strategy Optimization

**Agent Assignment: STRATEGY_AGENT_1**

#### Staged Implementation Plan

```bash
# Create staging branches for different risk levels
git checkout -b low-risk-changes
git checkout -b medium-risk-changes
git checkout -b high-risk-changes
git checkout debug-impact-analysis-[timestamp]
```

#### Change Ordering Protocol

- [ ] **Phase 1**: Isolated, low-risk changes first
- [ ] **Phase 2**: Medium-risk with comprehensive testing
- [ ] **Phase 3**: High-risk with rollback preparation
- [ ] **Validation Gates**: Full workspace build + test after each phase

#### Rollback Preparation

```bash
# Create rollback points
git tag debug-pre-low-risk
git tag debug-pre-medium-risk
git tag debug-pre-high-risk
# Document rollback commands
echo "git reset --hard debug-pre-[risk-level]" > rollback-instructions.txt
```

### 2.5.6 Impact Simulation Report

**MANDATORY DELIVERABLE:**

```markdown
# Downstream Effects Analysis - [Timestamp]

## Executive Summary

- Total files analyzed: [X]
- Direct dependencies found: [X]
- Transitive dependencies: [X]
- Cross-crate impacts: [X]
- Risk level distribution: [High/Medium/Low counts]

## Git Analysis Results

### Recent Change Patterns

[Summary of recent changes to target files]

### Coupling Analysis

[Files that commonly change together]

### Historical Risk Factors

[Previous issues when similar changes were made]

## Dependency Chain Analysis

### Direct Callers

[List all direct function callers with file:line]

### Transitive Effects

[Map of how changes could propagate through the system]

### Integration Point Impacts

[Analysis of MAVLink, ROS2, GPS, Core impacts]

## Risk Assessment Matrix

[Complete risk categorization with mitigation strategies]

## Recommended Change Strategy

### Phase 1: Low-Risk Changes

[List with validation requirements]

### Phase 2: Medium-Risk Changes

[List with testing requirements]

### Phase 3: High-Risk Changes

[List with extensive validation and rollback plans]

## Aerospace Compliance Impact

- NASA JPL Rule violations risk: [None/Low/Medium/High]
- Real-time performance impact: [None/Minimal/Significant]
- Safety-critical path effects: [None/Present]

## Validation Requirements

[Specific tests and checks needed for each change phase]

## Rollback Procedures

[Step-by-step rollback instructions for each phase]
```

**GATE CHECKPOINT**: Impact analysis complete with comprehensive risk assessment and staged implementation plan

## Phase 3: Debug Plan Creation

### 3.1 Strategic Planning (Wait for Phase 2 Completion)

**Agent Assignment: PLANNING_AGENT_1**

- [ ] **Create TodoWrite plan** with specific file assignments
- [ ] **Assign file ownership** to prevent overlap
- [ ] **Sequence operations** to avoid compilation conflicts
- [ ] **Define validation checkpoints** after each change
- [ ] **Plan rollback procedures** if issues arise

### 3.2 File Assignment Matrix

**CRITICAL: NO TWO AGENTS ON SAME FILE SIMULTANEOUSLY**

```
AGENT_ROLE | FILE_ASSIGNMENT | LOCK_TYPE | DEPENDENCIES
-----------|-----------------|-----------|-------------
FIX_AGENT_1 | src/module_a.rs | EXCLUSIVE | Wait for ANALYSIS_AGENT_1
FIX_AGENT_2 | src/module_b.rs | EXCLUSIVE | Wait for FIX_AGENT_1
TEST_AGENT_1 | tests/module_a_test.rs | EXCLUSIVE | Wait for FIX_AGENT_1
VALIDATE_AGENT_1 | ALL | READ_ONLY | Wait for all FIX_AGENTS
```

## Phase 4: Coherent Fix Implementation

### 4.1 Style-Matching Fix Application (Sequential by File)

**MANDATORY FOR EACH FIX AGENT - FOLLOW CLAUDE.md COHERENCE STANDARDS:**

#### Pre-Fix Analysis (Per CLAUDE.md Code Coherence Section)

- [ ] **Read target file completely** to understand local patterns
- [ ] **Verify CLAUDE.md naming conventions** (snake_case functions, PascalCase types, SCREAMING_SNAKE_CASE constants)
- [ ] **Confirm CLAUDE.md module organization** (lib.rs, error.rs, domain modules pattern)
- [ ] **Check CLAUDE.md error handling patterns** (OlympusError, Result propagation, aerospace-grade patterns)
- [ ] **Validate CLAUDE.md documentation style** (usage examples, safety considerations, performance characteristics)

#### Fix Implementation Requirements (CLAUDE.md Consistency Standards)

- [ ] **Match CLAUDE.md architectural coherence** (workspace structure consistency)
- [ ] **Follow CLAUDE.md naming conventions** (function, variable, type names per standards)
- [ ] **Use CLAUDE.md error types** (consistent traits: Error, Debug, Clone)
- [ ] **Maintain CLAUDE.md async patterns** (tokio runtime consistency, RAII patterns)
- [ ] **Preserve CLAUDE.md documentation standards** (public APIs with examples)
- [ ] **Keep CLAUDE.md import organization** (std, external, local order)

#### NASA JPL Compliance During Fix

- [ ] **Rule 1**: Maintain ≤10 cyclomatic complexity
- [ ] **Rule 2**: Use existing memory allocation patterns
- [ ] **Rule 3**: No recursive solutions introduced
- [ ] **Rule 4**: Keep functions ≤60 lines
- [ ] **Rule 5**: Add parameter validation matching existing style
- [ ] **Rule 6**: Use minimal scope matching patterns
- [ ] **Rule 7**: Handle return values consistently

### 4.2 Agent Synchronization Protocol

#### Before Starting Work

```bash
# Agent must announce intent
AGENT_STATUS: "FIX_AGENT_1 requesting exclusive lock on src/module_a.rs"
WAIT_FOR: Previous agent completion confirmation
ACQUIRE: Exclusive file lock
BEGIN: Only after lock confirmation
```

#### During Work

```bash
PROGRESS_UPDATE: Every 5 changes
STATUS_CHECK: Compilation state
CONFLICT_DETECTION: Monitor for other agent activity
IMMEDIATE_STOP: If compilation errors detected from other agents
```

#### After Completion

```bash
VALIDATION_RUN: cargo check --package [specific-crate]
RELEASE_LOCK: Only after successful validation
STATUS_REPORT: "FIX_AGENT_1 completed src/module_a.rs - READY for next agent"
```

## Phase 5: Progressive Validation

### 5.1 Per-File Validation (After Each Agent)

**Agent Assignment: VALIDATE*AGENT*[N]**

- [ ] **Run**: `cargo check --package [specific-crate]`
- [ ] **Verify**: No new warnings introduced
- [ ] **Check**: NASA JPL compliance maintained
- [ ] **Validate**: Code style consistency maintained
- [ ] **Test**: Affected unit tests still pass

### 5.2 Integration Validation (After All Fixes)

**Agent Assignment: INTEGRATION_AGENT_1**

- [ ] **Run**: `cargo build --workspace`
- [ ] **Check**: All crates compile cleanly
- [ ] **Verify**: No dependency conflicts introduced
- [ ] **Test**: Integration tests pass
- [ ] **Validate**: Performance requirements maintained

## Phase 6: Quality Assurance

### 6.1 Codebase Coherence Verification

**Agent Assignment: COHERENCE_AGENT_1**

- [ ] **Style Consistency**: All changes match existing patterns
- [ ] **Architecture Alignment**: Changes fit existing design
- [ ] **Error Handling Consistency**: Same patterns throughout
- [ ] **Testing Consistency**: Test style matches existing
- [ ] **Documentation Consistency**: Docs match existing style

### 6.2 Aerospace Compliance Final Check

**Agent Assignment: COMPLIANCE_AGENT_2**

- [ ] **All 10 NASA JPL Rules**: Verified maintained
- [ ] **Memory Safety**: No new allocation patterns
- [ ] **Real-time Constraints**: Performance not degraded
- [ ] **Error Handling**: Aerospace-grade error management
- [ ] **Documentation**: Safety-critical sections marked

## Phase 7: Completion Protocol

### 7.1 Final Validation Sequence

```bash
1. cargo fmt --all --check    # Style compliance
2. cargo clippy --workspace --all-targets -- -D warnings  # Code quality
3. cargo test --workspace     # Functionality
4. cargo build --workspace --release  # Production readiness
```

### 7.2 Debug Session Report

**MANDATORY DELIVERABLE:**

```markdown
# Debug Session Report - [Timestamp]

## Problem Summary

- Original issue: [Description]
- Root cause: [Analysis]
- Files affected: [List]

## Solution Summary

- Approach taken: [Methodology]
- Changes made: [List with file:line references]
- NASA JPL compliance: ✅ MAINTAINED

## Codebase Coherence Analysis

- Style consistency: ✅ MAINTAINED
- Architecture alignment: ✅ MAINTAINED
- Pattern consistency: ✅ MAINTAINED

## Agent Execution Report

[List each agent, files worked on, completion status]

## Validation Results

- Compilation: ✅ CLEAN
- Tests: ✅ PASSING
- Warnings: ✅ ZERO
- Compliance: ✅ AEROSPACE-GRADE

## Risk Assessment

- Breaking changes: [None/Minimal/Moderate]
- Performance impact: [None/Minimal/Improvement]
- Security implications: [None/Enhanced]
```

## Critical Safeguards

### Agent Orchestration Rules

1. **SEQUENTIAL PHASES**: No phase starts until previous completes
2. **EXCLUSIVE FILE LOCKS**: Only one agent per file at any time
3. **COMPILATION GATES**: Check compilation after each agent
4. **STATUS REPORTING**: Mandatory progress updates
5. **IMMEDIATE ABORT**: Stop all agents if corruption detected

### Style Coherence Mandates

1. **PATTERN MATCHING**: All changes must match existing code style
2. **CONVENTION ADHERENCE**: Follow established naming/organization
3. **ERROR STYLE CONSISTENCY**: Use same error handling patterns
4. **DOCUMENTATION STYLE**: Match existing doc comment style
5. **TESTING STYLE**: Follow established test patterns

### Quality Gates

1. **ZERO COMPILATION ERRORS**: Mandatory at each checkpoint
2. **ZERO WARNINGS**: No new warnings introduced
3. **NASA JPL COMPLIANCE**: All 10 rules maintained
4. **COHERENCE SCORE**: 10/10 required for completion
5. **AEROSPACE READINESS**: Production-grade code quality

**COMPLETION CRITERIA**: Debug session complete only when all agents report success, all validations pass, and codebase coherence score is 10/10.

## Phase 8: Cleanup & Artifact Management

### 8.1 Git Repository Cleanup

**Agent Assignment: CLEANUP_AGENT_1**

#### Temporary Branch Cleanup

```bash
# Remove all analysis branches
git branch -D debug-impact-analysis-* 2>/dev/null || true
git branch -D simulation-branch-* 2>/dev/null || true
git branch -D low-risk-changes 2>/dev/null || true
git branch -D medium-risk-changes 2>/dev/null || true
git branch -D high-risk-changes 2>/dev/null || true

# Clean up temporary tags (keep only final milestone tags)
git tag -d debug-pre-low-risk 2>/dev/null || true
git tag -d debug-pre-medium-risk 2>/dev/null || true
git tag -d debug-pre-high-risk 2>/dev/null || true

# Garbage collect to reclaim space
git gc --aggressive --prune=now
```

#### Analysis Artifact Cleanup

```bash
# Remove temporary analysis files
rm -f impact-log-*.txt
rm -f test-impact-*.txt
rm -f change-frequency.txt
rm -f coupling-analysis.txt
rm -f integration-map.md
rm -f rollback-instructions.txt

# Clean up cargo artifacts
cargo clean --package olympus-* 2>/dev/null || true
```

### 8.2 Selective Artifact Preservation

**Keep only valuable artifacts:**

#### Archive Important Analysis

```bash
# Create timestamped archive directory
ARCHIVE_DIR=".debug-archives/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$ARCHIVE_DIR"

# Preserve critical analysis (compress to save space)
if [ -f "audit-findings-*.md" ]; then
    gzip -c audit-findings-*.md > "$ARCHIVE_DIR/audit-findings.md.gz"
    rm audit-findings-*.md
fi

if [ -f "debug-session-report.md" ]; then
    gzip -c debug-session-report.md > "$ARCHIVE_DIR/debug-report.md.gz"
    rm debug-session-report.md
fi

# Compress and archive dependency analysis
if [ -f "downstream-effects-analysis.md" ]; then
    gzip -c downstream-effects-analysis.md > "$ARCHIVE_DIR/downstream-analysis.md.gz"
    rm downstream-effects-analysis.md
fi
```

### 8.3 Cargo Cache Management

**Agent Assignment: CACHE_CLEANUP_AGENT_1**

#### Target Directory Cleanup

```bash
# Remove specific target artifacts (keep release builds)
cargo clean --doc
cargo clean --package olympus-testing  # Clean test artifacts first
rm -rf target/debug/incremental/*      # Remove incremental compilation cache
rm -rf target/debug/deps/*             # Remove dependency artifacts
# Keep target/release/* for production use

# Clean registry cache if over 1GB
CACHE_SIZE=$(du -sh ~/.cargo/registry 2>/dev/null | cut -f1 | sed 's/[^0-9.]//g')
if [ $(echo "$CACHE_SIZE > 1.0" | bc 2>/dev/null || echo 0) -eq 1 ]; then
    cargo cache --autoclean
fi
```

### 8.4 System Resource Cleanup

**Agent Assignment: SYSTEM_CLEANUP_AGENT_1**

#### Memory & Disk Cleanup

```bash
# Clear system caches (Linux/WSL)
sync && echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true

# Clean up temporary files
rm -rf /tmp/debug-session-* 2>/dev/null || true
rm -rf /var/tmp/cargo-* 2>/dev/null || true

# Clear Rust analyzer cache if present
rm -rf ~/.cache/rust-analyzer 2>/dev/null || true
```

### 8.5 Automated Cleanup Schedule

**Configure automatic cleanup:**

#### Git Hooks for Cleanup

```bash
# Create post-debug cleanup hook
cat > .git/hooks/post-debug-cleanup << 'EOF'
#!/bin/bash
# Auto-cleanup after debug sessions
find . -name "debug-impact-analysis-*" -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null
find . -name "simulation-branch-*" -type d -mtime +3 -exec rm -rf {} \; 2>/dev/null
find . -name "*-impact-*.txt" -mtime +7 -delete 2>/dev/null
git gc --auto
EOF
chmod +x .git/hooks/post-debug-cleanup
```

### 8.6 Storage Impact Assessment

**Report cleanup effectiveness:**

#### Before/After Analysis

```bash
echo "=== CLEANUP EFFECTIVENESS REPORT ===" > cleanup-report.txt
echo "Timestamp: $(date)" >> cleanup-report.txt
echo "" >> cleanup-report.txt

# Calculate space reclaimed
du -sh .git >> cleanup-report.txt
du -sh target >> cleanup-report.txt
du -sh ~/.cargo/registry >> cleanup-report.txt
echo "" >> cleanup-report.txt

# Git repository size
echo "Git repo size: $(git count-objects -vH | grep size-pack | awk '{print $2}')" >> cleanup-report.txt
echo "Git objects count: $(git count-objects | awk '{print $1}')" >> cleanup-report.txt
```

### 8.7 Cleanup Configuration

**Add to CLAUDE.md for future reference:**

```markdown
## Debug Session Cleanup Protocol

After completing DB command, always run:

1. `git gc --aggressive --prune=now` - Reclaim Git space
2. `cargo clean --doc` - Remove documentation artifacts
3. `rm -rf target/debug/incremental` - Clear incremental cache
4. Archive important findings to `.debug-archives/`
5. Remove temporary analysis files (impact-\*.txt, etc.)

## Storage Limits

- Keep `.debug-archives/` under 100MB total
- Auto-clean debug branches older than 7 days
- Limit cargo registry cache to 1GB
- Git repository should not exceed 500MB
```

### 8.8 Emergency Cleanup Commands

**For immediate space recovery:**

```bash
# EMERGENCY: Aggressive cleanup (use only if disk space critical)
git clean -fdx                    # Remove ALL untracked files
cargo clean                       # Remove ALL build artifacts
rm -rf ~/.cargo/registry          # Remove ALL cargo cache
git gc --aggressive --prune=all   # Aggressive Git cleanup
```

### 8.9 Cleanup Validation

**Verify cleanup effectiveness:**

```bash
# Ensure no debug artifacts remain
find . -name "*debug-impact*" -o -name "*simulation-branch*" -o -name "*impact-log*"
# Should return empty

# Check Git repository size
git count-objects -vH

# Verify compilation still works
cargo check --workspace
```

**CLEANUP SUCCESS CRITERIA:**

- [ ] All temporary branches removed
- [ ] Analysis artifacts archived or deleted
- [ ] Git repository size reduced by >50%
- [ ] Target directory cleaned
- [ ] Cargo cache under 1GB
- [ ] System still compiles cleanly
- [ ] Important findings preserved in compressed archives

**FINAL STORAGE FOOTPRINT:** Debug session should add <10MB permanent storage (compressed archives only)
