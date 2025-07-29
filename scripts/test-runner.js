#!/usr/bin/env node

/**
 * Test Runner Script
 * Provides enhanced test running capabilities with better reporting
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const isWatch = args.includes('--watch') || args.includes('-w');
const isCoverage = args.includes('--coverage') || args.includes('-c');
const isVerbose = args.includes('--verbose') || args.includes('-v');
const pattern = args.find((arg) => arg.startsWith('--pattern='))?.split('=')[1];

// Build vitest command
const vitestArgs = ['vitest'];

if (isWatch) {
  vitestArgs.push('--watch');
} else {
  vitestArgs.push('--run');
}

if (isCoverage) {
  vitestArgs.push('--coverage');
}

if (isVerbose) {
  vitestArgs.push('--reporter=verbose');
}

if (pattern) {
  vitestArgs.push(pattern);
}

// Add any remaining arguments
const remainingArgs = args.filter(
  (arg) =>
    !arg.startsWith('--watch') &&
    !arg.startsWith('-w') &&
    !arg.startsWith('--coverage') &&
    !arg.startsWith('-c') &&
    !arg.startsWith('--verbose') &&
    !arg.startsWith('-v') &&
    !arg.startsWith('--pattern=')
);

vitestArgs.push(...remainingArgs);

console.log('🧪 Running tests with command:', 'pnpm', vitestArgs.join(' '));
console.log('📁 Working directory:', projectRoot);
console.log('');

// Run vitest
const child = spawn('pnpm', vitestArgs, {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true
});

child.on('error', (error) => {
  console.error('❌ Failed to start test runner:', error);
  process.exit(1);
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('✅ All tests completed successfully');
  } else {
    console.log(`❌ Tests failed with exit code ${code}`);
  }
  process.exit(code);
});
