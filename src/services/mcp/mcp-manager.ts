/**
 * MCP Manager
 * High-level manager for MCP server lifecycle and integration
 */

import { NirvanaMcpServer, McpServerConfig } from './mcp-server';

export class McpManager {
  private server: NirvanaMcpServer | null = null;
  private isRunning: boolean = false;

  /**
   * Initialize and start MCP server
   */
  async start(config: Partial<McpServerConfig> = {}): Promise<void> {
    if (this.isRunning) {
      console.warn('[McpManager] Server already running');
      return;
    }

    const defaultConfig: McpServerConfig = {
      name: 'nirvana-mcp-server',
      version: '1.0.0',
      transport: 'stdio',
      enableAuth: false,
    };

    const finalConfig = { ...defaultConfig, ...config };

    this.server = new NirvanaMcpServer(finalConfig);
    await this.server.start();
    this.isRunning = true;

    console.log('[McpManager] MCP server started', this.server.getStats());
  }

  /**
   * Stop MCP server
   */
  async stop(): Promise<void> {
    if (!this.server || !this.isRunning) {
      console.warn('[McpManager] Server not running');
      return;
    }

    await this.server.stop();
    this.server = null;
    this.isRunning = false;

    console.log('[McpManager] MCP server stopped');
  }

  /**
   * Restart MCP server
   */
  async restart(config?: Partial<McpServerConfig>): Promise<void> {
    await this.stop();
    await this.start(config);
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      stats: this.server?.getStats() || null,
    };
  }

  /**
   * Check if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const mcpManager = new McpManager();
