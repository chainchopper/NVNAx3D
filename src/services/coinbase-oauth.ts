/**
 * Coinbase OAuth Integration
 * 
 * Handles Coinbase OAuth flow for accessing user's cryptocurrency accounts,
 * transactions, and portfolio data.
 * 
 * FEATURES:
 * - OAuth 2.0 authorization flow
 * - Token management with automatic refresh
 * - Account balance fetching
 * - Transaction history
 * - Real-time portfolio sync
 * 
 * SCOPES:
 * - wallet:accounts:read - Read account balances
 * - wallet:transactions:read - Read transaction history
 * - wallet:buys:read - Read buy orders
 * - wallet:sells:read - Read sell orders
 * - wallet:deposits:read - Read deposits
 * - wallet:withdrawals:read - Read withdrawals
 */

import { oauthVault, OAUTH_PROVIDERS } from './oauth-vault-v2';

export interface CoinbaseAccount {
  id: string;
  name: string;
  type: 'wallet' | 'vault' | 'fiat';
  currency: {
    code: string;
    name: string;
    symbol: string;
  };
  balance: {
    amount: string;
    currency: string;
  };
  nativeBalance?: {
    amount: string;
    currency: string; // Usually USD
  };
  createdAt: string;
  updatedAt: string;
  primary: boolean;
}

export interface CoinbaseTransaction {
  id: string;
  type: 'send' | 'request' | 'transfer' | 'buy' | 'sell' | 'fiat_deposit' | 'fiat_withdrawal' | 'exchange_deposit' | 'exchange_withdrawal' | 'vault_withdrawal';
  status: 'pending' | 'completed' | 'failed' | 'expired' | 'canceled';
  amount: {
    amount: string;
    currency: string;
  };
  nativeAmount?: {
    amount: string;
    currency: string;
  };
  description: string | null;
  createdAt: string;
  updatedAt: string;
  resource: string;
  resourcePath: string;
  network?: {
    status: string;
    hash?: string;
    transactionFee?: {
      amount: string;
      currency: string;
    };
  };
  to?: {
    resource: string;
    address?: string;
    currency?: string;
    addressInfo?: {
      address: string;
    };
  };
  from?: {
    resource: string;
    currency?: string;
  };
  buy?: any;
  sell?: any;
  details?: {
    title: string;
    subtitle: string;
    header: string;
    health: string;
    paymentMethodName?: string;
  };
}

export interface CoinbasePortfolio {
  accounts: CoinbaseAccount[];
  totalBalance: {
    amount: number;
    currency: string;
  };
  lastUpdated: number;
}

/**
 * CoinbaseOAuthService - Manages Coinbase OAuth and API integration
 */
class CoinbaseOAuthService {
  private readonly providerId = 'coinbase';
  private readonly apiBase = 'https://api.coinbase.com/v2';
  private readonly backendProxy = '/api/coinbase'; // Backend handles sensitive operations

  /**
   * Initiate OAuth flow (now uses secure OAuth Vault V2)
   */
  async initiateOAuth(): Promise<string> {
    return oauthVault.initiateOAuth(this.providerId);
  }

  /**
   * Handle OAuth callback (now uses secure OAuth Vault V2)
   */
  async handleCallback(code: string, state: string): Promise<void> {
    await oauthVault.handleCallback(this.providerId, code, state);
    console.log('[CoinbaseOAuth] Successfully connected to Coinbase');
  }

  /**
   * Get user's accounts (proxied via secure backend)
   */
  async getAccounts(): Promise<CoinbaseAccount[]> {
    const response = await oauthVault.makeAuthenticatedRequest(
      this.providerId,
      'https://api.coinbase.com/v2/accounts',
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch accounts');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Get account transactions (proxied via secure backend)
   */
  async getTransactions(accountId: string, limit = 25): Promise<CoinbaseTransaction[]> {
    const response = await oauthVault.makeAuthenticatedRequest(
      this.providerId,
      `https://api.coinbase.com/v2/accounts/${accountId}/transactions?limit=${limit}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Get portfolio summary
   */
  async getPortfolio(): Promise<CoinbasePortfolio> {
    const accounts = await this.getAccounts();

    // Calculate total balance in USD
    let totalUSD = 0;
    for (const account of accounts) {
      if (account.nativeBalance) {
        totalUSD += parseFloat(account.nativeBalance.amount);
      }
    }

    return {
      accounts,
      totalBalance: {
        amount: totalUSD,
        currency: 'USD'
      },
      lastUpdated: Date.now()
    };
  }

  /**
   * Sync portfolio to BILLY financial system
   */
  async syncPortfolio(): Promise<void> {
    const portfolio = await this.getPortfolio();

    // Store in localStorage for BILLY to access
    localStorage.setItem('coinbase_portfolio', JSON.stringify(portfolio));

    console.log('[CoinbaseOAuth] Portfolio synced:', portfolio);

    // Trigger portfolio update event
    window.dispatchEvent(new CustomEvent('coinbase-portfolio-updated', {
      detail: portfolio
    }));
  }

  /**
   * Check connection status
   */
  async isConnected(): Promise<boolean> {
    const status = await oauthVault.getConnectionStatus(this.providerId);
    return status.isConnected;
  }

  /**
   * Disconnect from Coinbase
   */
  async disconnect(): Promise<void> {
    await oauthVault.disconnect(this.providerId);
    localStorage.removeItem('coinbase_portfolio');
    console.log('[CoinbaseOAuth] Disconnected from Coinbase');
  }
}

export const coinbaseOAuth = new CoinbaseOAuthService();
