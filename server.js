/**
 * NIRVANA Connector Backend Server
 * 
 * This backend provides API endpoints for external service integrations using
 * Replit Connectors for authentication. Replit Connectors handle OAuth flows
 * automatically and provide tokens via environment variables.
 * 
 * HOW TO USE REPLIT CONNECTORS:
 * 
 * 1. Set up connectors in your Replit workspace:
 *    - Open the "Connectors" panel in your Replit workspace sidebar
 *    - Click "Add new integration" and choose the service
 *    - Click "Connect" and authenticate with that service
 *    - Replit handles OAuth and stores credentials securely
 * 
 * 2. Connectors provide environment variables automatically:
 *    - Gmail/Calendar: GOOGLE_ACCESS_TOKEN
 *    - GitHub: GITHUB_TOKEN
 *    - Notion: NOTION_TOKEN
 *    - Linear: LINEAR_API_KEY
 *    - Slack: SLACK_BOT_TOKEN
 * 
 * 3. This server uses process.env.* to access tokens:
 *    - No manual API key management required
 *    - Tokens are refreshed automatically by Replit
 *    - Works in both development and production
 * 
 * ENVIRONMENT VARIABLE MAPPING:
 * 
 * Connector Name          | Environment Variable    | Replit Connector ID
 * ----------------------- | ----------------------- | -------------------------------------------------
 * Gmail                   | GOOGLE_ACCESS_TOKEN     | connector:ccfg_google-mail_B959E7249792448ABBA58D46AF
 * Google Calendar         | GOOGLE_ACCESS_TOKEN     | connector:ccfg_google-calendar_DDDBAC03DE404369B74F32E78D
 * GitHub                  | GITHUB_TOKEN            | connector:ccfg_github_01K4B9XD3VRVD2F99YM91YTCAF
 * Notion                  | NOTION_TOKEN            | connector:ccfg_notion_01K49R392Z3CSNMXCPWSV67AF4
 * Linear                  | LINEAR_API_KEY          | connector:ccfg_linear_01K4B3DCSR7JEAJK400V1HTJAK
 * Slack                   | SLACK_BOT_TOKEN         | (Manual Secret - add via Secrets panel)
 * Home Assistant          | HOME_ASSISTANT_URL      | (Manual Secret - add via Secrets panel)
 * Home Assistant          | HOME_ASSISTANT_TOKEN    | (Manual Secret - add via Secrets panel)
 * 
 * For services without Replit connectors (like Slack), add API keys manually
 * via the Secrets panel (lock icon in sidebar).
 * 
 * API ENDPOINTS:
 * - POST /api/connectors/gmail/search       - Search Gmail emails
 * - POST /api/connectors/calendar/events    - Get Google Calendar events
 * - POST /api/connectors/notion/search      - Search Notion pages
 * - POST /api/connectors/linear/issues      - Get Linear issues
 * - POST /api/connectors/slack/send         - Send Slack message
 * - POST /api/connectors/github/repo        - Get GitHub repository details
 * - POST /api/connectors/homeassistant/devices  - List Home Assistant entities
 * - POST /api/connectors/homeassistant/state    - Get entity state
 * - POST /api/connectors/homeassistant/control  - Control Home Assistant device
 * 
 * All endpoints return a consistent response format:
 * {
 *   success: boolean,
 *   data?: any,
 *   error?: string,
 *   requiresSetup?: boolean,
 *   setupInstructions?: string
 * }
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/connectors/gmail/search', async (req, res) => {
  try {
    const { query, maxResults = 10 } = req.body;
    
    const token = process.env.GOOGLE_ACCESS_TOKEN;
    if (!token) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Gmail integration not configured. Please set up Gmail access in the Connectors panel.'
      });
    }

    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return res.status(401).json({
          success: false,
          requiresSetup: true,
          setupInstructions: 'Gmail integration not configured. Please set up Gmail access in the Connectors panel.',
        });
      }
      throw new Error(`Gmail API error: ${response.statusText}`);
    }

    const data = await response.json();
    const messages = data.messages || [];

    const emailDetails = await Promise.all(
      messages.slice(0, 5).map(async (msg) => {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const detail = await detailResponse.json();
        const headers = detail.payload?.headers || [];
        const subject = headers.find((h) => h.name === 'Subject')?.value || '(No Subject)';
        const from = headers.find((h) => h.name === 'From')?.value || 'Unknown';
        const date = headers.find((h) => h.name === 'Date')?.value || '';
        return { id: msg.id, subject, from, date };
      })
    );

    res.json({
      success: true,
      data: {
        query,
        resultCount: messages.length,
        emails: emailDetails,
      },
    });
  } catch (error) {
    console.error('[Gmail API Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
      setupInstructions: 'Gmail integration required. Please configure Gmail access to search emails.',
    });
  }
});

app.post('/api/connectors/calendar/events', async (req, res) => {
  try {
    const { timeMin, timeMax, maxResults = 10 } = req.body;
    
    const token = process.env.GOOGLE_ACCESS_TOKEN;
    if (!token) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Google Calendar integration not configured. Please set up Calendar access in the Connectors panel.'
      });
    }

    const min = timeMin || new Date().toISOString();
    const max = timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(min)}&timeMax=${encodeURIComponent(max)}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return res.status(401).json({
          success: false,
          requiresSetup: true,
          setupInstructions: 'Google Calendar integration not configured. Please set up Calendar access in the Connectors panel.',
        });
      }
      throw new Error(`Calendar API error: ${response.statusText}`);
    }

    const data = await response.json();
    const events = (data.items || []).map((event) => ({
      id: event.id,
      summary: event.summary || '(No title)',
      start: event.start?.dateTime || event.start?.date || '',
      end: event.end?.dateTime || event.end?.date || '',
      location: event.location || '',
      description: event.description || '',
    }));

    res.json({
      success: true,
      data: {
        timeRange: { start: min, end: max },
        eventCount: events.length,
        events,
      },
    });
  } catch (error) {
    console.error('[Calendar API Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
      setupInstructions: 'Google Calendar integration required. Please configure Calendar access to view events.',
    });
  }
});

app.post('/api/connectors/notion/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    const token = process.env.NOTION_TOKEN;
    if (!token) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Notion integration not configured. Please set up Notion access in the Connectors panel.'
      });
    }

    const response = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        filter: {
          property: 'object',
          value: 'page',
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return res.status(401).json({
          success: false,
          requiresSetup: true,
          setupInstructions: 'Notion integration not configured. Please set up Notion access in the Connectors panel.',
        });
      }
      throw new Error(`Notion API error: ${response.statusText}`);
    }

    const data = await response.json();
    const pages = (data.results || []).map((page) => ({
      id: page.id,
      title: page.properties?.title?.title?.[0]?.plain_text || '(Untitled)',
      url: page.url,
      lastEditedTime: page.last_edited_time,
    }));

    res.json({
      success: true,
      data: {
        query,
        resultCount: pages.length,
        pages,
      },
    });
  } catch (error) {
    console.error('[Notion API Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
      setupInstructions: 'Notion integration required. Please configure Notion access to search pages.',
    });
  }
});

app.post('/api/connectors/linear/issues', async (req, res) => {
  try {
    const { filter, limit = 20 } = req.body;
    
    const token = process.env.LINEAR_API_KEY;
    if (!token) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Linear integration not configured. Please set up Linear access in the Connectors panel.'
      });
    }

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
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return res.status(401).json({
          success: false,
          requiresSetup: true,
          setupInstructions: 'Linear integration not configured. Please set up Linear access in the Connectors panel.',
        });
      }
      throw new Error(`Linear API error: ${response.statusText}`);
    }

    const data = await response.json();
    const issues = (data.data?.issues?.nodes || []).map((issue) => ({
      id: issue.identifier,
      title: issue.title,
      state: issue.state?.name || 'Unknown',
      assignee: issue.assignee?.name || 'Unassigned',
      priority: issue.priority || 0,
      url: issue.url,
    }));

    res.json({
      success: true,
      data: {
        filter: filter || 'none',
        issueCount: issues.length,
        issues,
      },
    });
  } catch (error) {
    console.error('[Linear API Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
      setupInstructions: 'Linear integration required. Please configure Linear access to view issues.',
    });
  }
});

app.post('/api/connectors/slack/send', async (req, res) => {
  try {
    const { channel, message, threadTs } = req.body;
    
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Slack Bot Token not configured. Please add SLACK_BOT_TOKEN to your secrets.'
      });
    }

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        text: message,
        thread_ts: threadTs,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      if (data.error === 'invalid_auth' || data.error === 'not_authed') {
        return res.status(401).json({
          success: false,
          requiresSetup: true,
          setupInstructions: 'Slack Bot Token not configured. Please add SLACK_BOT_TOKEN to your secrets.',
        });
      }
      throw new Error(`Slack API error: ${data.error}`);
    }

    res.json({
      success: true,
      data: {
        channel,
        timestamp: data.ts,
        message,
      },
    });
  } catch (error) {
    console.error('[Slack API Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
      setupInstructions: 'Slack Bot Token required. Please add SLACK_BOT_TOKEN secret with chat:write scope.',
    });
  }
});

app.post('/api/connectors/github/repo', async (req, res) => {
  try {
    const { repoName } = req.body;
    
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'GitHub integration not configured. Please set up GitHub access in the Connectors panel.'
      });
    }

    const response = await fetch(
      `https://api.github.com/repos/${repoName}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return res.status(401).json({
          success: false,
          requiresSetup: true,
          setupInstructions: 'GitHub integration not configured. Please set up GitHub access in the Connectors panel.',
        });
      }
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const repo = await response.json();

    const pullsResponse = await fetch(
      `https://api.github.com/repos/${repoName}/pulls`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    const pulls = pullsResponse.ok ? await pullsResponse.json() : [];

    res.json({
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
    });
  } catch (error) {
    console.error('[GitHub API Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
      setupInstructions: 'GitHub integration required. Please configure GitHub access to view repository details.',
    });
  }
});

app.post('/api/connectors/homeassistant/devices', async (req, res) => {
  try {
    const { domain } = req.body;
    
    const haUrl = process.env.HOME_ASSISTANT_URL;
    const token = process.env.HOME_ASSISTANT_TOKEN;
    
    if (!haUrl || !token) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Home Assistant not configured. Please set HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN environment variables.',
      });
    }

    const url = `${haUrl.replace(/\/$/, '')}/api/states`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return res.status(401).json({
          success: false,
          requiresSetup: true,
          setupInstructions: 'Home Assistant authentication failed. Please check your HOME_ASSISTANT_TOKEN.',
        });
      }
      throw new Error(`Home Assistant API error: ${response.statusText}`);
    }

    let entities = await response.json();

    if (domain) {
      entities = entities.filter((entity) => entity.entity_id.startsWith(`${domain}.`));
    }

    const devices = entities.map((entity) => ({
      entityId: entity.entity_id,
      state: entity.state,
      friendlyName: entity.attributes?.friendly_name || entity.entity_id,
      domain: entity.entity_id.split('.')[0],
      attributes: entity.attributes,
      lastChanged: entity.last_changed,
      lastUpdated: entity.last_updated,
    }));

    res.json({
      success: true,
      data: {
        deviceCount: devices.length,
        domain: domain || 'all',
        devices,
      },
    });
  } catch (error) {
    console.error('[Home Assistant API Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
      setupInstructions: 'Home Assistant integration required. Please configure HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN.',
    });
  }
});

app.post('/api/connectors/homeassistant/state', async (req, res) => {
  try {
    const { entityId } = req.body;
    
    if (!entityId) {
      return res.status(400).json({
        success: false,
        error: 'entityId is required',
      });
    }

    const haUrl = process.env.HOME_ASSISTANT_URL;
    const token = process.env.HOME_ASSISTANT_TOKEN;
    
    if (!haUrl || !token) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Home Assistant not configured. Please set HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN environment variables.',
      });
    }

    const url = `${haUrl.replace(/\/$/, '')}/api/states/${entityId}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({
          success: false,
          error: `Entity ${entityId} not found`,
        });
      }
      if (response.status === 401) {
        return res.status(401).json({
          success: false,
          requiresSetup: true,
          setupInstructions: 'Home Assistant authentication failed. Please check your HOME_ASSISTANT_TOKEN.',
        });
      }
      throw new Error(`Home Assistant API error: ${response.statusText}`);
    }

    const entity = await response.json();

    res.json({
      success: true,
      data: {
        entityId: entity.entity_id,
        state: entity.state,
        friendlyName: entity.attributes?.friendly_name || entity.entity_id,
        domain: entity.entity_id.split('.')[0],
        attributes: entity.attributes,
        lastChanged: entity.last_changed,
        lastUpdated: entity.last_updated,
      },
    });
  } catch (error) {
    console.error('[Home Assistant API Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
      setupInstructions: 'Home Assistant integration required. Please configure HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN.',
    });
  }
});

app.post('/api/connectors/homeassistant/control', async (req, res) => {
  try {
    const { domain, service, entityId, serviceData } = req.body;
    
    if (!domain || !service || !entityId) {
      return res.status(400).json({
        success: false,
        error: 'domain, service, and entityId are required',
      });
    }

    const haUrl = process.env.HOME_ASSISTANT_URL;
    const token = process.env.HOME_ASSISTANT_TOKEN;
    
    if (!haUrl || !token) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Home Assistant not configured. Please set HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN environment variables.',
      });
    }

    const url = `${haUrl.replace(/\/$/, '')}/api/services/${domain}/${service}`;
    
    let parsedServiceData = {};
    if (serviceData) {
      try {
        parsedServiceData = typeof serviceData === 'string' ? JSON.parse(serviceData) : serviceData;
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'Invalid serviceData JSON',
        });
      }
    }

    const requestBody = {
      entity_id: entityId,
      ...parsedServiceData,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return res.status(401).json({
          success: false,
          requiresSetup: true,
          setupInstructions: 'Home Assistant authentication failed. Please check your HOME_ASSISTANT_TOKEN.',
        });
      }
      const errorText = await response.text();
      throw new Error(`Home Assistant API error: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    res.json({
      success: true,
      data: {
        service: `${domain}.${service}`,
        entityId,
        result,
      },
    });
  } catch (error) {
    console.error('[Home Assistant API Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
      setupInstructions: 'Home Assistant integration required. Please configure HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN.',
    });
  }
});

app.post('/api/connectors/frigate/events', async (req, res) => {
  try {
    const { camera, objectType, limit = 10 } = req.body;
    
    if (!camera) {
      return res.status(400).json({
        success: false,
        error: 'camera is required',
      });
    }

    const frigateUrl = process.env.FRIGATE_URL;
    
    if (!frigateUrl) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Frigate not configured. Please set FRIGATE_URL environment variable (e.g., "http://frigate.local:5000").',
      });
    }

    let url = `${frigateUrl.replace(/\/$/, '')}/api/events?camera=${encodeURIComponent(camera)}&limit=${limit}`;
    if (objectType) {
      url += `&label=${encodeURIComponent(objectType)}`;
    }

    const response = await fetch(url, {
      headers: process.env.FRIGATE_API_KEY ? {
        'X-Frigate-API-Key': process.env.FRIGATE_API_KEY,
      } : {},
    });

    if (!response.ok) {
      if (response.status === 401) {
        return res.status(401).json({
          success: false,
          requiresSetup: true,
          setupInstructions: 'Frigate authentication failed. Please check your FRIGATE_API_KEY.',
        });
      }
      throw new Error(`Frigate API error: ${response.statusText}`);
    }

    const events = await response.json();

    res.json({
      success: true,
      data: {
        camera,
        objectType: objectType || 'all',
        eventCount: events.length,
        events: events.map(event => ({
          id: event.id,
          label: event.label,
          camera: event.camera,
          startTime: event.start_time,
          endTime: event.end_time,
          score: event.top_score,
          thumbnail: event.thumbnail,
          hasSnapshot: event.has_snapshot,
          hasClip: event.has_clip,
        })),
      },
    });
  } catch (error) {
    console.error('[Frigate API Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
      setupInstructions: 'Frigate integration required. Please configure FRIGATE_URL to access events.',
    });
  }
});

app.post('/api/connectors/frigate/snapshot', async (req, res) => {
  try {
    const { camera, eventId } = req.body;
    
    if (!camera) {
      return res.status(400).json({
        success: false,
        error: 'camera is required',
      });
    }

    const frigateUrl = process.env.FRIGATE_URL;
    
    if (!frigateUrl) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Frigate not configured. Please set FRIGATE_URL environment variable.',
      });
    }

    let url;
    if (eventId) {
      url = `${frigateUrl.replace(/\/$/, '')}/api/events/${eventId}/snapshot.jpg`;
    } else {
      url = `${frigateUrl.replace(/\/$/, '')}/api/${encodeURIComponent(camera)}/latest.jpg`;
    }

    const response = await fetch(url, {
      headers: process.env.FRIGATE_API_KEY ? {
        'X-Frigate-API-Key': process.env.FRIGATE_API_KEY,
      } : {},
    });

    if (!response.ok) {
      throw new Error(`Frigate API error: ${response.statusText}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    res.json({
      success: true,
      data: {
        camera,
        eventId: eventId || 'latest',
        imageUrl: `data:image/jpeg;base64,${base64Image}`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Frigate Snapshot Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
      setupInstructions: 'Frigate integration required. Please configure FRIGATE_URL.',
    });
  }
});

app.post('/api/connectors/frigate/camera-state', async (req, res) => {
  try {
    const { camera } = req.body;
    
    if (!camera) {
      return res.status(400).json({
        success: false,
        error: 'camera is required',
      });
    }

    const frigateUrl = process.env.FRIGATE_URL;
    
    if (!frigateUrl) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Frigate not configured. Please set FRIGATE_URL environment variable.',
      });
    }

    const configResponse = await fetch(`${frigateUrl.replace(/\/$/, '')}/api/config`, {
      headers: process.env.FRIGATE_API_KEY ? {
        'X-Frigate-API-Key': process.env.FRIGATE_API_KEY,
      } : {},
    });

    if (!configResponse.ok) {
      throw new Error(`Frigate API error: ${configResponse.statusText}`);
    }

    const config = await configResponse.json();
    const cameraConfig = config.cameras?.[camera];

    if (!cameraConfig) {
      return res.status(404).json({
        success: false,
        error: `Camera "${camera}" not found in Frigate configuration`,
      });
    }

    res.json({
      success: true,
      data: {
        camera,
        enabled: cameraConfig.enabled !== false,
        detect: cameraConfig.detect,
        record: cameraConfig.record,
        snapshots: cameraConfig.snapshots,
        motion: cameraConfig.motion,
        objects: cameraConfig.objects,
      },
    });
  } catch (error) {
    console.error('[Frigate Camera State Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
      setupInstructions: 'Frigate integration required. Please configure FRIGATE_URL.',
    });
  }
});

app.post('/api/connectors/codeprojectai/detect', async (req, res) => {
  try {
    const { imageUrl, minConfidence = 0.5 } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'imageUrl is required',
      });
    }

    const codeProjectAIUrl = process.env.CODEPROJECT_AI_URL;
    
    if (!codeProjectAIUrl) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'CodeProject.AI not configured. Please set CODEPROJECT_AI_URL environment variable (e.g., "http://localhost:32168").',
      });
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image from ${imageUrl}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const formData = new FormData();
    formData.append('image', new Blob([imageBuffer]), 'image.jpg');
    formData.append('min_confidence', minConfidence.toString());

    const response = await fetch(`${codeProjectAIUrl.replace(/\/$/, '')}/v1/vision/detection`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`CodeProject.AI API error: ${response.statusText}`);
    }

    const result = await response.json();

    res.json({
      success: true,
      data: {
        imageUrl,
        minConfidence,
        detectionCount: result.predictions?.length || 0,
        detections: (result.predictions || []).map(pred => ({
          label: pred.label,
          confidence: pred.confidence,
          boundingBox: {
            x: pred.x_min,
            y: pred.y_min,
            width: pred.x_max - pred.x_min,
            height: pred.y_max - pred.y_min,
          },
        })),
        processingTime: result.processMs,
      },
    });
  } catch (error) {
    console.error('[CodeProject.AI Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
      setupInstructions: 'CodeProject.AI integration required. Please configure CODEPROJECT_AI_URL.',
    });
  }
});

app.post('/api/connectors/yolo/detect', async (req, res) => {
  try {
    const { imageUrl, minConfidence = 0.5 } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'imageUrl is required',
      });
    }

    const yoloApiUrl = process.env.YOLO_API_URL;
    
    if (!yoloApiUrl) {
      return res.json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'YOLO API not configured. You can either set YOLO_API_URL for server-side detection, or use browser-based YOLO with TensorFlow.js (recommended).',
        useBrowserYOLO: true,
      });
    }

    const response = await fetch(`${yoloApiUrl.replace(/\/$/, '')}/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        confidence: minConfidence,
      }),
    });

    if (!response.ok) {
      throw new Error(`YOLO API error: ${response.statusText}`);
    }

    const result = await response.json();

    res.json({
      success: true,
      data: {
        imageUrl,
        minConfidence,
        detectionCount: result.detections?.length || 0,
        detections: (result.detections || []).map(det => ({
          label: det.class || det.label,
          confidence: det.score || det.confidence,
          boundingBox: det.bbox || det.box,
        })),
      },
    });
  } catch (error) {
    console.error('[YOLO API Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
      setupInstructions: 'YOLO API integration optional. For browser-based detection, use TensorFlow.js COCO-SSD model instead.',
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Connector Backend] Server running on port ${PORT}`);
  console.log(`[Connector Backend] Health check: http://localhost:${PORT}/health`);
});
