/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ConnectorResult {
  success: boolean;
  data?: any;
  error?: string;
  requiresSetup?: boolean;
  setupInstructions?: string;
}

export class ConnectorHandlers {
  private logOperation(connector: string, operation: string, params: any) {
    console.log(`[Connector: ${connector}] ${operation}`, params);
  }

  private async callBackend(endpoint: string, body: any): Promise<ConnectorResult> {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('[Backend Error]', error);
      return {
        success: false,
        error: error.message,
        requiresSetup: true,
        setupInstructions: 'Failed to connect to backend server. Please ensure the backend is running.',
      };
    }
  }

  private async callBackendGet(url: string): Promise<ConnectorResult> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.error) {
        return {
          success: false,
          error: data.error,
          requiresSetup: data.requiresSetup || false,
          setupInstructions: data.setupInstructions,
        };
      }

      return {
        success: true,
        data: data,
      };
    } catch (error: any) {
      console.error('[Backend Error]', error);
      return {
        success: false,
        error: error.message,
        requiresSetup: true,
        setupInstructions: 'Failed to connect to backend server. Please ensure the backend is running.',
      };
    }
  }

  async handleGmail(params: {
    query: string;
    maxResults?: number;
  }): Promise<ConnectorResult> {
    this.logOperation('Gmail', 'searchGmailEmails', params);
    return this.callBackend('/api/connectors/gmail/search', params);
  }

  async handleGoogleCalendar(params: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
  }): Promise<ConnectorResult> {
    this.logOperation('Google Calendar', 'getCalendarEvents', params);
    return this.callBackend('/api/connectors/calendar/events', params);
  }

  async handleGoogleDocs(params: {
    documentId: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Google Docs', 'readGoogleDoc', params);
    return this.callBackend('/api/connectors/googledocs/read', params);
  }

  async handleGoogleSheets(params: {
    spreadsheetId: string;
    range?: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Google Sheets', 'readGoogleSheet', params);
    return this.callBackend('/api/connectors/googlesheets/read', params);
  }

  async handleNotion(params: { query: string }): Promise<ConnectorResult> {
    this.logOperation('Notion', 'searchNotionPages', params);
    return this.callBackend('/api/connectors/notion/search', params);
  }

  async handleLinear(params: {
    filter?: string;
    limit?: number;
  }): Promise<ConnectorResult> {
    this.logOperation('Linear', 'getLinearIssues', params);
    return this.callBackend('/api/connectors/linear/issues', params);
  }

  async handleSlack(params: {
    channel: string;
    message: string;
    threadTs?: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Slack', 'sendSlackMessage', params);
    return this.callBackend('/api/connectors/slack/send', params);
  }

  async handleGitHub(params: { repoName: string }): Promise<ConnectorResult> {
    this.logOperation('GitHub', 'getGithubRepoDetails', params);
    return this.callBackend('/api/connectors/github/repo', params);
  }

  async handleOutlook(params: {
    query: string;
    maxResults?: number;
  }): Promise<ConnectorResult> {
    this.logOperation('Outlook', 'searchOutlookEmails', params);
    return this.callBackend('/api/connectors/outlook/search', params);
  }

  async handleJira(params: {
    jql: string;
    maxResults?: number;
  }): Promise<ConnectorResult> {
    this.logOperation('Jira', 'searchJiraIssues', params);
    return this.callBackend('/api/connectors/jira/search', params);
  }

  async handleAsana(params: {
    projectId?: string;
    assignee?: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Asana', 'getAsanaTasks', params);
    return this.callBackend('/api/connectors/asana/tasks', params);
  }

  async handleConfluence(params: {
    query: string;
    limit?: number;
  }): Promise<ConnectorResult> {
    this.logOperation('Confluence', 'searchConfluencePages', params);
    return this.callBackend('/api/connectors/confluence/search', params);
  }

  async handleHomeassistant(params: {
    domain?: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Home Assistant', 'getHomeAssistantDevices', params);
    return this.callBackend('/api/connectors/homeassistant/devices', params);
  }

  async handleHomeassistantState(params: {
    entityId: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Home Assistant', 'getHomeAssistantState', params);
    return this.callBackend('/api/connectors/homeassistant/state', params);
  }

  async handleHomeassistantControl(params: {
    domain: string;
    service: string;
    entityId: string;
    serviceData?: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Home Assistant', 'controlHomeAssistantDevice', params);
    return this.callBackend('/api/connectors/homeassistant/control', params);
  }

  async handleFrigateEvents(params: {
    camera: string;
    objectType?: string;
    limit?: number;
  }): Promise<ConnectorResult> {
    this.logOperation('Frigate', 'getFrigateEvents', params);
    return this.callBackend('/api/connectors/frigate/events', params);
  }

  async handleFrigateSnapshot(params: {
    camera: string;
    eventId?: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Frigate', 'getFrigateSnapshot', params);
    return this.callBackend('/api/connectors/frigate/snapshot', params);
  }

  async handleFrigateCameraState(params: {
    camera: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Frigate', 'getFrigateCameraState', params);
    return this.callBackend('/api/connectors/frigate/camera-state', params);
  }

  async handleCodeprojectaiDetect(params: {
    imageUrl: string;
    minConfidence?: number;
  }): Promise<ConnectorResult> {
    this.logOperation('CodeProject.AI', 'detectObjectsCodeProjectAI', params);
    return this.callBackend('/api/connectors/codeprojectai/detect', params);
  }

  async handleYoloDetect(params: {
    imageUrl: string;
    minConfidence?: number;
  }): Promise<ConnectorResult> {
    this.logOperation('YOLO', 'detectObjectsYOLO', params);
    return this.callBackend('/api/connectors/yolo/detect', params);
  }

  async handleSetReminder(params: {
    title: string;
    dueDate: string;
    notificationTimes: string;
    description?: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Reminder', 'setReminder', params);
    
    try {
      const { reminderManager } = await import('./reminder-manager');
      const notifyTimes = JSON.parse(params.notificationTimes);
      const reminderId = await reminderManager.setReminder(
        params.title,
        new Date(params.dueDate),
        notifyTimes,
        params.description,
        'AI'
      );

      return {
        success: true,
        data: {
          reminderId,
          message: `Reminder "${params.title}" set for ${new Date(params.dueDate).toLocaleString()}`,
        },
      };
    } catch (error: any) {
      console.error('[Reminder Error]', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async handleListReminders(params: {
    showCompleted?: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Reminder', 'listReminders', params);
    
    try {
      const { reminderManager } = await import('./reminder-manager');
      const showCompleted = params.showCompleted === 'true';
      const reminders = reminderManager.listReminders(showCompleted);

      return {
        success: true,
        data: {
          count: reminders.length,
          reminders: reminders.map(r => ({
            id: r.id,
            title: r.title,
            description: r.description,
            dueDate: r.dueDate.toISOString(),
            completed: r.completed,
            createdBy: r.createdBy,
          })),
        },
      };
    } catch (error: any) {
      console.error('[Reminder Error]', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async handleCompleteReminder(params: {
    reminderId: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Reminder', 'completeReminder', params);
    
    try {
      const { reminderManager } = await import('./reminder-manager');
      const success = await reminderManager.completeReminder(params.reminderId);

      if (success) {
        return {
          success: true,
          data: { message: `Reminder ${params.reminderId} marked as completed` },
        };
      } else {
        return {
          success: false,
          error: 'Reminder not found',
        };
      }
    } catch (error: any) {
      console.error('[Reminder Error]', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async handleDeleteReminder(params: {
    reminderId: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Reminder', 'deleteReminder', params);
    
    try {
      const { reminderManager } = await import('./reminder-manager');
      const success = await reminderManager.deleteReminder(params.reminderId);

      if (success) {
        return {
          success: true,
          data: { message: `Reminder ${params.reminderId} deleted` },
        };
      } else {
        return {
          success: false,
          error: 'Reminder not found',
        };
      }
    } catch (error: any) {
      console.error('[Reminder Error]', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async handleGetStockQuote(params: {
    symbol: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Financial', 'getStockQuote', params);
    return this.callBackendGet(`/api/financial/stocks/${params.symbol}`);
  }

  async handleGetCryptoPrice(params: {
    symbol: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Financial', 'getCryptoPrice', params);
    return this.callBackendGet(`/api/financial/crypto/${params.symbol}`);
  }

  async handleAnalyzePortfolio(params: {
    timeframe?: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Financial', 'analyzePortfolio', params);
    return this.callBackendGet('/api/financial/portfolio/summary');
  }

  async handleGetMarketNews(params: {
    topic?: string;
    limit?: number;
  }): Promise<ConnectorResult> {
    this.logOperation('Financial', 'getMarketNews', params);
    
    const topic = params.topic || 'general';
    const limit = params.limit || 5;
    
    return {
      success: true,
      data: {
        topic,
        articles: [
          {
            title: 'Markets Rally on Strong Economic Data',
            source: 'Financial Times',
            summary: 'Stock markets reached new highs following better-than-expected employment figures.',
            timestamp: new Date().toISOString(),
            sentiment: 'positive',
          },
          {
            title: 'Tech Sector Shows Continued Growth',
            source: 'Bloomberg',
            summary: 'Technology stocks continue their upward trend amid AI innovation.',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            sentiment: 'positive',
          },
          {
            title: 'Federal Reserve Maintains Interest Rates',
            source: 'Reuters',
            summary: 'The Fed kept rates steady, signaling confidence in economic stability.',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            sentiment: 'neutral',
          },
        ].slice(0, limit),
        requiresSetup: true,
        setupInstructions: 'Market news is currently using mock data. Connect a real news API (e.g., NewsAPI, Finnhub) for live market news.',
      },
    };
  }

  async handleAnalyzeSpending(params: {
    startDate?: string;
    endDate?: string;
    category?: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Financial', 'analyzeSpending', params);
    
    const startDate = params.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = params.endDate || new Date().toISOString();
    const category = params.category || 'all';
    
    return {
      success: true,
      data: {
        period: { startDate, endDate },
        category,
        totalSpent: 3245.67,
        breakdown: [
          { category: 'Groceries', amount: 845.32, percentage: 26.0 },
          { category: 'Utilities', amount: 425.00, percentage: 13.1 },
          { category: 'Entertainment', amount: 312.50, percentage: 9.6 },
          { category: 'Dining', amount: 567.85, percentage: 17.5 },
          { category: 'Transportation', amount: 295.00, percentage: 9.1 },
          { category: 'Other', amount: 800.00, percentage: 24.7 },
        ],
        trends: {
          vsLastPeriod: -5.2,
          largestCategory: 'Groceries',
          unusualSpending: [],
        },
        requiresSetup: true,
        setupInstructions: 'Spending analysis is using mock data. Connect your bank or financial service (e.g., Plaid, Yodlee) for real transaction analysis.',
      },
    };
  }

  async handleCreateBudget(params: {
    category: string;
    amount: number;
    period: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Financial', 'createBudget', params);
    
    return {
      success: true,
      data: {
        budgetId: `budget_${Date.now()}`,
        category: params.category,
        amount: params.amount,
        period: params.period,
        currentSpending: 0,
        remaining: params.amount,
        message: `Budget created: $${params.amount} for ${params.category} (${params.period})`,
        requiresSetup: true,
        setupInstructions: 'Budget tracking is using mock data. Connect a budgeting service or bank API for real budget management.',
      },
    };
  }

  async handleGetAccountBalance(params: {
    accountId?: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Financial', 'getAccountBalance', params);
    
    const accountId = params.accountId || 'default';
    
    return {
      success: true,
      data: {
        accountId,
        accountName: 'Primary Checking',
        balance: 12543.28,
        availableBalance: 12543.28,
        currency: 'USD',
        lastUpdated: new Date().toISOString(),
        accounts: [
          {
            id: 'checking_001',
            name: 'Primary Checking',
            type: 'checking',
            balance: 12543.28,
            currency: 'USD',
          },
          {
            id: 'savings_001',
            name: 'High Yield Savings',
            type: 'savings',
            balance: 45230.50,
            currency: 'USD',
          },
          {
            id: 'credit_001',
            name: 'Rewards Credit Card',
            type: 'credit',
            balance: -1245.67,
            currency: 'USD',
          },
        ],
        requiresSetup: true,
        setupInstructions: 'Account balances are using mock data. Connect your bank via Plaid, Yodlee, or direct bank API for real account information.',
      },
    };
  }

  async handleGetTransactions(params: {
    accountId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<ConnectorResult> {
    this.logOperation('Financial', 'getTransactions', params);
    
    const limit = params.limit || 10;
    const mockTransactions = [
      {
        id: 'txn_001',
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        description: 'Grocery Store',
        amount: -87.43,
        category: 'Groceries',
        merchant: 'Whole Foods',
      },
      {
        id: 'txn_002',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Online Purchase',
        amount: -45.99,
        category: 'Shopping',
        merchant: 'Amazon',
      },
      {
        id: 'txn_003',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Salary Deposit',
        amount: 3500.00,
        category: 'Income',
        merchant: 'Employer Inc.',
      },
      {
        id: 'txn_004',
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Electric Bill',
        amount: -125.50,
        category: 'Utilities',
        merchant: 'Power Company',
      },
      {
        id: 'txn_005',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Restaurant',
        amount: -67.80,
        category: 'Dining',
        merchant: 'Italian Bistro',
      },
    ];
    
    return {
      success: true,
      data: {
        accountId: params.accountId || 'default',
        count: mockTransactions.length,
        transactions: mockTransactions.slice(0, limit),
        totalDebits: mockTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
        totalCredits: mockTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
        requiresSetup: true,
        setupInstructions: 'Transactions are using mock data. Connect your bank via Plaid, Yodlee, or direct bank API for real transaction history.',
      },
    };
  }
}

export const connectorHandlers = new ConnectorHandlers();
