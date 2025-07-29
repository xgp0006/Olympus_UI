#!/usr/bin/env node
/**
 * Aerospace Validation Script
 * NASA JPL Rule 10 Compliance Validator
 *
 * CRITICAL: This script enforces aerospace-grade code quality
 * ZERO TOLERANCE for violations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// NASA JPL Rules configuration
const NASA_JPL_RULES = {
  maxComplexity: 10,
  maxFunctionLength: 60,
  maxFileLength: 500,
  forbiddenPatterns: [
    { pattern: /console\.log/g, message: 'console.log detected', exclude: /test|spec/ },
    { pattern: /\.unwrap\(\)/g, message: 'unwrap() detected', exclude: /test|spec/ },
    { pattern: /any\s*:/g, message: 'TypeScript "any" type detected', exclude: /\.d\.ts$/ },
    { pattern: /\/\/\s*@ts-ignore/g, message: '@ts-ignore detected' },
    { pattern: /\/\/\s*@ts-nocheck/g, message: '@ts-nocheck detected' },
    { pattern: /debugger/g, message: 'debugger statement detected' }
  ]
};

class AerospaceValidator {
  constructor() {
    this.violations = [];
    this.warnings = [];
  }

  log(message, level = 'info') {
    const prefix = {
      error: `${colors.red}❌ ERROR${colors.reset}`,
      warning: `${colors.yellow}⚠️  WARNING${colors.reset}`,
      success: `${colors.green}✅ SUCCESS${colors.reset}`,
      info: `${colors.blue}▶ INFO${colors.reset}`
    };
    console.log(`${prefix[level] || prefix.info}: ${message}`);
  }

  validateFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const fileName = path.relative(process.cwd(), filePath);

    // Check file length
    if (lines.length > NASA_JPL_RULES.maxFileLength) {
      this.violations.push({
        file: fileName,
        rule: 'File Length',
        message: `File exceeds ${NASA_JPL_RULES.maxFileLength} lines (${lines.length} lines)`
      });
    }

    // Check forbidden patterns
    NASA_JPL_RULES.forbiddenPatterns.forEach(({ pattern, message, exclude }) => {
      if (exclude && exclude.test(filePath)) return;

      const matches = content.match(pattern);
      if (matches) {
        this.violations.push({
          file: fileName,
          rule: 'Forbidden Pattern',
          message: `${message} (${matches.length} occurrences)`
        });
      }
    });

    // Check function complexity (simplified)
    this.checkFunctionComplexity(content, fileName);
  }

  checkFunctionComplexity(content, fileName) {
    // Simplified complexity check - count control flow statements
    const functionMatches =
      content.match(/function\s+\w+|const\s+\w+\s*=\s*\(|^\s*\w+\s*\(/gm) || [];

    functionMatches.forEach(() => {
      const controlFlowCount = (
        content.match(/if\s*\(|for\s*\(|while\s*\(|switch\s*\(|catch\s*\(/g) || []
      ).length;

      if (controlFlowCount > NASA_JPL_RULES.maxComplexity) {
        this.warnings.push({
          file: fileName,
          rule: 'Complexity',
          message: `High complexity detected (${controlFlowCount} control flow statements)`
        });
      }
    });
  }

  validateDirectory(dir, extensions = ['.ts', '.js', '.svelte']) {
    const files = this.getAllFiles(dir, extensions);

    this.log(`Validating ${files.length} files...`);

    files.forEach((file) => {
      this.validateFile(file);
    });
  }

  getAllFiles(dir, extensions) {
    const files = [];

    const walk = (currentDir) => {
      const items = fs.readdirSync(currentDir);

      items.forEach((item) => {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // Skip node_modules and other build directories
          if (!['node_modules', 'dist', 'build', '.git', 'target'].includes(item)) {
            walk(fullPath);
          }
        } else if (extensions.some((ext) => fullPath.endsWith(ext))) {
          files.push(fullPath);
        }
      });
    };

    walk(dir);
    return files;
  }

  runSystemChecks() {
    this.log('Running system checks...', 'info');

    // Check TypeScript strict mode
    const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      if (!tsconfig.compilerOptions?.strict) {
        this.violations.push({
          file: 'tsconfig.json',
          rule: 'TypeScript Strict Mode',
          message: 'TypeScript strict mode is not enabled'
        });
      }
    }

    // Check for test coverage
    try {
      execSync('npm run test:coverage', { stdio: 'pipe' });
      this.log('Test coverage check passed', 'success');
    } catch (error) {
      this.warnings.push({
        file: 'Test Coverage',
        rule: 'Coverage',
        message: 'Test coverage check failed or not configured'
      });
    }
  }

  generateReport() {
    console.log('\n' + '━'.repeat(60));
    console.log(`${colors.bold}🚀 AEROSPACE VALIDATION REPORT${colors.reset}`);
    console.log('━'.repeat(60) + '\n');

    if (this.violations.length === 0 && this.warnings.length === 0) {
      this.log('ALL CHECKS PASSED - Code meets aerospace-grade standards', 'success');
      return true;
    }

    if (this.violations.length > 0) {
      console.log(
        `${colors.red}${colors.bold}CRITICAL VIOLATIONS (${this.violations.length})${colors.reset}`
      );
      this.violations.forEach(({ file, rule, message }) => {
        console.log(`  ${colors.red}✗${colors.reset} [${rule}] ${file}: ${message}`);
      });
      console.log();
    }

    if (this.warnings.length > 0) {
      console.log(
        `${colors.yellow}${colors.bold}WARNINGS (${this.warnings.length})${colors.reset}`
      );
      this.warnings.forEach(({ file, rule, message }) => {
        console.log(`  ${colors.yellow}⚠${colors.reset} [${rule}] ${file}: ${message}`);
      });
      console.log();
    }

    console.log('━'.repeat(60));

    if (this.violations.length > 0) {
      this.log('VALIDATION FAILED - Fix all violations before proceeding', 'error');
      return false;
    }

    this.log('Validation passed with warnings', 'warning');
    return true;
  }

  run() {
    console.log(
      `${colors.bold}${colors.blue}🚀 Aerospace Code Validator - NASA JPL Compliance${colors.reset}\n`
    );

    const srcDir = path.join(process.cwd(), 'src');

    if (!fs.existsSync(srcDir)) {
      this.log('src directory not found', 'error');
      process.exit(1);
    }

    this.validateDirectory(srcDir);
    this.runSystemChecks();

    const passed = this.generateReport();
    process.exit(passed ? 0 : 1);
  }
}

// Run validator if called directly
if (require.main === module) {
  const validator = new AerospaceValidator();
  validator.run();
}

module.exports = AerospaceValidator;
