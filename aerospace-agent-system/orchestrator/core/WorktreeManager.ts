/**
 * Git Worktree Manager
 * Manages isolated development branches for agents
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import type { GitWorktree, WorktreeStatus, MergeStrategy, MergeResult } from '../types';

const execAsync = promisify(exec);

export class WorktreeManager {
  private basePath: string;
  private worktrees: Map<string, GitWorktree> = new Map();

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * Create a new worktree for an agent
   */
  public async createWorktree(
    worktreeId: string,
    branchName: string
  ): Promise<GitWorktree> {
    const worktreePath = path.join(this.basePath, worktreeId);
    
    try {
      // Ensure base path exists
      await fs.mkdir(this.basePath, { recursive: true });
      
      // Create worktree with new branch
      await execAsync(
        `git worktree add -b ${branchName} "${worktreePath}" HEAD`
      );
      
      const worktree: GitWorktree = {
        id: worktreeId,
        path: worktreePath,
        branch: branchName,
        baseBranch: await this.getCurrentBranch(),
        status: {
          clean: true,
          ahead: 0,
          behind: 0,
          conflicts: [],
          modifiedFiles: []
        },
        lastSync: new Date()
      };
      
      this.worktrees.set(worktreeId, worktree);
      return worktree;
    } catch (error) {
      throw new Error(`Failed to create worktree: ${error.message}`);
    }
  }

  /**
   * Get worktree status
   */
  public async getStatus(worktreeId: string): Promise<WorktreeStatus> {
    const worktree = this.worktrees.get(worktreeId);
    if (!worktree) {
      throw new Error(`Worktree ${worktreeId} not found`);
    }

    try {
      // Get git status
      const { stdout: statusOut } = await execAsync(
        'git status --porcelain',
        { cwd: worktree.path }
      );
      
      const modifiedFiles = statusOut
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.substring(3));
      
      // Check ahead/behind
      const { stdout: revList } = await execAsync(
        `git rev-list --left-right --count ${worktree.baseBranch}...${worktree.branch}`,
        { cwd: worktree.path }
      );
      
      const [behind, ahead] = revList.trim().split('\t').map(Number);
      
      const status: WorktreeStatus = {
        clean: modifiedFiles.length === 0,
        ahead,
        behind,
        conflicts: [],
        modifiedFiles
      };
      
      worktree.status = status;
      return status;
    } catch (error) {
      throw new Error(`Failed to get worktree status: ${error.message}`);
    }
  }

  /**
   * Sync worktree with base branch
   */
  public async syncWorktree(worktreeId: string): Promise<void> {
    const worktree = this.worktrees.get(worktreeId);
    if (!worktree) {
      throw new Error(`Worktree ${worktreeId} not found`);
    }

    try {
      // Fetch latest changes
      await execAsync('git fetch origin', { cwd: worktree.path });
      
      // Merge base branch
      const { stdout, stderr } = await execAsync(
        `git merge origin/${worktree.baseBranch} --no-edit`,
        { cwd: worktree.path }
      );
      
      if (stderr.includes('CONFLICT')) {
        // Handle merge conflicts
        const conflicts = await this.detectConflicts(worktree.path);
        worktree.status.conflicts = conflicts;
        throw new Error(`Merge conflicts detected: ${conflicts.join(', ')}`);
      }
      
      worktree.lastSync = new Date();
    } catch (error) {
      throw new Error(`Failed to sync worktree: ${error.message}`);
    }
  }

  /**
   * Merge multiple worktrees into target branch
   */
  public async mergeWorktrees(
    worktrees: GitWorktree[],
    targetBranch: string,
    strategy: MergeStrategy
  ): Promise<MergeResult> {
    try {
      // Checkout target branch in main worktree
      await execAsync(`git checkout ${targetBranch}`);
      
      if (strategy.type === 'octopus') {
        return await this.octopusMerge(worktrees, targetBranch);
      } else if (strategy.type === 'sequential') {
        return await this.sequentialMerge(worktrees, targetBranch, strategy);
      } else {
        return await this.rebaseMerge(worktrees, targetBranch);
      }
    } catch (error) {
      return {
        success: false,
        conflicts: [{
          file: 'merge',
          conflictType: 'content',
          branches: worktrees.map(w => w.branch),
          resolution: error.message
        }]
      };
    }
  }

  /**
   * Perform octopus merge
   */
  private async octopusMerge(
    worktrees: GitWorktree[],
    targetBranch: string
  ): Promise<MergeResult> {
    const branches = worktrees.map(w => w.branch).join(' ');
    
    try {
      const { stdout, stderr } = await execAsync(
        `git merge ${branches} --no-ff -m "Octopus merge from Mission Control"`
      );
      
      if (stderr.includes('CONFLICT')) {
        const conflicts = await this.detectConflicts(process.cwd());
        return {
          success: false,
          conflicts: conflicts.map(file => ({
            file,
            conflictType: 'content',
            branches: worktrees.map(w => w.branch)
          }))
        };
      }
      
      return {
        success: true,
        mergedBranch: targetBranch
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Perform sequential merge
   */
  private async sequentialMerge(
    worktrees: GitWorktree[],
    targetBranch: string,
    strategy: MergeStrategy
  ): Promise<MergeResult> {
    for (const worktree of worktrees) {
      try {
        // Test before merge if configured
        if (strategy.testBeforeMerge) {
          const testResult = await this.runTests(worktree.path);
          if (!testResult.passed && strategy.requireAllTestsPass) {
            return {
              success: false,
              testResults: [testResult]
            };
          }
        }
        
        // Merge branch
        const { stderr } = await execAsync(
          `git merge ${worktree.branch} --no-ff -m "Merge ${worktree.branch} from Mission Control"`
        );
        
        if (stderr.includes('CONFLICT')) {
          if (strategy.conflictResolution === 'abort') {
            await execAsync('git merge --abort');
            return {
              success: false,
              conflicts: [{
                file: 'merge',
                conflictType: 'content',
                branches: [worktree.branch]
              }]
            };
          }
          // Handle AI-assisted resolution here
        }
      } catch (error) {
        return {
          success: false,
          conflicts: [{
            file: 'merge',
            conflictType: 'content',
            branches: [worktree.branch],
            resolution: error.message
          }]
        };
      }
    }
    
    return {
      success: true,
      mergedBranch: targetBranch
    };
  }

  /**
   * Perform rebase merge
   */
  private async rebaseMerge(
    worktrees: GitWorktree[],
    targetBranch: string
  ): Promise<MergeResult> {
    // Implement rebase strategy
    // This is more complex and would need careful handling
    return {
      success: false,
      conflicts: [{
        file: 'rebase',
        conflictType: 'content',
        branches: worktrees.map(w => w.branch),
        resolution: 'Rebase merge not implemented'
      }]
    };
  }

  /**
   * Detect merge conflicts
   */
  private async detectConflicts(workDir: string): Promise<string[]> {
    const { stdout } = await execAsync(
      'git diff --name-only --diff-filter=U',
      { cwd: workDir }
    );
    
    return stdout.split('\n').filter(file => file.trim());
  }

  /**
   * Run tests in worktree
   */
  private async runTests(workDir: string): Promise<any> {
    try {
      const { stdout, stderr } = await execAsync(
        'npm test',
        { cwd: workDir }
      );
      
      return {
        suite: 'all',
        passed: !stderr.includes('failed'),
        tests: 0, // Would parse from output
        failures: 0,
        duration: 0
      };
    } catch (error) {
      return {
        suite: 'all',
        passed: false,
        tests: 0,
        failures: 1,
        duration: 0
      };
    }
  }

  /**
   * Remove worktree
   */
  public async removeWorktree(worktreeId: string): Promise<void> {
    const worktree = this.worktrees.get(worktreeId);
    if (!worktree) return;

    try {
      await execAsync(`git worktree remove "${worktree.path}" --force`);
      this.worktrees.delete(worktreeId);
    } catch (error) {
      console.error(`Failed to remove worktree: ${error.message}`);
    }
  }

  /**
   * Get current branch
   */
  private async getCurrentBranch(): Promise<string> {
    const { stdout } = await execAsync('git branch --show-current');
    return stdout.trim();
  }

  /**
   * Clean up all worktrees
   */
  public async cleanupAll(): Promise<void> {
    const worktreeIds = Array.from(this.worktrees.keys());
    
    for (const id of worktreeIds) {
      await this.removeWorktree(id);
    }
  }

  /**
   * List all worktrees
   */
  public async listWorktrees(): Promise<GitWorktree[]> {
    return Array.from(this.worktrees.values());
  }
}