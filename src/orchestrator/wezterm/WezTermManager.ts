/**
 * WezTerm Integration Manager
 * Manages terminal panes and layouts for Claude agents
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { BoundedArray } from '../../lib/utils/bounded-array';

const exec = promisify(require('child_process').exec);

export interface WezTermPane {
  paneId: string;
  title: string;
  cwd: string;
  processId?: number;
  dimensions: { rows: number; cols: number };
}

export interface PaneLayout {
  type: 'grid' | 'split' | 'custom';
  missionControlPane?: string;
  agentPanes: Map<string, string>;
}

export class WezTermManager extends EventEmitter {
  private panes: Map<string, WezTermPane> = new Map();
  private layout: PaneLayout = {
    type: 'grid',
    agentPanes: new Map()
  };

  /**
   * Initialize Mission Control layout in WezTerm
   */
  public async initializeMissionControlLayout(): Promise<void> {
    try {
      // Create the main Mission Control pane
      const missionControlPane = await this.createPane({
        title: 'Mission Control',
        cwd: process.cwd(),
        size: { width: 100, height: 30 }
      });

      this.layout.missionControlPane = missionControlPane.paneId;

      // Set up the grid layout
      await this.executeWezTermCommand([
        'cli',
        'adjust-pane-size',
        '--pane-id',
        missionControlPane.paneId,
        '--amount',
        '30',
        '--dimension',
        'height'
      ]);

      this.emit('layout:initialized', this.layout);
    } catch (error) {
      throw new Error(`Failed to initialize WezTerm layout: ${error.message}`);
    }
  }

  /**
   * Create a new pane for a Claude agent
   */
  public async createAgentPane(agentName: string, workingDirectory: string): Promise<string> {
    try {
      // Create new pane below mission control
      const result = await this.executeWezTermCommand([
        'cli',
        'split-pane',
        '--bottom',
        '--cwd',
        workingDirectory,
        '--percent',
        '25'
      ]);

      const paneId = this.extractPaneId(result);

      // Set pane title
      await this.setPaneTitle(paneId, `Agent: ${agentName}`);

      // Store pane information
      const pane: WezTermPane = {
        paneId,
        title: `Agent: ${agentName}`,
        cwd: workingDirectory,
        dimensions: { rows: 24, cols: 80 }
      };

      this.panes.set(paneId, pane);
      this.layout.agentPanes.set(agentName, paneId);

      // Launch Claude in the pane
      await this.executeInPane(paneId, 'claude');

      this.emit('pane:created', pane);
      return paneId;
    } catch (error) {
      throw new Error(`Failed to create agent pane: ${error.message}`);
    }
  }

  /**
   * Execute a command in a specific pane
   */
  public async executeInPane(paneId: string, command: string): Promise<void> {
    await this.executeWezTermCommand([
      'cli',
      'send-text',
      '--pane-id',
      paneId,
      '--no-paste',
      command + '\n'
    ]);
  }

  /**
   * Set pane title
   */
  private async setPaneTitle(paneId: string, title: string): Promise<void> {
    await this.executeWezTermCommand(['cli', 'set-tab-title', '--pane-id', paneId, title]);
  }

  /**
   * Monitor pane activity
   */
  public async monitorPane(paneId: string): Promise<any> {
    try {
      const result = await this.executeWezTermCommand(['cli', 'list-clients', '--format', 'json']);

      const clients = JSON.parse(result);
      const paneInfo = clients.find((c: any) => c.pane_id === paneId);

      return {
        active: !!paneInfo,
        idle: paneInfo?.idle_time || 0,
        focused: paneInfo?.focused || false
      };
    } catch (error) {
      console.error(`Error monitoring pane ${paneId}:`, error);
      return null;
    }
  }

  /**
   * Get pane output (last n lines)
   */
  public async getPaneOutput(paneId: string, lines: number = 50): Promise<BoundedArray<string>> {
    try {
      const result = await this.executeWezTermCommand([
        'cli',
        'get-text',
        '--pane-id',
        paneId,
        '--start-line',
        `-${lines}`
      ]);

      const lines = result.split('\n').filter((line) => line.trim());
      const boundedOutput = new BoundedArray<string>(100);
      boundedOutput.pushMany(lines);
      return boundedOutput;
    } catch (error) {
      console.error(`Error getting pane output: ${error}`);
      return new BoundedArray<string>(100);
    }
  }

  /**
   * Create a pane with specific configuration
   */
  private async createPane(config: {
    title: string;
    cwd: string;
    size?: { width: number; height: number };
  }): Promise<WezTermPane> {
    const result = await this.executeWezTermCommand([
      'cli',
      'spawn',
      '--cwd',
      config.cwd,
      '--new-window'
    ]);

    const paneId = this.extractPaneId(result);

    const pane: WezTermPane = {
      paneId,
      title: config.title,
      cwd: config.cwd,
      dimensions: {
        rows: config.size?.height || 24,
        cols: config.size?.width || 80
      }
    };

    this.panes.set(paneId, pane);
    return pane;
  }

  /**
   * Execute WezTerm CLI command
   */
  private async executeWezTermCommand(args: BoundedArray<string>): Promise<string> {
    const command = `wezterm ${args.join(' ')}`;

    try {
      const { stdout, stderr } = await exec(command);
      if (stderr && !stderr.includes('warning')) {
        console.warn('WezTerm command warning:', stderr);
      }
      return stdout.trim();
    } catch (error) {
      throw new Error(`WezTerm command failed: ${error.message}`);
    }
  }

  /**
   * Extract pane ID from WezTerm output
   */
  private extractPaneId(output: string): string {
    // WezTerm outputs pane ID in various formats
    const match = output.match(/pane_id=(\d+)|"pane_id":\s*(\d+)|(\d+)/);
    if (match) {
      return match[1] || match[2] || match[3];
    }
    throw new Error('Could not extract pane ID from output');
  }

  /**
   * Arrange panes in grid layout
   */
  public async arrangeGrid(columns: number = 2): Promise<void> {
    const agentPaneIds = Array.from(this.layout.agentPanes.values());

    if (agentPaneIds.length === 0) return;

    // Calculate grid dimensions
    const rows = Math.ceil(agentPaneIds.length / columns);

    // Rearrange panes
    for (let i = 0; i < agentPaneIds.length; i++) {
      const row = Math.floor(i / columns);
      const col = i % columns;

      // Move pane to grid position
      await this.movePaneToGrid(agentPaneIds[i], row, col, rows, columns);
    }

    this.layout.type = 'grid';
  }

  /**
   * Move pane to grid position
   */
  private async movePaneToGrid(
    paneId: string,
    row: number,
    col: number,
    totalRows: number,
    totalCols: number
  ): Promise<void> {
    // Calculate size percentages
    const widthPercent = Math.floor(100 / totalCols);
    const heightPercent = Math.floor(70 / totalRows); // 70% for agents, 30% for mission control

    // This is a simplified version - actual implementation would use
    // more complex WezTerm CLI commands or Lua configuration
    await this.executeWezTermCommand([
      'cli',
      'adjust-pane-size',
      '--pane-id',
      paneId,
      '--amount',
      `${widthPercent}`,
      '--dimension',
      'width'
    ]);
  }

  /**
   * Focus on a specific pane
   */
  public async focusPane(paneId: string): Promise<void> {
    await this.executeWezTermCommand(['cli', 'activate-pane', '--pane-id', paneId]);
  }

  /**
   * Close a pane
   */
  public async closePane(paneId: string): Promise<void> {
    try {
      await this.executeWezTermCommand(['cli', 'kill-pane', '--pane-id', paneId]);

      this.panes.delete(paneId);

      // Remove from layout
      for (const [name, id] of this.layout.agentPanes.entries()) {
        if (id === paneId) {
          this.layout.agentPanes.delete(name);
          break;
        }
      }

      this.emit('pane:closed', paneId);
    } catch (error) {
      console.error(`Error closing pane ${paneId}:`, error);
    }
  }

  /**
   * Get all active panes
   */
  public getActivePanes(): BoundedArray<WezTermPane> {
    const activePanes = new BoundedArray<WezTermPane>(50);
    activePanes.pushMany(Array.from(this.panes.values()));
    return activePanes;
  }

  /**
   * Get pane by ID
   */
  public getPane(paneId: string): WezTermPane | undefined {
    return this.panes.get(paneId);
  }

  /**
   * Send interrupt signal to pane
   */
  public async interruptPane(paneId: string): Promise<void> {
    await this.executeInPane(paneId, '\x03'); // Ctrl+C
  }

  /**
   * Save current layout configuration
   */
  public async saveLayout(name: string): Promise<void> {
    const layoutConfig = {
      name,
      type: this.layout.type,
      missionControlPane: this.layout.missionControlPane,
      agentPanes: Array.from(this.layout.agentPanes.entries()),
      panes: (() => {
        const paneList = new BoundedArray<any>(50);
        const entries = Array.from(this.panes.entries()).map(([id, pane]) => ({
          id,
          ...pane
        }));
        paneList.pushMany(entries);
        return paneList;
      })()
    };

    // Save to file or configuration
    const fs = require('fs').promises;
    await fs.writeFile(
      `.claude-orchestrator/layouts/${name}.json`,
      JSON.stringify(layoutConfig, null, 2)
    );
  }

  /**
   * Load saved layout
   */
  public async loadLayout(name: string): Promise<void> {
    const fs = require('fs').promises;
    const layoutConfig = JSON.parse(
      await fs.readFile(`.claude-orchestrator/layouts/${name}.json`, 'utf-8')
    );

    // Restore layout
    this.layout.type = layoutConfig.type;
    this.layout.missionControlPane = layoutConfig.missionControlPane;
    this.layout.agentPanes = new Map(layoutConfig.agentPanes);

    // Note: This doesn't recreate panes, just loads the configuration
    // Actual pane recreation would need to be handled by the caller
  }
}
