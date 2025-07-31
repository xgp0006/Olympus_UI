/**
 * NASA JPL Power of 10 Compliant Orchestrator Types
 * Aerospace-grade type definitions for Mission Control system
 */

import { BoundedArray } from '../lib/utils/bounded-array.js';

export interface MissionControlConfig {
  maxAgents: number;
  worktreeBasePath: string;
  validationStrategy: ValidationStrategy;
  mergeStrategy: MergeStrategy;
  resourceLimits: ResourceLimits;
  cleanupOnShutdown?: boolean;
}

export interface AgentDefinition {
  id: string;
  name: string;
  type: AgentType;
  capabilities: BoundedArray<AgentCapability>;
  focusAreas: BoundedArray<string>;
  validationRules: BoundedArray<string>;
  resourceAllocation: ResourceAllocation;
}

export type AgentType = 
  | 'ui-specialist'
  | 'plugin-developer'
  | 'telemetry-engineer'
  | 'test-specialist'
  | 'integration-expert'
  | 'validator';

export interface AgentCapability {
  name: string;
  proficiency: number; // 0-100
  domains: BoundedArray<string>;
}

export interface ClaudeAgent {
  id: string;
  definition: AgentDefinition;
  worktree: GitWorktree;
  paneId: string;
  status: AgentStatus;
  currentTask?: DevelopmentTask;
  metrics: AgentMetrics;
}

export type AgentStatus = 
  | 'initializing'
  | 'idle'
  | 'analyzing'
  | 'developing'
  | 'testing'
  | 'validating'
  | 'merging'
  | 'error';

export interface DevelopmentTask {
  id: string;
  type: TaskType;
  priority: number;
  component: string;
  requirements: BoundedArray<string>;
  dependencies: BoundedArray<string>;
  estimatedComplexity: number;
  validationCriteria: BoundedArray<ValidationCriteria>;
  deadline?: Date;
}

export type TaskType = 
  | 'feature'
  | 'bugfix'
  | 'refactor'
  | 'test'
  | 'documentation'
  | 'optimization';

export interface GitWorktree {
  id: string;
  path: string;
  branch: string;
  baseBranch: string;
  status: WorktreeStatus;
  lastSync: Date;
}

export interface WorktreeStatus {
  clean: boolean;
  ahead: number;
  behind: number;
  conflicts: BoundedArray<string>;
  modifiedFiles: BoundedArray<string>;
}

export interface ValidationStrategy {
  preCommitChecks: BoundedArray<string>;
  continuousValidation: boolean;
  validationInterval: number;
  failureThreshold: number;
}

export interface MergeStrategy {
  type: 'octopus' | 'sequential' | 'rebase';
  conflictResolution: 'manual' | 'ai-assisted' | 'abort';
  testBeforeMerge: boolean;
  requireAllTestsPass: boolean;
}

export interface ResourceLimits {
  maxCpuPercent: number;
  maxMemoryMB: number;
  maxDiskIOMBps: number;
  maxNetworkMBps: number;
}

export interface ResourceAllocation {
  cpuWeight: number;
  memoryMB: number;
  priority: number;
}

export interface AgentMetrics {
  tasksCompleted: number;
  successRate: number;
  averageTaskTime: number;
  validationFailures: number;
  resourceUsage: ResourceUsage;
}

export interface ResourceUsage {
  cpuPercent: number;
  memoryMB: number;
  diskIOMBps: number;
}

export interface ValidationCriteria {
  type: 'test' | 'lint' | 'typecheck' | 'nasa-jpl' | 'custom';
  command: string;
  expectedResult: 'pass' | 'warn' | 'specific-output';
  timeout: number;
}

export interface OrchestratorEvent {
  id: string;
  timestamp: Date;
  type: EventType;
  agentId?: string;
  taskId?: string;
  payload: any;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export type EventType = 
  | 'agent-started'
  | 'agent-stopped'
  | 'task-assigned'
  | 'task-completed'
  | 'validation-failed'
  | 'merge-conflict'
  | 'resource-exceeded'
  | 'system-error';

export interface ValidationResult {
  passed: boolean;
  violations: BoundedArray<ComplianceViolation>;
  warnings: BoundedArray<string>;
  suggestions: BoundedArray<string>;
  metrics: ValidationMetrics;
}

export interface ComplianceViolation {
  rule: string;
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  message: string;
  fix?: string;
}

export interface ValidationMetrics {
  totalFiles: number;
  filesChecked: number;
  totalViolations: number;
  criticalViolations: number;
  executionTime: number;
}

export interface MergeResult {
  success: boolean;
  mergedBranch?: string;
  conflicts?: BoundedArray<ConflictInfo>;
  testResults?: BoundedArray<TestResult>;
  validationResults?: ValidationResult;
}

export interface ConflictInfo {
  file: string;
  conflictType: 'content' | 'rename' | 'delete';
  branches: string[];
  resolution?: string;
}

export interface TestResult {
  suite: string;
  passed: boolean;
  tests: number;
  failures: number;
  duration: number;
  coverage?: CoverageInfo;
}

export interface CoverageInfo {
  lines: number;
  branches: number;
  functions: number;
  statements: number;
}