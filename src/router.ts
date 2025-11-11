/**
 * Simple Router for Multi-Route Support
 * Handles navigation between main interface (/) and visualizer (/visualizer)
 * 
 * Feature Flag: useVisualizerShell
 * - When enabled in localStorage, "/" shows visualizer-shell instead of main-interface
 * - Legacy interface always available at /legacy for rollback safety
 */

export type RouteName = 'main' | 'visualizer' | 'legacy';

export interface RouteConfig {
  path: string;
  name: RouteName;
  component: string;
}

/**
 * Check feature flag in localStorage to determine if visualizer-shell should be used as main route
 * 
 * NOTE: This function is called once during module initialization (when routes array is created).
 * To change the route behavior, set localStorage.setItem('useVisualizerShell', 'true') and refresh the page.
 * 
 * Usage for QA testing:
 * - Enable new interface: localStorage.setItem('useVisualizerShell', 'true'); location.reload();
 * - Revert to legacy: localStorage.setItem('useVisualizerShell', 'false'); location.reload();
 * - Legacy interface always available at /legacy for rollback safety
 */
function getMainRouteComponent(): string {
  try {
    const useVisualizerShell = localStorage.getItem('useVisualizerShell') === 'true';
    console.log('[Router] Feature flag useVisualizerShell:', useVisualizerShell);
    return useVisualizerShell ? 'visualizer-shell' : 'main-interface';
  } catch (error) {
    console.warn('[Router] Failed to read feature flag, defaulting to main-interface:', error);
    return 'main-interface';
  }
}

export const routes: RouteConfig[] = [
  { path: '/', name: 'main', component: 'visualizer-shell' },
  { path: '/visualizer', name: 'visualizer', component: 'visualizer-shell' },
  { path: '/legacy', name: 'legacy', component: 'gdm-live-audio' },
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
