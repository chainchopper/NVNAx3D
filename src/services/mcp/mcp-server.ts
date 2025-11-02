/**
 * Model Context Protocol (MCP) Server for NIRVANA
 * Exposes PersonI connectors and capabilities as standardized MCP tools
 * Supports both local (STDIO) and remote (HTTP+SSE) transport
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { connectorHandlers, ConnectorResult } from '../connector-handlers';
import { AVAILABLE_CONNECTORS, Connector } from '../../personas';
import { McpToolRegistry } from './mcp-tool-registry';

export interface McpServerConfig {
  name: string;
  version: string;
  transport: 'stdio' | 'http';
  port?: number;
  enableAuth?: boolean;
}

export class NirvanaMcpServer {
  private server: Server;
  private toolRegistry: McpToolRegistry;
  private config: McpServerConfig;

  constructor(config: McpServerConfig) {
    this.config = config;
    this.toolRegistry = new McpToolRegistry();

    this.server = new Server(
      {
        name: config.name || 'nirvana-mcp-server',
        version: config.version || '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.registerHandlers();
    this.registerConnectorTools();
  }

  /**
   * Register MCP protocol handlers
   */
  private registerHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = this.toolRegistry.listTools();
      console.log(`[MCP] Listing ${tools.length} available tools`);
      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      console.log(`[MCP] Calling tool: ${name}`, args);

      try {
        const result = await this.toolRegistry.executeTool(name, args || {});
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error(`[MCP] Tool execution failed: ${name}`, error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error.message,
              }),
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Register all NIRVANA connectors as MCP tools
   */
  private registerConnectorTools(): void {
    AVAILABLE_CONNECTORS.forEach((connector) => {
      // Convert Google Gemini FunctionDeclaration to MCP Tool schema
      const tool: Tool = {
        name: `nirvana_${connector.id}`,
        description: connector.description,
        inputSchema: this.convertGeminiSchemaToMcpSchema(connector.functionDeclaration.parameters),
      };

      // Create handler that routes to the appropriate connector method
      const mcpHandler = async (args: Record<string, any>): Promise<ConnectorResult> => {
        return await this.routeConnectorCall(connector.id, args);
      };

      this.toolRegistry.registerTool(tool, mcpHandler);
    });

    console.log(`[MCP] Registered ${AVAILABLE_CONNECTORS.length} connector tools`);
  }

  /**
   * Route connector calls to the appropriate handler method
   */
  private async routeConnectorCall(connectorId: string, params: any): Promise<ConnectorResult> {
    switch (connectorId) {
      // Google Workspace
      case 'gmail':
        return connectorHandlers.handleGmail(params);
      case 'google_calendar':
        return connectorHandlers.handleGoogleCalendar(params);
      case 'google_docs':
        return connectorHandlers.handleGoogleDocs(params);
      case 'google_sheets':
        return connectorHandlers.handleGoogleSheets(params);

      // Project Management
      case 'github':
        return connectorHandlers.handleGitHub(params);
      case 'notion':
        return connectorHandlers.handleNotion(params);
      case 'linear':
        return connectorHandlers.handleLinear(params);
      case 'jira':
        return connectorHandlers.handleJira(params);
      case 'asana':
        return connectorHandlers.handleAsana(params);
      case 'slack':
        return connectorHandlers.handleSlack(params);
      case 'outlook':
        return connectorHandlers.handleOutlook(params);
      case 'confluence':
        return connectorHandlers.handleConfluence(params);

      // Smart Home & Vision - route based on operation
      case 'homeassistant_devices':
        return connectorHandlers.handleHomeassistant(params);
      case 'homeassistant_state':
        return connectorHandlers.handleHomeassistantState(params);
      case 'homeassistant_control':
        return connectorHandlers.handleHomeassistantControl(params);

      case 'frigate_events':
        return connectorHandlers.handleFrigateEvents(params);
      case 'frigate_snapshot':
        return connectorHandlers.handleFrigateSnapshot(params);
      case 'frigate_camera_state':
        return connectorHandlers.handleFrigateCameraState(params);

      case 'codeprojectai':
        return connectorHandlers.handleCodeprojectaiDetect(params);

      case 'yolo':
        return connectorHandlers.handleYoloDetect(params);

      // Reminders - route based on operation
      case 'set_reminder':
        return connectorHandlers.handleSetReminder(params);
      case 'list_reminders':
        return connectorHandlers.handleListReminders(params);
      case 'complete_reminder':
        return connectorHandlers.handleCompleteReminder(params);
      case 'delete_reminder':
        return connectorHandlers.handleDeleteReminder(params);

      // Financial - route based on operation
      case 'get_stock_quote':
        return connectorHandlers.handleGetStockQuote(params);
      case 'get_crypto_price':
        return connectorHandlers.handleGetCryptoPrice(params);
      case 'get_market_news':
        return connectorHandlers.handleGetMarketNews(params);
      case 'analyze_portfolio':
        return connectorHandlers.handleAnalyzePortfolio(params);
      case 'analyze_spending':
        return connectorHandlers.handleAnalyzeSpending(params);
      case 'create_budget':
        return connectorHandlers.handleCreateBudget(params);
      case 'get_account_balance':
        return connectorHandlers.handleGetAccountBalance(params);
      case 'get_transactions':
        return connectorHandlers.handleGetTransactions(params);

      default:
        throw new Error(`Unknown connector: ${connectorId}`);
    }
  }

  /**
   * Convert Google Gemini parameter schema to MCP input schema
   */
  private convertGeminiSchemaToMcpSchema(geminiParams: any): any {
    // Gemini uses Type.OBJECT, Type.STRING, etc.
    // MCP uses standard JSON Schema
    const convertType = (type: any): string => {
      if (typeof type === 'string') return type.toLowerCase();
      if (type === 1) return 'string'; // Type.STRING
      if (type === 2) return 'number'; // Type.NUMBER
      if (type === 3) return 'integer'; // Type.INTEGER
      if (type === 4) return 'boolean'; // Type.BOOLEAN
      if (type === 5) return 'array'; // Type.ARRAY
      if (type === 6) return 'object'; // Type.OBJECT
      return 'string';
    };

    const convertProperties = (props: any): any => {
      const converted: any = {};
      for (const [key, value] of Object.entries(props)) {
        const prop = value as any;
        converted[key] = {
          type: convertType(prop.type),
          description: prop.description,
        };
        if (prop.items) {
          converted[key].items = { type: convertType(prop.items.type) };
        }
      }
      return converted;
    };

    return {
      type: 'object',
      properties: convertProperties(geminiParams.properties || {}),
      required: geminiParams.required || [],
    };
  }

  /**
   * Start the MCP server with configured transport
   */
  async start(): Promise<void> {
    if (this.config.transport === 'stdio') {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.log('[MCP] Server started with STDIO transport');
    } else if (this.config.transport === 'http') {
      // HTTP+SSE transport for remote connections
      // TODO: Implement HTTP transport with SSE streaming
      throw new Error('HTTP transport not yet implemented');
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    await this.server.close();
    console.log('[MCP] Server stopped');
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      name: this.config.name,
      version: this.config.version,
      transport: this.config.transport,
      toolCount: this.toolRegistry.getToolCount(),
      tools: this.toolRegistry.listTools().map((t) => t.name),
    };
  }
}
