/**
 * Simple Router for Multi-Route Support
 * Handles navigation between main interface (/) and visualizer (/visualizer)
 */

export type RouteName = 'main' | 'visualizer';

export interface RouteConfig {
  path: string;
  name: RouteName;
  component: string;
}

export const routes: RouteConfig[] = [
  { path: '/', name: 'main', component: 'main-interface' },
  { path: '/visualizer', name: 'visualizer', component: 'visualizer-interface' },
];

export class Router extends EventTarget {
  private currentRoute: RouteName = 'main';
  private boundHandlePopState: (event: PopStateEvent) => void;

  constructor() {
    super();
    this.boundHandlePopState = this.handlePopState.bind(this);
    window.addEventListener('popstate', this.boundHandlePopState);
    this.detectInitialRoute();
  }

  private detectInitialRoute(): void {
    const path = window.location.pathname;
    const route = routes.find(r => r.path === path);
    if (route) {
      this.currentRoute = route.name;
    } else {
      // Default to main
      this.currentRoute = 'main';
    }
    console.log('[Router] Initial route:', this.currentRoute);
  }

  private handlePopState(event: PopStateEvent): void {
    const state = event.state || {};
    const routeName = state.route || 'main';
    this.currentRoute = routeName as RouteName;
    this.dispatchEvent(new CustomEvent('routechange', { detail: { route: this.currentRoute } }));
  }

  navigate(routeName: RouteName): void {
    if (this.currentRoute === routeName) return;

    const route = routes.find(r => r.name === routeName);
    if (!route) {
      console.error('[Router] Unknown route:', routeName);
      return;
    }

    this.currentRoute = routeName;
    window.history.pushState({ route: routeName }, '', route.path);
    this.dispatchEvent(new CustomEvent('routechange', { detail: { route: this.currentRoute } }));
    console.log('[Router] Navigated to:', routeName);
  }

  getCurrentRoute(): RouteName {
    return this.currentRoute;
  }

  destroy(): void {
    window.removeEventListener('popstate', this.boundHandlePopState);
  }
}

export const router = new Router();
