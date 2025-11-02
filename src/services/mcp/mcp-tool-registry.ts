/**
 * MCP Tool Registry
 * Manages registration, discovery, and execution of MCP tools
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export type ToolHandler = (args: Record<string, any>) => Promise<any>;

export interface RegisteredTool {
  tool: Tool;
  handler: ToolHandler;
  metadata: {
    registeredAt: Date;
    invocationCount: number;
    lastInvokedAt?: Date;
    averageExecutionTime?: number;
  };
}

export class McpToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();

  /**
   * Register a new tool with its handler
   */
  registerTool(tool: Tool, handler: ToolHandler): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }

    this.tools.set(tool.name, {
      tool,
      handler,
      metadata: {
        registeredAt: new Date(),
        invocationCount: 0,
      },
    });

    console.log(`[ToolRegistry] Registered tool: ${tool.name}`);
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): boolean {
    const removed = this.tools.delete(name);
    if (removed) {
      console.log(`[ToolRegistry] Unregistered tool: ${name}`);
    }
    return removed;
  }

  /**
   * List all registered tools
   */
  listTools(): Tool[] {
    return Array.from(this.tools.values()).map((rt) => rt.tool);
  }

  /**
   * Get a specific tool by name
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name)?.tool;
  }

  /**
   * Execute a tool with timeout and error handling
   */
  async executeTool(
    name: string,
    args: Record<string, any>,
    timeoutMs: number = 30000
  ): Promise<any> {
    const registeredTool = this.tools.get(name);
    if (!registeredTool) {
      throw new Error(`Tool not found: ${name}`);
    }

    const startTime = Date.now();

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(
        registeredTool.handler(args),
        timeoutMs,
        `Tool execution timeout: ${name}`
      );

      // Update metadata
      const executionTime = Date.now() - startTime;
      this.updateToolMetadata(name, executionTime, true);

      return result;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      this.updateToolMetadata(name, executionTime, false);
      throw error;
    }
  }

  /**
   * Execute a promise with timeout
   */
  private executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      ),
    ]);
  }

  /**
   * Update tool execution metadata
   */
  private updateToolMetadata(name: string, executionTime: number, success: boolean): void {
    const registeredTool = this.tools.get(name);
    if (!registeredTool) return;

    const { metadata } = registeredTool;
    metadata.invocationCount++;
    metadata.lastInvokedAt = new Date();

    if (success) {
      if (metadata.averageExecutionTime === undefined) {
        metadata.averageExecutionTime = executionTime;
      } else {
        // Rolling average
        metadata.averageExecutionTime =
          (metadata.averageExecutionTime * (metadata.invocationCount - 1) + executionTime) /
          metadata.invocationCount;
      }
    }
  }

  /**
   * Get tool execution statistics
   */
  getToolStats(name: string): RegisteredTool['metadata'] | undefined {
    return this.tools.get(name)?.metadata;
  }

  /**
   * Get all tool statistics
   */
  getAllToolStats(): Record<string, RegisteredTool['metadata']> {
    const stats: Record<string, RegisteredTool['metadata']> = {};
    this.tools.forEach((rt, name) => {
      stats[name] = rt.metadata;
    });
    return stats;
  }

  /**
   * Get total tool count
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Search tools by name or description
   */
  searchTools(query: string): Tool[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.tools.values())
      .filter(
        (rt) =>
          rt.tool.name.toLowerCase().includes(lowerQuery) ||
          rt.tool.description?.toLowerCase().includes(lowerQuery)
      )
      .map((rt) => rt.tool);
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear();
    console.log('[ToolRegistry] Cleared all tools');
  }
}
