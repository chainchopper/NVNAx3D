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
}

export const connectorHandlers = new ConnectorHandlers();
