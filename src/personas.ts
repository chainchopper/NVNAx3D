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
export type IdleAnimation = 'none' | 'glow' | 'particles' | 'code';

export interface Connector {
  id: string;
  name: string;
  description: string;
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

// User-configured instance of a Personi
export interface PersoniConfig {
  id: string;
  name: string;
  tagline: string;
  systemInstruction: string;
  templateName: string;
  voiceName: string;
  thinkingModel: string;
  enabledConnectors: string[]; // List of connector IDs
  capabilities?: PersoniCapabilities;
  avatarUrl?: string;
  visuals: {
    shape: 'Icosahedron' | 'TorusKnot' | 'Box';
    accentColor: string; // hex string e.g., '#87ceeb'
    textureName?: TextureName;
    idleAnimation?: IdleAnimation;
  };
}

// Base template for creating a Personi
// FIX: Add `introductions` and `idlePrompts` to correctly type the templates.
export interface PersonaTemplate extends Omit<PersoniConfig, 'id'> {
  introductions: string[];
  idlePrompts: string[];
}

export const AVAILABLE_CONNECTORS: Connector[] = [
  {
    id: 'google_drive',
    name: 'Google Drive',
    description: 'Access and manage your Google Drive files and folders.',
    functionDeclaration: {
      name: 'readFileFromGoogleDrive',
      description:
        'Reads the content of a file from Google Drive given its name or URL.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          fileName: {
            type: Type.STRING,
            description: 'The name or URL of the file in Google Drive.',
          },
        },
        required: ['fileName'],
      },
    },
  },
  {
    id: 'gmail',
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
    id: 'youtube',
    name: 'YouTube',
    description: 'Access and manage YouTube videos, channels, and analytics.',
    functionDeclaration: {
      name: 'getYoutubeVideoDetails',
      description:
        'Gets details, such as the transcript or summary, from a YouTube video URL.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          url: {
            type: Type.STRING,
            description: 'The full URL of the YouTube video.',
          },
        },
        required: ['url'],
      },
    },
  },
  {
    id: 'notion',
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
    id: 'confluence',
    name: 'Confluence',
    description: 'Search and access Confluence pages and spaces.',
    functionDeclaration: {
      name: 'searchConfluencePages',
      description: 'Searches for pages in Confluence using CQL or text search.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description:
              'Search query or CQL (Confluence Query Language) to find pages.',
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
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Access HubSpot contacts, companies, and CRM data.',
    functionDeclaration: {
      name: 'getHubSpotContacts',
      description: 'Retrieves contacts from HubSpot CRM based on filters.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          searchQuery: {
            type: Type.STRING,
            description:
              'Search query to filter contacts (e.g., email, name, company).',
          },
          limit: {
            type: Type.NUMBER,
            description: 'Maximum number of contacts to return (default: 10).',
          },
        },
        required: [],
      },
    },
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    description: 'Access and manage your Dropbox files and folders.',
    functionDeclaration: {
      name: 'readDropboxFile',
      description: 'Reads the content of a file from Dropbox given its path.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          filePath: {
            type: Type.STRING,
            description:
              'The path to the file in Dropbox (e.g., "/Documents/report.txt").',
          },
        },
        required: ['filePath'],
      },
    },
  },
  {
    id: 'box',
    name: 'Box',
    description: 'Access and manage your Box files and folders.',
    functionDeclaration: {
      name: 'readBoxFile',
      description: 'Reads the content of a file from Box given its file ID.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          fileId: {
            type: Type.STRING,
            description: 'The Box file ID or URL.',
          },
        },
        required: ['fileId'],
      },
    },
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    description: 'Access and manage your OneDrive files and folders.',
    functionDeclaration: {
      name: 'readOneDriveFile',
      description:
        'Reads the content of a file from OneDrive given its path or ID.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          filePath: {
            type: Type.STRING,
            description:
              'The path or ID of the file in OneDrive (e.g., "/Documents/presentation.pptx").',
          },
        },
        required: ['filePath'],
      },
    },
  },
  {
    id: 'sharepoint',
    name: 'SharePoint',
    description: 'Access SharePoint sites, lists, and documents.',
    functionDeclaration: {
      name: 'readSharePointFile',
      description:
        'Reads the content of a file from SharePoint given its site and file path.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          siteUrl: {
            type: Type.STRING,
            description:
              'The SharePoint site URL (e.g., "https://company.sharepoint.com/sites/team").',
          },
          filePath: {
            type: Type.STRING,
            description:
              'The relative path to the file (e.g., "/Shared Documents/file.docx").',
          },
        },
        required: ['siteUrl', 'filePath'],
      },
    },
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Send messages and interact with Discord servers.',
    functionDeclaration: {
      name: 'sendDiscordMessage',
      description: 'Sends a message to a Discord channel.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          channelId: {
            type: Type.STRING,
            description: 'The Discord channel ID where the message will be sent.',
          },
          message: {
            type: Type.STRING,
            description: 'The message content to send.',
          },
        },
        required: ['channelId', 'message'],
      },
    },
  },
  {
    id: 'spotify',
    name: 'Spotify',
    description: 'Access Spotify playlists, tracks, and current playback.',
    functionDeclaration: {
      name: 'getCurrentSpotifyTrack',
      description:
        'Gets information about the currently playing track on Spotify.',
      parameters: {
        type: Type.OBJECT,
        properties: {},
        required: [],
      },
    },
  },
  {
    id: 'outlook',
    name: 'Outlook',
    description: 'Search and read emails from your Outlook inbox.',
    functionDeclaration: {
      name: 'searchOutlookEmails',
      description: 'Searches for emails in Outlook using a query string.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description:
              'Search query (e.g., "from:user@example.com", "subject:meeting", "hasAttachments:true").',
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
    id: 'twilio',
    name: 'Twilio',
    description: 'Send SMS messages and make calls using Twilio.',
    functionDeclaration: {
      name: 'sendTwilioSMS',
      description: 'Sends an SMS message using Twilio.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          to: {
            type: Type.STRING,
            description:
              'The recipient phone number in E.164 format (e.g., "+1234567890").',
          },
          message: {
            type: Type.STRING,
            description: 'The SMS message content to send.',
          },
        },
        required: ['to', 'message'],
      },
    },
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Send emails using SendGrid email service.',
    functionDeclaration: {
      name: 'sendEmailViaSendGrid',
      description: 'Sends an email using SendGrid.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          to: {
            type: Type.STRING,
            description: 'The recipient email address.',
          },
          subject: {
            type: Type.STRING,
            description: 'The email subject line.',
          },
          body: {
            type: Type.STRING,
            description: 'The email body content (supports HTML).',
          },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    id: 'resend',
    name: 'Resend',
    description: 'Send emails using Resend email service.',
    functionDeclaration: {
      name: 'sendEmailViaResend',
      description: 'Sends an email using Resend.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          to: {
            type: Type.STRING,
            description: 'The recipient email address.',
          },
          subject: {
            type: Type.STRING,
            description: 'The email subject line.',
          },
          body: {
            type: Type.STRING,
            description: 'The email body content (supports HTML).',
          },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    id: 'slack',
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
    enabledConnectors: ['youtube'],
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
      shape: 'Box',
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