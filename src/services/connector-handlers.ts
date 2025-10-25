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

  async handleGmail(params: {
    query: string;
    maxResults?: number;
  }): Promise<ConnectorResult> {
    this.logOperation('Gmail', 'searchGmailEmails', params);

    try {
      const maxResults = params.maxResults || 10;

      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(params.query)}&maxResults=${maxResults}`,
        {
          headers: {
            Authorization: `Bearer ${await this.getGoogleAccessToken()}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          return {
            success: false,
            requiresSetup: true,
            setupInstructions:
              'Gmail integration not configured. Please set up Gmail access in the Connectors panel.',
          };
        }
        throw new Error(`Gmail API error: ${response.statusText}`);
      }

      const data = await response.json();
      const messages = data.messages || [];

      const emailDetails = await Promise.all(
        messages.slice(0, 5).map(async (msg: any) => {
          const detailResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
            {
              headers: {
                Authorization: `Bearer ${await this.getGoogleAccessToken()}`,
              },
            }
          );
          const detail = await detailResponse.json();
          const headers = detail.payload?.headers || [];
          const subject =
            headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)';
          const from =
            headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
          const date =
            headers.find((h: any) => h.name === 'Date')?.value || '';
          return { id: msg.id, subject, from, date };
        })
      );

      return {
        success: true,
        data: {
          query: params.query,
          resultCount: messages.length,
          emails: emailDetails,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        requiresSetup: true,
        error: error.message,
        setupInstructions:
          'Gmail integration required. Please configure Gmail access to search emails.',
      };
    }
  }

  async handleGoogleCalendar(params: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
  }): Promise<ConnectorResult> {
    this.logOperation('Google Calendar', 'getCalendarEvents', params);

    try {
      const timeMin = params.timeMin || new Date().toISOString();
      const timeMax =
        params.timeMax ||
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const maxResults = params.maxResults || 10;

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${await this.getGoogleAccessToken()}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          return {
            success: false,
            requiresSetup: true,
            setupInstructions:
              'Google Calendar integration not configured. Please set up Calendar access in the Connectors panel.',
          };
        }
        throw new Error(`Calendar API error: ${response.statusText}`);
      }

      const data = await response.json();
      const events = (data.items || []).map((event: any) => ({
        id: event.id,
        summary: event.summary || '(No title)',
        start: event.start?.dateTime || event.start?.date || '',
        end: event.end?.dateTime || event.end?.date || '',
        location: event.location || '',
        description: event.description || '',
      }));

      return {
        success: true,
        data: {
          timeRange: { start: timeMin, end: timeMax },
          eventCount: events.length,
          events,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        requiresSetup: true,
        error: error.message,
        setupInstructions:
          'Google Calendar integration required. Please configure Calendar access to view events.',
      };
    }
  }

  async handleNotion(params: { query: string }): Promise<ConnectorResult> {
    this.logOperation('Notion', 'searchNotionPages', params);

    try {
      const notionToken = await this.getNotionToken();

      const response = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${notionToken}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: params.query,
          filter: {
            property: 'object',
            value: 'page',
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          return {
            success: false,
            requiresSetup: true,
            setupInstructions:
              'Notion integration not configured. Please set up Notion access in the Connectors panel.',
          };
        }
        throw new Error(`Notion API error: ${response.statusText}`);
      }

      const data = await response.json();
      const pages = (data.results || []).map((page: any) => ({
        id: page.id,
        title: page.properties?.title?.title?.[0]?.plain_text || '(Untitled)',
        url: page.url,
        lastEditedTime: page.last_edited_time,
      }));

      return {
        success: true,
        data: {
          query: params.query,
          resultCount: pages.length,
          pages,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        requiresSetup: true,
        error: error.message,
        setupInstructions:
          'Notion integration required. Please configure Notion access to search pages.',
      };
    }
  }

  async handleLinear(params: {
    filter?: string;
    limit?: number;
  }): Promise<ConnectorResult> {
    this.logOperation('Linear', 'getLinearIssues', params);

    try {
      const linearToken = await this.getLinearToken();
      const limit = params.limit || 20;

      const query = `
        query {
          issues(first: ${limit}) {
            nodes {
              id
              identifier
              title
              state {
                name
              }
              assignee {
                name
              }
              priority
              createdAt
              url
            }
          }
        }
      `;

      const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${linearToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          return {
            success: false,
            requiresSetup: true,
            setupInstructions:
              'Linear integration not configured. Please set up Linear access in the Connectors panel.',
          };
        }
        throw new Error(`Linear API error: ${response.statusText}`);
      }

      const data = await response.json();
      const issues = (data.data?.issues?.nodes || []).map((issue: any) => ({
        id: issue.identifier,
        title: issue.title,
        state: issue.state?.name || 'Unknown',
        assignee: issue.assignee?.name || 'Unassigned',
        priority: issue.priority || 0,
        url: issue.url,
      }));

      return {
        success: true,
        data: {
          filter: params.filter || 'none',
          issueCount: issues.length,
          issues,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        requiresSetup: true,
        error: error.message,
        setupInstructions:
          'Linear integration required. Please configure Linear access to view issues.',
      };
    }
  }

  async handleSlack(params: {
    channel: string;
    message: string;
    threadTs?: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Slack', 'sendSlackMessage', params);

    try {
      const slackToken = await this.getSlackBotToken();

      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${slackToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: params.channel,
          text: params.message,
          thread_ts: params.threadTs,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        if (data.error === 'invalid_auth' || data.error === 'not_authed') {
          return {
            success: false,
            requiresSetup: true,
            setupInstructions:
              'Slack Bot Token not configured. Please add SLACK_BOT_TOKEN to your secrets.',
          };
        }
        throw new Error(`Slack API error: ${data.error}`);
      }

      return {
        success: true,
        data: {
          channel: params.channel,
          timestamp: data.ts,
          message: params.message,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        requiresSetup: true,
        error: error.message,
        setupInstructions:
          'Slack Bot Token required. Please add SLACK_BOT_TOKEN secret with chat:write scope.',
      };
    }
  }

  async handleGitHub(params: { repoName: string }): Promise<ConnectorResult> {
    this.logOperation('GitHub', 'getGithubRepoDetails', params);

    try {
      const githubToken = await this.getGitHubToken();

      const response = await fetch(
        `https://api.github.com/repos/${params.repoName}`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          return {
            success: false,
            requiresSetup: true,
            setupInstructions:
              'GitHub integration not configured. Please set up GitHub access in the Connectors panel.',
          };
        }
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const repo = await response.json();

      const pullsResponse = await fetch(
        `https://api.github.com/repos/${params.repoName}/pulls`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      const pulls = pullsResponse.ok ? await pullsResponse.json() : [];

      return {
        success: true,
        data: {
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          openIssues: repo.open_issues_count,
          language: repo.language,
          openPullRequests: pulls.length,
          url: repo.html_url,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        requiresSetup: true,
        error: error.message,
        setupInstructions:
          'GitHub integration required. Please configure GitHub access to view repository details.',
      };
    }
  }

  async handleGoogleDrive(params: {
    fileName: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Google Drive', 'readFileFromGoogleDrive', params);
    return {
      success: false,
      requiresSetup: true,
      setupInstructions:
        'Google Drive handler not yet fully implemented. Integration coming soon.',
    };
  }

  async handleGoogleDocs(params: {
    documentId: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Google Docs', 'readGoogleDoc', params);
    return {
      success: false,
      requiresSetup: true,
      setupInstructions:
        'Google Docs handler not yet fully implemented. Integration coming soon.',
    };
  }

  async handleGoogleSheets(params: {
    spreadsheetId: string;
    range?: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Google Sheets', 'readGoogleSheet', params);
    return {
      success: false,
      requiresSetup: true,
      setupInstructions:
        'Google Sheets handler not yet fully implemented. Integration coming soon.',
    };
  }

  async handleYouTube(params: { url: string }): Promise<ConnectorResult> {
    this.logOperation('YouTube', 'getYoutubeVideoDetails', params);
    return {
      success: false,
      requiresSetup: true,
      setupInstructions:
        'YouTube handler not yet fully implemented. Integration coming soon.',
    };
  }

  async handleJira(params: {
    jql: string;
    maxResults?: number;
  }): Promise<ConnectorResult> {
    this.logOperation('Jira', 'searchJiraIssues', params);
    return {
      success: false,
      requiresSetup: true,
      setupInstructions:
        'Jira handler not yet fully implemented. Integration coming soon.',
    };
  }

  async handleAsana(params: {
    projectId?: string;
    assignee?: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Asana', 'getAsanaTasks', params);
    return {
      success: false,
      requiresSetup: true,
      setupInstructions:
        'Asana handler not yet fully implemented. Integration coming soon.',
    };
  }

  async handleConfluence(params: {
    query: string;
    limit?: number;
  }): Promise<ConnectorResult> {
    this.logOperation('Confluence', 'searchConfluencePages', params);
    return {
      success: false,
      requiresSetup: true,
      setupInstructions:
        'Confluence handler not yet fully implemented. Integration coming soon.',
    };
  }

  async handleHubSpot(params: {
    searchQuery?: string;
    limit?: number;
  }): Promise<ConnectorResult> {
    this.logOperation('HubSpot', 'getHubSpotContacts', params);
    return {
      success: false,
      requiresSetup: true,
      setupInstructions:
        'HubSpot handler not yet fully implemented. Integration coming soon.',
    };
  }

  async handleDropbox(params: { filePath: string }): Promise<ConnectorResult> {
    this.logOperation('Dropbox', 'readDropboxFile', params);
    return {
      success: false,
      requiresSetup: true,
      setupInstructions:
        'Dropbox handler not yet fully implemented. Integration coming soon.',
    };
  }

  async handleBox(params: { fileId: string }): Promise<ConnectorResult> {
    this.logOperation('Box', 'readBoxFile', params);
    return {
      success: false,
      requiresSetup: true,
      setupInstructions:
        'Box handler not yet fully implemented. Integration coming soon.',
    };
  }

  async handleOneDrive(params: {
    filePath: string;
  }): Promise<ConnectorResult> {
    this.logOperation('OneDrive', 'readOneDriveFile', params);
    return {
      success: false,
      requiresSetup: true,
      setupInstructions:
        'OneDrive handler not yet fully implemented. Integration coming soon.',
    };
  }

  async handleSharePoint(params: {
    siteUrl: string;
    filePath: string;
  }): Promise<ConnectorResult> {
    this.logOperation('SharePoint', 'readSharePointFile', params);
    return {
      success: false,
      requiresSetup: true,
      setupInstructions:
        'SharePoint handler not yet fully implemented. Integration coming soon.',
    };
  }

  async handleDiscord(params: {
    channelId: string;
    message: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Discord', 'sendDiscordMessage', params);
    return {
      success: false,
      requiresSetup: true,
      setupInstructions:
        'Discord handler not yet fully implemented. Integration coming soon.',
    };
  }

  async handleSpotify(params: {}): Promise<ConnectorResult> {
    this.logOperation('Spotify', 'getCurrentSpotifyTrack', params);
    return {
      success: false,
      requiresSetup: true,
      setupInstructions:
        'Spotify handler not yet fully implemented. Integration coming soon.',
    };
  }

  async handleOutlook(params: {
    query: string;
    maxResults?: number;
  }): Promise<ConnectorResult> {
    this.logOperation('Outlook', 'searchOutlookEmails', params);
    return {
      success: false,
      requiresSetup: true,
      setupInstructions:
        'Outlook handler not yet fully implemented. Integration coming soon.',
    };
  }

  async handleTwilio(params: {
    to: string;
    message: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Twilio', 'sendTwilioSMS', params);
    return {
      success: false,
      requiresSetup: true,
      setupInstructions:
        'Twilio handler not yet fully implemented. Integration coming soon.',
    };
  }

  async handleSendGrid(params: {
    to: string;
    subject: string;
    body: string;
  }): Promise<ConnectorResult> {
    this.logOperation('SendGrid', 'sendEmailViaSendGrid', params);
    return {
      success: false,
      requiresSetup: true,
      setupInstructions:
        'SendGrid handler not yet fully implemented. Integration coming soon.',
    };
  }

  async handleResend(params: {
    to: string;
    subject: string;
    body: string;
  }): Promise<ConnectorResult> {
    this.logOperation('Resend', 'sendEmailViaResend', params);
    return {
      success: false,
      requiresSetup: true,
      setupInstructions:
        'Resend handler not yet fully implemented. Integration coming soon.',
    };
  }

  private async getGoogleAccessToken(): Promise<string> {
    const token = process.env.GOOGLE_ACCESS_TOKEN;
    if (!token) {
      throw new Error('Google access token not configured');
    }
    return token;
  }

  private async getNotionToken(): Promise<string> {
    const token = process.env.NOTION_TOKEN;
    if (!token) {
      throw new Error('Notion token not configured');
    }
    return token;
  }

  private async getLinearToken(): Promise<string> {
    const token = process.env.LINEAR_API_KEY;
    if (!token) {
      throw new Error('Linear API key not configured');
    }
    return token;
  }

  private async getSlackBotToken(): Promise<string> {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) {
      throw new Error('Slack bot token not configured');
    }
    return token;
  }

  private async getGitHubToken(): Promise<string> {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GitHub token not configured');
    }
    return token;
  }
}

export const connectorHandlers = new ConnectorHandlers();
