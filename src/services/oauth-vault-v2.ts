/**
 * OAuth Vault V2 - Server-Side Token Management
 * 
 * SECURITY MODEL:
 * - All OAuth tokens stored EXCLUSIVELY on backend (not in browser)
 * - Backend maintains encrypted token database
 * - Frontend receives session-based access (no direct token exposure)
 * - Tokens never leave server except for API calls
 * - CSRF protection via state parameter validation
 * - PKCE for additional flow security
 * 
 * ARCHITECTURE:
 * Frontend <--HTTPS--> Backend Token Manager <--> Encrypted DB
 * 
 * NO client-side token storage or encryption keys.
 */

export interface OAuthProvider {
  id: string;
  name: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
}

export interface OAuthConnectionStatus {
  providerId: string;
  providerName: string;
  isConnected: boolean;
  accountInfo?: {
    id?: string;
    email?: string;
    name?: string;
  };
  connectedAt?: number;
  lastRefreshed?: number;
  expiresAt?: number;
  status: 'active' | 'expired' | 'error' | 'disconnected';
  error?: string;
}

export const OAUTH_PROVIDERS: Record<string, OAuthProvider> = {
  google: {
    id: 'google',
    name: 'Google',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ]
  },
  coinbase: {
    id: 'coinbase',
    name: 'Coinbase',
    authUrl: 'https://www.coinbase.com/oauth/authorize',
    tokenUrl: 'https://api.coinbase.com/oauth/token',
    scopes: [
      'wallet:accounts:read',
      'wallet:transactions:read',
      'wallet:buys:read',
      'wallet:sells:read',
      'wallet:deposits:read',
      'wallet:withdrawals:read'
    ]
  },
  github: {
    id: 'github',
    name: 'GitHub',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo', 'user', 'notifications']
  },
  microsoft: {
    id: 'microsoft',
    name: 'Microsoft',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: ['openid', 'profile', 'email', 'Mail.Read', 'Calendars.Read']
  }
};

/**
 * OAuthVaultV2 - Client-side vault interface (tokens managed server-side)
 */
class OAuthVaultV2 {
  private readonly apiBase = '/api/oauth';

  /**
   * Initiate OAuth flow with PKCE
   */
  async initiateOAuth(providerId: string): Promise<string> {
    const provider = OAUTH_PROVIDERS[providerId];
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    // Generate PKCE code verifier and challenge
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    // Store code verifier for callback (temporary session storage)
    sessionStorage.setItem(`oauth_verifier_${providerId}`, codeVerifier);

    // Request auth URL from backend with PKCE
    const response = await fetch(`${this.apiBase}/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId,
        codeChallenge,
        codeChallengeMethod: 'S256'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to initiate OAuth');
    }

    const { authUrl, state } = await response.json();
    
    // Store state for validation (temporary session storage)
    sessionStorage.setItem(`oauth_state_${providerId}`, state);

    return authUrl;
  }

  /**
   * Handle OAuth callback (called after redirect)
   */
  async handleCallback(providerId: string, code: string, state: string): Promise<void> {
    // Validate state (CSRF protection)
    const expectedState = sessionStorage.getItem(`oauth_state_${providerId}`);
    if (!expectedState || expectedState !== state) {
      throw new Error('Invalid state parameter (CSRF attack detected)');
    }

    // Get code verifier (PKCE)
    const codeVerifier = sessionStorage.getItem(`oauth_verifier_${providerId}`);
    if (!codeVerifier) {
      throw new Error('Missing code verifier (invalid session)');
    }

    // Exchange code for tokens on backend
    const response = await fetch(`${this.apiBase}/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId,
        code,
        state,
        codeVerifier
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'OAuth callback failed');
    }

    // Clean up session storage
    sessionStorage.removeItem(`oauth_state_${providerId}`);
    sessionStorage.removeItem(`oauth_verifier_${providerId}`);

    console.log(`[OAuthVaultV2] Successfully connected to ${providerId}`);
  }

  /**
   * Get connection status (without exposing tokens)
   */
  async getConnectionStatus(providerId: string): Promise<OAuthConnectionStatus> {
    const response = await fetch(`${this.apiBase}/status/${providerId}`);
    
    if (!response.ok) {
      return {
        providerId,
        providerName: OAUTH_PROVIDERS[providerId]?.name || providerId,
        isConnected: false,
        status: 'disconnected'
      };
    }

    const data = await response.json();
    return data;
  }

  /**
   * Get all connected providers
   */
  async getAllConnections(): Promise<OAuthConnectionStatus[]> {
    const response = await fetch(`${this.apiBase}/connections`);
    
    if (!response.ok) {
      return [];
    }

    const { connections } = await response.json();
    return connections;
  }

  /**
   * Disconnect provider (removes tokens from backend)
   */
  async disconnect(providerId: string): Promise<void> {
    const response = await fetch(`${this.apiBase}/disconnect/${providerId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to disconnect');
    }

    console.log(`[OAuthVaultV2] Disconnected from ${providerId}`);
  }

  /**
   * Make authenticated API call (backend proxies with token)
   */
  async makeAuthenticatedRequest(providerId: string, apiEndpoint: string, options: RequestInit = {}): Promise<Response> {
    return fetch(`${this.apiBase}/proxy/${providerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: apiEndpoint,
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body
      })
    });
  }

  /**
   * Generate PKCE code verifier
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64URLEncode(array);
  }

  /**
   * Generate PKCE code challenge
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return this.base64URLEncode(new Uint8Array(digest));
  }

  /**
   * Base64 URL encode (for PKCE)
   */
  private base64URLEncode(buffer: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...buffer));
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}

export const oauthVault = new OAuthVaultV2();
