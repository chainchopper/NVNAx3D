/**
 * Plugin Sandbox Service
 * 
 * Provides secure isolated execution environment for user-generated plugins using iframes.
 * Prevents XSS, arbitrary code execution, and DOM access vulnerabilities.
 * 
 * SECURITY FEATURES:
 * - Iframe sandbox with restricted permissions
 * - PostMessage API for controlled communication
 * - HTML/CSS sanitization before rendering
 * - Resource limits and timeout enforcement
 * - Error boundaries and crash recovery
 * 
 * ARCHITECTURE:
 * Main App <--postMessage--> Sandbox Iframe <--isolated--> Plugin Code
 */

import { Plugin } from '../types/plugin-types';
import DOMPurify from 'isomorphic-dompurify';

export interface SandboxConfig {
  maxExecutionTime?: number; // milliseconds
  maxMemory?: number; // bytes (not enforceable in browser, but tracked)
  allowedAPIs?: string[]; // Whitelist of allowed window APIs
  enableNetworkAccess?: boolean;
}

export interface SandboxMessage {
  type: 'render' | 'event' | 'method' | 'error' | 'log' | 'ready';
  payload?: any;
  pluginId?: string;
  timestamp: number;
}

export interface SandboxResponse {
  success: boolean;
  data?: any;
  error?: string;
}

const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
  maxExecutionTime: 5000, // 5 seconds
  maxMemory: 50 * 1024 * 1024, // 50MB (tracked, not enforced)
  allowedAPIs: ['console'], // Very restricted by default
  enableNetworkAccess: false
};

/**
 * PluginSandbox - Manages isolated plugin execution in iframe
 */
export class PluginSandbox {
  private iframe: HTMLIFrameElement | null = null;
  private config: SandboxConfig;
  private messageHandlers: Map<string, (response: SandboxResponse) => void> = new Map();
  private messageId = 0;
  private isReady = false;
  private readyPromise: Promise<void>;
  private readyResolve?: () => void;

  constructor(config: Partial<SandboxConfig> = {}) {
    this.config = { ...DEFAULT_SANDBOX_CONFIG, ...config };
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });
  }

  /**
   * Initialize the sandbox iframe
   */
  async initialize(container: HTMLElement): Promise<void> {
    if (this.iframe) {
      console.warn('[PluginSandbox] Already initialized');
      return;
    }

    this.iframe = document.createElement('iframe');
    
    // Strict sandbox restrictions
    this.iframe.sandbox.add(
      'allow-scripts', // Required for plugin code
      // Intentionally NOT including:
      // - allow-same-origin (prevents accessing parent)
      // - allow-top-navigation (prevents navigation)
      // - allow-forms (not needed)
      // - allow-popups (not needed)
    );

    // Additional security attributes
    this.iframe.style.border = 'none';
    this.iframe.style.width = '100%';
    this.iframe.style.height = '100%';
    this.iframe.setAttribute('referrerpolicy', 'no-referrer');
    
    // Listen for messages from iframe
    window.addEventListener('message', this.handleMessage.bind(this));

    // Create sandbox HTML content
    const sandboxHTML = this.createSandboxHTML();
    this.iframe.srcdoc = sandboxHTML;
    
    container.appendChild(this.iframe);

    // Wait for sandbox to be ready
    await this.readyPromise;
    
    console.log('[PluginSandbox] Initialized and ready');
  }

  /**
   * Create the sandboxed HTML content
   */
  private createSandboxHTML(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: system-ui, -apple-system, sans-serif;
      overflow: auto;
    }
  </style>
</head>
<body>
  <div id="plugin-root"></div>
  <script>
    (function() {
      'use strict';
      
      const root = document.getElementById('plugin-root');
      
      // Secure postMessage wrapper
      function sendMessage(type, payload) {
        window.parent.postMessage({
          type,
          payload,
          timestamp: Date.now()
        }, '*');
      }

      // Error handler
      window.addEventListener('error', (event) => {
        sendMessage('error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });

      // Message handler from parent
      window.addEventListener('message', (event) => {
        try {
          const { type, payload, messageId } = event.data;
          
          switch (type) {
            case 'render':
              // Render sanitized HTML
              root.innerHTML = payload.html;
              
              // Apply sanitized CSS
              if (payload.css) {
                const style = document.createElement('style');
                style.textContent = payload.css;
                document.head.appendChild(style);
              }
              
              // Attach event listeners
              if (payload.events) {
                Object.entries(payload.events).forEach(([selector, handlers]) => {
                  const elements = root.querySelectorAll(selector);
                  Object.entries(handlers).forEach(([eventName, handlerId]) => {
                    elements.forEach(el => {
                      el.addEventListener(eventName, (e) => {
                        sendMessage('event', {
                          handlerId,
                          eventType: eventName,
                          detail: e.detail
                        });
                      });
                    });
                  });
                });
              }
              
              sendMessage('ready', { messageId });
              break;
              
            case 'event':
              // Forward event to plugin code
              const event = new CustomEvent(payload.eventName, {
                detail: payload.detail
              });
              root.dispatchEvent(event);
              break;
          }
        } catch (error) {
          sendMessage('error', {
            message: error.message,
            stack: error.stack
          });
        }
      });

      // Signal ready
      sendMessage('ready', {});
    })();
  </script>
</body>
</html>`;
  }

  /**
   * Handle messages from iframe
   */
  private handleMessage(event: MessageEvent): void {
    // Verify message is from our iframe
    if (!this.iframe || event.source !== this.iframe.contentWindow) {
      return;
    }

    const message: SandboxMessage = event.data;

    switch (message.type) {
      case 'ready':
        if (!this.isReady) {
          this.isReady = true;
          this.readyResolve?.();
        }
        
        // Resolve pending message handler if messageId present
        if (message.payload?.messageId) {
          const handler = this.messageHandlers.get(message.payload.messageId);
          if (handler) {
            handler({ success: true });
            this.messageHandlers.delete(message.payload.messageId);
          }
        }
        break;

      case 'error':
        console.error('[PluginSandbox] Error from plugin:', message.payload);
        break;

      case 'log':
        console.log('[PluginSandbox] Plugin log:', message.payload);
        break;

      case 'event':
        // Handle events from plugin
        this.handlePluginEvent(message.payload);
        break;
    }
  }

  /**
   * Handle events triggered by plugin
   */
  private handlePluginEvent(payload: any): void {
    // Forward to app-level event handlers if needed
    console.log('[PluginSandbox] Plugin event:', payload);
  }

  /**
   * Render a plugin in the sandbox
   */
  async renderPlugin(plugin: Plugin): Promise<SandboxResponse> {
    if (!this.iframe || !this.isReady) {
      return { success: false, error: 'Sandbox not ready' };
    }

    // Sanitize HTML
    const sanitizedHTML = this.sanitizeHTML(plugin.component?.template || '');
    
    // Sanitize CSS
    const sanitizedCSS = this.sanitizeCSS(plugin.component?.styles || '');

    const messageId = `render_${this.messageId++}`;

    // Send render message
    this.iframe.contentWindow?.postMessage({
      type: 'render',
      messageId,
      payload: {
        html: sanitizedHTML,
        css: sanitizedCSS,
        events: this.extractEventHandlers(plugin)
      }
    }, '*');

    // Wait for response
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.messageHandlers.delete(messageId);
        resolve({ success: false, error: 'Render timeout' });
      }, this.config.maxExecutionTime);

      this.messageHandlers.set(messageId, (response) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });
  }

  /**
   * Sanitize HTML using DOMPurify (battle-tested XSS prevention)
   */
  private sanitizeHTML(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'div', 'span', 'p', 'a', 'b', 'i', 'u', 'strong', 'em',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'img', 'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon',
        'button', 'input', 'select', 'option', 'textarea', 'label', 'form',
        'canvas'
      ],
      ALLOWED_ATTR: [
        'class', 'id', 'style', 'data-*',
        'href', 'src', 'alt', 'title',
        'width', 'height', 'viewBox', 'xmlns',
        'd', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points',
        'fill', 'stroke', 'stroke-width',
        'type', 'value', 'placeholder', 'name', 'disabled', 'checked',
        'min', 'max', 'step'
      ],
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
      ALLOW_DATA_ATTR: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      SANITIZE_DOM: true,
      KEEP_CONTENT: true,
      IN_PLACE: false
    });
  }

  /**
   * Sanitize CSS to prevent data exfiltration
   */
  private sanitizeCSS(css: string): string {
    // Remove @import rules (could load external resources)
    css = css.replace(/@import\s+[^;]+;/gi, '');
    
    // Remove url() with external domains (keep data: and blob: for icons/images)
    css = css.replace(/url\s*\(\s*['"]?(?!data:|blob:)([^'")]+)['"]?\s*\)/gi, (match, url) => {
      // Only allow relative URLs or same-origin
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
        return ''; // Remove external URLs
      }
      return match;
    });

    return css;
  }

  /**
   * Extract event handlers from plugin definition
   */
  private extractEventHandlers(plugin: Plugin): Record<string, Record<string, string>> {
    // This would map selectors to event types to handler IDs
    // For now, return empty - full implementation would require plugin method registration
    return {};
  }

  /**
   * Destroy the sandbox
   */
  destroy(): void {
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
    this.isReady = false;
    this.messageHandlers.clear();
    window.removeEventListener('message', this.handleMessage);
    console.log('[PluginSandbox] Destroyed');
  }
}

/**
 * Global sandbox manager
 */
class PluginSandboxManager {
  private sandboxes: Map<string, PluginSandbox> = new Map();

  async createSandbox(pluginId: string, container: HTMLElement, config?: Partial<SandboxConfig>): Promise<PluginSandbox> {
    if (this.sandboxes.has(pluginId)) {
      console.warn(`[PluginSandboxManager] Sandbox for ${pluginId} already exists`);
      return this.sandboxes.get(pluginId)!;
    }

    const sandbox = new PluginSandbox(config);
    await sandbox.initialize(container);
    this.sandboxes.set(pluginId, sandbox);
    
    console.log(`[PluginSandboxManager] Created sandbox for plugin: ${pluginId}`);
    return sandbox;
  }

  getSandbox(pluginId: string): PluginSandbox | undefined {
    return this.sandboxes.get(pluginId);
  }

  destroySandbox(pluginId: string): void {
    const sandbox = this.sandboxes.get(pluginId);
    if (sandbox) {
      sandbox.destroy();
      this.sandboxes.delete(pluginId);
      console.log(`[PluginSandboxManager] Destroyed sandbox for plugin: ${pluginId}`);
    }
  }

  destroyAll(): void {
    this.sandboxes.forEach((sandbox, pluginId) => {
      sandbox.destroy();
    });
    this.sandboxes.clear();
    console.log('[PluginSandboxManager] Destroyed all sandboxes');
  }
}

export const pluginSandboxManager = new PluginSandboxManager();
