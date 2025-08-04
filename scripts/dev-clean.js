#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
import { platform } from 'os';

const PORT = 1420;

function killProcessOnPort(port) {
  try {
    if (platform() === 'win32') {
      // Windows: Find and kill processes using the port
      try {
        const netstatOutput = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
        const lines = netstatOutput.trim().split('\n');
        const pids = new Set();

        lines.forEach((line) => {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0') {
            pids.add(pid);
          }
        });

        pids.forEach((pid) => {
          try {
            execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
            console.log(`Killed process ${pid}`);
          } catch (e) {
            // Process might have already exited
          }
        });
      } catch (e) {
        // No process found on port
      }
    } else {
      // Unix/Linux/Mac
      try {
        execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
      } catch (e) {
        // No process found on port
      }
    }
  } catch (error) {
    // Ignore errors
  }
}

// Kill any existing processes on the port
console.log(`Ensuring port ${PORT} is free...`);
killProcessOnPort(PORT);

// Wait a moment for processes to terminate
setTimeout(() => {
  console.log('Starting Vite development server...');

  // Start vite dev server
  const vite = spawn('npx', ['vite', 'dev'], {
    stdio: 'inherit',
    shell: true
  });

  vite.on('error', (error) => {
    console.error('Failed to start Vite:', error);
    process.exit(1);
  });

  vite.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Vite exited with code ${code}`);
      process.exit(code);
    }
  });
}, 1000);
