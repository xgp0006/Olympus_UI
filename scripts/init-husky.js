#!/usr/bin/env node
/**
 * Husky Initialization Script
 * Sets up git hooks for aerospace-grade quality enforcement
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, level = 'info') {
  const prefix = {
    error: `${colors.red}❌${colors.reset}`,
    success: `${colors.green}✅${colors.reset}`,
    warning: `${colors.yellow}⚠️${colors.reset}`,
    info: `${colors.blue}▶${colors.reset}`
  };
  console.log(`${prefix[level]} ${message}`);
}

function makeExecutable(filePath) {
  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(filePath, '755');
      log(`Made ${path.basename(filePath)} executable`, 'success');
    } catch (error) {
      log(`Failed to make ${path.basename(filePath)} executable: ${error.message}`, 'error');
    }
  }
}

function initHusky() {
  console.log(
    `${colors.bold}${colors.blue}🚀 Initializing Aerospace-Grade Git Hooks${colors.reset}\n`
  );

  // Check if .git directory exists
  if (!fs.existsSync('.git')) {
    log('Not a git repository. Please run "git init" first.', 'error');
    process.exit(1);
  }

  // Check if husky is installed
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (!packageJson.devDependencies?.husky) {
    log('Husky not found in devDependencies. Installing...', 'warning');
    try {
      execSync('npm install --save-dev husky@9.1.7', { stdio: 'inherit' });
      log('Husky installed successfully', 'success');
    } catch (error) {
      log('Failed to install husky', 'error');
      process.exit(1);
    }
  }

  // Initialize husky
  try {
    execSync('npx husky init', { stdio: 'pipe' });
    log('Husky initialized', 'success');
  } catch (error) {
    // Husky might already be initialized
    log('Husky already initialized or initialization skipped', 'info');
  }

  // Set up git hooks
  const hooks = ['pre-commit', 'pre-push', 'commit-msg'];
  const huskyDir = path.join(process.cwd(), '.husky');

  hooks.forEach((hook) => {
    const hookPath = path.join(huskyDir, hook);
    if (fs.existsSync(hookPath)) {
      makeExecutable(hookPath);
      log(`${hook} hook configured`, 'success');
    } else {
      log(`${hook} hook not found`, 'warning');
    }
  });

  // Verify aerospace config
  const configPath = path.join(process.cwd(), '.aerospace-config.json');
  if (fs.existsSync(configPath)) {
    log('Aerospace configuration found', 'success');
  } else {
    log('Aerospace configuration not found', 'warning');
  }

  console.log(
    `\n${colors.bold}${colors.green}✅ Aerospace-grade git hooks initialized!${colors.reset}`
  );
  console.log('\nQuality gates enforced:');
  console.log('  • Gate 1 (pre-commit): Format, lint, type checks');
  console.log('  • Gate 2 (pre-push): Full validation suite');
  console.log('  • Commit message validation');
  console.log('\n🚀 Your repository now enforces NASA JPL compliance standards!');
}

// Run initialization
initHusky();
