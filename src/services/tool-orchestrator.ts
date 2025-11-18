/**
 * Tool Execution Orchestrator
 * 
 * Provides sandboxed execution of tools for PersonI autonomy
 * - Financial tools (get prices, execute trades, analyze portfolio)
 * - Communication tools (send SMS, make calls, send emails)
 * - Integration with routine automation system
 * - Audit logging for all tool executions
 * - User confirmation for sensitive operations
 */

import { twilioService } from './twilio-service';
import { getBackendUrl } from '../config/backend-url';

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: 'financial' | 'communication' | 'automation' | 'data';
  parameters: ToolParameter[];
  requiresConfirmation: boolean;
  requiredConnectors?: string[]; // Connectors needed for this tool
  handler: (params: any) => Promise<ToolResult>;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export interface ToolExecutionLog {
  toolId: string;
  toolName: string;
  parameters: any;
  result: ToolResult;
  timestamp: string;
  personaId: string;
  userId?: string;
  confirmed: boolean;
  executionTimeMs: number;
}

class ToolOrchestrator {
  private tools: Map<string, Tool> = new Map();
  private executionLogs: ToolExecutionLog[] = [];
  private pendingConfirmations: Map<string, any> = new Map();

  constructor() {
    this.registerBuiltInTools();
  }

  /**
   * Register all built-in tools
   */
  private registerBuiltInTools() {
    // Financial Tools
    this.registerTool({
      id: 'get_crypto_price',
      name: 'Get Cryptocurrency Price',
      description: 'Get current price and market data for cryptocurrencies',
      category: 'financial',
      requiresConfirmation: false,
      parameters: [
        { name: 'symbols', type: 'array', description: 'Array of crypto symbols (e.g., ["BTC", "ETH"])', required: true },
        { name: 'source', type: 'string', description: 'Data source: coingecko or coinmarketcap', required: false, default: 'coingecko' }
      ],
      handler: async (params) => {
        try {
          const { symbols, source = 'coingecko' } = params;
          const response = await fetch(getBackendUrl('/api/financial/crypto'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbols, source })
          });
          
          const data = await response.json();
          return { success: true, data: data.prices };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      }
    });

    this.registerTool({
      id: 'get_stock_price',
      name: 'Get Stock Price',
      description: 'Get current stock quote and market data',
      category: 'financial',
      requiresConfirmation: false,
      parameters: [
        { name: 'symbol', type: 'string', description: 'Stock symbol (e.g., "AAPL")', required: true }
      ],
      handler: async (params) => {
        try {
          const { symbol } = params;
          const response = await fetch(getBackendUrl('/api/financial/stocks'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol })
          });
          
          const data = await response.json();
          return { success: true, data: data.quote };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      }
    });

    this.registerTool({
      id: 'get_market_news',
      name: 'Get Market News',
      description: 'Get latest financial market news with sentiment analysis',
      category: 'financial',
      requiresConfirmation: false,
      parameters: [
        { name: 'symbol', type: 'string', description: 'Stock symbol for company news (optional)', required: false },
        { name: 'category', type: 'string', description: 'News category: general, forex, crypto, merger', required: false, default: 'general' },
        { name: 'limit', type: 'number', description: 'Number of news articles', required: false, default: 10 }
      ],
      handler: async (params) => {
        try {
          const { symbol, category = 'general', limit = 10 } = params;
          const response = await fetch(getBackendUrl(`/api/financial/news?symbol=${symbol || ''}&category=${category}&limit=${limit}`));
          
          const data = await response.json();
          return { success: true, data: data.news };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      }
    });

    this.registerTool({
      id: 'set_price_alert',
      name: 'Set Price Alert',
      description: 'Create a price alert for crypto or stock (triggers routine automation)',
      category: 'financial',
      requiresConfirmation: false,
      parameters: [
        { name: 'symbol', type: 'string', description: 'Asset symbol', required: true },
        { name: 'type', type: 'string', description: 'Asset type: crypto or stock', required: true },
        { name: 'targetPrice', type: 'number', description: 'Target price', required: true },
        { name: 'condition', type: 'string', description: 'Condition: above, below, or crosses', required: true },
        { name: 'action', type: 'string', description: 'Action to take: notify, sms, call, email', required: true },
        { name: 'phoneNumber', type: 'string', description: 'Phone number for SMS/call actions', required: false },
        { name: 'email', type: 'string', description: 'Email for email actions', required: false }
      ],
      handler: async (params) => {
        // Create a routine in the automation system
        const routineName = `Price Alert: ${params.symbol} ${params.condition} $${params.targetPrice}`;
        const routineDescription = `Alert when ${params.symbol} goes ${params.condition} $${params.targetPrice}`;
        
        const trigger = {
          type: 'price_alert' as const,
          config: {
            priceAlert: {
              symbol: params.symbol,
              assetType: params.type as 'crypto' | 'stock',
              condition: params.condition as 'above' | 'below' | 'crosses',
              targetPrice: params.targetPrice,
              dataSource: params.type === 'crypto' ? ('coingecko' as const) : ('alphavantage' as const),
              checkInterval: 60000 // Check every minute
            }
          }
        };
        
        const actions = [];
        
        // Build action based on requested action type
        if (params.action === 'sms' && params.phoneNumber) {
          actions.push({
            type: 'send_sms' as const,
            smsConfig: {
              to: params.phoneNumber,
              message: `Price alert: ${params.symbol} is now ${params.condition} $${params.targetPrice}`,
              includeData: true
            }
          });
        } else if (params.action === 'call' && params.phoneNumber) {
          actions.push({
            type: 'make_call' as const,
            callConfig: {
              to: params.phoneNumber,
              message: `Price alert: ${params.symbol} has reached your target price of $${params.targetPrice}`
            }
          });
        } else if (params.action === 'email' && params.email) {
          actions.push({
            type: 'send_email' as const,
            emailConfig: {
              to: params.email,
              subject: `Price Alert: ${params.symbol}`,
              body: `${params.symbol} is now ${params.condition} $${params.targetPrice}`,
              includeData: true
            }
          });
        } else {
          // Default to notification
          actions.push({
            type: 'notification' as const,
            parameters: {
              message: `Price alert: ${params.symbol} is now ${params.condition} $${params.targetPrice}`
            }
          });
        }
        
        try {
          // Import routine executor dynamically to avoid circular dependencies
          const { routineExecutor } = await import('./routine-executor');
          
          // Initialize if not already done
          if (!routineExecutor['initialized']) {
            await routineExecutor.initialize();
          }
          
          const routineId = await routineExecutor.createRoutine({
            name: routineName,
            description: routineDescription,
            trigger,
            actions,
            tags: ['price-alert', 'financial', params.type]
          });
          
          return {
            success: true,
            data: {
              alertId: routineId,
              routineName,
              symbol: params.symbol,
              targetPrice: params.targetPrice,
              condition: params.condition,
              action: params.action,
              status: 'active'
            }
          };
        } catch (error) {
          console.error('[ToolOrchestrator] Error creating price alert routine:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create price alert routine'
          };
        }
      }
    });

    // Communication Tools
    this.registerTool({
      id: 'send_sms',
      name: 'Send SMS',
      description: 'Send SMS message via Twilio',
      category: 'communication',
      requiresConfirmation: true,
      requiredConnectors: ['twilio'],
      parameters: [
        { name: 'to', type: 'string', description: 'Phone number to send to (E.164 format, e.g., +15551234567)', required: true },
        { name: 'message', type: 'string', description: 'Message content (up to 1600 characters)', required: true }
      ],
      handler: async (params) => {
        const result = await twilioService.sendSMS(params.to, params.message);
        return result;
      }
    });

    this.registerTool({
      id: 'make_call',
      name: 'Make Phone Call',
      description: 'Initiate phone call via Twilio',
      category: 'communication',
      requiresConfirmation: true,
      requiredConnectors: ['twilio'],
      parameters: [
        { name: 'to', type: 'string', description: 'Phone number to call (E.164 format)', required: true },
        { name: 'personaVoice', type: 'string', description: 'Persona voice to use', required: false }
      ],
      handler: async (params) => {
        const result = await twilioService.makeCall(params.to, params.personaVoice);
        return result;
      }
    });

    // Gmail Tools
    this.registerTool({
      id: 'search_gmail',
      name: 'Search Gmail',
      description: 'Search for emails in Gmail inbox',
      category: 'communication',
      requiresConfirmation: false,
      parameters: [
        { name: 'query', type: 'string', description: 'Search query (supports Gmail search syntax, e.g., "from:user@example.com subject:invoice")', required: true },
        { name: 'maxResults', type: 'number', description: 'Maximum number of results to return (default: 10)', required: false, default: 10 }
      ],
      handler: async (params) => {
        try {
          const response = await fetch(getBackendUrl('/api/connectors/gmail/search'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: params.query,
              maxResults: params.maxResults || 10
            })
          });
          
          const data = await response.json();
          
          if (data.requiresSetup) {
            return {
              success: false,
              error: 'Gmail not configured',
              requiresConfirmation: false,
              confirmationMessage: data.setupInstructions || 'Please configure GOOGLE_ACCESS_TOKEN in your .env file or app settings.'
            };
          }
          
          return { 
            success: data.success, 
            data: data.emails || data.data,
            error: data.error 
          };
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to search Gmail' 
          };
        }
      }
    });

    this.registerTool({
      id: 'send_gmail',
      name: 'Send Gmail',
      description: 'Send an email via Gmail',
      category: 'communication',
      requiresConfirmation: true,
      parameters: [
        { name: 'to', type: 'string', description: 'Recipient email address', required: true },
        { name: 'subject', type: 'string', description: 'Email subject line', required: true },
        { name: 'body', type: 'string', description: 'Email body content (plain text or HTML)', required: true },
        { name: 'cc', type: 'string', description: 'CC email addresses (comma-separated)', required: false },
        { name: 'bcc', type: 'string', description: 'BCC email addresses (comma-separated)', required: false }
      ],
      handler: async (params) => {
        try {
          const response = await fetch(getBackendUrl('/api/connectors/gmail/send'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: params.to,
              subject: params.subject,
              body: params.body,
              cc: params.cc,
              bcc: params.bcc
            })
          });
          
          const data = await response.json();
          
          if (data.requiresSetup) {
            return {
              success: false,
              error: 'Gmail not configured',
              confirmationMessage: data.setupInstructions || 'Please configure GOOGLE_ACCESS_TOKEN in your .env file or app settings.'
            };
          }
          
          return { 
            success: data.success, 
            data: data.messageId || data.data,
            error: data.error 
          };
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to send email' 
          };
        }
      }
    });
  }

  /**
   * Register a custom tool
   */
  registerTool(tool: Tool) {
    this.tools.set(tool.id, tool);
    console.log(`[ToolOrchestrator] Registered tool: ${tool.name} (${tool.id})`);
  }

  /**
   * Get all available tools
   */
  getAvailableTools(category?: string): Tool[] {
    const allTools = Array.from(this.tools.values());
    
    if (category) {
      return allTools.filter(tool => tool.category === category);
    }
    
    return allTools;
  }

  /**
   * Get tool by ID
   */
  getTool(toolId: string): Tool | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Execute a tool
   */
  async executeTool(
    toolId: string,
    parameters: any,
    personaId: string,
    userId?: string,
    confirmed: boolean = false
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const tool = this.tools.get(toolId);

    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${toolId}`
      };
    }

    // Validate parameters
    const validation = this.validateParameters(tool, parameters);
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid parameters: ${validation.errors.join(', ')}`
      };
    }

    // Check if confirmation is required
    if (tool.requiresConfirmation && !confirmed) {
      const confirmId = `confirm_${Date.now()}`;
      this.pendingConfirmations.set(confirmId, {
        toolId,
        parameters,
        personaId,
        userId
      });

      return {
        success: false,
        requiresConfirmation: true,
        confirmationMessage: `${tool.name} requires user confirmation. Confirm to proceed with parameters: ${JSON.stringify(parameters)}`
      };
    }

    // Execute tool
    try {
      const result = await tool.handler(parameters);
      
      // Log execution
      const log: ToolExecutionLog = {
        toolId,
        toolName: tool.name,
        parameters,
        result,
        timestamp: new Date().toISOString(),
        personaId,
        userId,
        confirmed,
        executionTimeMs: Date.now() - startTime
      };
      
      this.executionLogs.push(log);
      
      return result;
    } catch (error) {
      const errorResult: ToolResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown execution error'
      };

      // Log failed execution
      this.executionLogs.push({
        toolId,
        toolName: tool.name,
        parameters,
        result: errorResult,
        timestamp: new Date().toISOString(),
        personaId,
        userId,
        confirmed,
        executionTimeMs: Date.now() - startTime
      });

      return errorResult;
    }
  }

  /**
   * Validate tool parameters
   */
  private validateParameters(tool: Tool, parameters: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const param of tool.parameters) {
      if (param.required && !(param.name in parameters)) {
        errors.push(`Missing required parameter: ${param.name}`);
      }

      if (param.name in parameters) {
        const value = parameters[param.name];
        const actualType = Array.isArray(value) ? 'array' : typeof value;

        if (actualType !== param.type) {
          errors.push(`Parameter ${param.name} must be of type ${param.type}, got ${actualType}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get execution logs
   */
  getExecutionLogs(limit?: number, personaId?: string): ToolExecutionLog[] {
    let logs = this.executionLogs;

    if (personaId) {
      logs = logs.filter(log => log.personaId === personaId);
    }

    if (limit) {
      logs = logs.slice(-limit);
    }

    return logs.reverse();
  }

  /**
   * Get tool execution statistics
   */
  getStatistics(personaId?: string): any {
    let logs = this.executionLogs;

    if (personaId) {
      logs = logs.filter(log => log.personaId === personaId);
    }

    const totalExecutions = logs.length;
    const successfulExecutions = logs.filter(log => log.result.success).length;
    const failedExecutions = totalExecutions - successfulExecutions;
    const avgExecutionTime = logs.reduce((sum, log) => sum + log.executionTimeMs, 0) / totalExecutions || 0;

    const toolUsage = new Map<string, number>();
    logs.forEach(log => {
      toolUsage.set(log.toolName, (toolUsage.get(log.toolName) || 0) + 1);
    });

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      avgExecutionTime: Math.round(avgExecutionTime),
      toolUsage: Object.fromEntries(toolUsage)
    };
  }

  /**
   * Get tools for a specific connector (driven by tool metadata)
   */
  getToolsForConnector(connectorId: string): string[] {
    const toolNames: string[] = [];
    
    // Map connectors to tool names using requiredConnectors metadata
    for (const tool of this.tools.values()) {
      // Check if this tool requires this connector
      if (tool.requiredConnectors && tool.requiredConnectors.includes(connectorId)) {
        toolNames.push(tool.name);
      }
      // Fallback for tools without requiredConnectors metadata
      else if (!tool.requiredConnectors) {
        // Use category-based mapping for backward compatibility
        if (connectorId.includes('financial') && tool.category === 'financial') {
          toolNames.push(tool.name);
        }
      }
    }
    
    return toolNames;
  }

  /**
   * Get all available tools (for debugging/introspection)
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }
}

// Export singleton instance
export const toolOrchestrator = new ToolOrchestrator();
