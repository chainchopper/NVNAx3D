/**
 * NIRVANA Backend Server - Standalone/Docker Deployment
 * 
 * This backend provides API endpoints for external service integrations.
 * API keys and OAuth tokens are configured via environment variables (.env file
 * or in-app configuration) for standalone/Docker deployment.
 * 
 * ENVIRONMENT VARIABLES (Configure in .env):
 * 
 * Service                 | Environment Variables
 * ----------------------- | -----------------------
 * Google Gemini AI        | GEMINI_API_KEY
 * OpenAI                  | OPENAI_API_KEY
 * Financial APIs          | ALPHA_VANTAGE_API_KEY, FINNHUB_API_KEY, COINMARKETCAP_API_KEY
 * Crypto APIs             | (CoinGecko is free, no key needed)
 * OAuth Services          | COINBASE_CLIENT_ID, COINBASE_CLIENT_SECRET
 * Twilio                  | TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 * Song Identification     | AUDD_API_TOKEN, GENIUS_API_TOKEN
 * External Connectors     | GOOGLE_ACCESS_TOKEN, GITHUB_TOKEN, NOTION_TOKEN, LINEAR_API_KEY
 * 
 * CORE INTEGRATIONS:
 * - Twilio: SMS, voice calls, media streaming (WebSocket)
 * - Financial APIs: CoinGecko, CoinMarketCap, Coinbase (OAuth), Alpha Vantage
 * - OAuth/SSO: Centralized token vault with refresh scheduling
 * - Tool execution: Sandboxed tool orchestration for PersonI autonomy
 * 
 * API ENDPOINTS:
 * - GET  /api/config/env                   - Get API key availability status
 * - POST /api/models/proxy                 - Discover models from custom endpoints (with SSRF protection)
 * - GET  /api/twilio/status                - Check Twilio configuration status
 * - POST /api/twilio/sms/send              - Send SMS message
 * - POST /api/twilio/voice/call            - Initiate voice call
 * - GET  /api/twilio/voice/calls           - Get active calls
 * - POST /api/financial/stocks             - Get stock data (Alpha Vantage)
 * - POST /api/financial/crypto             - Get crypto data (CoinGecko)
 * - POST /api/financial/news               - Get market news (Finnhub)
 * - POST /api/connectors/gmail/search      - Search Gmail emails
 * - POST /api/connectors/gmail/send        - Send Gmail email
 * - POST /api/connectors/calendar/events   - Get Google Calendar events
 * - POST /api/connectors/notion/search     - Search Notion pages
 * - POST /api/connectors/linear/issues     - Get Linear issues
 * - POST /api/connectors/slack/send        - Send Slack message
 * - POST /api/connectors/github/repo       - Get GitHub repository details
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
import http from 'http';
import { WebSocketServer } from 'ws';
import { GoogleGenAI } from '@google/genai';
import { stockDataService } from './src/services/financial/stock-data-service.js';
import { cryptoDataService } from './src/services/financial/crypto-data-service.js';
import { portfolioManager } from './src/services/financial/portfolio-manager.js';
import { marketNewsService } from './src/services/financial/market-news-service.js';
import { coinMarketCapService } from './src/services/financial/coinmarketcap-service.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3001;

const CONNECTOR_SECRETS = {
  gmail: { GOOGLE_ACCESS_TOKEN: 'Your Google OAuth token with Gmail API access' },
  google_calendar: { GOOGLE_ACCESS_TOKEN: 'Your Google OAuth token with Calendar API access' },
  google_docs: { GOOGLE_ACCESS_TOKEN: 'Your Google OAuth token with Docs API access' },
  google_sheets: { GOOGLE_ACCESS_TOKEN: 'Your Google OAuth token with Sheets API access' },
  github: { GITHUB_TOKEN: 'Your GitHub Personal Access Token' },
  notion: { NOTION_TOKEN: 'Your Notion Integration Token' },
  linear: { LINEAR_API_KEY: 'Your Linear API Key' },
  slack: { SLACK_BOT_TOKEN: 'Your Slack Bot Token with chat:write scope' },
  outlook: { OUTLOOK_TOKEN: 'Your Microsoft Graph API token' },
  jira: { JIRA_TOKEN: 'Your Jira API Token', JIRA_DOMAIN: 'Your Jira domain (e.g., company.atlassian.net)', JIRA_EMAIL: 'Your Jira email address' },
  asana: { ASANA_TOKEN: 'Your Asana Personal Access Token' },
  confluence: { CONFLUENCE_TOKEN: 'Your Confluence API Token', CONFLUENCE_DOMAIN: 'Your Confluence domain', CONFLUENCE_EMAIL: 'Your Confluence email address' },
  homeassistant: { HOME_ASSISTANT_URL: 'Your HA URL', HOME_ASSISTANT_TOKEN: 'Your HA Long-Lived Access Token' },
  homeassistant_state: { HOME_ASSISTANT_URL: 'Your HA URL', HOME_ASSISTANT_TOKEN: 'Your HA Long-Lived Access Token' },
  homeassistant_control: { HOME_ASSISTANT_URL: 'Your HA URL', HOME_ASSISTANT_TOKEN: 'Your HA Long-Lived Access Token' },
  frigate_events: { FRIGATE_URL: 'Your Frigate NVR URL', FRIGATE_API_KEY: 'Your Frigate API Key (optional)' },
  frigate_snapshot: { FRIGATE_URL: 'Your Frigate NVR URL', FRIGATE_API_KEY: 'Your Frigate API Key (optional)' },
  frigate_camera_state: { FRIGATE_URL: 'Your Frigate NVR URL', FRIGATE_API_KEY: 'Your Frigate API Key (optional)' },
  codeprojectai_detect: { CODEPROJECT_AI_URL: 'Your CodeProject.AI server URL' },
  yolo_detect: { YOLO_API_URL: 'Your YOLO API URL' }
};

// CORS Configuration - read from environment or default based on NODE_ENV
const isDevelopment = process.env.NODE_ENV !== 'production';
let allowedOrigins = [];

if (process.env.CORS_ALLOWED_ORIGINS) {
  // Use environment variable if set
  if (process.env.CORS_ALLOWED_ORIGINS === '*') {
    // Allow all origins in development
    allowedOrigins = ['*'];
  } else {
    // Parse comma-separated list
    allowedOrigins = process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);
  }
} else if (isDevelopment) {
  // Default to * in development for easy testing
  allowedOrigins = ['*'];
  console.log('[CORS] Development mode: allowing all origins (*)');
} else {
  // Default to specific origins in production
  allowedOrigins = [
    'http://localhost:5000',
    process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : ''
  ].filter(Boolean);
}

console.log('[CORS] Allowed origins:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is allowed
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true
}));

// CSP Configuration - read from environment or default based on NODE_ENV
let cspDirectives = '';

if (process.env.CSP_DIRECTIVES) {
  // Use custom CSP from environment
  cspDirectives = process.env.CSP_DIRECTIVES;
} else if (isDevelopment) {
  // Permissive CSP for development - allow testing of all endpoints
  cspDirectives = "default-src 'self'; " +
    "script-src 'self' https://esm.sh 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'; " +
    "script-src-elem 'self' https://esm.sh 'unsafe-inline'; " +
    "connect-src 'self' http://localhost:* https://esm.sh https://raw.githubusercontent.com https://huggingface.co https://cdn-lfs.huggingface.co https://cdn.jsdelivr.net https://generativelanguage.googleapis.com https://api.openai.com https://api.anthropic.com https://api.x.ai https://api.deepseek.com ws: wss: *; " +
    "worker-src 'self' blob:; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https: *; " +
    "media-src 'self' blob: mediastream:; " +
    "font-src 'self' data:; " +
    "object-src 'none'; " +
    "base-uri 'self';";
  console.log('[CSP] Development mode: permissive CSP to allow all testing');
} else {
  // Strict CSP for production
  cspDirectives = "default-src 'self'; " +
    "script-src 'self' https://esm.sh 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'; " +
    "script-src-elem 'self' https://esm.sh 'unsafe-inline'; " +
    "connect-src 'self' https://esm.sh https://raw.githubusercontent.com https://huggingface.co https://cdn-lfs.huggingface.co https://cdn.jsdelivr.net https://generativelanguage.googleapis.com https://api.openai.com https://api.anthropic.com https://api.x.ai https://api.deepseek.com https://storage.googleapis.com https://cas-bridge.xethub.hf.co ws: wss:; " +
    "worker-src 'self' blob:; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https://raw.githubusercontent.com https://cdn.jsdelivr.net; " +
    "media-src 'self' blob: mediastream:; " +
    "font-src 'self' data:; " +
    "object-src 'none'; " +
    "base-uri 'self';";
}

console.log('[CSP] Content Security Policy:', cspDirectives);

// Add CSP header middleware
app.use((req, res, next) => {
  if (cspDirectives) {
    res.setHeader('Content-Security-Policy', cspDirectives);
  }
  next();
});

app.use(express.json());

async function verifyGmailCredentials() {
  const token = process.env.GOOGLE_ACCESS_TOKEN;
  if (!token) return false;
  try {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function verifyGoogleCalendarCredentials() {
  const token = process.env.GOOGLE_ACCESS_TOKEN;
  if (!token) return false;
  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function verifyGitHubCredentials() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return false;
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: { 
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function verifyNotionCredentials() {
  const token = process.env.NOTION_TOKEN;
  if (!token) return false;
  try {
    const response = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28'
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function verifyLinearCredentials() {
  const token = process.env.LINEAR_API_KEY;
  if (!token) return false;
  try {
    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: '{ viewer { id } }' })
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function verifySlackCredentials() {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return false;
  try {
    const response = await fetch('https://slack.com/api/auth.test', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

async function verifyOutlookCredentials() {
  const token = process.env.OUTLOOK_TOKEN;
  if (!token) return false;
  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function verifyJiraCredentials() {
  const token = process.env.JIRA_TOKEN;
  const domain = process.env.JIRA_DOMAIN;
  if (!token || !domain) return false;
  try {
    const response = await fetch(
      `https://${domain}/rest/api/3/myself`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

async function verifyAsanaCredentials() {
  const token = process.env.ASANA_TOKEN;
  if (!token) return false;
  try {
    const response = await fetch('https://app.asana.com/api/1.0/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function verifyConfluenceCredentials() {
  const token = process.env.CONFLUENCE_TOKEN;
  const domain = process.env.CONFLUENCE_DOMAIN;
  if (!token || !domain) return false;
  try {
    const response = await fetch(
      `https://${domain}/wiki/rest/api/user/current`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

async function verifyHomeAssistantCredentials() {
  const url = process.env.HOME_ASSISTANT_URL;
  const token = process.env.HOME_ASSISTANT_TOKEN;
  if (!url || !token) return false;
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/api/`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function verifyFrigateCredentials() {
  const url = process.env.FRIGATE_URL;
  if (!url) return false;
  try {
    const headers = {};
    const apiKey = process.env.FRIGATE_API_KEY;
    if (apiKey) {
      headers['X-Frigate-API-Key'] = apiKey;
    }
    const response = await fetch(`${url.replace(/\/$/, '')}/api/config`, {
      headers
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function verifyCodeProjectAICredentials() {
  const url = process.env.CODEPROJECT_AI_URL;
  if (!url) return false;
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/v1/status`);
    return response.ok;
  } catch {
    return false;
  }
}

async function verifyYoloCredentials() {
  const url = process.env.YOLO_API_URL;
  if (!url) return false;
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/health`);
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

async function verifyConnectorCredentials(connectorId) {
  switch (connectorId) {
    case 'gmail':
      return verifyGmailCredentials();
    case 'google_calendar':
      return verifyGoogleCalendarCredentials();
    case 'google_docs':
      return verifyGmailCredentials();
    case 'google_sheets':
      return verifyGmailCredentials();
    case 'github':
      return verifyGitHubCredentials();
    case 'notion':
      return verifyNotionCredentials();
    case 'linear':
      return verifyLinearCredentials();
    case 'slack':
      return verifySlackCredentials();
    case 'outlook':
      return verifyOutlookCredentials();
    case 'jira':
      return verifyJiraCredentials();
    case 'asana':
      return verifyAsanaCredentials();
    case 'confluence':
      return verifyConfluenceCredentials();
    case 'homeassistant':
    case 'homeassistant_state':
    case 'homeassistant_control':
      return verifyHomeAssistantCredentials();
    case 'frigate_events':
    case 'frigate_snapshot':
    case 'frigate_camera_state':
      return verifyFrigateCredentials();
    case 'codeprojectai_detect':
      return verifyCodeProjectAICredentials();
    case 'yolo_detect':
      return verifyYoloCredentials();
    default:
      return true;
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// PROVIDER CONFIGURATION ENDPOINTS
// ============================================================================

// Environment Configuration - Returns API key availability (NOT actual keys)
app.get('/api/config/env', (req, res) => {
  try {
    const config = {
      geminiApiKey: !!process.env.GEMINI_API_KEY,
      openaiApiKey: !!process.env.OPENAI_API_KEY,
      anthropicApiKey: !!process.env.ANTHROPIC_API_KEY,
      twilioConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      gmailConfigured: !!process.env.GOOGLE_ACCESS_TOKEN,
    };
    
    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('[Config API Error]', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Model Discovery Proxy endpoint is defined later in this file (line ~3863)
// This duplicate has been removed to prevent JSON parse errors

// ============================================================================
// CONNECTOR VERIFICATION
// ============================================================================

app.post('/api/connectors/verify', async (req, res) => {
  try {
    const { connectorId } = req.body;

    if (!connectorId) {
      return res.status(400).json({
        success: false,
        error: 'connectorId is required'
      });
    }

    const secrets = CONNECTOR_SECRETS[connectorId];
    if (!secrets) {
      return res.status(400).json({
        success: false,
        error: `Unknown connector: ${connectorId}`
      });
    }

    const missingSecrets = Object.keys(secrets).filter(key => !process.env[key]);
    const configured = missingSecrets.length === 0;

    if (!configured) {
      return res.json({
        success: false,
        configured: false,
        missingSecrets,
        setupInstructions: `Add the following to Replit Secrets: ${missingSecrets.join(', ')}`
      });
    }

    const verified = await verifyConnectorCredentials(connectorId);

    res.json({
      success: true,
      configured: true,
      verified,
      message: verified 
        ? `${connectorId} is properly configured and verified` 
        : `${connectorId} secrets are present but verification failed. Check your credentials.`
    });
  } catch (error) {
    console.error('[Connector Verify Error]', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/connectors/gmail/search', async (req, res) => {
  try {
    const { query, maxResults = 10 } = req.body;
    
    const token = process.env.GOOGLE_ACCESS_TOKEN;
    if (!token) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Add GOOGLE_ACCESS_TOKEN to Replit Secrets panel.'
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
          setupInstructions: 'Gmail credentials invalid or expired. Please update your credentials in the Connector Configuration panel.',
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

app.post('/api/connectors/gmail/send', async (req, res) => {
  try {
    const { to, subject, body, cc, bcc } = req.body;
    
    if (!to || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, body'
      });
    }
    
    const token = process.env.GOOGLE_ACCESS_TOKEN;
    if (!token) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Add GOOGLE_ACCESS_TOKEN to Replit Secrets panel or .env file.'
      });
    }

    // Build email message in RFC 2822 format
    const emailLines = [];
    emailLines.push(`To: ${to}`);
    if (cc) emailLines.push(`Cc: ${cc}`);
    if (bcc) emailLines.push(`Bcc: ${bcc}`);
    emailLines.push(`Subject: ${subject}`);
    emailLines.push('Content-Type: text/html; charset=utf-8');
    emailLines.push('');
    emailLines.push(body);
    
    const email = emailLines.join('\r\n');
    
    // Base64url encode the email
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: encodedEmail
        })
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return res.status(401).json({
          success: false,
          requiresSetup: true,
          setupInstructions: 'Gmail credentials invalid or expired. Please update your credentials in the Connector Configuration panel.',
        });
      }
      const errorData = await response.json();
      throw new Error(`Gmail API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    res.json({
      success: true,
      data: {
        messageId: data.id,
        threadId: data.threadId,
        to,
        subject,
        message: 'Email sent successfully'
      },
    });
  } catch (error) {
    console.error('[Gmail Send Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
      setupInstructions: 'Gmail integration required. Please configure Gmail access to send emails.',
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
        setupInstructions: 'Add GOOGLE_ACCESS_TOKEN to Replit Secrets panel.'
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
          setupInstructions: 'Google Calendar credentials invalid or expired. Please update your credentials in the Connector Configuration panel.',
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
        setupInstructions: 'Add NOTION_TOKEN to Replit Secrets panel.'
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
        setupInstructions: 'Add LINEAR_API_KEY to Replit Secrets panel.'
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
        setupInstructions: 'Add SLACK_BOT_TOKEN to Replit Secrets panel.'
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
        setupInstructions: 'Add GITHUB_TOKEN to Replit Secrets panel.'
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

// Web Search API - supports multiple search engines
app.post('/api/web-search', async (req, res) => {
  try {
    const { query, limit = 5, engine = 'duckduckgo' } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    let results = [];

    // Option 1: Brave Search API (if API key configured)
    if (engine === 'brave' && process.env.BRAVE_SEARCH_API_KEY) {
      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}`,
        {
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        results = data.web?.results?.slice(0, limit).map(r => ({
          title: r.title,
          url: r.url,
          description: r.description,
          engine: 'brave'
        })) || [];
      }
    }
    // Option 2: DuckDuckGo Instant Answer API (free, no key)
    else if (engine === 'duckduckgo') {
      const response = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // Extract results from DuckDuckGo response
        const abstractResult = data.Abstract ? [{
          title: data.Heading || query,
          url: data.AbstractURL,
          description: data.Abstract,
          engine: 'duckduckgo'
        }] : [];
        
        const relatedTopics = (data.RelatedTopics || [])
          .filter(t => t.FirstURL && t.Text)
          .slice(0, limit - abstractResult.length)
          .map(t => ({
            title: t.Text.split(' - ')[0] || t.Text.substring(0, 60),
            url: t.FirstURL,
            description: t.Text,
            engine: 'duckduckgo'
          }));
        
        results = [...abstractResult, ...relatedTopics].slice(0, limit);
      }
    }

    // If no results, provide fallback
    if (results.length === 0) {
      results = [{
        title: `Search results for: ${query}`,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        description: `No structured results available. Try searching manually at DuckDuckGo.`,
        engine: 'fallback'
      }];
    }

    res.json({
      success: true,
      data: {
        query,
        results,
        engine,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Web Search Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Web search failed',
      setupInstructions: 'Web search uses DuckDuckGo by default. For better results, add BRAVE_SEARCH_API_KEY to your environment.'
    });
  }
});

app.post('/api/connectors/googledocs/read', async (req, res) => {
  try {
    const { documentId } = req.body;
    
    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: 'documentId is required',
      });
    }
    
    const token = process.env.GOOGLE_ACCESS_TOKEN;
    if (!token) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Add GOOGLE_ACCESS_TOKEN to Replit Secrets panel.'
      });
    }

    const docId = documentId.includes('docs.google.com') 
      ? documentId.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1] || documentId
      : documentId;

    const response = await fetch(
      `https://docs.googleapis.com/v1/documents/${docId}`,
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
          setupInstructions: 'Google Docs integration not configured. Please set up Google Docs access in the Connectors panel.',
        });
      }
      throw new Error(`Google Docs API error: ${response.statusText}`);
    }

    const doc = await response.json();
    
    let textContent = '';
    if (doc.body && doc.body.content) {
      for (const element of doc.body.content) {
        if (element.paragraph) {
          for (const textElement of element.paragraph.elements || []) {
            if (textElement.textRun) {
              textContent += textElement.textRun.content;
            }
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        documentId: doc.documentId,
        title: doc.title,
        textContent: textContent.trim(),
        revisionId: doc.revisionId,
      },
    });
  } catch (error) {
    console.error('[Google Docs API Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
      setupInstructions: 'Google Docs integration required. Please configure Google Docs access to read documents.',
    });
  }
});

app.post('/api/connectors/googlesheets/read', async (req, res) => {
  try {
    const { spreadsheetId, range } = req.body;
    
    if (!spreadsheetId) {
      return res.status(400).json({
        success: false,
        error: 'spreadsheetId is required',
      });
    }
    
    const credentials = getConnectorCredentials('google_sheets');
    if (!credentials) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Google Sheets not configured. Please configure in Connector Settings.'
      });
    }
    
    const token = credentials.googleAccessToken;

    const sheetId = spreadsheetId.includes('docs.google.com') 
      ? spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1] || spreadsheetId
      : spreadsheetId;

    const requestRange = range || 'A1:Z1000';
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(requestRange)}`,
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
          setupInstructions: 'Google Sheets integration not configured. Please set up Google Sheets access in the Connectors panel.',
        });
      }
      throw new Error(`Google Sheets API error: ${response.statusText}`);
    }

    const data = await response.json();

    res.json({
      success: true,
      data: {
        spreadsheetId: sheetId,
        range: data.range,
        values: data.values || [],
        rowCount: data.values?.length || 0,
      },
    });
  } catch (error) {
    console.error('[Google Sheets API Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
      setupInstructions: 'Google Sheets integration required. Please configure Google Sheets access to read spreadsheets.',
    });
  }
});

app.post('/api/connectors/outlook/search', async (req, res) => {
  try {
    const { query, maxResults = 10 } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'query is required',
      });
    }
    
    const credentials = getConnectorCredentials('outlook');
    if (!credentials) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Outlook not configured. Please configure in Connector Settings.'
      });
    }
    
    const token = credentials.outlookToken;

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages?$search="${encodeURIComponent(query)}"&$top=${maxResults}`,
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
          setupInstructions: 'Outlook integration not configured. Please set up Outlook access in the Connectors panel.',
        });
      }
      throw new Error(`Outlook API error: ${response.statusText}`);
    }

    const data = await response.json();
    const emails = (data.value || []).map((msg) => ({
      id: msg.id,
      subject: msg.subject || '(No Subject)',
      from: msg.from?.emailAddress?.address || 'Unknown',
      receivedDateTime: msg.receivedDateTime,
      bodyPreview: msg.bodyPreview,
    }));

    res.json({
      success: true,
      data: {
        query,
        resultCount: emails.length,
        emails,
      },
    });
  } catch (error) {
    console.error('[Outlook API Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
      setupInstructions: 'Outlook integration required. Please configure Outlook access to search emails.',
    });
  }
});

app.post('/api/connectors/jira/search', async (req, res) => {
  try {
    const { jql, maxResults = 50 } = req.body;
    
    if (!jql) {
      return res.status(400).json({
        success: false,
        error: 'jql query is required',
      });
    }
    
    const credentials = getConnectorCredentials('jira');
    if (!credentials) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Jira not configured. Please configure in Connector Settings.'
      });
    }
    
    const token = credentials.jiraToken;
    const domain = credentials.jiraDomain;

    const response = await fetch(
      `https://${domain}.atlassian.net/rest/api/3/search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jql,
          maxResults,
          fields: ['summary', 'status', 'assignee', 'priority', 'created'],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return res.status(401).json({
          success: false,
          requiresSetup: true,
          setupInstructions: 'Jira integration not configured. Please set up Jira access in the Connectors panel.',
        });
      }
      throw new Error(`Jira API error: ${response.statusText}`);
    }

    const data = await response.json();
    const issues = (data.issues || []).map((issue) => ({
      key: issue.key,
      summary: issue.fields?.summary || '(No summary)',
      status: issue.fields?.status?.name || 'Unknown',
      assignee: issue.fields?.assignee?.displayName || 'Unassigned',
      priority: issue.fields?.priority?.name || 'None',
      created: issue.fields?.created,
    }));

    res.json({
      success: true,
      data: {
        jql,
        issueCount: issues.length,
        total: data.total,
        issues,
      },
    });
  } catch (error) {
    console.error('[Jira API Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
      setupInstructions: 'Jira integration required. Please configure Jira access and set JIRA_DOMAIN to search issues.',
    });
  }
});

app.post('/api/connectors/asana/tasks', async (req, res) => {
  try {
    const { projectId, assignee } = req.body;
    
    const credentials = getConnectorCredentials('asana');
    if (!credentials) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Asana not configured. Please configure in Connector Settings.'
      });
    }
    
    const token = credentials.asanaToken;

    let url = 'https://app.asana.com/api/1.0/tasks';
    const params = new URLSearchParams();
    
    if (projectId) {
      params.append('project', projectId);
    }
    if (assignee) {
      params.append('assignee', assignee === 'me' ? 'me' : assignee);
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return res.status(401).json({
          success: false,
          requiresSetup: true,
          setupInstructions: 'Asana integration not configured. Please set up Asana access in the Connectors panel.',
        });
      }
      throw new Error(`Asana API error: ${response.statusText}`);
    }

    const data = await response.json();
    const tasks = (data.data || []).map((task) => ({
      gid: task.gid,
      name: task.name,
      completed: task.completed,
      assignee: task.assignee?.name || 'Unassigned',
    }));

    res.json({
      success: true,
      data: {
        projectId: projectId || 'all',
        taskCount: tasks.length,
        tasks,
      },
    });
  } catch (error) {
    console.error('[Asana API Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
      setupInstructions: 'Asana integration required. Please configure Asana access to view tasks.',
    });
  }
});

app.post('/api/connectors/confluence/search', async (req, res) => {
  try {
    const { query, limit = 25 } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'query is required',
      });
    }
    
    const credentials = getConnectorCredentials('confluence');
    if (!credentials) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Confluence not configured. Please configure in Connector Settings.'
      });
    }
    
    const token = credentials.confluenceToken;
    const domain = credentials.confluenceDomain;

    const response = await fetch(
      `https://${domain}.atlassian.net/wiki/rest/api/content/search?cql=${encodeURIComponent(`text ~ "${query}"`)}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return res.status(401).json({
          success: false,
          requiresSetup: true,
          setupInstructions: 'Confluence integration not configured. Please set up Confluence access in the Connectors panel.',
        });
      }
      throw new Error(`Confluence API error: ${response.statusText}`);
    }

    const data = await response.json();
    const pages = (data.results || []).map((page) => ({
      id: page.id,
      title: page.title,
      type: page.type,
      url: page._links?.webui ? `https://${domain}.atlassian.net/wiki${page._links.webui}` : '',
      lastModified: page.history?.lastUpdated?.when,
    }));

    res.json({
      success: true,
      data: {
        query,
        pageCount: pages.length,
        pages,
      },
    });
  } catch (error) {
    console.error('[Confluence API Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
      setupInstructions: 'Confluence integration required. Please configure Confluence access and set CONFLUENCE_DOMAIN to search pages.',
    });
  }
});

app.post('/api/connectors/homeassistant/devices', async (req, res) => {
  try {
    const { domain } = req.body;
    
    const credentials = getConnectorCredentials('homeassistant');
    if (!credentials) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Home Assistant not configured. Please configure in Connector Settings.',
      });
    }
    
    const haUrl = credentials.haUrl;
    const token = credentials.haToken;

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

    const credentials = getConnectorCredentials('homeassistant');
    if (!credentials) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Home Assistant not configured. Please configure in Connector Settings.',
      });
    }
    
    const haUrl = credentials.haUrl;
    const token = credentials.haToken;

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

    const credentials = getConnectorCredentials('homeassistant');
    if (!credentials) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Home Assistant not configured. Please configure in Connector Settings.',
      });
    }
    
    const haUrl = credentials.haUrl;
    const token = credentials.haToken;

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

    const credentials = getConnectorCredentials('frigate_events');
    if (!credentials) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Frigate not configured. Please configure in Connector Settings.',
      });
    }
    
    const frigateUrl = credentials.frigateUrl;
    const frigateApiKey = credentials.frigateApiKey;

    let url = `${frigateUrl.replace(/\/$/, '')}/api/events?camera=${encodeURIComponent(camera)}&limit=${limit}`;
    if (objectType) {
      url += `&label=${encodeURIComponent(objectType)}`;
    }

    const response = await fetch(url, {
      headers: frigateApiKey ? {
        'X-Frigate-API-Key': frigateApiKey,
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

    const credentials = getConnectorCredentials('frigate_snapshot');
    if (!credentials) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Frigate not configured. Please configure in Connector Settings.',
      });
    }
    
    const frigateUrl = credentials.frigateUrl;
    const frigateApiKey = credentials.frigateApiKey;

    let url;
    if (eventId) {
      url = `${frigateUrl.replace(/\/$/, '')}/api/events/${eventId}/snapshot.jpg`;
    } else {
      url = `${frigateUrl.replace(/\/$/, '')}/api/${encodeURIComponent(camera)}/latest.jpg`;
    }

    const response = await fetch(url, {
      headers: frigateApiKey ? {
        'X-Frigate-API-Key': frigateApiKey,
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

    const credentials = getConnectorCredentials('frigate_camera_state');
    if (!credentials) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'Frigate not configured. Please configure in Connector Settings.',
      });
    }
    
    const frigateUrl = credentials.frigateUrl;
    const frigateApiKey = credentials.frigateApiKey;

    const configResponse = await fetch(`${frigateUrl.replace(/\/$/, '')}/api/config`, {
      headers: frigateApiKey ? {
        'X-Frigate-API-Key': frigateApiKey,
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

    const credentials = getConnectorCredentials('codeprojectai_detect');
    if (!credentials) {
      return res.status(401).json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'CodeProject.AI not configured. Please configure in Connector Settings.',
      });
    }
    
    const codeProjectAIUrl = credentials.codeprojectaiUrl;

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

    const credentials = getConnectorCredentials('yolo_detect');
    if (!credentials) {
      return res.json({
        success: false,
        requiresSetup: true,
        setupInstructions: 'YOLO not configured. Please configure in Connector Settings.',
        useBrowserYOLO: true,
      });
    }
    
    const yoloApiUrl = credentials.yoloApiUrl;

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

app.get('/api/financial/stocks/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Stock symbol is required',
      });
    }

    const quote = await stockDataService.getQuote(symbol.toUpperCase());
    
    res.json({
      success: true,
      data: quote,
    });
  } catch (error) {
    console.error('[Financial API - Stock Quote Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch stock quote',
    });
  }
});

app.get('/api/financial/crypto/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Cryptocurrency ID or symbol is required',
      });
    }

    const cryptoData = await cryptoDataService.getPrice(id.toLowerCase());
    
    res.json({
      success: true,
      data: cryptoData,
    });
  } catch (error) {
    console.error('[Financial API - Crypto Price Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch cryptocurrency price',
    });
  }
});

// CoinMarketCap Integration - Real-time crypto data with market cap tracking
app.post('/api/financial/coinmarketcap/quotes', async (req, res) => {
  try {
    const { symbols, convert = 'USD' } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({
        success: false,
        error: 'Symbols array is required',
      });
    }

    // Initialize service with API key if available
    const hasApiKey = coinMarketCapService.init(process.env.COINMARKETCAP_API_KEY);
    const quotes = await coinMarketCapService.getLatestQuotes(symbols, convert);
    
    res.json({
      success: true,
      quotes,
      requiresSetup: !hasApiKey,
      setupInstructions: hasApiKey ? null : 'Using mock data. Add COINMARKETCAP_API_KEY for real-time data from CoinMarketCap (free tier: 333 credits/day).',
    });
  } catch (error) {
    console.error('[CoinMarketCap API Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch CoinMarketCap quotes',
    });
  }
});

app.get('/api/financial/coinmarketcap/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const hasApiKey = coinMarketCapService.init(process.env.COINMARKETCAP_API_KEY);
    const trending = await coinMarketCapService.getTrending(limit);
    
    res.json({
      success: true,
      trending,
      requiresSetup: !hasApiKey,
    });
  } catch (error) {
    console.error('[CoinMarketCap Trending Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch trending cryptocurrencies',
    });
  }
});

app.get('/api/financial/coinmarketcap/global', async (req, res) => {
  try {
    const hasApiKey = coinMarketCapService.init(process.env.COINMARKETCAP_API_KEY);
    const metrics = await coinMarketCapService.getGlobalMetrics();
    
    res.json({
      success: true,
      metrics,
      requiresSetup: !hasApiKey,
    });
  } catch (error) {
    console.error('[CoinMarketCap Global Metrics Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch global crypto metrics',
    });
  }
});

app.get('/api/financial/portfolio/summary', async (req, res) => {
  try {
    const summary = await portfolioManager.getSummary();
    
    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('[Financial API - Portfolio Summary Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch portfolio summary',
    });
  }
});

app.get('/api/financial/portfolio/holdings', async (req, res) => {
  try {
    const holdings = portfolioManager.getHoldings();
    
    res.json({
      success: true,
      data: holdings,
    });
  } catch (error) {
    console.error('[Financial API - Portfolio Holdings Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch portfolio holdings',
    });
  }
});

app.post('/api/financial/portfolio/holding/add', async (req, res) => {
  try {
    const { symbol, type, quantity, averageCost } = req.body;
    
    if (!symbol || !type || !quantity || !averageCost) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, type, quantity, averageCost',
      });
    }

    if (!['stock', 'crypto'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Type must be either "stock" or "crypto"',
      });
    }

    portfolioManager.addHolding(symbol, type, parseFloat(quantity), parseFloat(averageCost));
    
    res.json({
      success: true,
      data: {
        message: `Added ${quantity} shares/units of ${symbol} to portfolio`,
      },
    });
  } catch (error) {
    console.error('[Financial API - Add Holding Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add holding to portfolio',
    });
  }
});

app.delete('/api/financial/portfolio/holding/:symbol/:type', async (req, res) => {
  try {
    const { symbol, type } = req.params;
    
    if (!symbol || !type) {
      return res.status(400).json({
        success: false,
        error: 'Symbol and type are required',
      });
    }

    if (!['stock', 'crypto'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Type must be either "stock" or "crypto"',
      });
    }

    portfolioManager.removeHolding(symbol, type);
    
    res.json({
      success: true,
      data: {
        message: `Removed ${symbol} from portfolio`,
      },
    });
  } catch (error) {
    console.error('[Financial API - Remove Holding Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to remove holding from portfolio',
    });
  }
});

app.get('/api/financial/accounts', async (req, res) => {
  try {
    const accounts = [
      { id: 'checking_001', name: 'Primary Checking', type: 'checking', balance: 12543.28, currency: 'USD' },
      { id: 'savings_001', name: 'High Yield Savings', type: 'savings', balance: 45230.50, currency: 'USD' },
      { id: 'credit_001', name: 'Rewards Credit Card', type: 'credit', balance: -1245.67, currency: 'USD' },
    ];

    res.json({
      success: true,
      accounts,
      requiresSetup: true,
      setupInstructions: 'Account balances are using mock data. Connect your bank via Plaid, Yodlee, or direct bank API for real account information.',
    });
  } catch (error) {
    console.error('[Financial API - Accounts Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve accounts',
    });
  }
});

app.get('/api/financial/transactions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const transactions = [
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
    
    const totalDebits = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalCredits = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    
    res.json({
      success: true,
      count: transactions.length,
      transactions: transactions.slice(0, limit),
      totalDebits,
      totalCredits,
      requiresSetup: true,
      setupInstructions: 'Transactions are using mock data. Connect your bank via Plaid, Yodlee, or direct bank API for real transaction history.',
    });
  } catch (error) {
    console.error('[Financial API - Transactions Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve transactions',
    });
  }
});

app.get('/api/financial/news', async (req, res) => {
  try {
    const category = req.query.category || 'general';
    const limit = parseInt(req.query.limit) || 10;
    const symbol = req.query.symbol;
    
    let newsData;
    
    if (symbol) {
      newsData = await marketNewsService.getCompanyNews(symbol, limit);
    } else {
      newsData = await marketNewsService.getMarketNews(category, limit);
    }
    
    const hasFinnhubKey = !!process.env.FINNHUB_API_KEY;
    
    res.json({
      success: true,
      news: newsData,
      requiresSetup: !hasFinnhubKey,
      setupInstructions: hasFinnhubKey ? null : 'Market news is using mock data. Add a FINNHUB_API_KEY secret for real-time financial news from Finnhub.io (free tier available).',
    });
  } catch (error) {
    console.error('[Financial API - News Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve market news',
    });
  }
});

// Environment config endpoint - provides frontend with available API keys (without exposing actual values)
app.get('/api/config/env', (req, res) => {
  res.json({
    success: true,
    config: {
      geminiApiKey: !!process.env.GEMINI_API_KEY,
      openaiApiKey: !!process.env.OPENAI_API_KEY,
      alphaVantageApiKey: !!process.env.ALPHA_VANTAGE_API_KEY,
      finnhubApiKey: !!process.env.FINNHUB_API_KEY,
      auddApiToken: !!process.env.AUDD_API_TOKEN,
      geniusApiToken: !!process.env.GENIUS_API_TOKEN,
      twilioConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    },
  });
});

// ============================================================================
// GEMINI AI PROXY - Secure server-side API calls
// ============================================================================
// Required environment variable: GEMINI_API_KEY
// All Gemini API calls go through this proxy to keep API keys secure
// ============================================================================

const geminiClient = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

app.post('/api/chat/gemini', async (req, res) => {
  if (!geminiClient) {
    return res.status(503).json({
      success: false,
      error: 'Gemini API not configured. Add GEMINI_API_KEY to environment.',
    });
  }

  try {
    const { model, messages, stream = false } = req.body;

    if (!model || !messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: model, messages (array)',
      });
    }

    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: typeof msg.content === 'string'
        ? [{ text: msg.content }]
        : msg.content,
    }));

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const streamResponse = await geminiClient.models.generateContentStream({
        model,
        contents,
      });

      for await (const chunk of streamResponse) {
        const text = chunk.text || '';
        res.write(`data: ${JSON.stringify({ text, done: false })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ text: '', done: true })}\n\n`);
      res.end();
    } else {
      const response = await geminiClient.models.generateContent({
        model,
        contents,
      });

      const text = response.text || '';

      res.json({
        success: true,
        text,
      });
    }
  } catch (error) {
    console.error('[Gemini Chat Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate response',
    });
  }
});

app.post('/api/gemini/embeddings', async (req, res) => {
  if (!geminiClient) {
    return res.status(503).json({
      success: false,
      error: 'Gemini API not configured. Add GEMINI_API_KEY to environment.',
    });
  }

  try {
    const { text, model = 'text-embedding-004' } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: text',
      });
    }

    const response = await geminiClient.models.embedContent({
      model,
      contents: [{ parts: [{ text }] }],
    });

    if (response.embeddings && response.embeddings.length > 0) {
      res.json({
        success: true,
        embedding: response.embeddings[0].values,
      });
    } else {
      throw new Error('No embedding returned from Gemini');
    }
  } catch (error) {
    console.error('[Gemini Embeddings Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate embedding',
    });
  }
});

app.post('/api/gemini/generate-speech', async (req, res) => {
  if (!geminiClient) {
    return res.status(503).json({
      success: false,
      error: 'Gemini API not configured. Add GEMINI_API_KEY to environment.',
    });
  }

  try {
    const { text, personaName, personaVoice } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: text',
      });
    }

    const prompt = `You are ${personaName || 'an AI assistant'}. Convert the following text into a natural, conversational spoken format. Remove any markdown, code formatting, or technical notation. Make it sound natural as if being spoken out loud:\n\n${text}`;

    const response = await geminiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [{ text: prompt }],
      }],
    });

    const spokenText = response.text || text;

    res.json({
      success: true,
      spokenText,
      voice: personaVoice || 'default',
    });
  } catch (error) {
    console.error('[Gemini TTS Generation Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate speech text',
    });
  }
});

// ============================================================================
// OPENAI PROXY - Secure Backend API Proxy
// ============================================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.post('/api/chat/openai', async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(503).json({
      success: false,
      error: 'OpenAI API not configured. Add OPENAI_API_KEY to environment.',
    });
  }

  try {
    const { messages, model = 'gpt-4o-mini', stream = false } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: messages (array)',
      });
    }

    const endpoint = 'https://api.openai.com/v1';
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenAI API error: ${response.statusText}`);
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                res.write('data: [DONE]\n\n');
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
                }
              } catch (e) {
                console.error('[OpenAI Proxy] Parse error:', e);
              }
            }
          }
        }
      } finally {
        res.end();
      }
    } else {
      const data = await response.json();
      res.json({
        success: true,
        text: data.choices[0].message.content,
      });
    }
  } catch (error) {
    console.error('[OpenAI Proxy Error]', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to complete chat',
      });
    }
  }
});

// ============================================================================
// TWILIO INTEGRATION - Voice & SMS
// ============================================================================
// Required environment variables:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
// ============================================================================

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// In-memory call state (use Redis in production)
const activeCalls = new Map();
const smsHistory = [];

// Twilio: Configuration Status
app.get('/api/twilio/status', (req, res) => {
  const configured = twilioClient !== null;
  
  res.json({
    success: true,
    configured,
    phoneNumber: configured ? process.env.TWILIO_PHONE_NUMBER : null,
    message: configured 
      ? 'Twilio is configured and ready' 
      : 'Twilio not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to environment.'
  });
});

// SMS: Send outgoing message
app.post('/api/twilio/sms/send', async (req, res) => {
  if (!twilioClient) {
    return res.status(503).json({
      success: false,
      error: 'Twilio not configured. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to environment.',
    });
  }

  try {
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ success: false, error: 'Missing required fields: to, message' });
    }

    const twilioMessage = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
    });

    smsHistory.push({
      sid: twilioMessage.sid,
      direction: 'outbound',
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
      body: message,
      timestamp: new Date().toISOString(),
      status: twilioMessage.status,
    });

    res.json({
      success: true,
      messageSid: twilioMessage.sid,
      status: twilioMessage.status,
    });
  } catch (error) {
    console.error('[Twilio SMS Send Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send SMS',
    });
  }
});

// SMS: Incoming webhook (receives messages)
app.post('/api/twilio/sms/incoming', (req, res) => {
  const { From, To, Body, MessageSid } = req.body;

  console.log(`[Twilio] Incoming SMS from ${From}: ${Body}`);

  smsHistory.push({
    sid: MessageSid,
    direction: 'inbound',
    from: From,
    to: To,
    body: Body,
    timestamp: new Date().toISOString(),
    status: 'received',
  });

  // Send TwiML response (optional auto-reply)
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Thanks for your message! NIRVANA received it.</Message>
</Response>`;

  res.type('text/xml');
  res.send(twiml);
});

// SMS: Get history
app.get('/api/twilio/sms/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const history = smsHistory.slice(-limit).reverse();
  
  res.json({
    success: true,
    messages: history,
    total: smsHistory.length,
  });
});

// Voice: Make outgoing call
app.post('/api/twilio/voice/call', async (req, res) => {
  if (!twilioClient) {
    return res.status(503).json({
      success: false,
      error: 'Twilio not configured.',
    });
  }

  try {
    const { to, personaVoice = 'Polly.Joanna' } = req.body;

    if (!to) {
      return res.status(400).json({ success: false, error: 'Missing required field: to' });
    }

    const call = await twilioClient.calls.create({
      url: `${process.env.PUBLIC_URL || 'https://your-domain.com'}/api/twilio/voice/twiml`,
      to: to,
      from: process.env.TWILIO_PHONE_NUMBER,
      statusCallback: `${process.env.PUBLIC_URL || 'https://your-domain.com'}/api/twilio/voice/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
    });

    activeCalls.set(call.sid, {
      sid: call.sid,
      to: to,
      from: process.env.TWILIO_PHONE_NUMBER,
      status: call.status,
      direction: 'outbound',
      startTime: new Date().toISOString(),
      personaVoice,
      userMuted: false,
      userListening: true,
    });

    res.json({
      success: true,
      callSid: call.sid,
      status: call.status,
    });
  } catch (error) {
    console.error('[Twilio Voice Call Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate call',
    });
  }
});

// Voice: Incoming call webhook
app.post('/api/twilio/voice/incoming', (req, res) => {
  const { CallSid, From, To } = req.body;

  console.log(`[Twilio] Incoming call from ${From}`);

  activeCalls.set(CallSid, {
    sid: CallSid,
    from: From,
    to: To,
    status: 'ringing',
    direction: 'inbound',
    startTime: new Date().toISOString(),
    personaVoice: 'Polly.Joanna',
    userMuted: false,
    userListening: true,
  });

  // TwiML response - connect to media stream
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Hello! This is NIRVANA. How can I help you today?</Say>
  <Pause length="1"/>
  <Start>
    <Stream url="wss://${req.get('host')}/api/twilio/voice/media/${CallSid}" />
  </Start>
  <Pause length="60"/>
</Response>`;

  res.type('text/xml');
  res.send(twiml);
});

// Voice: TwiML handler for outbound calls
app.post('/api/twilio/voice/twiml', (req, res) => {
  const { CallSid } = req.body;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Hello! This is NIRVANA calling. Please hold while I connect you.</Say>
  <Pause length="1"/>
  <Start>
    <Stream url="wss://${req.get('host')}/api/twilio/voice/media/${CallSid}" />
  </Start>
  <Pause length="60"/>
</Response>`;

  res.type('text/xml');
  res.send(twiml);
});

// Voice: Call status callback
app.post('/api/twilio/voice/status', (req, res) => {
  const { CallSid, CallStatus, CallDuration } = req.body;

  if (activeCalls.has(CallSid)) {
    const call = activeCalls.get(CallSid);
    call.status = CallStatus;
    call.duration = CallDuration;

    if (CallStatus === 'completed' || CallStatus === 'failed' || CallStatus === 'busy' || CallStatus === 'no-answer') {
      call.endTime = new Date().toISOString();
      console.log(`[Twilio] Call ${CallSid} ended with status: ${CallStatus}`);
    }
  }

  res.sendStatus(200);
});

// Voice: Get active calls
app.get('/api/twilio/voice/calls', (req, res) => {
  const calls = Array.from(activeCalls.values());
  
  res.json({
    success: true,
    calls: calls,
  });
});

// Voice: Update call controls (mute, join, etc.)
app.post('/api/twilio/voice/controls', (req, res) => {
  const { callSid, action, value } = req.body;

  if (!activeCalls.has(callSid)) {
    return res.status(404).json({ success: false, error: 'Call not found' });
  }

  const call = activeCalls.get(callSid);

  switch (action) {
    case 'mute':
      call.userMuted = value;
      break;
    case 'listen':
      call.userListening = value;
      break;
    case 'join':
      call.userJoined = value;
      break;
    default:
      return res.status(400).json({ success: false, error: 'Invalid action' });
  }

  res.json({
    success: true,
    call: call,
  });
});

// Voice: Hangup call
app.post('/api/twilio/voice/hangup', async (req, res) => {
  if (!twilioClient) {
    return res.status(503).json({ success: false, error: 'Twilio not configured' });
  }

  try {
    const { callSid } = req.body;

    await twilioClient.calls(callSid).update({ status: 'completed' });

    if (activeCalls.has(callSid)) {
      const call = activeCalls.get(callSid);
      call.status = 'completed';
      call.endTime = new Date().toISOString();
    }

    res.json({
      success: true,
      callSid: callSid,
    });
  } catch (error) {
    console.error('[Twilio Hangup Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to hangup call',
    });
  }
});

/**
 * ===========================================
 * OAUTH V2 - SECURE SERVER-SIDE TOKEN MANAGEMENT
 * ===========================================
 * 
 * SECURITY MODEL:
 * - All tokens stored server-side (in-memory Map, production: database)
 * - CSRF protection via state parameter validation
 * - PKCE for additional security
 * - Tokens NEVER sent to client
 * - Frontend makes authenticated requests via backend proxy
 */

// Server-side OAuth token storage (In production, use database)
const oauthTokens = new Map(); // providerId -> { accessToken, refreshToken, expiresAt, accountInfo }
const oauthStates = new Map(); // state -> { providerId, codeChallenge, timestamp }

// OAuth V2: Initiate authorization flow
app.post('/api/oauth/initiate', async (req, res) => {
  try {
    const { providerId, codeChallenge, codeChallengeMethod } = req.body;

    if (!providerId) {
      return res.status(400).json({
        success: false,
        error: 'Missing providerId'
      });
    }

    // Generate state for CSRF protection
    const state = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Store state and PKCE challenge
    oauthStates.set(state, {
      providerId,
      codeChallenge,
      codeChallengeMethod,
      timestamp: Date.now()
    });

    // Clean up old states (>10 minutes)
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    for (const [s, data] of oauthStates.entries()) {
      if (data.timestamp < tenMinutesAgo) {
        oauthStates.delete(s);
      }
    }

    // Provider-specific auth URLs
    let authUrl, clientId, redirectUri, scopes;

    switch (providerId) {
      case 'coinbase':
        clientId = process.env.COINBASE_CLIENT_ID;
        redirectUri = process.env.COINBASE_REDIRECT_URI || 'http://localhost:5000/oauth/callback';
        scopes = 'wallet:accounts:read,wallet:transactions:read,wallet:buys:read,wallet:sells:read';
        authUrl = `https://www.coinbase.com/oauth/authorize?` +
          `response_type=code&` +
          `client_id=${clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scopes)}&` +
          `state=${state}`;
        break;

      case 'google':
        clientId = process.env.GOOGLE_CLIENT_ID;
        redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/oauth/callback';
        scopes = 'openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly';
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `response_type=code&` +
          `client_id=${clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scopes)}&` +
          `state=${state}&` +
          `code_challenge=${codeChallenge}&` +
          `code_challenge_method=${codeChallengeMethod}`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown provider: ${providerId}`
        });
    }

    if (!clientId) {
      return res.status(503).json({
        success: false,
        error: `${providerId} OAuth not configured`,
        requiresSetup: true
      });
    }

    res.json({
      success: true,
      authUrl,
      state
    });
  } catch (error) {
    console.error('[OAuth V2 Initiate Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate OAuth'
    });
  }
});

// OAuth V2: Handle callback with state and PKCE validation
app.post('/api/oauth/callback', async (req, res) => {
  try {
    const { providerId, code, state, codeVerifier } = req.body;

    // Validate state (CSRF protection)
    const stateData = oauthStates.get(state);
    if (!stateData || stateData.providerId !== providerId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired state (CSRF protection)'
      });
    }

    // Clean up state
    oauthStates.delete(state);

    // Provider-specific token exchange
    let tokenUrl, clientId, clientSecret, redirectUri;

    switch (providerId) {
      case 'coinbase':
        tokenUrl = 'https://api.coinbase.com/oauth/token';
        clientId = process.env.COINBASE_CLIENT_ID;
        clientSecret = process.env.COINBASE_CLIENT_SECRET;
        redirectUri = process.env.COINBASE_REDIRECT_URI || 'http://localhost:5000/oauth/callback';
        break;

      case 'google':
        tokenUrl = 'https://oauth2.googleapis.com/token';
        clientId = process.env.GOOGLE_CLIENT_ID;
        clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/oauth/callback';
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown provider: ${providerId}`
        });
    }

    if (!clientId || !clientSecret) {
      return res.status(503).json({
        success: false,
        error: `${providerId} OAuth not configured`
      });
    }

    // Exchange code for tokens
    const tokenParams = {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri
    };

    // Add PKCE verifier if present
    if (codeVerifier) {
      tokenParams.code_verifier = codeVerifier;
    }

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(tokenParams)
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      return res.status(tokenResponse.status).json({
        success: false,
        error: `Token exchange failed: ${error}`
      });
    }

    const tokenData = await tokenResponse.json();

    // Get user info (provider-specific)
    let accountInfo = {};
    try {
      if (providerId === 'coinbase') {
        const userResponse = await fetch('https://api.coinbase.com/v2/user', {
          headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
        });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          accountInfo = {
            id: userData.data?.id,
            name: userData.data?.name,
            email: userData.data?.email
          };
        }
      } else if (providerId === 'google') {
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
        });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          accountInfo = {
            id: userData.id,
            name: userData.name,
            email: userData.email
          };
        }
      }
    } catch (error) {
      console.warn('[OAuth V2] Failed to fetch user info:', error);
    }

    // Store tokens SERVER-SIDE (never sent to client!)
    oauthTokens.set(providerId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : null,
      tokenType: tokenData.token_type || 'Bearer',
      scope: tokenData.scope,
      accountInfo,
      connectedAt: Date.now()
    });

    console.log(`[OAuth V2] Tokens stored server-side for ${providerId}`);

    // Return success WITHOUT exposing tokens
    res.json({
      success: true,
      providerId,
      accountInfo
    });

  } catch (error) {
    console.error('[OAuth V2 Callback Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'OAuth callback failed'
    });
  }
});

// OAuth V2: Get connection status (no tokens exposed)
app.get('/api/oauth/status/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    const tokenData = oauthTokens.get(providerId);

    if (!tokenData) {
      return res.json({
        providerId,
        isConnected: false,
        status: 'disconnected'
      });
    }

    // Check if expired
    const isExpired = tokenData.expiresAt && tokenData.expiresAt < Date.now();

    res.json({
      providerId,
      isConnected: true,
      accountInfo: tokenData.accountInfo,
      connectedAt: tokenData.connectedAt,
      expiresAt: tokenData.expiresAt,
      status: isExpired ? 'expired' : 'active'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// OAuth V2: Get all connections
app.get('/api/oauth/connections', async (req, res) => {
  try {
    const connections = [];

    for (const [providerId, tokenData] of oauthTokens.entries()) {
      const isExpired = tokenData.expiresAt && tokenData.expiresAt < Date.now();
      connections.push({
        providerId,
        isConnected: true,
        accountInfo: tokenData.accountInfo,
        connectedAt: tokenData.connectedAt,
        expiresAt: tokenData.expiresAt,
        status: isExpired ? 'expired' : 'active'
      });
    }

    res.json({
      success: true,
      connections
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// OAuth V2: Disconnect (remove server-side tokens)
app.delete('/api/oauth/disconnect/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    oauthTokens.delete(providerId);

    res.json({
      success: true,
      message: `Disconnected from ${providerId}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// OAuth V2: Proxy authenticated requests (backend uses stored tokens)
app.post('/api/oauth/proxy/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    const { endpoint, method, headers, body } = req.body;

    const tokenData = oauthTokens.get(providerId);
    if (!tokenData) {
      return res.status(401).json({
        success: false,
        error: 'Not connected to provider'
      });
    }

    // Check if token expired - attempt refresh
    if (tokenData.expiresAt && tokenData.expiresAt < Date.now()) {
      if (tokenData.refreshToken) {
        // Attempt token refresh
        console.log(`[OAuth V2] Token expired for ${providerId}, refreshing...`);
        // Token refresh logic would go here
        // For now, return error
        return res.status(401).json({
          success: false,
          error: 'Token expired, please reconnect'
        });
      } else {
        return res.status(401).json({
          success: false,
          error: 'Token expired, please reconnect'
        });
      }
    }

    // Make authenticated request
    const response = await fetch(endpoint, {
      method: method || 'GET',
      headers: {
        ...headers,
        'Authorization': `${tokenData.tokenType} ${tokenData.accessToken}`
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const responseData = await response.json();

    res.status(response.status).json(responseData);

  } catch (error) {
    console.error('[OAuth V2 Proxy Error]', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ===========================================
 * OAUTH & AUTHENTICATION ENDPOINTS (LEGACY - INSECURE)
 * ===========================================
 */

// OAuth: Generic token refresh endpoint
app.post('/api/oauth/refresh', async (req, res) => {
  try {
    const { providerId, refreshToken } = req.body;

    if (!providerId || !refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing providerId or refreshToken'
      });
    }

    // Provider-specific token refresh logic
    let tokenUrl, clientId, clientSecret;

    switch (providerId) {
      case 'coinbase':
        tokenUrl = 'https://api.coinbase.com/oauth/token';
        clientId = process.env.COINBASE_CLIENT_ID;
        clientSecret = process.env.COINBASE_CLIENT_SECRET;
        break;
      case 'google':
        tokenUrl = 'https://oauth2.googleapis.com/token';
        clientId = process.env.GOOGLE_CLIENT_ID;
        clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown provider: ${providerId}`
        });
    }

    if (!clientId || !clientSecret) {
      return res.status(503).json({
        success: false,
        error: `${providerId} OAuth not configured`,
        requiresSetup: true
      });
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({
        success: false,
        error: `Token refresh failed: ${error}`
      });
    }

    const data = await response.json();

    res.json({
      success: true,
      token: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: data.expires_in ? Date.now() + (data.expires_in * 1000) : undefined,
        tokenType: data.token_type || 'Bearer',
        scope: data.scope
      }
    });
  } catch (error) {
    console.error('[OAuth Refresh Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Token refresh failed'
    });
  }
});

// Coinbase: Initiate OAuth authorization
app.post('/api/coinbase/oauth/authorize', async (req, res) => {
  try {
    const clientId = process.env.COINBASE_CLIENT_ID;
    const redirectUri = process.env.COINBASE_REDIRECT_URI || 'http://localhost:5000/oauth/callback';

    if (!clientId) {
      return res.status(503).json({
        success: false,
        error: 'Coinbase OAuth not configured',
        requiresSetup: true,
        setupInstructions: 'Add COINBASE_CLIENT_ID and COINBASE_CLIENT_SECRET to .env'
      });
    }

    const { scopes } = req.body;
    const scopeString = scopes?.join(',') || 'wallet:accounts:read,wallet:transactions:read';

    const authUrl = `https://www.coinbase.com/oauth/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopeString)}&` +
      `state=${Math.random().toString(36).substring(7)}`;

    res.json({
      success: true,
      authUrl
    });
  } catch (error) {
    console.error('[Coinbase OAuth Authorize Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate auth URL'
    });
  }
});

// Coinbase: Handle OAuth callback
app.post('/api/coinbase/oauth/callback', async (req, res) => {
  try {
    const { code } = req.body;
    const clientId = process.env.COINBASE_CLIENT_ID;
    const clientSecret = process.env.COINBASE_CLIENT_SECRET;
    const redirectUri = process.env.COINBASE_REDIRECT_URI || 'http://localhost:5000/oauth/callback';

    if (!clientId || !clientSecret) {
      return res.status(503).json({
        success: false,
        error: 'Coinbase OAuth not configured',
        requiresSetup: true
      });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.coinbase.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      return res.status(tokenResponse.status).json({
        success: false,
        error: `Token exchange failed: ${error}`
      });
    }

    const tokenData = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch('https://api.coinbase.com/v2/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    let accountInfo = {};
    if (userResponse.ok) {
      const userData = await userResponse.json();
      accountInfo = {
        id: userData.data?.id,
        name: userData.data?.name,
        email: userData.data?.email
      };
    }

    res.json({
      success: true,
      token: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : undefined,
        tokenType: tokenData.token_type || 'Bearer',
        scope: tokenData.scope
      },
      accountInfo
    });
  } catch (error) {
    console.error('[Coinbase OAuth Callback Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'OAuth callback failed'
    });
  }
});

// Coinbase: Get user accounts
app.get('/api/coinbase/accounts', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Missing authorization header'
      });
    }

    const response = await fetch('https://api.coinbase.com/v2/accounts', {
      headers: {
        'Authorization': authHeader,
        'CB-VERSION': '2024-11-01'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({
        success: false,
        error: `Failed to fetch accounts: ${error}`
      });
    }

    const data = await response.json();
    res.json({
      success: true,
      data: data.data
    });
  } catch (error) {
    console.error('[Coinbase Accounts Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch accounts'
    });
  }
});

// Coinbase: Get account transactions
app.get('/api/coinbase/accounts/:accountId/transactions', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit = 25 } = req.query;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Missing authorization header'
      });
    }

    const response = await fetch(
      `https://api.coinbase.com/v2/accounts/${accountId}/transactions?limit=${limit}`,
      {
        headers: {
          'Authorization': authHeader,
          'CB-VERSION': '2024-11-01'
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({
        success: false,
        error: `Failed to fetch transactions: ${error}`
      });
    }

    const data = await response.json();
    res.json({
      success: true,
      data: data.data
    });
  } catch (error) {
    console.error('[Coinbase Transactions Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch transactions'
    });
  }
});

// Voice: Media stream WebSocket handler
wss.on('connection', (ws, req) => {
  const urlParts = req.url.split('/');
  const callSid = urlParts[urlParts.length - 1];
  
  console.log(`[Twilio WebSocket] Media stream connected for call: ${callSid}`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.event === 'connected') {
        console.log('[Twilio WebSocket] Stream connected:', data);
      } else if (data.event === 'start') {
        console.log('[Twilio WebSocket] Stream started:', data);
      } else if (data.event === 'media') {
        // Incoming audio from caller (mulaw format)
        // This can be sent to PersonI STT for processing
        // For now, we just echo it back as a test
        ws.send(JSON.stringify({
          event: 'media',
          media: {
            payload: data.media.payload
          }
        }));
      } else if (data.event === 'stop') {
        console.log('[Twilio WebSocket] Stream stopped');
      }
    } catch (error) {
      console.error('[Twilio WebSocket] Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`[Twilio WebSocket] Stream disconnected for call: ${callSid}`);
  });

  ws.on('error', (error) => {
    console.error('[Twilio WebSocket] Error:', error);
  });
});

// Model Discovery Proxy - for custom providers (with SSRF protection)
app.post('/api/models/proxy', async (req, res) => {
  try {
    const { baseUrl, apiKey, headers = {} } = req.body;

    if (!baseUrl) {
      return res.status(400).json({
        success: false,
        error: 'Base URL is required'
      });
    }

    // SSRF Protection: Validate URL
    let url;
    try {
      url = new URL(baseUrl);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
    }

    // Block private network ranges
    const hostname = url.hostname;
    const privatePatterns = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^::1$/,
      /^fc00:/i,
      /^fe80:/i
    ];

    // Allow localhost only in development
    const isDev = process.env.NODE_ENV !== 'production';
    if (!isDev && privatePatterns.some(pattern => pattern.test(hostname))) {
      return res.status(403).json({
        success: false,
        error: 'Access to private network ranges is not allowed'
      });
    }

    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(url.protocol)) {
      return res.status(400).json({
        success: false,
        error: 'Only HTTP/HTTPS protocols are allowed'
      });
    }

    // Build request to model discovery endpoint
    // Normalize URL: if baseUrl already includes /v1, don't duplicate it
    let normalizedBase = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    const modelsUrl = normalizedBase.includes('/v1') 
      ? `${normalizedBase}/models`
      : `${normalizedBase}/v1/models`;
    
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    if (apiKey) {
      requestHeaders['Authorization'] = `Bearer ${apiKey}`;
    }

    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(modelsUrl, {
      headers: requestHeaders,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `Model discovery failed: ${response.statusText}`
      });
    }

    // Limit response size to 1MB
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1048576) {
      return res.status(413).json({
        success: false,
        error: 'Response too large'
      });
    }

    const data = await response.json();

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('[Models Proxy Error]', error);
    
    if (error.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        error: 'Request timeout'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch models'
    });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Connector Backend] Server running on port ${PORT}`);
  console.log(`[Connector Backend] Health check: http://localhost:${PORT}/health`);
  console.log(`[Connector Backend] WebSocket server ready for Twilio media streams`);
  
  if (twilioClient) {
    console.log('[Twilio] ✅ Integration active');
    console.log(`[Twilio] Phone number: ${process.env.TWILIO_PHONE_NUMBER || 'NOT SET'}`);
  } else {
    console.log('[Twilio] ⚠️  Not configured - add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
  }
});
