/**
 * Backend URL Configuration
 * 
 * Centralized backend API URL resolver that defaults to relative paths for CORS compatibility.
 * Uses relative /api/ paths by default, which work across any host via Vite proxy (dev) or same-origin (production).
 * 
 * Benefits:
 * - No CORS issues - requests go through same origin
 * - Works on any domain without hardcoded URLs
 * - Environment-agnostic - dev, staging, production all use same code
 * 
 * Usage:
 *   import { getBackendUrl } from './config/backend-url';
 *   const url = getBackendUrl('/api/chat/gemini');
 *   // Returns: '/api/chat/gemini' (relative, no CORS issues)
 */

/**
 * Get backend API URL
 * 
 * @param endpoint - API endpoint path (e.g., '/api/chat/gemini')
 * @returns Full URL for the endpoint (defaults to relative path)
 * 
 * @example
 * getBackendUrl('/api/chat/gemini') // -> '/api/chat/gemini'
 * getBackendUrl('/api/models/proxy') // -> '/api/models/proxy'
 */
export function getBackendUrl(endpoint: string): string {
  // Remove leading slash if present to normalize
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Check for explicit backend URL override (for native apps or special cases)
  const backendOverride = import.meta.env.VITE_BACKEND_URL;
  
  if (backendOverride) {
    // Use explicit override (e.g., for native mobile apps)
    return `${backendOverride}${normalizedEndpoint}`;
  }
  
  // Default: Use relative path (works via Vite proxy in dev, same-origin in production)
  // This avoids CORS issues entirely
  return normalizedEndpoint;
}

/**
 * Legacy compatibility - returns localhost URL for migration
 * @deprecated Use getBackendUrl() instead for CORS compatibility
 */
export function getLegacyBackendUrl(): string {
  return 'http://localhost:3001';
}
