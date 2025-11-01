/**
 * Dynamic UI Plugin System Types
 * Supports PersonI-generated UI components with persistence
 */

export interface PluginMetadata {
  id: string;
  name: string;
  description: string;
  author: string; // PersonI name or "user"
  version: string;
  createdAt: string;
  updatedAt: string;
  category: 'dashboard' | 'chart' | 'form' | 'table' | 'card' | 'list' | 'custom';
  tags: string[];
}

export interface PluginComponent {
  template: string; // HTML template string
  styles: string; // CSS styles
  props: Record<string, PropDefinition>;
  events: Record<string, EventDefinition>;
  methods?: Record<string, MethodDefinition>;
}

export interface PropDefinition {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  default?: any;
  required?: boolean;
  description?: string;
}

export interface EventDefinition {
  description: string;
  payload?: Record<string, any>;
}

export interface MethodDefinition {
  params: Record<string, PropDefinition>;
  returns?: string;
  implementation: string; // JavaScript function body
}

export interface Plugin {
  metadata: PluginMetadata;
  component: PluginComponent;
  enabled: boolean;
  autoLoad: boolean;
}

export interface PluginInstance {
  pluginId: string;
  instanceId: string;
  props: Record<string, any>;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

export interface PluginRegistry {
  plugins: Map<string, Plugin>;
  instances: Map<string, PluginInstance>;
  loadedComponents: Map<string, any>; // Compiled Lit components
}

export interface PluginGenerationRequest {
  description: string; // Natural language description
  category?: string;
  dataSource?: string; // API endpoint or data source
  updateInterval?: number; // For real-time updates
  interactivity?: 'none' | 'basic' | 'advanced';
}

export interface PluginGenerationResponse {
  success: boolean;
  plugin?: Plugin;
  error?: string;
  suggestions?: string[];
}
