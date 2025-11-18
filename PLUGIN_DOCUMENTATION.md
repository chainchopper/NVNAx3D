# Nirvana Plugin System Documentation

## Overview

The Nirvana plugin system allows you to create custom UI components and integrate them into the PersonI AI platform. Plugins are dynamic Lit-based web components that can be loaded via file upload (ZIP) or GitHub URL.

## Plugin Structure

A plugin consists of:
- **Metadata**: Name, version, author, description
- **Component Definition**: Props, template (HTML), styles (CSS), and optional methods
- **Permissions**: Required capabilities and system access

### Basic Plugin Format

```json
{
  "metadata": {
    "id": "my-custom-plugin",
    "name": "My Custom Plugin",
    "version": "1.0.0",
    "author": "Your Name",
    "description": "A custom plugin for Nirvana",
    "tags": ["dashboard", "monitoring"],
    "createdAt": "2025-01-18T00:00:00.000Z",
    "updatedAt": "2025-01-18T00:00:00.000Z"
  },
  "component": {
    "props": {
      "title": {
        "type": "string",
        "default": "Dashboard"
      },
      "darkMode": {
        "type": "boolean",
        "default": true
      }
    },
    "template": "<div class='plugin-container'><h2>${this.title}</h2><slot></slot></div>",
    "styles": ".plugin-container { padding: 20px; background: rgba(0,0,0,0.8); border-radius: 12px; }"
  },
  "permissions": [],
  "enabled": true,
  "autoLoad": false
}
```

## Creating a Plugin

### 1. Define Metadata

```json
{
  "metadata": {
    "id": "security-monitor",
    "name": "Security Monitor",
    "version": "1.0.0",
    "author": "Security Team",
    "description": "Real-time security monitoring dashboard",
    "tags": ["security", "monitoring", "dashboard"]
  }
}
```

### 2. Define Component Props

Props are reactive properties that can be passed to your component:

```json
{
  "component": {
    "props": {
      "alertThreshold": {
        "type": "number",
        "default": 80
      },
      "refreshInterval": {
        "type": "number",
        "default": 5000
      },
      "showDetails": {
        "type": "boolean",
        "default": true
      }
    }
  }
}
```

### 3. Write the Template

Use Lit's `html` tagged template literals. Access props via `this`:

```javascript
"template": `
  <div class="security-monitor">
    <h2>Security Status</h2>
    <div class="status">
      ${this.showDetails ? 'Details visible' : 'Overview only'}
    </div>
    <div class="threshold">Alert Threshold: ${this.alertThreshold}%</div>
  </div>
`
```

### 4. Add Styles

CSS scoped to the component:

```css
"styles": `
  .security-monitor {
    padding: 24px;
    background: linear-gradient(135deg, rgba(10, 14, 39, 0.95), rgba(20, 28, 58, 0.95));
    border: 1px solid rgba(135, 206, 250, 0.2);
    border-radius: 16px;
    color: white;
  }
  
  h2 {
    color: #87CEFA;
    font-size: 24px;
    margin-bottom: 16px;
  }
  
  .status {
    padding: 12px;
    background: rgba(76, 175, 80, 0.2);
    border-radius: 8px;
    margin-bottom: 12px;
  }
`
```

## Loading Plugins

### Method 1: ZIP File Upload

1. Create your plugin JSON file (e.g., `plugin.json`)
2. Optionally include additional assets (images, data files)
3. Compress into a ZIP file
4. Navigate to **Plugins** panel in Nirvana
5. Click **Upload Plugin**
6. Select your ZIP file
7. The plugin will be extracted and registered automatically

**ZIP Structure:**
```
my-plugin.zip
  ├── plugin.json (required)
  ├── assets/
  │   ├── icon.svg
  │   └── data.json
  └── README.md (optional)
```

### Method 2: GitHub URL

1. Host your `plugin.json` in a GitHub repository
2. Get the raw file URL (e.g., `https://raw.githubusercontent.com/username/repo/main/plugin.json`)
3. Navigate to **Plugins** panel
4. Click **Load from URL**
5. Paste the GitHub raw URL
6. Plugin will be fetched and registered

## Advanced Features

### Event Handling

Plugins can dispatch custom events to communicate with the host application:

```javascript
"template": `
  <button @click="${() => this.dispatchEvent(new CustomEvent('alert-triggered', { 
    detail: { level: 'high' },
    bubbles: true,
    composed: true 
  }))}">
    Trigger Alert
  </button>
`
```

### Lifecycle Methods

Plugins support standard Lit lifecycle callbacks:

```javascript
{
  "component": {
    "methods": {
      "connectedCallback": "console.log('Plugin mounted');",
      "disconnectedCallback": "console.log('Plugin unmounted');"
    }
  }
}
```

### Accessing System Services

Plugins can access Nirvana services via global exports:

```javascript
"template": `
  <button @click="${async () => {
    const { ragMemoryManager } = await import('/src/services/memory/rag-memory-manager.js');
    await ragMemoryManager.addMemory('User clicked button', { type: 'interaction' });
  }}">
    Save to Memory
  </button>
`
```

## Security & Idle Mode Plugins

### Security Monitor Plugin

For automated security monitoring when idle:

```json
{
  "metadata": {
    "id": "security-idle-monitor",
    "name": "Idle Security Monitor",
    "description": "Monitors camera feed for security events when system is idle"
  },
  "component": {
    "props": {
      "enableVision": { "type": "boolean", "default": true },
      "enableObjectDetection": { "type": "boolean", "default": true },
      "alertOnMotion": { "type": "boolean", "default": true }
    },
    "template": `
      <div class="security-monitor">
        <h3>🔒 Security Monitor Active</h3>
        <div class="status-grid">
          <div class="status-item">
            <span>Vision:</span> <span>${this.enableVision ? '✓' : '✗'}</span>
          </div>
          <div class="status-item">
            <span>Object Detection:</span> <span>${this.enableObjectDetection ? '✓' : '✗'}</span>
          </div>
        </div>
      </div>
    `
  }
}
```

### Configuring Idle Mode

1. Go to **Device Settings** panel
2. Enable **Idle Mode**
3. Select **Security** role
4. Enable required sensors (Vision, Object Recognition)
5. Enable **Connectors** for notifications
6. Save settings

The system will automatically activate when idle and can trigger alerts via SMS/email through configured connectors.

## Best Practices

1. **Keep plugins lightweight** - Large plugins impact performance
2. **Use semantic HTML** - Ensure accessibility
3. **Scope your CSS** - Avoid global style conflicts
4. **Handle errors gracefully** - Wrap async operations in try-catch
5. **Document your props** - Help users understand configuration
6. **Version your plugins** - Use semantic versioning (1.0.0, 1.1.0, etc.)
7. **Test thoroughly** - Verify in both light and dark modes

## Plugin Examples

### Example 1: Simple Counter

```json
{
  "metadata": {
    "id": "simple-counter",
    "name": "Click Counter",
    "version": "1.0.0"
  },
  "component": {
    "props": {
      "count": { "type": "number", "default": 0 }
    },
    "template": `
      <div class="counter">
        <h3>Count: ${this.count}</h3>
        <button @click="${() => this.count++}">Increment</button>
      </div>
    `,
    "styles": `
      .counter { padding: 20px; text-align: center; }
      button { 
        padding: 10px 20px; 
        background: #87CEFA;
        border: none;
        border-radius: 8px;
        cursor: pointer;
      }
    `
  }
}
```

### Example 2: Status Dashboard

```json
{
  "metadata": {
    "id": "status-dashboard",
    "name": "System Status",
    "version": "1.0.0"
  },
  "component": {
    "props": {
      "cpuUsage": { "type": "number", "default": 0 },
      "memoryUsage": { "type": "number", "default": 0 }
    },
    "template": `
      <div class="dashboard">
        <div class="metric">
          <span>CPU:</span>
          <div class="bar" style="width: ${this.cpuUsage}%"></div>
          <span>${this.cpuUsage}%</span>
        </div>
        <div class="metric">
          <span>Memory:</span>
          <div class="bar" style="width: ${this.memoryUsage}%"></div>
          <span>${this.memoryUsage}%</span>
        </div>
      </div>
    `,
    "styles": `
      .dashboard { padding: 20px; background: rgba(0,0,0,0.8); border-radius: 12px; }
      .metric { margin: 12px 0; display: flex; align-items: center; gap: 12px; }
      .bar { height: 8px; background: #4CAF50; border-radius: 4px; }
    `
  }
}
```

## Troubleshooting

### Plugin Not Loading

- Check JSON syntax is valid
- Ensure all required fields are present
- Verify template uses valid Lit syntax
- Check browser console for errors

### Styling Issues

- Use `:host` selector for component root styles
- Ensure CSS is properly scoped
- Avoid `!important` declarations
- Test in both expanded and collapsed states

### Performance Issues

- Minimize DOM updates
- Use Lit's reactive properties efficiently
- Avoid expensive operations in templates
- Consider lazy-loading heavy assets

## API Reference

### Plugin Registry API

```javascript
import { pluginRegistry } from '/src/services/plugin-registry.js';

// Register a plugin
const pluginId = await pluginRegistry.registerPlugin(pluginDefinition);

// Get all plugins
const plugins = pluginRegistry.getAllPlugins();

// Enable/disable a plugin
await pluginRegistry.updatePlugin(pluginId, { enabled: true });

// Export plugin
const exported = await pluginRegistry.exportPlugin(pluginId);

// Import plugin
const imported = await pluginRegistry.importPlugin(pluginJSON);
```

### Dynamic Component Generator API

```javascript
import { dynamicComponentGenerator } from '/src/services/dynamic-component-generator.js';

// Generate component class
const ComponentClass = await dynamicComponentGenerator.generateComponent(plugin);

// Create element instance
const element = dynamicComponentGenerator.createPluginElement(pluginId, { prop1: 'value' });

// Validate plugin
const { valid, errors } = dynamicComponentGenerator.validatePlugin(plugin);
```

## Support

For issues, questions, or contributions:
- Check existing plugins in the Plugins panel for examples
- Review browser console for error messages
- Test plugins in isolation before deployment

---

**Version:** 1.0.0  
**Last Updated:** November 18, 2025  
**Nirvana Plugin System**
