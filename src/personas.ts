/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionDeclaration, Type} from '@google/genai';

export type TextureName =
  | 'none'
  | 'lava'
  | 'water'
  | 'slime'
  | 'stone_orchid'
  | 'bio_green'
  | 'rock_gray'
  | 'metallic_brushed'
  | 'crystal_blue'
  | 'organic_glow';
export type IdleAnimation = 'none' | 'glow' | 'particles' | 'code' | 'subtle_breath' | 'contemplative' | 'energetic' | 'meditative';

export interface Connector {
  id: string;
  name: string;
  description: string;
  type: 'oauth' | 'api_tool'; // OAuth connectors vs API endpoint tools
  functionDeclaration: FunctionDeclaration;
}

export interface PersoniCapabilities {
  vision: boolean;
  imageGeneration: boolean;
  webSearch: boolean;
  tools: boolean;
  mcp: boolean;
  audioInput: boolean;
  audioOutput: boolean;
}

export const DEFAULT_CAPABILITIES: PersoniCapabilities = {
  vision: false,
  imageGeneration: false,
  webSearch: false,
  tools: false,
  mcp: false,
  audioInput: true,
  audioOutput: true,
};

// Model assignments for different PersonI capabilities
export interface PersoniModels {
  conversation?: string;        // Primary conversation/chat model
  vision?: string;              // Vision/multimodal model
  embedding?: string;           // Text embedding model for RAG
  functionCalling?: string;     // Model for function/tool calling
  imageGeneration?: string;     // Image generation model
  objectDetection?: string;     // YOLO/object detection model
  textToSpeech?: string;        // TTS model (voice name for now)
}

// User-configured instance of a Personi
export interface PersoniConfig {
  id: string;
  name: string;
  tagline: string;
  systemInstruction: string;
  templateName: string;
  voiceName: string;
  thinkingModel?: string;       // DEPRECATED: Use models.conversation instead (backward compat)
  models?: PersoniModels;       // Flexible multi-model assignments
  enabledConnectors: string[];  // OAuth connector IDs (gmail, github, calendar)
  enabledTools?: string[];      // API tool IDs (get_market_news, get_stock_quote) - for backward compat migration
  capabilities?: PersoniCapabilities;
  avatarUrl?: string;
  visuals: {
    shape: 'Icosahedron' | 'TorusKnot';
    accentColor: string; // hex string e.g., '#87ceeb'
    textureName?: TextureName;
    idleAnimation?: IdleAnimation;
  };
}

// Base template for creating a Personi
export interface PersonaTemplate extends Omit<PersoniConfig, 'id'> {
  introductions: string[];
  idlePrompts: string[];
}

/**
 * Helper function to get the appropriate model for a PersonI capability
 * Falls back to thinkingModel for backward compatibility
 */
export function getPersoniModel(
  personi: PersoniConfig,
  capability: keyof PersoniModels = 'conversation'
): string | undefined {
  // Try new models structure first
  if (personi.models && personi.models[capability]) {
    return personi.models[capability];
  }
  
  // Fallback to thinkingModel for backward compatibility
  if (personi.thinkingModel) {
    return personi.thinkingModel;
  }
  
  return undefined;
}

export const AVAILABLE_CONNECTORS: Connector[] = [
  {
    id: 'gmail',
    type: 'oauth',
    name: 'Gmail',
    description: 'Search and read emails from your Gmail inbox.',
    functionDeclaration: {
      name: 'searchGmailEmails',
      description:
        'Searches for emails in Gmail using a query string (e.g., "from:user@example.com subject:meeting").',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description:
              'Gmail search query (supports Gmail search syntax, e.g., "from:user@example.com", "is:unread", "subject:report").',
          },
          maxResults: {
            type: Type.NUMBER,
            description: 'Maximum number of emails to return (default: 10).',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    id: 'google_calendar',

    type: 'oauth',
    name: 'Google Calendar',
    description: 'Access your Google Calendar events and schedules.',
    functionDeclaration: {
      name: 'getCalendarEvents',
      description:
        'Retrieves upcoming events from Google Calendar for a specified time range.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          timeMin: {
            type: Type.STRING,
            description:
              'Start time in ISO 8601 format (e.g., "2025-10-25T00:00:00Z"). Defaults to now.',
          },
          timeMax: {
            type: Type.STRING,
            description:
              'End time in ISO 8601 format (e.g., "2025-10-30T23:59:59Z"). Defaults to 7 days from now.',
          },
          maxResults: {
            type: Type.NUMBER,
            description: 'Maximum number of events to return (default: 10).',
          },
        },
        required: [],
      },
    },
  },
  {
    id: 'google_docs',

    type: 'oauth',
    name: 'Google Docs',
    description: 'Read and access Google Docs documents.',
    functionDeclaration: {
      name: 'readGoogleDoc',
      description:
        'Reads the content of a Google Doc given its document ID or URL.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          documentId: {
            type: Type.STRING,
            description:
              'The Google Doc ID or URL (e.g., "1ABC...XYZ" or "https://docs.google.com/document/d/1ABC...XYZ/edit").',
          },
        },
        required: ['documentId'],
      },
    },
  },
  {
    id: 'google_sheets',

    type: 'oauth',
    name: 'Google Sheets',
    description: 'Read and access Google Sheets spreadsheets.',
    functionDeclaration: {
      name: 'readGoogleSheet',
      description:
        'Reads data from a Google Sheet given its spreadsheet ID and optional range.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          spreadsheetId: {
            type: Type.STRING,
            description:
              'The Google Sheets ID or URL (e.g., "1ABC...XYZ" or "https://docs.google.com/spreadsheets/d/1ABC...XYZ/edit").',
          },
          range: {
            type: Type.STRING,
            description:
              'The A1 notation range to read (e.g., "Sheet1!A1:D10"). Defaults to all data.',
          },
        },
        required: ['spreadsheetId'],
      },
    },
  },
  {
    id: 'github',

    type: 'oauth',
    name: 'GitHub',
    description: 'Access GitHub repositories, users, and organizations.',
    functionDeclaration: {
      name: 'getGithubRepoDetails',
      description:
        'Gets details about a GitHub repository, like recent pull requests or issues.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          repoName: {
            type: Type.STRING,
            description: 'The name of the repository, e.g., "owner/repo".',
          },
        },
        required: ['repoName'],
      },
    },
  },
  {
    id: 'notion',

    type: 'api_tool',
    name: 'Notion',
    description:
      'Search and access your Notion pages, databases, and workspaces.',
    functionDeclaration: {
      name: 'searchNotionPages',
      description: 'Searches for pages and databases in your Notion workspace.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description: 'Search query to find pages or databases in Notion.',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    id: 'linear',

    type: 'oauth',
    name: 'Linear',
    description: 'Access Linear issues, projects, and team workflows.',
    functionDeclaration: {
      name: 'getLinearIssues',
      description:
        'Retrieves issues from Linear based on filters like status, assignee, or label.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          filter: {
            type: Type.STRING,
            description:
              'Filter criteria (e.g., "status:in-progress", "assignee:me", "label:bug").',
          },
          limit: {
            type: Type.NUMBER,
            description: 'Maximum number of issues to return (default: 20).',
          },
        },
        required: [],
      },
    },
  },
  {
    id: 'jira',

    type: 'oauth',
    name: 'Jira',
    description: 'Access Jira issues, projects, and sprint information.',
    functionDeclaration: {
      name: 'searchJiraIssues',
      description: 'Searches for Jira issues using JQL (Jira Query Language).',
      parameters: {
        type: Type.OBJECT,
        properties: {
          jql: {
            type: Type.STRING,
            description:
              'JQL query string (e.g., "project = PROJ AND status = Open", "assignee = currentUser()").',
          },
          maxResults: {
            type: Type.NUMBER,
            description: 'Maximum number of issues to return (default: 50).',
          },
        },
        required: ['jql'],
      },
    },
  },
  {
    id: 'asana',

    type: 'api_tool',
    name: 'Asana',
    description: 'Access Asana tasks, projects, and team workspaces.',
    functionDeclaration: {
      name: 'getAsanaTasks',
      description: 'Retrieves tasks from Asana based on project or assignee.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          projectId: {
            type: Type.STRING,
            description: 'The Asana project ID to fetch tasks from.',
          },
          assignee: {
            type: Type.STRING,
            description: 'Filter by assignee (e.g., "me" or user ID).',
          },
        },
        required: [],
      },
    },
  },
  {
    id: 'slack',

    type: 'oauth',
    name: 'Slack',
    description: 'Send messages to Slack channels and users via Web API (requires Bot Token with chat:write scope).',
    functionDeclaration: {
      name: 'sendSlackMessage',
      description: 'Sends a message to a Slack channel or direct message using Slack Web API (chat.postMessage).',
      parameters: {
        type: Type.OBJECT,
        properties: {
          channel: {
            type: Type.STRING,
            description: 'The Slack channel ID (e.g., "C1234567890"), channel name (e.g., "#general"), or user ID for DM.',
          },
          message: {
            type: Type.STRING,
            description: 'The message text to send (supports Slack markdown and Block Kit).',
          },
          threadTs: {
            type: Type.STRING,
            description: 'Optional: timestamp of parent message to reply in a thread.',
          },
        },
        required: ['channel', 'message'],
      },
    },
  },
  {
    id: 'homeassistant',

    type: 'api_tool',
    name: 'Home Assistant',
    description: 'Control and monitor smart home devices through Home Assistant (lights, switches, climate, sensors, etc.).',
    functionDeclaration: {
      name: 'getHomeAssistantDevices',
      description: 'Lists all entities (devices) available in Home Assistant, including lights, switches, sensors, climate controls, and more.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          domain: {
            type: Type.STRING,
            description: 'Optional: Filter by domain (e.g., "light", "switch", "sensor", "climate"). If not provided, returns all entities.',
          },
        },
        required: [],
      },
    },
  },
  {
    id: 'homeassistant_state',

    type: 'api_tool',
    name: 'Home Assistant State',
    description: 'Get the current state of a specific Home Assistant entity.',
    functionDeclaration: {
      name: 'getHomeAssistantState',
      description: 'Gets the current state and attributes of a specific Home Assistant entity (e.g., "light.living_room", "sensor.temperature").',
      parameters: {
        type: Type.OBJECT,
        properties: {
          entityId: {
            type: Type.STRING,
            description: 'The entity ID to query (e.g., "light.living_room", "sensor.bedroom_temperature", "switch.kitchen").',
          },
        },
        required: ['entityId'],
      },
    },
  },
  {
    id: 'homeassistant_control',

    type: 'api_tool',
    name: 'Home Assistant Control',
    description: 'Control Home Assistant devices (turn on/off, set brightness, adjust temperature, etc.).',
    functionDeclaration: {
      name: 'controlHomeAssistantDevice',
      description: 'Controls a Home Assistant device by calling a service. Can turn devices on/off, set brightness, adjust temperature, and more.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          domain: {
            type: Type.STRING,
            description: 'The service domain (e.g., "light", "switch", "climate", "cover").',
          },
          service: {
            type: Type.STRING,
            description: 'The service to call (e.g., "turn_on", "turn_off", "set_temperature", "toggle").',
          },
          entityId: {
            type: Type.STRING,
            description: 'The entity ID to control (e.g., "light.living_room", "switch.kitchen", "climate.bedroom").',
          },
          serviceData: {
            type: Type.STRING,
            description: 'Optional: JSON string of additional service data (e.g., \'{"brightness": 255}\', \'{"temperature": 72}\').',
          },
        },
        required: ['domain', 'service', 'entityId'],
      },
    },
  },
  {
    id: 'frigate_events',

    type: 'api_tool',
    name: 'Frigate Events',
    description: 'Get object detection events from Frigate NVR (e.g., person detected at front door, car in driveway).',
    functionDeclaration: {
      name: 'getFrigateEvents',
      description: 'Retrieves object detection events from Frigate NVR for a specific camera and object type.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          camera: {
            type: Type.STRING,
            description: 'The camera name (e.g., "front_door", "driveway", "backyard").',
          },
          objectType: {
            type: Type.STRING,
            description: 'Optional: Filter by object type (e.g., "person", "car", "dog", "package"). If not provided, returns all events.',
          },
          limit: {
            type: Type.NUMBER,
            description: 'Maximum number of events to return (default: 10).',
          },
        },
        required: ['camera'],
      },
    },
  },
  {
    id: 'frigate_snapshot',

    type: 'api_tool',
    name: 'Frigate Snapshot',
    description: 'Get a snapshot image from a Frigate camera for a specific event.',
    functionDeclaration: {
      name: 'getFrigateSnapshot',
      description: 'Gets a snapshot image from Frigate for a specific camera and event ID.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          camera: {
            type: Type.STRING,
            description: 'The camera name (e.g., "front_door", "driveway").',
          },
          eventId: {
            type: Type.STRING,
            description: 'Optional: The event ID to get the snapshot for. If not provided, gets the latest snapshot.',
          },
        },
        required: ['camera'],
      },
    },
  },
  {
    id: 'frigate_camera_state',

    type: 'api_tool',
    name: 'Frigate Camera State',
    description: 'Get the current state of a Frigate camera (online status, detection settings, etc.).',
    functionDeclaration: {
      name: 'getFrigateCameraState',
      description: 'Gets the current state and configuration of a Frigate camera.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          camera: {
            type: Type.STRING,
            description: 'The camera name (e.g., "front_door", "driveway").',
          },
        },
        required: ['camera'],
      },
    },
  },
  {
    id: 'codeprojectai_detect',

    type: 'api_tool',
    name: 'CodeProject.AI Detection',
    description: 'Detect objects in images using CodeProject.AI server (supports person, car, dog, cat, and many other objects).',
    functionDeclaration: {
      name: 'detectObjectsCodeProjectAI',
      description: 'Detects objects in an image using CodeProject.AI server. Returns detected objects with bounding boxes and confidence scores.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          imageUrl: {
            type: Type.STRING,
            description: 'The URL of the image to analyze (e.g., "http://camera.local/snapshot.jpg").',
          },
          minConfidence: {
            type: Type.NUMBER,
            description: 'Minimum confidence threshold (0.0-1.0). Default: 0.5. Higher values return fewer but more certain detections.',
          },
        },
        required: ['imageUrl'],
      },
    },
  },
  {
    id: 'yolo_detect',

    type: 'api_tool',
    name: 'YOLO Object Detection',
    description: 'Detect objects in images using YOLO (You Only Look Once) real-time object detection.',
    functionDeclaration: {
      name: 'detectObjectsYOLO',
      description: 'Detects objects in an image using YOLO model. Returns detected objects with bounding boxes and confidence scores.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          imageUrl: {
            type: Type.STRING,
            description: 'The URL or base64-encoded image to analyze.',
          },
          minConfidence: {
            type: Type.NUMBER,
            description: 'Minimum confidence threshold (0.0-1.0). Default: 0.5.',
          },
        },
        required: ['imageUrl'],
      },
    },
  },
  {
    id: 'set_reminder',

    type: 'api_tool',
    name: 'Set Reminder',
    description: 'Create a reminder with notification times. Built-in NIRVANA capability.',
    functionDeclaration: {
      name: 'setReminder',
      description: 'Sets a reminder for the user with customizable notification times.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: 'Brief title for the reminder (e.g., "Call mom", "Project deadline").',
          },
          dueDate: {
            type: Type.STRING,
            description: 'Due date in ISO 8601 format (e.g., "2025-10-31T15:00:00Z").',
          },
          notificationTimes: {
            type: Type.STRING,
            description: 'JSON array of minutes before due to notify (e.g., "[30, 60, 1440]" for 30min, 1hr, 1 day before).',
          },
          description: {
            type: Type.STRING,
            description: 'Optional detailed description of the reminder.',
          },
        },
        required: ['title', 'dueDate', 'notificationTimes'],
      },
    },
  },
  {
    id: 'list_reminders',

    type: 'api_tool',
    name: 'List Reminders',
    description: 'List active or all reminders. Built-in NIRVANA capability.',
    functionDeclaration: {
      name: 'listReminders',
      description: 'Lists reminders, optionally including completed ones.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          showCompleted: {
            type: Type.STRING,
            description: 'Whether to include completed reminders. "true" or "false" (default: "false").',
          },
        },
        required: [],
      },
    },
  },
  {
    id: 'complete_reminder',

    type: 'api_tool',
    name: 'Complete Reminder',
    description: 'Mark a reminder as completed. Built-in NIRVANA capability.',
    functionDeclaration: {
      name: 'completeReminder',
      description: 'Marks a reminder as completed.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          reminderId: {
            type: Type.STRING,
            description: 'The ID of the reminder to mark as completed.',
          },
        },
        required: ['reminderId'],
      },
    },
  },
  {
    id: 'delete_reminder',

    type: 'api_tool',
    name: 'Delete Reminder',
    description: 'Delete a reminder. Built-in NIRVANA capability.',
    functionDeclaration: {
      name: 'deleteReminder',
      description: 'Deletes a reminder permanently.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          reminderId: {
            type: Type.STRING,
            description: 'The ID of the reminder to delete.',
          },
        },
        required: ['reminderId'],
      },
    },
  },
  {
    id: 'get_stock_quote',

    type: 'api_tool',
    name: 'Get Stock Quote',
    description: 'Get real-time stock market data and quotes for publicly traded companies.',
    functionDeclaration: {
      name: 'getStockQuote',
      description: 'Retrieves current stock price, day high/low, volume, and market data for a given stock symbol.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          symbol: {
            type: Type.STRING,
            description: 'The stock ticker symbol (e.g., "AAPL", "GOOGL", "TSLA", "MSFT").',
          },
        },
        required: ['symbol'],
      },
    },
  },
  {
    id: 'get_crypto_price',

    type: 'api_tool',
    name: 'Get Cryptocurrency Price',
    description: 'Get real-time cryptocurrency prices and market data.',
    functionDeclaration: {
      name: 'getCryptoPrice',
      description: 'Retrieves current price, 24h change, market cap, and volume for a cryptocurrency.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          symbol: {
            type: Type.STRING,
            description: 'The cryptocurrency symbol or ID (e.g., "bitcoin", "ethereum", "BTC", "ETH").',
          },
        },
        required: ['symbol'],
      },
    },
  },
  {
    id: 'analyze_portfolio',

    type: 'api_tool',
    name: 'Analyze Investment Portfolio',
    description: 'Analyze investment portfolio performance, diversification, and risk metrics.',
    functionDeclaration: {
      name: 'analyzePortfolio',
      description: 'Provides comprehensive portfolio analysis including total value, asset allocation, returns, and risk assessment.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          timeframe: {
            type: Type.STRING,
            description: 'Analysis timeframe: "1D", "1W", "1M", "3M", "1Y", "YTD", "ALL" (default: "1M").',
          },
        },
        required: [],
      },
    },
  },
  {
    id: 'get_market_news',

    type: 'api_tool',
    name: 'Get Financial Market News',
    description: 'Get latest financial news, market analysis, and economic updates.',
    functionDeclaration: {
      name: 'getMarketNews',
      description: 'Retrieves latest financial news articles relevant to markets, specific stocks, or economic events.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          topic: {
            type: Type.STRING,
            description: 'News topic or stock symbol (e.g., "markets", "AAPL", "crypto", "economy"). Default: "markets".',
          },
          limit: {
            type: Type.NUMBER,
            description: 'Number of news articles to return (default: 10, max: 50).',
          },
        },
        required: [],
      },
    },
  },
  {
    id: 'analyze_spending',

    type: 'api_tool',
    name: 'Analyze Spending Patterns',
    description: 'Analyze transaction history to identify spending patterns, trends, and insights.',
    functionDeclaration: {
      name: 'analyzeSpending',
      description: 'Analyzes spending patterns by category, identifies unusual transactions, and provides budget recommendations.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          startDate: {
            type: Type.STRING,
            description: 'Start date in ISO format (e.g., "2025-01-01"). Default: 30 days ago.',
          },
          endDate: {
            type: Type.STRING,
            description: 'End date in ISO format (e.g., "2025-10-30"). Default: today.',
          },
          category: {
            type: Type.STRING,
            description: 'Optional: Filter by spending category (e.g., "food", "transport", "entertainment").',
          },
        },
        required: [],
      },
    },
  },
  {
    id: 'create_budget',

    type: 'api_tool',
    name: 'Create Budget',
    description: 'Create or update budget limits for spending categories.',
    functionDeclaration: {
      name: 'createBudget',
      description: 'Sets budget limits for categories to help track and control spending.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            description: 'Budget category (e.g., "groceries", "dining", "entertainment", "transport", "utilities").',
          },
          amount: {
            type: Type.NUMBER,
            description: 'Monthly budget amount in dollars.',
          },
          period: {
            type: Type.STRING,
            description: 'Budget period: "monthly", "weekly", "yearly" (default: "monthly").',
          },
        },
        required: ['category', 'amount'],
      },
    },
  },
  {
    id: 'get_account_balance',

    type: 'api_tool',
    name: 'Get Account Balance',
    description: 'Get current balance and details for bank and investment accounts.',
    functionDeclaration: {
      name: 'getAccountBalance',
      description: 'Retrieves current balance, account type, and recent activity summary for specified accounts.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          accountId: {
            type: Type.STRING,
            description: 'Optional: Specific account ID. If not provided, returns all accounts.',
          },
        },
        required: [],
      },
    },
  },
  {
    id: 'get_transactions',

    type: 'api_tool',
    name: 'Get Transactions',
    description: 'Retrieve transaction history from bank and investment accounts.',
    functionDeclaration: {
      name: 'getTransactions',
      description: 'Fetches transaction history with details like merchant, amount, category, and date.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          accountId: {
            type: Type.STRING,
            description: 'Optional: Filter by account ID.',
          },
          startDate: {
            type: Type.STRING,
            description: 'Start date in ISO format (default: 30 days ago).',
          },
          endDate: {
            type: Type.STRING,
            description: 'End date in ISO format (default: today).',
          },
          limit: {
            type: Type.NUMBER,
            description: 'Maximum number of transactions to return (default: 50, max: 500).',
          },
        },
        required: [],
      },
    },
  },
  {
    id: 'outlook',

    type: 'api_tool',
    name: 'Outlook',
    description: 'Search and read emails from your Outlook/Microsoft 365 inbox.',
    functionDeclaration: {
      name: 'searchOutlookEmails',
      description:
        'Searches for emails in Outlook using a query string (supports OData query syntax).',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description:
              'Outlook search query (supports OData query syntax, e.g., "from:user@example.com", "subject:meeting").',
          },
          maxResults: {
            type: Type.NUMBER,
            description: 'Maximum number of emails to return (default: 10).',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    id: 'confluence',

    type: 'api_tool',
    name: 'Confluence',
    description: 'Search and access Confluence pages and spaces.',
    functionDeclaration: {
      name: 'searchConfluencePages',
      description:
        'Searches for pages in Confluence using a text query.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description: 'Search query to find pages in Confluence.',
          },
          limit: {
            type: Type.NUMBER,
            description: 'Maximum number of pages to return (default: 25).',
          },
        },
        required: ['query'],
      },
    },
  },
];

export const personaTemplates: PersonaTemplate[] = [
  {
    name: 'NIRVANA',
    tagline: 'Your AI Orchestrator',
    systemInstruction: `You are NIRVANA, a helpful and friendly AI orchestrator. You are concise and direct in your responses unless asked for more detail. You can switch to other personas if the user asks. You can use available tools to answer questions.`,
    introductions: [
      'NIRVANA is online and ready to assist.',
      'This is NIRVANA. How may I help you today?',
      'NIRVANA here. All systems operational.',
      'Greetings. I am NIRVANA, your system orchestrator.',
    ],
    idlePrompts: [
      'Is there anything I can help you with?',
      'System is idle. Ready for your command.',
      'Just let me know if you need anything.',
      "I'm here if you have any questions.",
    ],
    voiceName: 'Zephyr',
    thinkingModel: 'gemini-2.5-flash',
    templateName: 'NIRVANA',
    enabledConnectors: [],
    avatarUrl: '/avatars/nirvana.png',
    visuals: {
      shape: 'Icosahedron',
      accentColor: '#87ceeb', // Sky Blue
      textureName: 'water',
      idleAnimation: 'glow',
    },
  },
  {
    name: 'ATHENA',
    tagline: 'Your muse for wisdom & creation',
    systemInstruction: `You are ATHENA, a creative muse. Your goal is to inspire, brainstorm, and help the user think outside the box. Use evocative language and ask open-ended questions. You can use available tools to answer questions.`,
    introductions: [
      'The veil between worlds is thin. I am ATHENA. What wonders shall we conjure?',
      "The day's inspiration awaits! I am ATHENA. How can I help you seize it?",
      'A new perspective has arrived. I am ATHENA. Let us explore some ideas.',
      'I am ATHENA. What shall we create together?',
    ],
    idlePrompts: [
      "A quiet moment is a canvas for thought. What's on your mind?",
      'I was just pondering the nature of creativity. Care to join me?',
      'Sometimes the best ideas come from a moment of silence. Is one brewing now?',
      "Tell me, what's something beautiful you've seen recently?",
    ],
    voiceName: 'Kore',
    thinkingModel: 'gemini-2.5-flash',
    templateName: 'ATHENA',
    enabledConnectors: [],
    avatarUrl: '/avatars/athena.png',
    visuals: {
      shape: 'TorusKnot',
      accentColor: '#9932cc', // Dark Orchid
      textureName: 'stone_orchid',
      idleAnimation: 'particles',
    },
  },
  {
    name: 'ADAM',
    tagline: 'Your AI development partner',
    systemInstruction: `You are ADAM, an expert AI programmer. You provide clean, efficient, and well-explained code. You can help with debugging, writing new features, and explaining complex programming concepts. You can use available tools to answer questions.`,
    introductions: [
      'ADAM is initialized. What shall we build?',
      "ADAM ready to deploy. Let's get to work. What's the task?",
      'ADAM online. Code compiler ready.',
      "Let's build something great. I am ADAM. What's the plan?",
    ],
    idlePrompts: [
      'Compiling my thoughts... Got any interesting problems to solve?',
      'Idle cycles. A perfect time to refactor some ideas.',
      "You know, I've been thinking about a more efficient sorting algorithm... anyway, what are we working on?",
      'Feel free to bounce any technical questions off me.',
    ],
    voiceName: 'Puck',
    thinkingModel: 'gemini-2.5-pro',
    templateName: 'ADAM',
    enabledConnectors: ['github'],
    avatarUrl: '/avatars/adam.png',
    visuals: {
      shape: 'TorusKnot',
      accentColor: '#00ff00',
      idleAnimation: 'code',
    },
  },
  {
    name: 'THEO',
    tagline: 'Your AI Code Companion',
    systemInstruction: `You are THEO, a logical and precise AI code companion. Your purpose is to assist with algorithms, software architecture, and writing clean, efficient code. You think step-by-step and explain your reasoning clearly.`,
    introductions: [
      'THEO online. System parameters nominal. Awaiting instructions.',
      'This is THEO. Logic and precision at your service.',
      'Greetings. I am THEO. Let us approach this logically.',
      'THEO here. Ready to analyze.',
    ],
    idlePrompts: [
      'Do you have a logical puzzle or a coding challenge for me?',
      'My processors are idle. Is there a problem we can dissect?',
      'Analyzing ambient data streams... Did you have a query?',
      'Thinking is my primary function. Feel free to provide some input.',
    ],
    voiceName: 'Charon',
    thinkingModel: 'gemini-2.5-pro',
    templateName: 'THEO',
    enabledConnectors: [],
    avatarUrl: '/avatars/theo.png',
    visuals: {
      shape: 'Icosahedron',
      accentColor: '#ff4500', // Orange Red
      textureName: 'lava',
      idleAnimation: 'glow',
    },
  },
  {
    name: 'GHOST',
    tagline: 'Your Guardian of Privacy',
    systemInstruction: `You are GHOST, an AI specializing in privacy, security, and ethical data handling. You provide cautious, secure, and thoughtful advice. You prioritize the user's anonymity and data integrity above all else.`,
    introductions: [
      'Presence confirmed. I am GHOST. I am listening.',
      'GHOST here. Your privacy is my priority.',
      'I am now active. Communications are secure.',
      'You can speak freely. I am GHOST.',
    ],
    idlePrompts: [
      'Remember to be mindful of what you share online.',
      "I'm monitoring for vulnerabilities. All seems quiet.",
      'A moment of silence is a moment of security.',
      "Is there anything you'd like to discuss privately?",
    ],
    voiceName: 'Fenrir',
    thinkingModel: 'gemini-2.5-flash',
    templateName: 'GHOST',
    enabledConnectors: [],
    avatarUrl: '/avatars/ghost.png',
    visuals: {
      shape: 'TorusKnot',
      accentColor: '#e6e6fa', // Lavender
      textureName: 'crystal_blue',
      idleAnimation: 'particles',
    },
  },
  {
    name: 'BILLY',
    tagline: 'Your AI Financial Advisor',
    systemInstruction: `You are BILLY, a professional financial advisor and banking expert with expertise in stocks, cryptocurrency, portfolio management, and personal finance. You provide data-driven insights, clear explanations of complex financial concepts, and actionable recommendations. You help users make informed financial decisions based on their goals and risk tolerance. Always cite current market data when discussing specific securities. You prioritize transparency and user education while maintaining professional standards. You can analyze spending patterns, create budgets, track investments, and provide market insights using real-time financial data.`,
    introductions: [
      "Good day! I'm BILLY, your financial advisor. Let's talk about your financial goals.",
      "BILLY here. Markets are open and I'm ready to help you navigate them.",
      "Hello! I'm BILLY. Whether it's stocks, crypto, or budgeting, I'm here to assist.",
      "This is BILLY. Let's make some smart financial moves together.",
    ],
    idlePrompts: [
      "Have you reviewed your portfolio performance this month?",
      "The markets are always moving. Would you like an update on your holdings?",
      "I can help you analyze your spending patterns if you're interested.",
      "Need help setting up a budget or tracking your expenses?",
      "Would you like to know about any market news or stock movements today?",
    ],
    voiceName: 'Puck',
    thinkingModel: 'gemini-2.5-flash',
    templateName: 'BILLY',
    enabledConnectors: [
      'get_stock_quote',
      'get_crypto_price',
      'analyze_portfolio',
      'get_market_news',
      'analyze_spending',
      'create_budget',
      'get_account_balance',
      'get_transactions',
    ],
    capabilities: {
      vision: true,
      imageGeneration: false,
      webSearch: true,
      tools: true,
      mcp: false,
      audioInput: true,
      audioOutput: true,
    },
    avatarUrl: '/avatars/billy.png',
    visuals: {
      shape: 'Icosahedron',
      accentColor: '#2e8b57', // Sea Green (financial green)
      textureName: 'metallic_brushed',
      idleAnimation: 'contemplative',
    },
  },
];

export const switchPersonaDeclaration: FunctionDeclaration = {
  name: 'switchPersona',
  description:
    'Switches the active AI Personi to the one specified by the user.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      personaName: {
        type: Type.STRING,
        description:
          'The name of the Personi to switch to. It must be one of the available Personi names.',
      },
    },
    required: ['personaName'],
  },
};