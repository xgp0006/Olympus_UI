#!/usr/bin/env node

/**
 * Mission Control CLI
 * Command-line interface for managing the Claude orchestrator
 */

const { program } = require('commander');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const chalk = require('chalk');

// Configuration
const ORCHESTRATOR_DIR = path.join(process.cwd(), '.claude-orchestrator');
const CONFIG_FILE = path.join(ORCHESTRATOR_DIR, 'config', 'mission-control.json');

// Ensure orchestrator directory exists
async function ensureOrchestratorDir() {
  await fs.mkdir(ORCHESTRATOR_DIR, { recursive: true });
  await fs.mkdir(path.join(ORCHESTRATOR_DIR, 'config'), { recursive: true });
  await fs.mkdir(path.join(ORCHESTRATOR_DIR, 'worktrees'), { recursive: true });
  await fs.mkdir(path.join(ORCHESTRATOR_DIR, 'logs'), { recursive: true });
}

// Load configuration
async function loadConfig() {
  try {
    const config = await fs.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(config);
  } catch (error) {
    // Return default config if not found
    return {
      maxAgents: 6,
      worktreeBasePath: path.join(ORCHESTRATOR_DIR, 'worktrees'),
      validationStrategy: {
        preCommitChecks: ['npm run check', 'npm run lint'],
        continuousValidation: true,
        validationInterval: 300000, // 5 minutes
        failureThreshold: 3
      },
      mergeStrategy: {
        type: 'sequential',
        conflictResolution: 'ai-assisted',
        testBeforeMerge: true,
        requireAllTestsPass: true
      },
      resourceLimits: {
        maxCpuPercent: 80,
        maxMemoryMB: 8192,
        maxDiskIOMBps: 100,
        maxNetworkMBps: 50
      }
    };
  }
}

// Save configuration
async function saveConfig(config) {
  await ensureOrchestratorDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Start Mission Control
async function startMissionControl() {
  console.log(chalk.blue('🚀 Starting Mission Control...'));

  await ensureOrchestratorDir();
  const config = await loadConfig();

  // Check if already running
  try {
    const pidFile = path.join(ORCHESTRATOR_DIR, 'mission-control.pid');
    const pid = await fs.readFile(pidFile, 'utf-8');

    if (process.kill(pid, 0)) {
      console.log(chalk.yellow('⚠️  Mission Control is already running'));
      return;
    }
  } catch (error) {
    // Not running, continue
  }

  // Start the orchestrator
  const orchestratorPath = path.join(__dirname, '..', '..', 'src', 'orchestrator', 'cli.ts');
  const child = spawn('npx', ['tsx', orchestratorPath, 'start'], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // Save PID
  await fs.writeFile(path.join(ORCHESTRATOR_DIR, 'mission-control.pid'), child.pid.toString());

  child.stdout.on('data', (data) => {
    console.log(chalk.green(`[MC] ${data.toString().trim()}`));
  });

  child.stderr.on('data', (data) => {
    console.error(chalk.red(`[MC] ${data.toString().trim()}`));
  });

  child.unref();

  console.log(chalk.green('✅ Mission Control started successfully'));
  console.log(chalk.gray(`PID: ${child.pid}`));
  console.log(chalk.gray(`Logs: ${path.join(ORCHESTRATOR_DIR, 'logs')}`));
}

// Stop Mission Control
async function stopMissionControl() {
  console.log(chalk.blue('🛑 Stopping Mission Control...'));

  try {
    const pidFile = path.join(ORCHESTRATOR_DIR, 'mission-control.pid');
    const pid = await fs.readFile(pidFile, 'utf-8');

    process.kill(pid, 'SIGTERM');
    await fs.unlink(pidFile);

    console.log(chalk.green('✅ Mission Control stopped'));
  } catch (error) {
    console.log(chalk.yellow('⚠️  Mission Control is not running'));
  }
}

// Launch an agent
async function launchAgent(type, options) {
  const validTypes = ['ui', 'plugin', 'telemetry', 'test', 'integration', 'validator'];

  if (!validTypes.includes(type)) {
    console.error(chalk.red(`Invalid agent type: ${type}`));
    console.log(chalk.gray(`Valid types: ${validTypes.join(', ')}`));
    return;
  }

  console.log(chalk.blue(`🤖 Launching ${type} agent...`));

  // Create agent configuration
  const agentConfig = {
    type,
    name: options.name || `${type}-agent-${Date.now()}`,
    task: options.task,
    focus: options.focus
  };

  // Send launch command to Mission Control
  const orchestratorPath = path.join(__dirname, '..', '..', 'src', 'orchestrator', 'cli.ts');
  const child = spawn('npx', [
    'tsx',
    orchestratorPath,
    'launch-agent',
    JSON.stringify(agentConfig)
  ]);

  child.stdout.on('data', (data) => {
    console.log(data.toString().trim());
  });

  child.stderr.on('data', (data) => {
    console.error(chalk.red(data.toString().trim()));
  });

  child.on('close', (code) => {
    if (code === 0) {
      console.log(chalk.green(`✅ ${type} agent launched successfully`));
    } else {
      console.error(chalk.red(`❌ Failed to launch ${type} agent`));
    }
  });
}

// Show status
async function showStatus() {
  console.log(chalk.blue('📊 Mission Control Status'));

  try {
    const pidFile = path.join(ORCHESTRATOR_DIR, 'mission-control.pid');
    const pid = await fs.readFile(pidFile, 'utf-8');

    if (process.kill(pid, 0)) {
      console.log(chalk.green('✅ Mission Control is running'));
      console.log(chalk.gray(`PID: ${pid}`));

      // Get detailed status from Mission Control
      const orchestratorPath = path.join(__dirname, '..', '..', 'src', 'orchestrator', 'cli.ts');
      const child = spawn('npx', ['tsx', orchestratorPath, 'status'], {
        stdio: 'inherit'
      });

      await new Promise((resolve) => {
        child.on('close', resolve);
      });
    }
  } catch (error) {
    console.log(chalk.yellow('⚠️  Mission Control is not running'));
  }
}

// Validate all worktrees
async function validateAll() {
  console.log(chalk.blue('🔍 Validating all worktrees...'));

  const orchestratorPath = path.join(__dirname, '..', '..', 'src', 'orchestrator', 'cli.ts');
  const child = spawn('npx', ['tsx', orchestratorPath, 'validate'], {
    stdio: 'inherit'
  });

  await new Promise((resolve) => {
    child.on('close', resolve);
  });
}

// Merge worktrees
async function mergeWorktrees(target) {
  console.log(chalk.blue(`🔀 Merging worktrees to ${target}...`));

  const orchestratorPath = path.join(__dirname, '..', '..', 'src', 'orchestrator', 'cli.ts');
  const child = spawn('npx', ['tsx', orchestratorPath, 'merge', target], {
    stdio: 'inherit'
  });

  await new Promise((resolve) => {
    child.on('close', resolve);
  });
}

// Configure Mission Control
async function configure(key, value) {
  const config = await loadConfig();

  // Parse nested keys
  const keys = key.split('.');
  let obj = config;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!obj[keys[i]]) {
      obj[keys[i]] = {};
    }
    obj = obj[keys[i]];
  }

  // Parse value
  let parsedValue = value;
  if (value === 'true') parsedValue = true;
  else if (value === 'false') parsedValue = false;
  else if (!isNaN(value)) parsedValue = Number(value);

  obj[keys[keys.length - 1]] = parsedValue;

  await saveConfig(config);
  console.log(chalk.green(`✅ Configuration updated: ${key} = ${parsedValue}`));
}

// CLI setup
program
  .name('mission-control')
  .description('Mission Control - Orchestrate parallel Claude Code development')
  .version('1.0.0');

program
  .command('start')
  .description('Start Mission Control orchestrator')
  .action(startMissionControl);

program.command('stop').description('Stop Mission Control orchestrator').action(stopMissionControl);

program.command('status').description('Show Mission Control status').action(showStatus);

program
  .command('launch <type>')
  .description('Launch a specialized agent')
  .option('-n, --name <name>', 'Agent name')
  .option('-t, --task <task>', 'Initial task for agent')
  .option('-f, --focus <focus>', 'Focus area for agent')
  .action(launchAgent);

program.command('validate').description('Validate all agent worktrees').action(validateAll);

program
  .command('merge <target>')
  .description('Merge all worktrees to target branch')
  .action(mergeWorktrees);

program
  .command('config <key> <value>')
  .description('Configure Mission Control settings')
  .action(configure);

// Error handling
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('Error:'), error);
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);
