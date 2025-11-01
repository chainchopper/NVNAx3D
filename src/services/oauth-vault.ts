/**
 * OAuth Vault Service
 * 
 * Centralized OAuth token management with encrypted storage and automatic refresh.
 * Supports multiple providers: Google, Coinbase, GitHub, Microsoft, etc.
 * 
 * FEATURES:
 * - Encrypted token storage (AES-256-GCM)
 * - Automatic token refresh scheduling
 * - Provider registry with OAuth config
 * - Secure token retrieval with decryption
 * - Connection status monitoring
 * - Token expiry tracking
 * 
 * ARCHITECTURE:
 * App <--> OAuth Vault <--> LocalStorage (encrypted) <--> Backend Proxy
 */

export interface OAuthProvider {
  id: string;
  name: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientId?: string; // Set in .env
  clientSecret?: string; // Backend only
  redirectUri?: string;
}

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Unix timestamp
  tokenType: string;
  scope?: string;
}

export interface OAuthConnection {
  providerId: string;
  providerName: string;
  accountInfo?: {
    id?: string;
    email?: string;
    name?: string;
  };
  token: OAuthToken;
  connectedAt: number;
  lastRefreshed?: number;
  status: 'active' | 'expired' | 'error';
  error?: string;
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt: string;
}

const STORAGE_KEY = 'nirvana_oauth_vault';
const ENCRYPTION_KEY_STORAGE = 'nirvana_vault_key';

/**
 * OAuth Provider Registry
 */
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
      'https://www.googleapis.com/auth/calendar.readonly'
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
    scopes: [
      'openid',
      'profile',
      'email',
      'Mail.Read',
      'Calendars.Read'
    ]
  },
  slack: {
    id: 'slack',
    name: 'Slack',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: ['chat:write', 'channels:read', 'users:read']
  },
  notion: {
    id: 'notion',
    name: 'Notion',
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scopes: []
  },
  linear: {
    id: 'linear',
    name: 'Linear',
    authUrl: 'https://linear.app/oauth/authorize',
    tokenUrl: 'https://api.linear.app/oauth/token',
    scopes: ['read', 'write']
  }
};

/**
 * OAuthVault - Secure token management service
 */
class OAuthVault {
  private connections: Map<string, OAuthConnection> = new Map();
  private encryptionKey: CryptoKey | null = null;
  private refreshTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initialize();
  }

  /**
   * Initialize vault and load stored connections
   */
  private async initialize(): Promise<void> {
    try {
      await this.initializeEncryptionKey();
      await this.loadConnections();
      this.scheduleTokenRefreshes();
      console.log('[OAuthVault] Initialized successfully');
    } catch (error) {
      console.error('[OAuthVault] Initialization error:', error);
    }
  }

  /**
   * Initialize or retrieve encryption key
   */
  private async initializeEncryptionKey(): Promise<void> {
    const storedKey = localStorage.getItem(ENCRYPTION_KEY_STORAGE);
    
    if (storedKey) {
      // Import stored key
      const keyData = JSON.parse(storedKey);
      this.encryptionKey = await crypto.subtle.importKey(
        'jwk',
        keyData,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    } else {
      // Generate new key
      this.encryptionKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      
      // Store key
      const exportedKey = await crypto.subtle.exportKey('jwk', this.encryptionKey);
      localStorage.setItem(ENCRYPTION_KEY_STORAGE, JSON.stringify(exportedKey));
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  private async encrypt(data: string): Promise<EncryptedData> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      dataBuffer
    );

    return {
      ciphertext: this.bufferToHex(ciphertext),
      iv: this.bufferToHex(iv),
      salt: '' // Not used for AES-GCM but kept for compatibility
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  private async decrypt(encryptedData: EncryptedData): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const ciphertext = this.hexToBuffer(encryptedData.ciphertext);
    const iv = this.hexToBuffer(encryptedData.iv);

    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        ciphertext
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  /**
   * Load connections from encrypted storage
   */
  private async loadConnections(): Promise<void> {
    const encrypted = localStorage.getItem(STORAGE_KEY);
    if (!encrypted) {
      return;
    }

    try {
      const encryptedData: EncryptedData = JSON.parse(encrypted);
      const decrypted = await this.decrypt(encryptedData);
      const connections: OAuthConnection[] = JSON.parse(decrypted);

      this.connections.clear();
      connections.forEach(conn => {
        // Update status based on expiry
        if (conn.token.expiresAt && conn.token.expiresAt < Date.now()) {
          conn.status = 'expired';
        }
        this.connections.set(conn.providerId, conn);
      });

      console.log(`[OAuthVault] Loaded ${connections.length} connections`);
    } catch (error) {
      console.error('[OAuthVault] Failed to load connections:', error);
    }
  }

  /**
   * Save connections to encrypted storage
   */
  private async saveConnections(): Promise<void> {
    const connections = Array.from(this.connections.values());
    const json = JSON.stringify(connections);
    
    try {
      const encrypted = await this.encrypt(json);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
      console.log('[OAuthVault] Connections saved');
    } catch (error) {
      console.error('[OAuthVault] Failed to save connections:', error);
    }
  }

  /**
   * Add or update OAuth connection
   */
  async addConnection(providerId: string, token: OAuthToken, accountInfo?: OAuthConnection['accountInfo']): Promise<void> {
    const provider = OAUTH_PROVIDERS[providerId];
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    const connection: OAuthConnection = {
      providerId,
      providerName: provider.name,
      accountInfo,
      token,
      connectedAt: Date.now(),
      status: 'active'
    };

    this.connections.set(providerId, connection);
    await this.saveConnections();

    // Schedule token refresh if expires_at is set
    if (token.expiresAt) {
      this.scheduleTokenRefresh(providerId, token.expiresAt);
    }

    console.log(`[OAuthVault] Added connection for ${provider.name}`);
  }

  /**
   * Get OAuth token for provider
   */
  async getToken(providerId: string): Promise<OAuthToken | null> {
    const connection = this.connections.get(providerId);
    if (!connection) {
      return null;
    }

    // Check if token is expired
    if (connection.token.expiresAt && connection.token.expiresAt < Date.now()) {
      console.warn(`[OAuthVault] Token for ${providerId} is expired`);
      
      // Attempt refresh if refresh token exists
      if (connection.token.refreshToken) {
        try {
          await this.refreshToken(providerId);
          return this.connections.get(providerId)?.token || null;
        } catch (error) {
          console.error(`[OAuthVault] Token refresh failed for ${providerId}:`, error);
          connection.status = 'error';
          connection.error = 'Token expired and refresh failed';
          await this.saveConnections();
          return null;
        }
      }
      
      return null;
    }

    return connection.token;
  }

  /**
   * Refresh OAuth token
   */
  private async refreshToken(providerId: string): Promise<void> {
    const connection = this.connections.get(providerId);
    if (!connection || !connection.token.refreshToken) {
      throw new Error('No refresh token available');
    }

    const provider = OAUTH_PROVIDERS[providerId];
    
    // Call backend to refresh token
    const response = await fetch('/api/oauth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId,
        refreshToken: connection.token.refreshToken
      })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const { token } = await response.json();
    
    // Update connection
    connection.token = token;
    connection.lastRefreshed = Date.now();
    connection.status = 'active';
    delete connection.error;

    await this.saveConnections();

    // Schedule next refresh
    if (token.expiresAt) {
      this.scheduleTokenRefresh(providerId, token.expiresAt);
    }

    console.log(`[OAuthVault] Refreshed token for ${provider.name}`);
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(providerId: string, expiresAt: number): void {
    // Clear existing timer
    const existingTimer = this.refreshTimers.get(providerId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule refresh 5 minutes before expiry
    const refreshAt = expiresAt - (5 * 60 * 1000);
    const delay = refreshAt - Date.now();

    if (delay > 0) {
      const timer = setTimeout(() => {
        this.refreshToken(providerId).catch(error => {
          console.error(`[OAuthVault] Scheduled refresh failed for ${providerId}:`, error);
        });
      }, delay);

      this.refreshTimers.set(providerId, timer);
      console.log(`[OAuthVault] Scheduled refresh for ${providerId} in ${Math.round(delay / 1000)}s`);
    }
  }

  /**
   * Schedule all token refreshes
   */
  private scheduleTokenRefreshes(): void {
    this.connections.forEach((connection, providerId) => {
      if (connection.token.expiresAt && connection.token.refreshToken) {
        this.scheduleTokenRefresh(providerId, connection.token.expiresAt);
      }
    });
  }

  /**
   * Remove OAuth connection
   */
  async removeConnection(providerId: string): Promise<void> {
    const connection = this.connections.get(providerId);
    if (connection) {
      this.connections.delete(providerId);
      
      // Clear refresh timer
      const timer = this.refreshTimers.get(providerId);
      if (timer) {
        clearTimeout(timer);
        this.refreshTimers.delete(providerId);
      }

      await this.saveConnections();
      console.log(`[OAuthVault] Removed connection for ${connection.providerName}`);
    }
  }

  /**
   * Get all connections
   */
  getConnections(): OAuthConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection status
   */
  getConnectionStatus(providerId: string): OAuthConnection['status'] | null {
    return this.connections.get(providerId)?.status || null;
  }

  /**
   * Check if provider is connected
   */
  isConnected(providerId: string): boolean {
    const connection = this.connections.get(providerId);
    return connection?.status === 'active' || false;
  }

  /**
   * Helper: Buffer to hex string
   */
  private bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Helper: Hex string to buffer
   */
  private hexToBuffer(hex: string): ArrayBuffer {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes.buffer;
  }
}

export const oauthVault = new OAuthVault();
