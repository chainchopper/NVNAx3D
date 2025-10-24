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
  // Add other connectors here...
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
      accentColor: '#32cd32', // Lime Green
      textureName: 'metallic_brushed',
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