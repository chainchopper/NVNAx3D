/**
 * Circular Menu Wheel Component
 * 
 * Always-visible circular menu with 11 panel icons arranged in a wheel
 * Each icon opens its respective settings panel/drawer
 * Active icon remains highlighted while panel is open
 */

import { LitElement, css, html, svg, SVGTemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { appStateService } from '../../services/app-state-service';
import type { ActiveSidePanel } from '../../services/app-state-service';

interface MenuItem {
  id: ActiveSidePanel;
  label: string;
  icon: () => SVGTemplateResult;
}

@customElement('circular-menu-wheel')
export class CircularMenuWheel extends LitElement {
  @state() private activePanelId: ActiveSidePanel = 'none';
  @state() private settingsDockVisible = false;
  @state() private expanded = true; // Start expanded
  
  private unsubscribeAppState: (() => void) | null = null;

  // Menu items with custom SVG icons
  private static readonly MENU_ITEMS: MenuItem[] = [
    {
      id: 'models',
      label: 'AI Models',
      icon: () => svg`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v4m0 12v4M4.22 4.22l2.83 2.83m9.9 9.9l2.83 2.83M2 12h4m12 0h4M4.22 19.78l2.83-2.83m9.9-9.9l2.83-2.83"/>
        </svg>
      `
    },
    {
      id: 'personis',
      label: 'PersonI',
      icon: () => svg`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      `
    },
    {
      id: 'connectorConfig',
      label: 'Connectors',
      icon: () => svg`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      `
    },
    {
      id: 'notes',
      label: 'Notes',
      icon: () => svg`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="8" y1="13" x2="16" y2="13"/>
          <line x1="8" y1="17" x2="16" y2="17"/>
        </svg>
      `
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: () => svg`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 11 12 14 22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
      `
    },
    {
      id: 'memory',
      label: 'Memory',
      icon: () => svg`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 3v4M8 3v4m-6 4h20"/>
        </svg>
      `
    },
    {
      id: 'routines',
      label: 'Routines',
      icon: () => svg`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.5 2v6h-6M2.5 22v-6h6"/>
          <path d="M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
        </svg>
      `
    },
    {
      id: 'plugins',
      label: 'Plugins',
      icon: () => svg`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
      `
    },
    {
      id: 'telephony',
      label: 'Telephony',
      icon: () => svg`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
      `
    },
    {
      id: 'userProfile',
      label: 'Profile',
      icon: () => svg`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      `
    },
    {
      id: 'help',
      label: 'Help',
      icon: () => svg`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      `
    }
  ];

  static override styles = css`
    :host {
      display: block;
      position: fixed;
      bottom: 32px;
      right: 32px;
      z-index: 170;
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    :host(.dock-open) {
      transform: translateX(-380px);
    }

    .wheel-container {
      position: relative;
      width: 280px;
      height: 280px;
    }

    .center-hub {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(10, 14, 39, 0.9);
      backdrop-filter: blur(12px);
      border: 2px solid rgba(135, 206, 250, 0.4);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(135, 206, 250, 0.8);
      font-size: 24px;
      cursor: pointer;
      pointer-events: all;
      transition: all 0.3s ease;
    }

    .center-hub:hover {
      background: rgba(135, 206, 250, 0.2);
      border-color: rgba(135, 206, 250, 0.6);
      transform: translate(-50%, -50%) scale(1.08);
    }

    .menu-item {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 48px;
      height: 48px;
      margin-left: -24px;
      margin-top: -24px;
      border-radius: 50%;
      background: rgba(25, 22, 30, 0.85);
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: all;
      opacity: 1;
    }

    .menu-item.collapsed {
      opacity: 0;
      pointer-events: none;
      transform: scale(0.3);
    }

    .menu-item svg {
      width: 24px;
      height: 24px;
    }

    .menu-item:hover {
      background: rgba(135, 206, 250, 0.2);
      border-color: rgba(135, 206, 250, 0.5);
      color: rgba(135, 206, 250, 1);
      transform: scale(1.15);
      box-shadow: 0 4px 12px rgba(135, 206, 250, 0.3);
    }

    .menu-item.active {
      background: rgba(135, 206, 250, 0.3);
      border-color: rgba(135, 206, 250, 0.8);
      color: rgba(135, 206, 250, 1);
      box-shadow: 0 0 20px rgba(135, 206, 250, 0.6),
                  0 0 40px rgba(135, 206, 250, 0.3);
      animation: pulse-glow 2s ease-in-out infinite;
    }

    @keyframes pulse-glow {
      0%, 100% {
        box-shadow: 0 0 20px rgba(135, 206, 250, 0.6),
                    0 0 40px rgba(135, 206, 250, 0.3);
      }
      50% {
        box-shadow: 0 0 30px rgba(135, 206, 250, 0.8),
                    0 0 60px rgba(135, 206, 250, 0.5);
      }
    }

    .tooltip {
      position: absolute;
      left: -10px;
      top: 50%;
      transform: translate(-100%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
      border: 1px solid rgba(255, 255, 255, 0.2);
      z-index: 10;
    }

    .menu-item:hover .tooltip {
      opacity: 1;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.unsubscribeAppState = appStateService.subscribe(() => {
      const state = appStateService.getState();
      this.activePanelId = state.activeSidePanel;
      this.settingsDockVisible = state.settingsMenuVisible || state.activeSidePanel !== 'none';
      
      // Add/remove dock-open class for responsive offset
      if (this.settingsDockVisible) {
        this.classList.add('dock-open');
      } else {
        this.classList.remove('dock-open');
      }
    });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribeAppState) {
      this.unsubscribeAppState();
    }
  }

  private handleItemClick(item: MenuItem): void {
    // Close settings menu (radial from settings-fab) if open
    appStateService.setSettingsMenuVisible(false);
    
    // Toggle panel: close if same panel clicked, open otherwise
    if (this.activePanelId === item.id) {
      appStateService.setActiveSidePanel('none');
    } else {
      appStateService.setActiveSidePanel(item.id);
    }

    // Emit custom event for analytics/logging
    this.dispatchEvent(new CustomEvent('panel-selected', {
      detail: { panelId: item.id },
      bubbles: true,
      composed: true
    }));
  }

  private handleToggleExpand(): void {
    this.expanded = !this.expanded;
    
    // If collapsing and a panel is open, close it
    if (!this.expanded && this.activePanelId !== 'none') {
      appStateService.setActiveSidePanel('none');
    }
  }

  private calculatePosition(index: number, total: number): string {
    const radius = 110; // Distance from center
    const angle = (360 / total) * index - 90; // Start at top (-90deg offset)
    const angleRad = (angle * Math.PI) / 180;
    const x = Math.cos(angleRad) * radius;
    const y = Math.sin(angleRad) * radius;
    
    return `translate(${x}px, ${y}px)`;
  }

  override render() {
    const items = CircularMenuWheel.MENU_ITEMS;

    return html`
      <div class="wheel-container">
        <!-- Center hub (clickable to expand/collapse) -->
        <button
          class="center-hub"
          @click=${this.handleToggleExpand}
          aria-label="Toggle settings menu"
        >
          ⚙️
          <span class="tooltip">${this.expanded ? 'Hide Menu' : 'Show Menu'}</span>
        </button>

        <!-- Menu items arranged in circle -->
        ${items.map((item, index) => {
          const isActive = this.activePanelId === item.id;
          const position = this.calculatePosition(index, items.length);
          const collapsed = !this.expanded ? 'collapsed' : '';
          
          return html`
            <button
              class="menu-item ${isActive ? 'active' : ''} ${collapsed}"
              style="transform: ${position}"
              @click=${() => this.handleItemClick(item)}
              aria-pressed=${isActive}
              aria-label="${item.label}"
            >
              ${item.icon()}
              <span class="tooltip">${item.label}</span>
            </button>
          `;
        })}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'circular-menu-wheel': CircularMenuWheel;
  }
}
