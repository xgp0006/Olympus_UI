# Agent Brief: Audit Validator (Background)

## Mission
Continuously monitor all agent code for NASA JPL compliance, performance regressions, and integration issues without blocking development.

## Performance Target
- **Frame Budget**: 0ms (runs async off main thread)
- **Validation Speed**: <100ms per file
- **Zero false positives**

## Technical Requirements

### Core Architecture
```typescript
// Runs as a separate process/worker
class AuditValidator {
  private fileWatcher: FSWatcher;
  private validationQueue: AsyncQueue<ValidationTask>;
  private performanceBaseline: PerformanceBaseline;
  private complianceEngine: NasaJplValidator;
  
  async start(): Promise<void> {
    // Watch all agent worktrees
    this.watchAgentFiles();
    
    // Start validation worker pool
    this.startValidationWorkers(4); // 4 parallel validators
    
    // Monitor performance metrics
    this.startPerformanceMonitoring();
  }
}
```

### Continuous Validation Pipeline
```typescript
interface ValidationPipeline {
  stages: [
    'syntax-check',
    'type-check', 
    'nasa-jpl-compliance',
    'performance-analysis',
    'integration-check',
    'security-scan'
  ];
  
  hooks: {
    preCommit: boolean;
    prePush: boolean;
    continuous: boolean;
  };
}

class ContinuousValidator {
  private async validateFile(file: string): Promise<ValidationResult> {
    const results: StageResult[] = [];
    
    // Run all stages in parallel where possible
    const [syntax, types, compliance] = await Promise.all([
      this.checkSyntax(file),
      this.checkTypes(file),
      this.checkCompliance(file)
    ]);
    
    // Performance check needs runtime data
    const performance = await this.checkPerformance(file);
    
    return this.aggregateResults(results);
  }
}
```

### NASA JPL Compliance Engine
```typescript
class EnhancedNasaJplValidator extends NasaJplValidator {
  // Additional aerospace-specific rules
  private additionalRules = [
    new MemoryAllocationRule(),
    new RealTimeConstraintRule(),
    new ErrorPropagationRule(),
    new NumericStabilityRule()
  ];
  
  async validateForAerospace(file: string): Promise<ComplianceReport> {
    const baseResults = await super.validateFile(file);
    
    // Check for 144fps specific patterns
    const performancePatterns = await this.checkPerformancePatterns(file);
    
    // Verify bounded memory in render loops
    const memoryPatterns = await this.checkMemoryPatterns(file);
    
    return {
      ...baseResults,
      aerospaceCompliance: {
        memoryBounded: memoryPatterns.valid,
        realTimeCapable: performancePatterns.valid,
        deterministicExecution: this.checkDeterminism(file)
      }
    };
  }
}
```

### Performance Regression Detection
```typescript
class PerformanceAnalyzer {
  private baseline: Map<string, PerformanceProfile> = new Map();
  
  async analyzePerformance(
    component: string,
    metrics: PerformanceMetrics
  ): Promise<PerformanceAnalysis> {
    const baseline = this.baseline.get(component);
    
    if (!baseline) {
      // First run, establish baseline
      this.baseline.set(component, metrics);
      return { regression: false };
    }
    
    // Check for regressions
    const regressions: Regression[] = [];
    
    if (metrics.frameTime.avg > baseline.frameTime.avg * 1.1) {
      regressions.push({
        type: 'frame-time',
        severity: 'warning',
        delta: metrics.frameTime.avg - baseline.frameTime.avg,
        message: `Frame time increased by ${Math.round((metrics.frameTime.avg / baseline.frameTime.avg - 1) * 100)}%`
      });
    }
    
    // Check memory usage
    if (metrics.memoryUsage > baseline.memoryUsage * 1.2) {
      regressions.push({
        type: 'memory',
        severity: 'error',
        delta: metrics.memoryUsage - baseline.memoryUsage,
        message: `Memory usage increased by ${Math.round((metrics.memoryUsage - baseline.memoryUsage) / 1048576)}MB`
      });
    }
    
    return {
      regression: regressions.length > 0,
      regressions,
      suggestion: this.generateOptimizationSuggestions(regressions)
    };
  }
}
```

### Integration Testing
```typescript
class IntegrationValidator {
  async checkIntegration(
    agent: string,
    changes: FileChange[]
  ): Promise<IntegrationResult> {
    // Check API contracts
    const apiCompatibility = await this.checkAPIContracts(changes);
    
    // Verify event bus usage
    const eventBusUsage = await this.checkEventBusPatterns(changes);
    
    // Check store modifications
    const storeIntegrity = await this.checkStoreIntegrity(changes);
    
    // Verify shared type usage
    const typeConsistency = await this.checkTypeConsistency(changes);
    
    return {
      compatible: apiCompatibility.valid && 
                  eventBusUsage.valid && 
                  storeIntegrity.valid &&
                  typeConsistency.valid,
      issues: [...apiCompatibility.issues, ...eventBusUsage.issues],
      suggestions: this.generateIntegrationSuggestions()
    };
  }
}
```

### Git Hook Integration
```bash
#!/bin/bash
# .claude-orchestrator/hooks/pre-commit

# Run audit validation
node .claude-orchestrator/audit-validator/validate-staged.js

if [ $? -ne 0 ]; then
  echo "❌ Validation failed. Fix issues before committing."
  exit 1
fi

echo "✅ All validations passed"
```

### Real-time Feedback System
```typescript
class ValidationFeedback {
  private websocket: WebSocket;
  
  async sendFeedback(
    agentId: string,
    validation: ValidationResult
  ): Promise<void> {
    if (!validation.passed) {
      // Send to agent's message queue
      await this.websocket.send(JSON.stringify({
        type: 'validation-feedback',
        agentId,
        severity: this.calculateSeverity(validation),
        violations: validation.violations,
        suggestions: validation.suggestions,
        autoFix: this.generateAutoFixes(validation)
      }));
    }
  }
  
  private generateAutoFixes(validation: ValidationResult): AutoFix[] {
    const fixes: AutoFix[] = [];
    
    for (const violation of validation.violations) {
      if (violation.fix) {
        fixes.push({
          file: violation.file,
          line: violation.line,
          original: violation.original,
          fixed: violation.fix,
          confidence: this.calculateConfidence(violation)
        });
      }
    }
    
    return fixes;
  }
}
```

### Monitoring Dashboard
```typescript
interface ValidationDashboard {
  agents: Map<string, AgentValidationStatus>;
  overallCompliance: number; // percentage
  performanceTrends: PerformanceTrend[];
  recentViolations: Violation[];
  
  criticalIssues: {
    count: number;
    items: CriticalIssue[];
  };
}

class DashboardUpdater {
  private dashboard: ValidationDashboard;
  
  updateDashboard(validation: ValidationResult): void {
    // Update real-time metrics
    this.dashboard.overallCompliance = this.calculateCompliance();
    
    // Track trends
    this.updateTrends(validation);
    
    // Broadcast to Mission Control UI
    this.broadcastUpdate();
  }
}
```

### Bypass Permissions Mode
```typescript
// Allow development to continue while validating
class NonBlockingValidator {
  private blockingEnabled = false; // Bypass by default
  
  async validate(file: string): Promise<void> {
    const result = await this.runValidation(file);
    
    if (!result.passed) {
      if (this.blockingEnabled) {
        throw new Error('Validation failed');
      } else {
        // Log but don't block
        console.warn(`Validation issues in ${file}:`, result);
        
        // Queue for background resolution
        this.queueForResolution(file, result);
      }
    }
  }
}
```

### Testing the Validator
```typescript
describe('AuditValidator', () => {
  test('detects NASA JPL violations');
  test('catches performance regressions');
  test('validates integration points');
  test('generates accurate auto-fixes');
  test('runs without blocking development');
});
```

### Deliverables
1. `AuditValidator.ts` - Main validation engine
2. `PerformanceAnalyzer.ts` - Regression detection
3. `IntegrationValidator.ts` - API contract checking
4. `ValidationFeedback.ts` - Real-time feedback
5. `git-hooks/` - Pre-commit/push hooks
6. `dashboard/` - Monitoring UI

Remember: Silent guardian of code quality. Every line validated, no development blocked.