/**
 * OAuth Service - Centralized OAuth Management
 * 
 * Wraps oauth-vault-v2 and provides a unified interface for:
 * - Initiating OAuth flows with popup windows
 * - Handling callbacks
 * - Checking connection status
 * - Managing multiple provider connections
 * - Sharing Google tokens across all Google services
 */

import { oauthVault, OAuthConnectionStatus, OAUTH_PROVIDERS } from './oauth-vault-v2';

export interface ConnectorAuthState {
  connectorId: string;
  providerId: string;
  isConnected: boolean;
  status: 'active' | 'expired' | 'error' | 'disconnected';
  accountInfo?: {
    email?: string;
    name?: string;
  };
  error?: string;
}

class OAuthService {
  private popupWindow: Window | null = null;
  private popupCheckInterval: number | null = null;
  private listeners: Set<() => void> = new Set();

  /**
   * Initiate OAuth flow in popup window
   */
  async connectProvider(providerId: string): Promise<void> {
    try {
      console.log(`[OAuthService] Initiating OAuth for: ${providerId}`);
      
      // Get auth URL from backend
      const authUrl = await oauthVault.initiateOAuth(providerId);
      
      // Open popup window
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      this.popupWindow = window.open(
        authUrl,
        'oauth-popup',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );

      if (!this.popupWindow) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Monitor popup for callback
      this.startPopupMonitoring(providerId);
      
    } catch (error: any) {
      console.error('[OAuthService] Failed to initiate OAuth:', error);
      throw error;
    }
  }

  /**
   * Monitor popup window for OAuth callback
   */
  private startPopupMonitoring(providerId: string): void {
    if (this.popupCheckInterval) {
      clearInterval(this.popupCheckInterval);
    }

    this.popupCheckInterval = window.setInterval(async () => {
      if (!this.popupWindow || this.popupWindow.closed) {
        clearInterval(this.popupCheckInterval!);
        this.popupCheckInterval = null;
        this.popupWindow = null;

        // Check if connection succeeded
        await this.checkConnectionAfterPopup(providerId);
      }
    }, 500);
  }

  /**
   * Check connection status after popup closes
   */
  private async checkConnectionAfterPopup(providerId: string): Promise<void> {
    try {
      // Wait a bit for backend to process callback
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const status = await oauthVault.getConnectionStatus(providerId);
      
      if (status.isConnected) {
        console.log(`[OAuthService] Successfully connected to ${providerId}`);
      } else {
        console.warn(`[OAuthService] Connection to ${providerId} failed or cancelled`);
      }
      
      // ALWAYS notify listeners (success OR failure) so UI can update
      this.notifyListeners();
    } catch (error) {
      console.error('[OAuthService] Error checking connection status:', error);
      // Notify even on error so UI doesn't stay stuck
      this.notifyListeners();
    }
  }

  /**
   * Get connection status for a specific provider
   */
  async getProviderStatus(providerId: string): Promise<OAuthConnectionStatus> {
    return await oauthVault.getConnectionStatus(providerId);
  }

  /**
   * Get all active connections
   */
  async getAllConnections(): Promise<OAuthConnectionStatus[]> {
    return await oauthVault.getAllConnections();
  }

  /**
   * Get connector auth state (maps connectors to their OAuth provider)
   * Google connectors (gmail, google_calendar, google_docs, google_sheets) share one token
   */
  async getConnectorAuthState(connectorId: string): Promise<ConnectorAuthState> {
    // Map connector IDs to OAuth provider IDs
    const providerMap: Record<string, string> = {
      'gmail': 'google',
      'google_calendar': 'google',
      'google_docs': 'google',
      'google_sheets': 'google',
      'github': 'github',
      'coinbase': 'coinbase',
      'microsoft': 'microsoft',
      'outlook': 'microsoft'
    };

    const providerId = providerMap[connectorId];
    
    if (!providerId) {
      // Non-OAuth connector (uses API keys instead)
      return {
        connectorId,
        providerId: 'none',
        isConnected: false,
        status: 'disconnected'
      };
    }

    const status = await oauthVault.getConnectionStatus(providerId);
    
    return {
      connectorId,
      providerId,
      isConnected: status.isConnected,
      status: status.status,
      accountInfo: status.accountInfo,
      error: status.error
    };
  }

  /**
   * Disconnect provider
   */
  async disconnectProvider(providerId: string): Promise<void> {
    await oauthVault.disconnect(providerId);
    this.notifyListeners();
  }

  /**
   * Subscribe to connection status changes
   */
  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => callback());
  }

  /**
   * Check if connector needs OAuth (vs API key)
   */
  isOAuthConnector(connectorId: string): boolean {
    const oauthConnectors = [
      'gmail',
      'google_calendar', 
      'google_docs',
      'google_sheets',
      'github',
      'coinbase',
      'outlook',
      'microsoft'
    ];
    return oauthConnectors.includes(connectorId);
  }

  /**
   * Get OAuth provider for connector
   */
  getProviderForConnector(connectorId: string): string | null {
    const providerMap: Record<string, string> = {
      'gmail': 'google',
      'google_calendar': 'google',
      'google_docs': 'google',
      'google_sheets': 'google',
      'github': 'github',
      'coinbase': 'coinbase',
      'microsoft': 'microsoft',
      'outlook': 'microsoft'
    };
    return providerMap[connectorId] || null;
  }

  /**
   * Get provider display name
   */
  getProviderName(providerId: string): string {
    return OAUTH_PROVIDERS[providerId]?.name || providerId;
  }
}

// Export singleton instance
export const oauthService = new OAuthService();
