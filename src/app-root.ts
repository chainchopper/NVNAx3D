/**
 * App Root - Router Container
 * 
 * Handles routing between main interface (/) and visualizer (/visualizer)
 * Dynamically renders the appropriate component based on current route
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { router, RouteName } from './router';
import './index'; // Main interface (gdm-live-audio)
import './routes/visualizer/index'; // Visualizer interface

@customElement('app-root')
export class AppRoot extends LitElement {
  @state() private currentRoute: RouteName = 'main';

  static styles = css`
    :host {
      display: block;
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.currentRoute = router.getCurrentRoute();
    router.addEventListener('routechange', this.handleRouteChange.bind(this));
    console.log('[AppRoot] Mounted with route:', this.currentRoute);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    router.removeEventListener('routechange', this.handleRouteChange.bind(this));
  }

  private handleRouteChange(event: Event): void {
    const customEvent = event as CustomEvent;
    this.currentRoute = customEvent.detail.route;
    console.log('[AppRoot] Route changed to:', this.currentRoute);
  }

  render() {
    return html`
      ${this.currentRoute === 'main'
        ? html`<gdm-live-audio></gdm-live-audio>`
        : html`<visualizer-interface></visualizer-interface>`}
    `;
  }
}
