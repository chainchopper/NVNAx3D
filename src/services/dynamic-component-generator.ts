/**
 * Dynamic Component Generator
 * Meta-programming layer for generating Lit components from plugin definitions
 */

import { LitElement, html, css, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import type { Plugin, PropDefinition } from '../types/plugin-types';
import { pluginRegistry } from './plugin-registry';

class DynamicComponentGenerator {
  private compiledTemplates: Map<string, Function> = new Map();
  private componentRegistry: Map<string, typeof LitElement> = new Map();

  async generateComponent(plugin: Plugin): Promise<typeof LitElement | null> {
    try {
      console.log('[ComponentGenerator] Generating component for:', plugin.metadata.name);

      const componentClass = this.createComponentClass(plugin);
      
      const tagName = this.getTagName(plugin.metadata.id);
      if (!customElements.get(tagName)) {
        customElements.define(tagName, componentClass);
        console.log('[ComponentGenerator] Registered custom element:', tagName);
      }

      this.componentRegistry.set(plugin.metadata.id, componentClass);
      pluginRegistry.setLoadedComponent(plugin.metadata.id, componentClass);

      return componentClass;
    } catch (error) {
      console.error('[ComponentGenerator] Error generating component:', error);
      return null;
    }
  }

  private createComponentClass(plugin: Plugin): typeof LitElement {
    const { component, metadata } = plugin;
    const self = this;

    class DynamicComponent extends LitElement {
      static styles = css`
        :host {
          display: block;
          position: relative;
        }

        ${unsafeCSS(component.styles || '')}
      `;

      constructor() {
        super();
        
        Object.keys(component.props).forEach(propName => {
          const propDef = component.props[propName];
          if (propDef.default !== undefined) {
            (this as any)[propName] = propDef.default;
          }
        });
      }

      render() {
        try {
          const templateFn = self.compileTemplate(metadata.id, component.template);
          return templateFn.call(this, html);
        } catch (error) {
          console.error('[DynamicComponent] Render error:', error);
          return html`
            <div style="color: red; padding: 20px; border: 2px solid red;">
              <strong>Plugin Render Error:</strong> ${(error as Error).message}
            </div>
          `;
        }
      }

      connectedCallback() {
        super.connectedCallback();
        console.log('[DynamicComponent] Connected:', metadata.name);
      }

      disconnectedCallback() {
        super.disconnectedCallback();
        console.log('[DynamicComponent] Disconnected:', metadata.name);
      }
    }

    Object.keys(component.props).forEach(propName => {
      const propDef = component.props[propName];
      const decorator = property({ 
        type: this.getLitType(propDef.type),
        reflect: true 
      });
      decorator(DynamicComponent.prototype, propName);
    });

    if (component.methods) {
      Object.keys(component.methods).forEach(methodName => {
        const methodDef = component.methods![methodName];
        try {
          const fn = new Function('params', methodDef.implementation);
          (DynamicComponent.prototype as any)[methodName] = fn;
        } catch (error) {
          console.error(`[ComponentGenerator] Error creating method ${methodName}:`, error);
        }
      });
    }

    return DynamicComponent;
  }

  private compileTemplate(pluginId: string, template: string): Function {
    if (this.compiledTemplates.has(pluginId)) {
      return this.compiledTemplates.get(pluginId)!;
    }

    try {
      const templateFn = new Function('html', `
        return html\`${this.sanitizeTemplate(template)}\`;
      `);

      this.compiledTemplates.set(pluginId, templateFn);
      return templateFn;
    } catch (error) {
      console.error('[ComponentGenerator] Template compilation error:', error);
      throw new Error(`Failed to compile template: ${(error as Error).message}`);
    }
  }

  private sanitizeTemplate(template: string): string {
    template = template.replace(/<script[\s\S]*?<\/script>/gi, '');
    
    template = template.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    
    template = template.replace(/javascript:/gi, '');
    
    return template;
  }

  private getLitType(type: string): any {
    switch (type) {
      case 'string': return String;
      case 'number': return Number;
      case 'boolean': return Boolean;
      case 'object': return Object;
      case 'array': return Array;
      default: return String;
    }
  }

  getTagName(pluginId: string): string {
    return `dynamic-plugin-${pluginId.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
  }

  getComponent(pluginId: string): typeof LitElement | undefined {
    return this.componentRegistry.get(pluginId);
  }

  async loadAndGeneratePlugin(pluginId: string): Promise<typeof LitElement | null> {
    const plugin = pluginRegistry.getPlugin(pluginId);
    
    if (!plugin) {
      console.warn('[ComponentGenerator] Plugin not found:', pluginId);
      return null;
    }

    if (!plugin.enabled) {
      console.warn('[ComponentGenerator] Plugin not enabled:', pluginId);
      return null;
    }

    const existing = this.componentRegistry.get(pluginId);
    if (existing) {
      return existing;
    }

    return await this.generateComponent(plugin);
  }

  async regeneratePlugin(pluginId: string): Promise<typeof LitElement | null> {
    this.compiledTemplates.delete(pluginId);
    this.componentRegistry.delete(pluginId);
    
    const tagName = this.getTagName(pluginId);
    const existingElement = customElements.get(tagName);
    if (existingElement) {
      console.warn('[ComponentGenerator] Cannot redefine custom element:', tagName);
      console.warn('[ComponentGenerator] Browser limitation - page refresh required for full regeneration');
    }

    return await this.loadAndGeneratePlugin(pluginId);
  }

  createPluginElement(pluginId: string, props: Record<string, any> = {}): HTMLElement | null {
    const component = this.componentRegistry.get(pluginId);
    
    if (!component) {
      console.warn('[ComponentGenerator] Component not loaded:', pluginId);
      return null;
    }

    const tagName = this.getTagName(pluginId);
    const element = document.createElement(tagName) as any;

    Object.keys(props).forEach(key => {
      element[key] = props[key];
    });

    return element;
  }

  validatePlugin(plugin: Plugin): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!plugin.metadata.name || plugin.metadata.name.trim().length === 0) {
      errors.push('Plugin name is required');
    }

    if (!plugin.component.template || plugin.component.template.trim().length === 0) {
      errors.push('Component template is required');
    }

    try {
      this.sanitizeTemplate(plugin.component.template);
    } catch (error) {
      errors.push(`Template validation failed: ${(error as Error).message}`);
    }

    Object.keys(plugin.component.props).forEach(propName => {
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(propName)) {
        errors.push(`Invalid property name: ${propName}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getStats() {
    return {
      compiledTemplates: this.compiledTemplates.size,
      registeredComponents: this.componentRegistry.size,
    };
  }
}

export const dynamicComponentGenerator = new DynamicComponentGenerator();
