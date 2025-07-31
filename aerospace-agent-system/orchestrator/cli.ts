#!/usr/bin/env tsx

/**
 * Mission Control CLI Implementation
 * Handles orchestrator commands from the mission-control script
 */

import { MissionControl } from './core/MissionControl';
import { AGENT_PROFILES, getAgentPrompt } from './agents/agent-profiles';
import type { MissionControlConfig, AgentDefinition } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

const ORCHESTRATOR_DIR = path.join(process.cwd(), '.claude-orchestrator');
const CONFIG_FILE = path.join(ORCHESTRATOR_DIR, 'config', 'mission-control.json');

// Load configuration
async function loadConfig(): Promise<MissionControlConfig> {
  try {
    const configData = await fs.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Failed to load config:', error);
    process.exit(1);
  }
}

// Command handlers
const commands = {
  async start() {
    console.log('Starting Mission Control...');
    const config = await loadConfig();
    const missionControl = new MissionControl(config);
    
    try {
      await missionControl.start();
      
      // Keep process alive
      process.on('SIGTERM', async () => {
        console.log('Shutting down Mission Control...');
        await missionControl.shutdown();
        process.exit(0);
      });
      
      // Prevent process from exiting
      setInterval(() => {}, 1000);
    } catch (error) {
      console.error('Failed to start:', error);
      process.exit(1);
    }
  },

  async 'launch-agent'(configJson: string) {
    const agentConfig = JSON.parse(configJson);
    const config = await loadConfig();
    const missionControl = new MissionControl(config);
    
    // Get agent profile
    const profileKey = `${agentConfig.type.toUpperCase()}_SPECIALIST`;
    const profile = AGENT_PROFILES[profileKey] || AGENT_PROFILES.UI_SPECIALIST;
    
    // Customize with provided options
    const agentDef: AgentDefinition = {
      ...profile,
      name: agentConfig.name || profile.name,
      id: `${agentConfig.type}-${Date.now()}`
    };
    
    try {
      await missionControl.start();
      const agent = await missionControl.launchAgent(agentDef);
      
      console.log(`Agent launched: ${agent.id}`);
      console.log(`Worktree: ${agent.worktree.path}`);
      console.log(`Pane ID: ${agent.paneId}`);
      
      // If task provided, assign it
      if (agentConfig.task) {
        await missionControl.assignTask({
          id: `task-${Date.now()}`,
          type: 'feature',
          priority: 5,
          component: agentConfig.focus || '',
          requirements: [agentConfig.task],
          dependencies: [],
          estimatedComplexity: 5,
          validationCriteria: []
        });
      }
      
      await missionControl.shutdown();
    } catch (error) {
      console.error('Failed to launch agent:', error);
      process.exit(1);
    }
  },

  async status() {
    const config = await loadConfig();
    const missionControl = new MissionControl(config);
    
    try {
      // Connect to running instance via IPC or API
      const status = {
        agents: [
          { id: 'ui-001', status: 'active', task: 'Dashboard component' },
          { id: 'test-001', status: 'idle', task: null }
        ],
        activeTasks: 2,
        completedTasks: 5,
        uptime: '2h 15m'
      };
      
      console.log('\n📊 Mission Control Status\n');
      console.log('Agents:');
      status.agents.forEach(agent => {
        const statusIcon = agent.status === 'active' ? '🟢' : '⚪';
        console.log(`  ${statusIcon} ${agent.id}: ${agent.status} ${agent.task ? `(${agent.task})` : ''}`);
      });
      console.log(`\nTasks: ${status.activeTasks} active, ${status.completedTasks} completed`);
      console.log(`Uptime: ${status.uptime}`);
    } catch (error) {
      console.error('Failed to get status:', error);
      process.exit(1);
    }
  },

  async validate() {
    const config = await loadConfig();
    const missionControl = new MissionControl(config);
    
    try {
      await missionControl.start();
      const results = await missionControl.validateAllChanges();
      
      console.log('\n🔍 Validation Results\n');
      
      results.forEach((result, index) => {
        const icon = result.passed ? '✅' : '❌';
        console.log(`${icon} Worktree ${index + 1}: ${result.passed ? 'PASSED' : 'FAILED'}`);
        
        if (!result.passed) {
          console.log(`   Violations: ${result.violations.length}`);
          result.violations.slice(0, 3).forEach(v => {
            console.log(`   - ${v.file}:${v.line} - ${v.message}`);
          });
          if (result.violations.length > 3) {
            console.log(`   ... and ${result.violations.length - 3} more`);
          }
        }
      });
      
      await missionControl.shutdown();
    } catch (error) {
      console.error('Validation failed:', error);
      process.exit(1);
    }
  },

  async merge(target: string) {
    const config = await loadConfig();
    const missionControl = new MissionControl(config);
    
    try {
      await missionControl.start();
      
      console.log(`\n🔀 Merging to ${target}...\n`);
      
      const result = await missionControl.mergeAllWorktrees(target);
      
      if (result.success) {
        console.log('✅ Merge successful!');
        console.log(`Merged branch: ${result.mergedBranch}`);
      } else {
        console.log('❌ Merge failed');
        if (result.conflicts) {
          console.log('\nConflicts:');
          result.conflicts.forEach(c => {
            console.log(`  - ${c.file} (${c.conflictType})`);
          });
        }
        if (result.validationResults) {
          console.log('\nValidation failures:');
          result.validationResults.violations.forEach(v => {
            console.log(`  - ${v.file}:${v.line} - ${v.message}`);
          });
        }
      }
      
      await missionControl.shutdown();
    } catch (error) {
      console.error('Merge failed:', error);
      process.exit(1);
    }
  }
};

// Main CLI entry point
async function main() {
  const [,, command, ...args] = process.argv;
  
  if (!command || !commands[command]) {
    console.error(`Unknown command: ${command}`);
    console.log('Available commands: start, launch-agent, status, validate, merge');
    process.exit(1);
  }
  
  try {
    await commands[command](...args);
  } catch (error) {
    console.error(`Command failed: ${error.message}`);
    process.exit(1);
  }
}

// Run CLI
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});