/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ConnectorConfig {
  id: string;
  name: string;
  configured: boolean;
  verified: boolean;
  lastVerified?: string;
}

export interface ConnectorFieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url';
  placeholder?: string;
  required: boolean;
  helpText?: string;
}

export const CONNECTOR_FIELDS: Record<string, ConnectorFieldDefinition[]> = {
  gmail: [
    {
      key: 'googleAccessToken',
      label: 'Google Access Token (Optional - use OAuth button above)',
      type: 'password',
      placeholder: 'Enter your Google OAuth access token',
      required: false,
      helpText: 'OAuth token with Gmail read permissions. Use "Connect with Google" button instead for easier setup.',
    },
  ],
  google_calendar: [
    {
      key: 'googleAccessToken',
      label: 'Google Access Token (Optional - use OAuth button above)',
      type: 'password',
      placeholder: 'Enter your Google OAuth access token',
      required: false,
      helpText: 'OAuth token with Calendar read permissions. Use "Connect with Google" button instead for easier setup.',
    },
  ],
  google_docs: [
    {
      key: 'googleAccessToken',
      label: 'Google Access Token (Optional - use OAuth button above)',
      type: 'password',
      placeholder: 'Enter your Google OAuth access token',
      required: false,
      helpText: 'OAuth token with Google Docs read permissions. Use "Connect with Google" button instead for easier setup.',
    },
  ],
  google_sheets: [
    {
      key: 'googleAccessToken',
      label: 'Google Access Token (Optional - use OAuth button above)',
      type: 'password',
      placeholder: 'Enter your Google OAuth access token',
      required: false,
      helpText: 'OAuth token with Google Sheets read permissions. Use "Connect with Google" button instead for easier setup.',
    },
  ],
  github: [
    {
      key: 'githubToken',
      label: 'GitHub Personal Access Token',
      type: 'password',
      placeholder: 'ghp_...',
      required: true,
      helpText: 'Create a token at github.com/settings/tokens',
    },
  ],
  notion: [
    {
      key: 'notionToken',
      label: 'Notion Integration Token',
      type: 'password',
      placeholder: 'secret_...',
      required: true,
      helpText: 'Create an integration at notion.so/my-integrations',
    },
  ],
  linear: [
    {
      key: 'linearApiKey',
      label: 'Linear API Key',
      type: 'password',
      placeholder: 'lin_api_...',
      required: true,
      helpText: 'Find in Linear Settings → API',
    },
  ],
  slack: [
    {
      key: 'slackBotToken',
      label: 'Slack Bot Token',
      type: 'password',
      placeholder: 'xoxb-...',
      required: true,
      helpText: 'Bot User OAuth Token with chat:write scope',
    },
  ],
  outlook: [
    {
      key: 'outlookToken',
      label: 'Microsoft Outlook Token',
      type: 'password',
      placeholder: 'Enter your Microsoft OAuth access token',
      required: true,
      helpText: 'OAuth token with Mail.Read permissions',
    },
  ],
  jira: [
    {
      key: 'jiraDomain',
      label: 'Jira Domain',
      type: 'text',
      placeholder: 'yourcompany.atlassian.net',
      required: true,
      helpText: 'Your Jira instance domain',
    },
    {
      key: 'jiraToken',
      label: 'Jira API Token',
      type: 'password',
      placeholder: 'API token',
      required: true,
      helpText: 'Create at id.atlassian.com/manage-profile/security/api-tokens',
    },
    {
      key: 'jiraEmail',
      label: 'Jira Email',
      type: 'text',
      placeholder: 'your@email.com',
      required: true,
      helpText: 'Email associated with your Jira account',
    },
  ],
  asana: [
    {
      key: 'asanaToken',
      label: 'Asana Personal Access Token',
      type: 'password',
      placeholder: 'Enter Asana PAT',
      required: true,
      helpText: 'Create in Asana → My Settings → Apps → Personal Access Tokens',
    },
  ],
  confluence: [
    {
      key: 'confluenceDomain',
      label: 'Confluence Domain',
      type: 'text',
      placeholder: 'yourcompany.atlassian.net',
      required: true,
      helpText: 'Your Confluence instance domain',
    },
    {
      key: 'confluenceToken',
      label: 'Confluence API Token',
      type: 'password',
      placeholder: 'API token',
      required: true,
      helpText: 'Create at id.atlassian.com/manage-profile/security/api-tokens',
    },
    {
      key: 'confluenceEmail',
      label: 'Confluence Email',
      type: 'text',
      placeholder: 'your@email.com',
      required: true,
      helpText: 'Email associated with your Confluence account',
    },
  ],
  homeassistant: [
    {
      key: 'haUrl',
      label: 'Home Assistant URL',
      type: 'url',
      placeholder: 'http://homeassistant.local:8123',
      required: true,
      helpText: 'Your Home Assistant instance URL',
    },
    {
      key: 'haToken',
      label: 'Long-Lived Access Token',
      type: 'password',
      placeholder: 'Enter long-lived token',
      required: true,
      helpText: 'Create in Home Assistant → Profile → Long-Lived Access Tokens',
    },
  ],
  homeassistant_state: [
    {
      key: 'haUrl',
      label: 'Home Assistant URL',
      type: 'url',
      placeholder: 'http://homeassistant.local:8123',
      required: true,
      helpText: 'Your Home Assistant instance URL',
    },
    {
      key: 'haToken',
      label: 'Long-Lived Access Token',
      type: 'password',
      placeholder: 'Enter long-lived token',
      required: true,
      helpText: 'Create in Home Assistant → Profile → Long-Lived Access Tokens',
    },
  ],
  homeassistant_control: [
    {
      key: 'haUrl',
      label: 'Home Assistant URL',
      type: 'url',
      placeholder: 'http://homeassistant.local:8123',
      required: true,
      helpText: 'Your Home Assistant instance URL',
    },
    {
      key: 'haToken',
      label: 'Long-Lived Access Token',
      type: 'password',
      placeholder: 'Enter long-lived token',
      required: true,
      helpText: 'Create in Home Assistant → Profile → Long-Lived Access Tokens',
    },
  ],
  frigate_events: [
    {
      key: 'frigateUrl',
      label: 'Frigate URL',
      type: 'url',
      placeholder: 'http://frigate.local:5000',
      required: true,
      helpText: 'Your Frigate NVR instance URL',
    },
  ],
  frigate_snapshot: [
    {
      key: 'frigateUrl',
      label: 'Frigate URL',
      type: 'url',
      placeholder: 'http://frigate.local:5000',
      required: true,
      helpText: 'Your Frigate NVR instance URL',
    },
  ],
  frigate_camera_state: [
    {
      key: 'frigateUrl',
      label: 'Frigate URL',
      type: 'url',
      placeholder: 'http://frigate.local:5000',
      required: true,
      helpText: 'Your Frigate NVR instance URL',
    },
  ],
  codeprojectai_detect: [
    {
      key: 'codeprojectaiUrl',
      label: 'CodeProject.AI Server URL',
      type: 'url',
      placeholder: 'http://localhost:32168',
      required: true,
      helpText: 'Your CodeProject.AI Server URL',
    },
  ],
  yolo_detect: [
    {
      key: 'yoloApiUrl',
      label: 'YOLO API URL',
      type: 'url',
      placeholder: 'http://localhost:8080',
      required: true,
      helpText: 'Your YOLO detection API endpoint',
    },
  ],
};

export class ConnectorConfigManager {
  private static readonly STORAGE_KEY = 'connectorConfigs';

  static loadConfigs(): ConnectorConfig[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[ConnectorConfig] Error loading configs:', error);
      return [];
    }
  }

  static saveConfigs(configs: ConnectorConfig[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs));
    } catch (error) {
      console.error('[ConnectorConfig] Error saving configs:', error);
    }
  }

  static getConfig(connectorId: string): ConnectorConfig | null {
    const configs = this.loadConfigs();
    return configs.find(c => c.id === connectorId) || null;
  }

  static updateConfig(config: ConnectorConfig): void {
    const configs = this.loadConfigs();
    const index = configs.findIndex(c => c.id === config.id);
    if (index >= 0) {
      configs[index] = config;
    } else {
      configs.push(config);
    }
    this.saveConfigs(configs);
  }

  static deleteConfig(connectorId: string): void {
    const configs = this.loadConfigs();
    const filtered = configs.filter(c => c.id !== connectorId);
    this.saveConfigs(filtered);
  }

  static getVerifiedConnectors(): ConnectorConfig[] {
    return this.loadConfigs().filter(c => c.verified);
  }
}
