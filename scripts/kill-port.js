#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const PORT = 1420;

async function killPort(port) {
  try {
    // Windows command to find and kill process using the port
    if (process.platform === 'win32') {
      // Find the PID using the port
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];

        if (pid && pid !== '0') {
          console.log(`Killing process ${pid} using port ${port}...`);
          try {
            // Use Windows cmd to avoid Git bash path issues
            await execAsync(`cmd /c "taskkill /PID ${pid} /F"`);
            console.log(`Successfully killed process ${pid}`);
          } catch (error) {
            console.error(`Failed to kill process ${pid}:`, error.message);
          }
        }
      }
    } else {
      // Unix/Linux/Mac command
      try {
        await execAsync(`lsof -ti:${port} | xargs kill -9`);
        console.log(`Successfully killed process using port ${port}`);
      } catch (error) {
        // Port might not be in use
        console.log(`No process found using port ${port}`);
      }
    }
  } catch (error) {
    console.log(`No process found using port ${port}`);
  }
}

// Kill the port
killPort(PORT)
  .then(() => {
    console.log(`Port ${PORT} is now free`);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
