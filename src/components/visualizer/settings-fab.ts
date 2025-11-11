/**
 * Settings FAB (Floating Action Button)
 * 
 * Gear icon button that toggles the radial settings menu
 * Draggable, repositionable, with GSAP smooth motion
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';

@customElement('settings-fab')
export class SettingsFab extends LitElement {
  @state() private menuOpen = false;
  @state() private position = { x: 0, y: 0 };
  
  private draggableInstance: Draggable[] | null = null;

  static override styles = css`
    :host {
      display: block;
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 100;
    }

    .fab-button {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(25, 22, 30, 0.85);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      cursor: grab;
      transition: all 0.3s ease;
      outline: none;
    }

    .fab-button:hover {
      background: rgba(135, 206, 250, 0.25);
      border-color: rgba(135, 206, 250, 0.6);
      box-shadow: 0 6px 16px rgba(135, 206, 250, 0.4);
      transform: scale(1.05);
    }

    .fab-button:active {
      cursor: grabbing;
      transform: scale(0.95);
    }

    .fab-button.menu-open {
      background: rgba(135, 206, 250, 0.3);
      border-color: rgba(135, 206, 250, 0.8);
      box-shadow: 0 0 20px rgba(135, 206, 250, 0.6);
    }

    svg {
      width: 32px;
      height: 32px;
      transition: transform 0.3s ease;
    }

    .fab-button.menu-open svg {
      transform: rotate(180deg);
    }
  `;

  override render() {
    return html`
      <button
        class="fab-button ${this.menuOpen ? 'menu-open' : ''}"
        @click=${this.toggleMenu}
        title="Settings"
        aria-label="Toggle settings menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6m-5-13l-3 5.2m14.4 6.8l-3-5.2m0-6.8l-3 5.2M1.6 12l3 5.2m14.4 0l-3-5.2"></path>
        </svg>
      </button>
    `;
  }

  override firstUpdated() {
    this.setupDraggable();
    
    // Set initial position
    this.updatePosition();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this.draggableInstance) {
      this.draggableInstance.forEach(d => d.kill());
      this.draggableInstance = null;
    }
  }

  private setupDraggable(): void {
    const button = this.shadowRoot?.querySelector('.fab-button');
    if (!button) return;

    this.draggableInstance = Draggable.create(this, {
      type: 'x,y',
      bounds: {
        minX: 20,
        maxX: window.innerWidth - 84,
        minY: 20,
        maxY: window.innerHeight - 84
      },
      inertia: true,
      edgeResistance: 0.65,
      onDrag: () => {
        this.updatePosition();
      },
      onDragEnd: () => {
        this.updatePosition();
      }
    });
  }

  private updatePosition(): void {
    const rect = this.getBoundingClientRect();
    this.position = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };

    this.dispatchEvent(new CustomEvent('position-change', {
      detail: this.position,
      bubbles: true,
      composed: true
    }));
  }

  private toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    
    this.dispatchEvent(new CustomEvent('menu-toggle', {
      detail: { open: this.menuOpen, position: this.position },
      bubbles: true,
      composed: true
    }));
  }

  public closeMenu(): void {
    if (this.menuOpen) {
      this.menuOpen = false;
      this.dispatchEvent(new CustomEvent('menu-toggle', {
        detail: { open: false, position: this.position },
        bubbles: true,
        composed: true
      }));
    }
  }
}
