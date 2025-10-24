/**
 * Enhanced PersonI types with capabilities
 */

import { PersoniConfig } from '../personas';

export interface PersoniCapabilities {
  vision: boolean;
  imageGeneration: boolean;
  webSearch: boolean;
  tools: boolean;
  mcp: boolean;  // Model Context Protocol
  audioInput: boolean;
  audioOutput: boolean;
}

export interface EnhancedPersoniConfig extends PersoniConfig {
  capabilities: PersoniCapabilities;
  modelProviderId?: string;  // References a model from the provider system
  avatarUrl?: string;
  avatarAnimatedUrl?: string;
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
