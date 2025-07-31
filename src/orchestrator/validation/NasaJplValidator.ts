/**
 * NASA JPL Power of 10 Compliance Validator
 * Ensures aerospace-grade code quality standards
 */

import * as ts from 'typescript';
import { readFileSync } from 'fs';
import type { ComplianceViolation, ValidationResult } from '../types';

export interface NasaJplRule {
  id: string;
  name: string;
  description: string;
  validate(sourceFile: ts.SourceFile): ComplianceViolation[];
}

export class NasaJplValidator {
  private rules: NasaJplRule[] = [
    new SimpleControlFlowRule(),
    new LoopBoundRule(),
    new RecursionDepthRule(),
    new HeapMemoryRule(),
    new FunctionLengthRule(),
    new AssertionDensityRule(),
    new DataDeclarationRule(),
    new PreprocessorRule(),
    new PointerRule(),
    new CompilerWarningRule()
  ];

  /**
   * Validate a TypeScript file for NASA JPL compliance
   */
  public async validateFile(filePath: string): Promise<ValidationResult> {
    try {
      const sourceCode = readFileSync(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const violations: ComplianceViolation[] = [];
      
      for (const rule of this.rules) {
        const ruleViolations = rule.validate(sourceFile);
        violations.push(...ruleViolations);
      }

      return {
        passed: violations.length === 0,
        violations,
        warnings: this.generateWarnings(violations),
        suggestions: this.generateSuggestions(violations),
        metrics: {
          totalFiles: 1,
          filesChecked: 1,
          totalViolations: violations.length,
          criticalViolations: violations.filter(v => v.severity === 'error').length,
          executionTime: 0
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to validate file ${filePath}: ${errorMessage}`);
    }
  }

  private generateWarnings(violations: ComplianceViolation[]): string[] {
    const warnings: string[] = [];
    
    if (violations.some(v => v.rule === 'loop-bounds')) {
      warnings.push('Unbounded loops detected - potential infinite execution risk');
    }
    
    if (violations.some(v => v.rule === 'recursion-depth')) {
      warnings.push('Deep recursion detected - stack overflow risk');
    }

    return warnings;
  }

  private generateSuggestions(violations: ComplianceViolation[]): string[] {
    const suggestions: string[] = [];
    
    if (violations.length > 10) {
      suggestions.push('Consider breaking down complex functions into smaller units');
    }
    
    if (violations.some(v => v.rule === 'function-length')) {
      suggestions.push('Extract helper functions to reduce function complexity');
    }

    return suggestions;
  }
}

/**
 * Rule 1: Restrict to simple control flow constructs
 */
class SimpleControlFlowRule implements NasaJplRule {
  id = 'simple-control-flow';
  name = 'Simple Control Flow';
  description = 'Do not use goto, setjmp, longjmp, or recursion';

  validate(sourceFile: ts.SourceFile): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    
    const checkNode = (node: ts.Node) => {
      // Check for restricted control flow
      if (ts.isIdentifier(node) && node.text === 'goto') {
        violations.push(this.createViolation(node, 'goto statement detected'));
      }
      
      ts.forEachChild(node, checkNode);
    };
    
    checkNode(sourceFile);
    return violations;
  }

  private createViolation(node: ts.Node, message: string): ComplianceViolation {
    const { line, character } = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
    return {
      rule: this.id,
      file: node.getSourceFile().fileName,
      line: line + 1,
      column: character + 1,
      severity: 'error',
      message
    };
  }
}

/**
 * Rule 2: All loops must have fixed upper bounds
 */
class LoopBoundRule implements NasaJplRule {
  id = 'loop-bounds';
  name = 'Fixed Loop Bounds';
  description = 'All loops must have a fixed upper-bound';

  validate(sourceFile: ts.SourceFile): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    
    const checkNode = (node: ts.Node) => {
      if (ts.isWhileStatement(node)) {
        if (!this.hasFixedBound(node)) {
          violations.push(this.createViolation(node, 'While loop without fixed upper bound'));
        }
      }
      
      if (ts.isForStatement(node)) {
        if (!this.hasFixedForBound(node)) {
          violations.push(this.createViolation(node, 'For loop without fixed upper bound'));
        }
      }
      
      ts.forEachChild(node, checkNode);
    };
    
    checkNode(sourceFile);
    return violations;
  }

  private hasFixedBound(node: ts.WhileStatement): boolean {
    // Check for counter variable that limits iterations
    // This is a simplified check - real implementation would be more sophisticated
    const condition = node.expression;
    
    if (ts.isBinaryExpression(condition)) {
      const operator = condition.operatorToken.kind;
      return operator === ts.SyntaxKind.LessThanToken ||
             operator === ts.SyntaxKind.LessThanEqualsToken;
    }
    
    return false;
  }

  private hasFixedForBound(node: ts.ForStatement): boolean {
    if (!node.condition) return false;
    
    if (ts.isBinaryExpression(node.condition)) {
      const operator = node.condition.operatorToken.kind;
      const right = node.condition.right;
      
      // Check if comparing against a literal or const
      return (operator === ts.SyntaxKind.LessThanToken ||
              operator === ts.SyntaxKind.LessThanEqualsToken) &&
             (ts.isNumericLiteral(right) || ts.isIdentifier(right));
    }
    
    return false;
  }

  private createViolation(node: ts.Node, message: string): ComplianceViolation {
    const { line, character } = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
    return {
      rule: this.id,
      file: node.getSourceFile().fileName,
      line: line + 1,
      column: character + 1,
      severity: 'error',
      message
    };
  }
}

/**
 * Rule 3: Do not use dynamic memory allocation after initialization
 */
class HeapMemoryRule implements NasaJplRule {
  id = 'heap-memory';
  name = 'No Dynamic Memory';
  description = 'Do not use dynamic memory allocation after initialization';

  validate(sourceFile: ts.SourceFile): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    let inInitializer = false;
    
    const checkNode = (node: ts.Node) => {
      // Check if we're in a constructor or module initializer
      if (ts.isConstructorDeclaration(node) || ts.isSourceFile(node)) {
        inInitializer = true;
      }
      
      // Check for dynamic allocations
      if (ts.isNewExpression(node) && !inInitializer) {
        // Allow certain safe allocations (like creating error objects)
        const type = node.expression;
        if (ts.isIdentifier(type) && !this.isSafeAllocation(type.text)) {
          violations.push(this.createViolation(node, 'Dynamic memory allocation outside initialization'));
        }
      }
      
      ts.forEachChild(node, checkNode);
      
      if (ts.isConstructorDeclaration(node)) {
        inInitializer = false;
      }
    };
    
    checkNode(sourceFile);
    return violations;
  }

  private isSafeAllocation(typeName: string): boolean {
    const safeTypes = ['Error', 'Date', 'RegExp'];
    return safeTypes.includes(typeName);
  }

  private createViolation(node: ts.Node, message: string): ComplianceViolation {
    const { line, character } = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
    return {
      rule: this.id,
      file: node.getSourceFile().fileName,
      line: line + 1,
      column: character + 1,
      severity: 'error',
      message
    };
  }
}

/**
 * Rule 4: No function should be longer than 60 lines
 */
class FunctionLengthRule implements NasaJplRule {
  id = 'function-length';
  name = 'Function Length Limit';
  description = 'No function should be longer than 60 lines';
  
  private maxLines = 60;

  validate(sourceFile: ts.SourceFile): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    
    const checkNode = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) || 
          ts.isMethodDeclaration(node) || 
          ts.isArrowFunction(node)) {
        
        const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        const lineCount = end.line - start.line + 1;
        
        if (lineCount > this.maxLines) {
          violations.push({
            rule: this.id,
            file: sourceFile.fileName,
            line: start.line + 1,
            column: start.character + 1,
            severity: 'error',
            message: `Function is ${lineCount} lines long (max: ${this.maxLines})`,
            fix: 'Break down into smaller functions'
          });
        }
      }
      
      ts.forEachChild(node, checkNode);
    };
    
    checkNode(sourceFile);
    return violations;
  }
}

/**
 * Rule 5: Use a minimum of two runtime assertions per function
 */
class AssertionDensityRule implements NasaJplRule {
  id = 'assertion-density';
  name = 'Assertion Density';
  description = 'Use a minimum of two runtime assertions per function';

  validate(sourceFile: ts.SourceFile): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    
    const checkFunction = (node: ts.FunctionLikeDeclaration) => {
      let assertionCount = 0;
      
      const countAssertions = (n: ts.Node) => {
        if (ts.isCallExpression(n)) {
          const expression = n.expression;
          if (ts.isIdentifier(expression) && 
              (expression.text === 'assert' || 
               expression.text === 'expect' ||
               expression.text.includes('assert'))) {
            assertionCount++;
          }
        }
        
        // Check for if-throw patterns (manual assertions)
        if (ts.isIfStatement(n) && n.thenStatement) {
          if (ts.isThrowStatement(n.thenStatement)) {
            assertionCount++;
          }
        }
        
        ts.forEachChild(n, countAssertions);
      };
      
      if (node.body) {
        countAssertions(node.body);
        
        if (assertionCount < 2) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          violations.push({
            rule: this.id,
            file: sourceFile.fileName,
            line: line + 1,
            column: character + 1,
            severity: 'warning',
            message: `Function has ${assertionCount} assertions (minimum: 2)`,
            fix: 'Add parameter validation and invariant checks'
          });
        }
      }
    };
    
    const checkNode = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) || 
          ts.isMethodDeclaration(node) || 
          ts.isArrowFunction(node)) {
        checkFunction(node as ts.FunctionLikeDeclaration);
      }
      
      ts.forEachChild(node, checkNode);
    };
    
    checkNode(sourceFile);
    return violations;
  }
}

/**
 * Rule 6: Restrict data to the smallest possible scope
 */
class DataDeclarationRule implements NasaJplRule {
  id = 'data-declaration';
  name = 'Data Scope Restriction';
  description = 'Data should be declared at the smallest possible level of scope';

  validate(sourceFile: ts.SourceFile): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    
    // Check for module-level variables that could be function-scoped
    const moduleVariables = new Map<string, ts.Node>();
    const functionUsage = new Map<string, Set<string>>();
    
    const collectModuleVariables = (node: ts.Node) => {
      if (ts.isVariableStatement(node) && node.parent === sourceFile) {
        node.declarationList.declarations.forEach(decl => {
          if (ts.isIdentifier(decl.name)) {
            moduleVariables.set(decl.name.text, decl);
          }
        });
      }
      ts.forEachChild(node, collectModuleVariables);
    };
    
    collectModuleVariables(sourceFile);
    
    // Check usage patterns
    // (Simplified - full implementation would track all usages)
    
    return violations;
  }
}

/**
 * Rule 7: Check the return value of all non-void functions
 */
class ReturnValueCheckRule implements NasaJplRule {
  id = 'return-value-check';
  name = 'Return Value Checking';
  description = 'The return value of non-void functions must be checked';

  validate(sourceFile: ts.SourceFile): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    
    const checkNode = (node: ts.Node) => {
      if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)) {
        // Check if the called function returns a value
        const callExpr = node.expression;
        
        // This is a simplified check - real implementation would use type information
        if (!this.isVoidFunction(callExpr)) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          violations.push({
            rule: this.id,
            file: sourceFile.fileName,
            line: line + 1,
            column: character + 1,
            severity: 'warning',
            message: 'Return value not checked',
            fix: 'Store or check the return value'
          });
        }
      }
      
      ts.forEachChild(node, checkNode);
    };
    
    checkNode(sourceFile);
    return violations;
  }

  private isVoidFunction(call: ts.CallExpression): boolean {
    // Simplified check - would need type checker for accurate results
    const expr = call.expression;
    if (ts.isIdentifier(expr)) {
      const voidFunctions = ['console.log', 'console.error', 'console.warn'];
      return voidFunctions.some(f => expr.text === f.split('.').pop());
    }
    return false;
  }
}

/**
 * Rule 8: Limited use of preprocessor
 */
class PreprocessorRule implements NasaJplRule {
  id = 'preprocessor-limit';
  name = 'Limited Preprocessor';
  description = 'Limited use of the preprocessor';

  validate(sourceFile: ts.SourceFile): ComplianceViolation[] {
    // TypeScript doesn't have traditional preprocessor
    // Check for excessive conditional compilation patterns
    return [];
  }
}

/**
 * Rule 9: Restrict use of pointers
 */
class PointerRule implements NasaJplRule {
  id = 'pointer-restriction';
  name = 'Pointer Restriction';
  description = 'Restrict use of pointers, no function pointers';

  validate(sourceFile: ts.SourceFile): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    
    const checkNode = (node: ts.Node) => {
      // Check for function type assignments (function pointers)
      if (ts.isVariableDeclaration(node) && node.type) {
        if (ts.isFunctionTypeNode(node.type)) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          violations.push({
            rule: this.id,
            file: sourceFile.fileName,
            line: line + 1,
            column: character + 1,
            severity: 'warning',
            message: 'Function pointer detected',
            fix: 'Use direct function calls or class methods'
          });
        }
      }
      
      ts.forEachChild(node, checkNode);
    };
    
    checkNode(sourceFile);
    return violations;
  }
}

/**
 * Rule 10: Compile with all warnings enabled
 */
class CompilerWarningRule implements NasaJplRule {
  id = 'compiler-warnings';
  name = 'All Warnings Enabled';
  description = 'Compile with all warnings enabled and treat warnings as errors';

  validate(sourceFile: ts.SourceFile): ComplianceViolation[] {
    // This would check tsconfig.json settings
    // For now, return empty as it's a configuration check
    return [];
  }
}

/**
 * Rule 3: Limit recursion depth
 */
class RecursionDepthRule implements NasaJplRule {
  id = 'recursion-depth';
  name = 'Recursion Depth Limit';
  description = 'Do not use recursion deeper than 3 levels';
  
  private maxDepth = 3;

  validate(sourceFile: ts.SourceFile): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    const functionCalls = new Map<string, Set<string>>();
    
    // Build call graph
    const buildCallGraph = (node: ts.Node, currentFunction?: string) => {
      if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
        const name = node.name?.getText() || 'anonymous';
        if (!functionCalls.has(name)) {
          functionCalls.set(name, new Set());
        }
        currentFunction = name;
      }
      
      if (ts.isCallExpression(node) && currentFunction) {
        const callee = node.expression;
        if (ts.isIdentifier(callee)) {
          functionCalls.get(currentFunction)?.add(callee.text);
        }
      }
      
      ts.forEachChild(node, n => buildCallGraph(n, currentFunction));
    };
    
    buildCallGraph(sourceFile);
    
    // Check for recursive calls
    functionCalls.forEach((calls, func) => {
      if (calls.has(func)) {
        // Direct recursion detected
        violations.push({
          rule: this.id,
          file: sourceFile.fileName,
          line: 1, // Would need to track actual location
          column: 1,
          severity: 'error',
          message: `Recursive function detected: ${func}`,
          fix: 'Convert to iterative approach'
        });
      }
    });
    
    return violations;
  }
}