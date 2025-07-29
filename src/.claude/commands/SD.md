# Sequential Development (SD) - Task Master Integration Command

**CRITICAL: Execute with ZERO errors, ZERO warnings, ZERO fake code, ABSOLUTE accuracy**

## Pre-Development Task Analysis

### Phase 0: Task Master Integration & Context
**MANDATORY BEFORE ANY DEVELOPMENT:**
- [ ] **Read CLAUDE.md COMPLETELY** - Focus on Code Coherence and Consistency section for architectural patterns, naming conventions, error handling consistency, testing patterns, and future-proofing strategies
- [ ] **Read design specifications**: `@".kiro/specs/olympus-cli-interconnectivity/design.md"`
- [ ] **Read system requirements**: `@".kiro/specs/olympus-cli-interconnectivity/requirements.md"`
- [ ] **Load Task Master context**: Use mcp__task-master-ai__get_task for current task details
- [ ] **Analyze task dependencies**: Check if other tasks must complete first
- [ ] **Map task scope**: Identify all files, modules, and integrations affected
- [ ] **Validate task readiness**: Ensure all prerequisites are met

### Phase 0.1: Agent Work Assignment Prevention
**CRITICAL: NO OVERLAPPING WORK ASSIGNMENTS**
```bash
# Create exclusive task lock file
echo "SD_AGENT_LOCK: $(date +%s) - Task $(TASK_ID)" > .task-locks/sd-lock-$(date +%s).txt
# Verify no other SD processes running
ps aux | grep -E "(SD|Sequential|Development)" | grep -v grep || echo "CLEAR TO PROCEED"
```

## Phase 1: Comprehensive Research & Intelligence

### 1.1 External Research (Sequential - Wait for Completion)
**Agent Assignment: RESEARCH_SPECIALIST_1**
**TASK SCOPE: Information gathering only - NO CODE IMPLEMENTATION**

#### Pre-Implementation Research
- [ ] **WebSearch**: Research aerospace-grade solutions for specific task requirements
- [ ] **WebFetch**: Gather official documentation and NASA JPL compliance standards
- [ ] **GitHub Search**: Find reference implementations and proven aerospace patterns
- [ ] **Context7**: Research library-specific best practices for task components
- [ ] **Task Master Research**: Use mcp__task-master-ai__research for task-specific intelligence

#### Research Documentation Requirements
```markdown
# Research Report - Task [ID]
## Task Scope Understanding
- Primary objective: [Clear task goal]
- Acceptance criteria: [Specific requirements]
- NASA JPL compliance requirements: [Applicable rules]

## External Intelligence
- Best practices found: [List with sources]
- Reference implementations: [GitHub links and analysis]
- Aerospace standards: [Relevant guidelines]
- Library documentation: [Context7 findings]

## Implementation Strategy
- Recommended approach: [Based on research]
- Aerospace compliance plan: [NASA JPL rule adherence]
- Risk factors identified: [Potential issues]
```

**GATE CHECKPOINT**: Research complete and documented before proceeding

### 1.2 Codebase Pattern Analysis (Wait for 1.1 Completion)
**Agent Assignment: PATTERN_ANALYSIS_SPECIALIST_1**
**TASK SCOPE: Analysis only - NO CODE CHANGES**

#### Existing Code Pattern Investigation
- [ ] **Scan target modules** for existing error handling patterns
- [ ] **Document function signatures** and return types in task scope
- [ ] **Identify testing patterns** used in similar code sections
- [ ] **Map integration points** that will be affected by task
- [ ] **Extract existing aerospace patterns** (memory management, real-time constraints)
- [ ] **Analyze codebase coherence patterns** from existing modules
- [ ] **Document architectural consistency** (module organization, naming conventions)
- [ ] **Map interconnectivity patterns** (MAVLink, ROS2, GPS, Core message bus integration)

#### Codebase Coherence Analysis
```rust
// Coherence Analysis Report - Task [ID]
/*
ARCHITECTURAL CONSISTENCY:
- Module organization: [Pattern found in crates/]
- Naming conventions: [snake_case, PascalCase patterns]
- Import organization: [std, external, local order]
- Error type consistency: [OlympusError, crate-specific errors]

INTERCONNECTIVITY PATTERNS:
- MAVLink integration: [Pattern from olympus-mavlink]
- ROS2 integration: [Pattern from olympus-ros2]
- GPS integration: [Pattern from olympus-gps]
- Core message bus: [Pattern from olympus-core]
- Plugin architecture: [Pattern from olympus-plugin]

AEROSPACE DESIGN CONSISTENCY:
- Real-time constraints: [50Hz telemetry patterns]
- Memory management: [heapless usage patterns]
- Error handling: [Result<T,E> propagation patterns]
- Configuration: [TOML/JSON patterns from existing code]
- Logging: [Structured logging patterns]

TESTING CONSISTENCY:
- Test organization: [tests/ vs src/ patterns]
- Mock patterns: [Testing doubles patterns]
- Integration test patterns: [Cross-crate testing]
- Benchmark patterns: [Performance testing]
*/
```

#### Pattern Documentation
```rust
// Pattern Analysis Report - Task [ID]
/*
EXISTING ERROR HANDLING PATTERN:
- Result<T, E> usage: [Pattern found]
- Error propagation: [Method used]
- Resource cleanup: [Pattern identified]

EXISTING MEMORY PATTERNS:
- Collection types: [heapless vs std]
- Allocation patterns: [Stack vs heap usage]
- Lifetime management: [Pattern found]

EXISTING FUNCTION ORGANIZATION:
- Naming conventions: [snake_case patterns]
- Parameter validation: [Assertion patterns]
- Return patterns: [Success/error handling]
*/
```

**GATE CHECKPOINT**: Pattern analysis complete and documented

## Phase 2: NASA JPL Compliance Pre-Validation

### 2.1 Pre-Implementation Compliance Planning
**Agent Assignment: COMPLIANCE_PLANNING_SPECIALIST_1**
**TASK SCOPE: Compliance verification only - NO CODE IMPLEMENTATION**

#### Complete NASA JPL Rule Analysis for Task

##### Rule 1: Cyclomatic Complexity (≤10 per function)
- [ ] **Plan**: Break task into functions with single responsibility
- [ ] **Design**: Minimize nested conditions (≤3 levels maximum)
- [ ] **Strategy**: Extract complex logic into helper functions
- [ ] **Validate**: Ensure early returns reduce nesting depth
- [ ] **Document**: Function complexity targets for each component

##### Rule 2: Dynamic Memory Allocation
- [ ] **Plan**: Use existing memory allocation patterns from codebase
- [ ] **Design**: Leverage `heapless` collections for bounded operations
- [ ] **Strategy**: Pre-allocate arrays with fixed sizes
- [ ] **Validate**: No `Box::new`, `Vec::new`, `HashMap::new` in hot paths
- [ ] **Document**: Memory usage patterns for task implementation

##### Rule 3: Recursion
- [ ] **Plan**: Design iterative solutions only
- [ ] **Design**: Explicit and finite loop bounds
- [ ] **Strategy**: Stack-based traversal for any tree structures
- [ ] **Validate**: Zero recursive function calls planned
- [ ] **Document**: Iteration patterns for complex operations

##### Rule 4: Function Length (≤60 lines)
- [ ] **Plan**: Decompose task into functions ≤60 lines each
- [ ] **Design**: Single responsibility principle for each function
- [ ] **Strategy**: Create helper functions for repeated logic
- [ ] **Validate**: Line count planning for each component
- [ ] **Document**: Function breakdown strategy

##### Rule 5: Assertions
- [ ] **Plan**: Parameter validation for all public functions
- [ ] **Design**: Return value verification strategy
- [ ] **Strategy**: Boundary condition checking approach
- [ ] **Validate**: Type assumption validation plan
- [ ] **Document**: Assertion placement strategy

##### Rule 6: Minimal Scope
- [ ] **Plan**: Variable declaration at point of use
- [ ] **Design**: Const usage for immutable values
- [ ] **Strategy**: Minimal scope variable management
- [ ] **Validate**: No broad-scope variables planned
- [ ] **Document**: Scope management strategy

##### Rule 7: Return Value Checking
- [ ] **Plan**: All function calls handle return values
- [ ] **Design**: No ignored `Result` types
- [ ] **Strategy**: Error condition handling approach
- [ ] **Validate**: Resource cleanup on failure paths
- [ ] **Document**: Error handling strategy

##### Rule 8: Preprocessor Use (Rust: Macros)
- [ ] **Plan**: Simple declarative macros only
- [ ] **Design**: No complex procedural macros
- [ ] **Strategy**: Replace macros with functions where possible
- [ ] **Validate**: Minimal conditional compilation
- [ ] **Document**: Macro usage justification

##### Rule 9: Pointer Use (Rust: References & Raw Pointers)
- [ ] **Plan**: Maximum one level of dereferencing
- [ ] **Design**: Slice indexing over pointer arithmetic
- [ ] **Strategy**: References over raw pointers always
- [ ] **Validate**: No double-pointer patterns
- [ ] **Document**: Reference usage strategy

##### Rule 10: Compiler Warnings
- [ ] **Plan**: Zero warnings target
- [ ] **Design**: Clean compilation strategy
- [ ] **Strategy**: No `#[allow(warnings)]` in production
- [ ] **Validate**: Clippy compliance planning
- [ ] **Document**: Warning prevention approach

**GATE CHECKPOINT**: NASA JPL compliance plan complete and documented

## Phase 3: Exclusive Implementation Planning

### 3.1 Sequential Agent Assignment Protocol
**Agent Assignment: IMPLEMENTATION_COORDINATOR_1**

#### File-Based Work Distribution
```bash
# Create file assignment matrix (NO OVERLAPS ALLOWED)
TASK_FILES=$(mcp__task-master-ai__get_task [TASK_ID] | grep -E '\.rs$' | sort)

# Assign exclusive ownership
AGENT_1_FILES="[List specific files]"  # Implementation Agent 1
AGENT_2_FILES="[List specific files]"  # Testing Agent 1  
AGENT_3_FILES="[List specific files]"  # Integration Agent 1

# Create file locks
for file in $AGENT_1_FILES; do
    echo "LOCKED: IMPLEMENTATION_AGENT_1 - $(date)" > .task-locks/$(basename $file).lock
done
```

#### Sequential Implementation Strategy
```markdown
# Implementation Sequence - Task [ID]

## Phase 3A: Core Implementation (IMPLEMENTATION_AGENT_1)
- Files: [Specific file list]
- Dependencies: Wait for Research completion
- Validation: Per-file compilation check
- Duration: Estimated completion time

## Phase 3B: Testing Implementation (TESTING_AGENT_1) 
- Files: [Test file list]
- Dependencies: Wait for Phase 3A completion
- Validation: Test compilation and execution
- Duration: Estimated completion time

## Phase 3C: Integration Validation (INTEGRATION_AGENT_1)
- Files: [Integration test files]
- Dependencies: Wait for Phase 3B completion
- Validation: Full workspace compilation
- Duration: Estimated completion time
```

### 3.2 Agent Synchronization Protocol

#### Pre-Work Checklist for Each Agent
```bash
# Before starting ANY implementation work
AGENT_CHECK() {
    # 1. Verify exclusive file access
    for file in $ASSIGNED_FILES; do
        if [ -f ".task-locks/$(basename $file).lock" ]; then
            lock_owner=$(cat ".task-locks/$(basename $file).lock" | cut -d' ' -f2)
            if [ "$lock_owner" != "$AGENT_ID" ]; then
                echo "ERROR: File $file locked by $lock_owner"
                exit 1
            fi
        fi
    done
    
    # 2. Verify previous phase completion
    if [ ! -f ".phase-completions/phase-$(($CURRENT_PHASE - 1)).complete" ]; then
        echo "ERROR: Previous phase not complete"
        exit 1
    fi
    
    # 3. Load research and compliance documentation
    source research-report-task-$TASK_ID.sh
    source compliance-plan-task-$TASK_ID.sh
}
```

## Phase 4: Accurate Implementation with Zero Errors

### 4.1 Implementation Agent Protocol
**Agent Assignment: IMPLEMENTATION_AGENT_1**
**EXCLUSIVE FILE ACCESS: Core implementation files only**

#### Pre-Implementation Validation
- [ ] **Load research findings**: All external intelligence gathered
- [ ] **Load pattern analysis**: Existing codebase patterns documented
- [ ] **Load compliance plan**: NASA JPL rule adherence strategy
- [ ] **Verify file locks**: Exclusive access to assigned files confirmed
- [ ] **Baseline test**: `cargo check --package [target-crate]` passes

#### Implementation Requirements (MANDATORY)
- [ ] **Match existing code style**: Follow exact patterns from pattern analysis
- [ ] **Maintain architectural coherence**: Follow interconnectivity design patterns
- [ ] **Implement NASA JPL compliance**: Follow every rule from compliance plan
- [ ] **Use researched approaches**: Apply intelligence from research phase
- [ ] **Validate each change**: `cargo check` after every function implementation
- [ ] **Document implementation**: Inline comments explaining aerospace requirements
- [ ] **Ensure codebase consistency**: Match naming, organization, and error handling patterns
- [ ] **Maintain interconnectivity**: Follow established MAVLink, ROS2, GPS, Core integration patterns

#### Codebase Coherence Enforcement (MANDATORY - Per CLAUDE.md)
```rust
// MANDATORY: Each implementation must maintain coherence per CLAUDE.md guidelines
fn enforce_codebase_coherence() -> Result<(), CoherenceError> {
    // Architectural consistency (CLAUDE.md Architectural Coherence section)
    assert!(follows_module_organization_pattern()); // lib.rs, error.rs, domain modules
    assert!(follows_naming_conventions()); // snake_case, PascalCase, SCREAMING_SNAKE_CASE
    assert!(follows_import_organization()); // std, external, local order
    
    // Interconnectivity consistency (CLAUDE.md Data Flow Consistency)
    assert!(follows_mavlink_integration_pattern()); // olympus-mavlink patterns
    assert!(follows_ros2_integration_pattern()); // olympus-ros2 patterns  
    assert!(follows_gps_integration_pattern()); // olympus-gps patterns
    assert!(follows_core_message_bus_pattern()); // universal event bus
    
    // Error handling consistency (CLAUDE.md Error Handling section)
    assert!(uses_consistent_error_types()); // OlympusError, crate-specific errors
    assert!(follows_result_propagation_pattern()); // aerospace-grade patterns
    
    // Testing consistency (CLAUDE.md Testing Consistency section)
    assert!(follows_test_organization_pattern()); // tests/ directory structure
    assert!(uses_consistent_mock_patterns()); // factory patterns
    
    // Documentation consistency (CLAUDE.md Documentation Standards)
    assert!(follows_documentation_style()); // usage examples, safety considerations
    assert!(includes_aerospace_safety_notes()); // performance characteristics
    
    Ok(())
}
```

#### Implementation Verification Per Function
```rust
// MANDATORY: Each function must pass this verification
fn verify_implementation_compliance() -> Result<(), ComplianceError> {
    // Rule 1: Cyclomatic complexity ≤10
    assert!(cyclomatic_complexity() <= 10);
    
    // Rule 4: Function length ≤60 lines
    assert!(line_count() <= 60);
    
    // Rule 5: All parameters validated
    assert!(all_parameters_validated());
    
    // Rule 7: All return values handled
    assert!(no_ignored_results());
    
    // Rule 10: No warnings
    assert!(cargo_clippy_clean());
    
    Ok(())
}
```

### 4.2 Testing Agent Protocol  
**Agent Assignment: TESTING_AGENT_1**
**EXCLUSIVE FILE ACCESS: Test files only**
**DEPENDENCY: Wait for IMPLEMENTATION_AGENT_1 completion**

#### Test Implementation Requirements
- [ ] **Wait for implementation completion**: Verify `.phase-completions/implementation.complete`
- [ ] **Load implementation details**: Review what was implemented
- [ ] **Create comprehensive tests**: Cover all aerospace requirements
- [ ] **Test NASA JPL compliance**: Verify each rule is satisfied
- [ ] **Test error conditions**: Aerospace-grade error handling validation

#### Test Categories (ALL REQUIRED)
```rust
#[cfg(test)]
mod aerospace_compliance_tests {
    // NASA JPL Rule compliance tests
    #[test] fn test_function_complexity() { /* verify ≤10 */ }
    #[test] fn test_no_dynamic_allocation() { /* verify heapless usage */ }
    #[test] fn test_no_recursion() { /* verify iterative solutions */ }
    #[test] fn test_function_length() { /* verify ≤60 lines */ }
    #[test] fn test_parameter_validation() { /* verify all params checked */ }
    #[test] fn test_minimal_scope() { /* verify variable scoping */ }
    #[test] fn test_return_value_checking() { /* verify all Results handled */ }
    
    // Aerospace-specific tests
    #[test] fn test_real_time_constraints() { /* verify performance */ }
    #[test] fn test_error_recovery() { /* verify graceful degradation */ }
    #[test] fn test_resource_cleanup() { /* verify no leaks */ }
}

#[cfg(test)]
mod codebase_coherence_tests {
    // Architectural coherence tests
    #[test] fn test_module_organization_consistency() { /* verify follows crate patterns */ }
    #[test] fn test_naming_convention_consistency() { /* verify snake_case, PascalCase */ }
    #[test] fn test_import_organization_consistency() { /* verify std, external, local order */ }
    #[test] fn test_error_type_consistency() { /* verify OlympusError usage */ }
    
    // Interconnectivity pattern tests
    #[test] fn test_mavlink_integration_pattern() { /* verify follows olympus-mavlink patterns */ }
    #[test] fn test_ros2_integration_pattern() { /* verify follows olympus-ros2 patterns */ }
    #[test] fn test_gps_integration_pattern() { /* verify follows olympus-gps patterns */ }
    #[test] fn test_core_message_bus_pattern() { /* verify follows olympus-core patterns */ }
    #[test] fn test_plugin_architecture_pattern() { /* verify follows olympus-plugin patterns */ }
    
    // Design specification compliance tests
    #[test] fn test_cli_interconnectivity_requirements() { /* verify .kiro/specs requirements */ }
    #[test] fn test_design_specification_compliance() { /* verify .kiro/specs design */ }
    #[test] fn test_system_integration_coherence() { /* verify multi-crate consistency */ }
}
```

### 4.3 Integration Agent Protocol
**Agent Assignment: INTEGRATION_AGENT_1** 
**EXCLUSIVE FILE ACCESS: Integration test files only**
**DEPENDENCY: Wait for TESTING_AGENT_1 completion**

#### Integration Validation Requirements
- [ ] **Wait for testing completion**: Verify `.phase-completions/testing.complete`
- [ ] **Full workspace compilation**: `cargo build --workspace`
- [ ] **All tests pass**: `cargo test --workspace`
- [ ] **Zero warnings**: `cargo clippy --workspace --all-targets -- -D warnings`
- [ ] **Aerospace compliance**: All NASA JPL rules verified across integration
- [ ] **Codebase coherence validation**: All coherence tests pass
- [ ] **Interconnectivity validation**: MAVLink, ROS2, GPS, Core integration verified
- [ ] **Design specification compliance**: .kiro/specs requirements satisfied
- [ ] **Performance validation**: Real-time constraints satisfied
- [ ] **Cross-crate consistency**: Multi-crate integration maintains patterns

## Phase 5: Task Master Integration & Validation

### 5.1 Task Completion Validation
**Agent Assignment: VALIDATION_AGENT_1**

#### Task Master Status Update
- [ ] **Update task status**: `mcp__task-master-ai__set_task_status [TASK_ID] "review"`
- [ ] **Document implementation**: `mcp__task-master-ai__update_task [TASK_ID] "Implementation complete with NASA JPL compliance"`
- [ ] **Add implementation details**: Document what was built and how
- [ ] **Link to aerospace standards**: Reference compliance verification

#### Final Validation Checklist
- [ ] **Zero compilation errors**: `cargo build --workspace` succeeds
- [ ] **Zero warnings**: `cargo clippy --workspace --all-targets -- -D warnings` clean
- [ ] **All tests pass**: `cargo test --workspace` success
- [ ] **NASA JPL compliance**: All 10 rules verified and documented
- [ ] **Codebase coherence**: All coherence tests pass and patterns maintained
- [ ] **Interconnectivity integrity**: MAVLink, ROS2, GPS, Core integration verified
- [ ] **Design specification compliance**: .kiro/specs requirements fully satisfied
- [ ] **Task requirements met**: All acceptance criteria satisfied
- [ ] **No fake code**: All implementations are real, tested, and functional
- [ ] **Integration verified**: Full system compilation and testing
- [ ] **Architectural consistency**: Module organization and naming conventions maintained
- [ ] **Future-proof coherence**: Code patterns support ongoing development consistency

## Phase 6: Cleanup & Lock Release

### 6.1 Agent Resource Cleanup
**Agent Assignment: CLEANUP_AGENT_1**

#### Release File Locks
```bash
# Release all file locks
for lock_file in .task-locks/*.lock; do
    if grep -q "$AGENT_ID" "$lock_file"; then
        rm "$lock_file"
    fi
done

# Mark task completion
echo "TASK_COMPLETE: $(date) - Task $TASK_ID" > .phase-completions/task-$TASK_ID.complete

# Update Task Master
mcp__task-master-ai__set_task_status $TASK_ID "done"
```

#### Cleanup Validation
- [ ] **All locks released**: No `.task-locks/*.lock` files remain for this task
- [ ] **Task marked complete**: Task Master status updated
- [ ] **Workspace clean**: No temporary files or artifacts
- [ ] **Compilation verified**: Final workspace build successful

## Critical Success Criteria

**TASK COMPLETION ONLY WHEN:**
- [ ] All NASA JPL Power of 10 rules verified and documented
- [ ] Zero compilation errors in workspace build
- [ ] Zero warnings from clippy analysis  
- [ ] All tests pass with aerospace-grade coverage
- [ ] **Codebase coherence maintained**: All architectural patterns followed
- [ ] **Interconnectivity integrity verified**: MAVLink, ROS2, GPS, Core integration consistent
- [ ] **Design specification compliance**: .kiro/specs requirements fully satisfied
- [ ] **Future development coherence**: Patterns established for ongoing consistency
- [ ] No fake or placeholder code anywhere
- [ ] Task Master integration complete with status updates
- [ ] All file locks properly managed and released
- [ ] Sequential agent execution with zero overlaps
- [ ] Implementation matches research and compliance planning
- [ ] Real-time aerospace constraints satisfied
- [ ] **Cross-crate consistency**: Multi-crate integration maintains established patterns
- [ ] **Architectural future-proofing**: Code supports coherent future development

**FINAL DELIVERABLE:** Fully functional, NASA JPL compliant code that satisfies all task requirements with zero errors, zero warnings, aerospace-grade reliability, and **perfect codebase coherence** that maintains architectural consistency and supports future development without breaking existing patterns.