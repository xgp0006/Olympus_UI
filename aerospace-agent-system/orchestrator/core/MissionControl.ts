/**
 * Mission Control Orchestrator
 * Central command for coordinating parallel Claude Code development
 */

import { EventEmitter } from 'events';
import type {
  MissionControlConfig,
  ClaudeAgent,
  DevelopmentTask,
  AgentDefinition,
  OrchestratorEvent,
  ValidationResult,
  MergeResult
} from '../types';
import { AgentManager } from '../agents/AgentManager';
import { WorktreeManager } from './WorktreeManager';
import { WezTermManager } from '../wezterm/WezTermManager';
import { ValidationOrchestrator } from '../validation/ValidationOrchestrator';
import { TaskScheduler } from './TaskScheduler';
import { CommunicationHub } from '../communication/CommunicationHub';
import { MetricsCollector } from './MetricsCollector';

export class MissionControl extends EventEmitter {
  private config: MissionControlConfig;
  private agentManager: AgentManager;
  private worktreeManager: WorktreeManager;
  private wezTermManager: WezTermManager;
  private validator: ValidationOrchestrator;
  private scheduler: TaskScheduler;
  private commHub: CommunicationHub;
  private metrics: MetricsCollector;
  private isRunning: boolean = false;

  constructor(config: MissionControlConfig) {
    super();
    this.config = config;
    this.initializeComponents();
  }

  private initializeComponents(): void {
    this.agentManager = new AgentManager(this.config);
    this.worktreeManager = new WorktreeManager(this.config.worktreeBasePath);
    this.wezTermManager = new WezTermManager();
    this.validator = new ValidationOrchestrator(this.config.validationStrategy);
    this.scheduler = new TaskScheduler();
    this.commHub = new CommunicationHub();
    this.metrics = new MetricsCollector();

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Agent lifecycle events
    this.agentManager.on('agent:started', (agent: ClaudeAgent) => {
      this.logEvent({
        type: 'agent-started',
        agentId: agent.id,
        payload: { agent }
      });
    });

    // Task completion events
    this.scheduler.on('task:completed', async (task: DevelopmentTask, agentId: string) => {
      await this.handleTaskCompletion(task, agentId);
    });

    // Validation events
    this.validator.on('validation:failed', (result: ValidationResult) => {
      this.handleValidationFailure(result);
    });
  }

  /**
   * Start the Mission Control system
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Mission Control is already running');
    }

    try {
      this.isRunning = true;

      // Initialize WezTerm layout
      await this.wezTermManager.initializeMissionControlLayout();

      // Start communication hub
      await this.commHub.start();

      // Initialize monitoring
      this.metrics.startCollection();

      this.emit('started');
      console.log('Mission Control started successfully');
    } catch (error) {
      this.isRunning = false;
      throw new Error(`Failed to start Mission Control: ${error.message}`);
    }
  }

  /**
   * Launch a new agent with specific capabilities
   */
  public async launchAgent(definition: AgentDefinition): Promise<ClaudeAgent> {
    // Create worktree for agent
    const worktree = await this.worktreeManager.createWorktree(
      `agent-${definition.id}`,
      `claude/${definition.name}`
    );

    // Create WezTerm pane
    const paneId = await this.wezTermManager.createAgentPane(definition.name, worktree.path);

    // Initialize agent
    const agent = await this.agentManager.createAgent(definition, worktree, paneId);

    // Register with communication hub
    await this.commHub.registerAgent(agent);

    return agent;
  }

  /**
   * Assign a task to the most suitable agent
   */
  public async assignTask(task: DevelopmentTask): Promise<void> {
    // Find best agent for task
    const agent = await this.scheduler.findBestAgent(task, this.agentManager.getActiveAgents());

    if (!agent) {
      throw new Error(`No suitable agent found for task ${task.id}`);
    }

    // Validate agent can handle task
    const canHandle = await this.validateAgentCapabilities(agent, task);
    if (!canHandle) {
      throw new Error(`Agent ${agent.id} cannot handle task ${task.id}`);
    }

    // Assign task
    await this.scheduler.assignTask(task, agent);

    // Send task to agent via communication hub
    await this.commHub.sendTaskToAgent(agent.id, task);
  }

  /**
   * Validate changes across all agents
   */
  public async validateAllChanges(): Promise<ValidationResult[]> {
    const agents = this.agentManager.getActiveAgents();
    const results: ValidationResult[] = [];

    for (const agent of agents) {
      const worktreeStatus = await this.worktreeManager.getStatus(agent.worktree.id);
      if (worktreeStatus.modifiedFiles.length > 0) {
        const result = await this.validator.validateWorktree(agent.worktree);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Merge all agent worktrees into target branch
   */
  public async mergeAllWorktrees(targetBranch: string): Promise<MergeResult> {
    // Validate all changes first
    const validationResults = await this.validateAllChanges();
    const allValid = validationResults.every((r) => r.passed);

    if (!allValid) {
      return {
        success: false,
        validationResults: validationResults.find((r) => !r.passed)
      };
    }

    // Get all agent worktrees
    const worktrees = this.agentManager.getActiveAgents().map((agent) => agent.worktree);

    // Perform merge
    return await this.worktreeManager.mergeWorktrees(
      worktrees,
      targetBranch,
      this.config.mergeStrategy
    );
  }

  /**
   * Handle task completion
   */
  private async handleTaskCompletion(task: DevelopmentTask, agentId: string): Promise<void> {
    // Run validation on agent's changes
    const agent = this.agentManager.getAgent(agentId);
    const validationResult = await this.validator.validateWorktree(agent.worktree);

    if (!validationResult.passed) {
      // Send fixes back to agent
      await this.commHub.sendValidationFeedback(agentId, validationResult);
      return;
    }

    // Update metrics
    this.metrics.recordTaskCompletion(agentId, task, true);

    // Check for dependent tasks
    const dependentTasks = this.scheduler.getDependentTasks(task.id);
    for (const depTask of dependentTasks) {
      await this.assignTask(depTask);
    }

    this.logEvent({
      type: 'task-completed',
      agentId,
      taskId: task.id,
      payload: { task, validationResult }
    });
  }

  /**
   * Handle validation failures
   */
  private handleValidationFailure(result: ValidationResult): void {
    this.logEvent({
      type: 'validation-failed',
      payload: { result },
      severity: 'error'
    });

    // Implement recovery strategy
    if (result.violations.some((v) => v.severity === 'error')) {
      // Critical failure - pause affected agents
      this.pauseAffectedAgents(result);
    }
  }

  /**
   * Validate agent capabilities against task requirements
   */
  private async validateAgentCapabilities(
    agent: ClaudeAgent,
    task: DevelopmentTask
  ): Promise<boolean> {
    // Check if agent type matches task type
    const typeMatch = this.matchAgentTypeToTask(agent.definition.type, task.type);
    if (!typeMatch) return false;

    // Check if agent has required capabilities
    const requiredCapabilities = this.getRequiredCapabilities(task);
    const hasCapabilities = requiredCapabilities.every((req) =>
      agent.definition.capabilities.some((cap) => cap.name === req && cap.proficiency >= 70)
    );

    return hasCapabilities;
  }

  /**
   * Match agent type to task type
   */
  private matchAgentTypeToTask(agentType: string, taskType: string): boolean {
    const mapping = {
      'ui-specialist': ['feature', 'bugfix', 'refactor'],
      'plugin-developer': ['feature', 'optimization'],
      'test-specialist': ['test', 'bugfix'],
      'integration-expert': ['feature', 'refactor'],
      validator: ['test', 'documentation']
    };

    return mapping[agentType]?.includes(taskType) || false;
  }

  /**
   * Get required capabilities for a task
   */
  private getRequiredCapabilities(task: DevelopmentTask): string[] {
    // Analyze task requirements and map to capabilities
    const capabilities: string[] = [];

    if (task.component.includes('ui')) {
      capabilities.push('svelte', 'typescript', 'tailwind');
    }
    if (task.component.includes('plugin')) {
      capabilities.push('plugin-architecture', 'typescript');
    }
    if (task.type === 'test') {
      capabilities.push('vitest', 'testing');
    }

    return capabilities;
  }

  /**
   * Pause agents affected by validation failure
   */
  private pauseAffectedAgents(result: ValidationResult): void {
    const affectedFiles = result.violations.map((v) => v.file);
    const agents = this.agentManager.getActiveAgents();

    agents.forEach((agent) => {
      const agentFiles = agent.worktree.status.modifiedFiles;
      const hasAffectedFiles = agentFiles.some((f) => affectedFiles.includes(f));

      if (hasAffectedFiles) {
        this.agentManager.pauseAgent(agent.id);
      }
    });
  }

  /**
   * Log orchestrator event
   */
  private logEvent(event: Partial<OrchestratorEvent>): void {
    const fullEvent: OrchestratorEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      severity: 'info',
      ...event
    } as OrchestratorEvent;

    this.emit('event', fullEvent);
    this.metrics.recordEvent(fullEvent);
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gracefully shutdown Mission Control
   */
  public async shutdown(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Stop all agents
      await this.agentManager.stopAllAgents();

      // Stop communication hub
      await this.commHub.stop();

      // Stop metrics collection
      this.metrics.stopCollection();

      // Clean up worktrees if configured
      if (this.config.cleanupOnShutdown) {
        await this.worktreeManager.cleanupAll();
      }

      this.isRunning = false;
      this.emit('shutdown');
      console.log('Mission Control shutdown complete');
    } catch (error) {
      console.error('Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Get current system status
   */
  public getStatus(): any {
    return {
      running: this.isRunning,
      agents: this.agentManager.getAgentStatuses(),
      activeTasks: this.scheduler.getActiveTasks(),
      metrics: this.metrics.getSummary(),
      uptime: this.metrics.getUptime()
    };
  }
}
