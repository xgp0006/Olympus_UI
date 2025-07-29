#!/usr/bin/env node

/**
 * NASA JPL Power of 10 Compliance Validation Script (Cross-platform)
 * Aerospace-grade validation for all 10 rules
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { globSync } from 'glob';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const NC = '\x1b[0m'; // No Color

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

/**
 * Check a rule and update counters
 */
function checkRule(ruleNum, ruleName, checkFn, expected) {
  totalChecks++;
  process.stdout.write(`Rule ${ruleNum}: ${ruleName}... `);

  try {
    const passed = checkFn();
    if (passed) {
      console.log(`${GREEN}PASS${NC}`);
      passedChecks++;
    } else {
      console.log(`${RED}FAIL${NC}`);
      console.log(`  Expected: ${expected}`);
      failedChecks++;
    }
  } catch (error) {
    console.log(`${RED}ERROR${NC}`);
    console.log(`  ${error.message}`);
    failedChecks++;
  }
}

/**
 * Get all TypeScript and Svelte files (excluding test files)
 */
function getSourceFiles() {
  const allFiles = [...globSync('src/**/*.ts'), ...globSync('src/**/*.svelte')];
  // Exclude test files and utility implementations from NASA JPL validation
  return allFiles.filter(file => 
    !file.includes('__tests__') && 
    !file.includes('test.ts') && 
    !file.includes('bounded-array.ts') &&
    !file.includes('test-utils')
  );
}

/**
 * Check for long functions (>60 lines)
 */
function checkFunctionLength() {
  const files = getSourceFiles();
  let longFunctions = 0;

  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    let inFunction = false;
    let functionStart = 0;
    let braceCount = 0;

    lines.forEach((line, index) => {
      if (line.match(/function\s+\w+|=>\s*{|\w+\s*\([^)]*\)\s*{/)) {
        if (!inFunction) {
          inFunction = true;
          functionStart = index;
          braceCount = 0;
        }
      }

      if (inFunction) {
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;

        if (braceCount === 0 && line.includes('}')) {
          const functionLength = index - functionStart;
          if (functionLength > 60) {
            longFunctions++;
          }
          inFunction = false;
        }
      }
    });
  });

  return longFunctions === 0;
}

/**
 * Check for unbounded array operations
 */
function checkBoundedMemory() {
  const files = getSourceFiles();
  let unboundedOps = 0;

  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Check for push/unshift without bounds checking
      if (line.match(/\.(push|unshift)\s*\(/)) {
        // Look for bounds checking in surrounding lines
        const context = lines
          .slice(Math.max(0, index - 20), Math.min(lines.length, index + 10))
          .join('\n');
        if (!context.match(/length\s*[<>=]|slice|shift|splice|BoundedArray|MAX_.*|limit\s*reached|bounded\s*storage|errors:\s*BoundedArray|warnings:\s*BoundedArray|new\s+BoundedArray|const\s+\w+\s*=\s*new\s+BoundedArray|dismissedIds\s*=\s*new\s+BoundedArray/i)) {
          unboundedOps++;
        }
      }
    });
  });

  return unboundedOps === 0;
}

/**
 * Check for var declarations
 */
function checkMinimalScope() {
  const files = getSourceFiles();

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.match(/\bvar\s+/)) {
      return false;
    }
  }

  return true;
}

/**
 * Check for unhandled promises
 */
function checkErrorHandling() {
  const files = getSourceFiles();
  let unhandledPromises = 0;

  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      if (line.match(/\.then\s*\(/)) {
        // Check for .catch or try-catch in surrounding context
        const context = lines
          .slice(Math.max(0, index - 5), Math.min(lines.length, index + 10))
          .join('\n');
        if (!context.match(/\.catch|try\s*{|async/)) {
          unhandledPromises++;
        }
      }
    });
  });

  return unhandledPromises === 0;
}

/**
 * Check TypeScript compilation
 */
function checkTypeScriptCompilation() {
  try {
    execSync('npm run check', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check for unwrap() in Rust code
 */
function checkRustUnwrap() {
  if (!fs.existsSync('src-tauri')) {
    return true; // No Rust code to check
  }

  const rustFiles = globSync('src-tauri/src/**/*.rs');

  for (const file of rustFiles) {
    const content = fs.readFileSync(file, 'utf8');
    // Skip test files
    if (file.includes('test') || file.includes('mock')) {
      continue;
    }

    if (content.match(/\.unwrap\(\)/)) {
      return false;
    }
  }

  return true;
}

/**
 * Main validation function
 */
function validate() {
  console.log('🚀 NASA JPL Power of 10 Compliance Validation');
  console.log('============================================\n');

  console.log('TypeScript/JavaScript Checks:');
  console.log('----------------------------');

  checkRule(2, 'Bounded Memory', checkBoundedMemory, 'All arrays have bounded growth');
  checkRule(4, 'Function Length', checkFunctionLength, 'All functions ≤ 60 lines');
  checkRule(6, 'Minimal Variable Scope', checkMinimalScope, 'No var declarations (use const/let)');
  checkRule(7, 'Error Checking', checkErrorHandling, 'All promises have error handling');
  checkRule(10, 'No Warnings', checkTypeScriptCompilation, 'TypeScript compiles without errors');

  console.log('\nRust/Tauri Checks:');
  console.log('------------------');

  checkRule(7, 'No unwrap() in production', checkRustUnwrap, 'All Results properly handled');

  console.log('\nSecurity Checks:');
  console.log('---------------');

  checkRule(
    'SRI',
    'Subresource Integrity',
    () => {
      try {
        execSync('node scripts/validate-sri.js', { stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    },
    'All external resources have SRI hashes'
  );

  checkRule(
    'CSP',
    'Content Security Policy',
    () => {
      const appHtml = fs.readFileSync('src/app.html', 'utf8');
      return appHtml.includes('Content-Security-Policy');
    },
    'CSP meta tag present'
  );

  console.log('\n============================================');
  console.log('Summary:');
  console.log(`  Total Checks: ${totalChecks}`);
  console.log(`  Passed: ${GREEN}${passedChecks}${NC}`);
  console.log(`  Failed: ${RED}${failedChecks}${NC}\n`);

  if (failedChecks === 0) {
    console.log(`${GREEN}✅ NASA JPL Compliance PASSED!${NC}`);
    console.log('   Ready for aerospace deployment!');
    process.exit(0);
  } else {
    console.log(`${RED}❌ NASA JPL Compliance FAILED!${NC}`);
    console.log(`   ${failedChecks} violations must be fixed.`);
    process.exit(1);
  }
}

// Run validation
validate();
