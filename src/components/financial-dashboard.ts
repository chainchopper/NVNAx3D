import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

interface PortfolioSummary {
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  assetAllocation: {
    stocks: number;
    crypto: number;
  };
  topPerformers: Array<{
    symbol: string;
    gainLossPercent: number;
  }>;
}

interface AccountData {
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    balance: number;
    currency: string;
  }>;
}

interface TransactionData {
  transactions: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    category: string;
  }>;
}

@customElement('financial-dashboard')
export class FinancialDashboard extends LitElement {
  @property({ type: Boolean }) visible = false;
  
  @state() private portfolioData: PortfolioSummary | null = null;
  @state() private accountData: AccountData | null = null;
  @state() private transactionData: TransactionData | null = null;
  @state() private loading = false;
  @state() private error: string | null = null;
  @state() private activeTab: 'overview' | 'accounts' | 'transactions' = 'overview';

  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: 20px;
      right: 20px;
      width: 450px;
      max-height: 80vh;
      z-index: 1000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: transform 0.3s ease-in-out;
    }

    .dashboard {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .header {
      padding: 20px;
      background: rgba(46, 139, 87, 0.2);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .close-button {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 8px 12px;
      color: #fff;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .close-button:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.05);
    }

    .tabs {
      display: flex;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .tab {
      flex: 1;
      padding: 12px;
      text-align: center;
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
      border-bottom: 2px solid transparent;
    }

    .tab:hover {
      background: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.8);
    }

    .tab.active {
      color: #fff;
      border-bottom-color: #2e8b57;
      background: rgba(46, 139, 87, 0.1);
    }

    .content {
      padding: 20px;
      overflow-y: auto;
      max-height: calc(80vh - 160px);
    }

    .content::-webkit-scrollbar {
      width: 6px;
    }

    .content::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
    }

    .content::-webkit-scrollbar-thumb {
      background: rgba(46, 139, 87, 0.5);
      border-radius: 3px;
    }

    .content::-webkit-scrollbar-thumb:hover {
      background: rgba(46, 139, 87, 0.7);
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
    }

    .error {
      background: rgba(255, 0, 0, 0.1);
      border: 1px solid rgba(255, 0, 0, 0.3);
      border-radius: 8px;
      padding: 12px;
      color: #ff6b6b;
      font-size: 13px;
      margin-bottom: 16px;
    }

    .stat-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
    }

    .stat-card h3 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.7);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 8px;
    }

    .stat-change {
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .stat-change.positive {
      color: #4caf50;
    }

    .stat-change.negative {
      color: #f44336;
    }

    .allocation {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }

    .allocation-bar {
      height: 8px;
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .allocation-bar.stocks {
      background: linear-gradient(90deg, #2196f3, #1976d2);
    }

    .allocation-bar.crypto {
      background: linear-gradient(90deg, #ff9800, #f57c00);
    }

    .allocation-legend {
      display: flex;
      gap: 16px;
      margin-top: 8px;
      font-size: 12px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      color: rgba(255, 255, 255, 0.8);
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .account-list, .transaction-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .account-item, .transaction-item {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.2s;
    }

    .account-item:hover, .transaction-item:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: translateX(-4px);
    }

    .account-info, .transaction-info {
      flex: 1;
    }

    .account-name, .transaction-desc {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      margin-bottom: 4px;
    }

    .account-type, .transaction-category {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
    }

    .account-balance, .transaction-amount {
      font-size: 16px;
      font-weight: 700;
      text-align: right;
    }

    .account-balance.positive, .transaction-amount.positive {
      color: #4caf50;
    }

    .account-balance.negative, .transaction-amount.negative {
      color: #f44336;
    }

    .refresh-button {
      width: 100%;
      padding: 12px;
      background: rgba(46, 139, 87, 0.2);
      border: 1px solid rgba(46, 139, 87, 0.4);
      border-radius: 8px;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 12px;
    }

    .refresh-button:hover {
      background: rgba(46, 139, 87, 0.3);
      transform: translateY(-2px);
    }

    .refresh-button:active {
      transform: translateY(0);
    }

    .performer-badge {
      display: inline-block;
      background: rgba(76, 175, 80, 0.2);
      border: 1px solid rgba(76, 175, 80, 0.4);
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 12px;
      font-weight: 600;
      color: #4caf50;
      margin-top: 8px;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    if (this.visible) {
      this.loadData();
    }
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('visible') && this.visible) {
      this.loadData();
    }
  }

  private async loadData() {
    this.loading = true;
    this.error = null;

    try {
      if (this.activeTab === 'overview') {
        await this.loadPortfolio();
      } else if (this.activeTab === 'accounts') {
        await this.loadAccounts();
      } else if (this.activeTab === 'transactions') {
        await this.loadTransactions();
      }
    } catch (err: any) {
      this.error = err.message || 'Failed to load financial data';
    } finally {
      this.loading = false;
    }
  }

  private async loadPortfolio() {
    const response = await fetch('/api/financial/portfolio/summary');
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    this.portfolioData = data;
  }

  private async loadAccounts() {
    const response = await fetch('/api/financial/accounts');
    const data = await response.json();
    
    if (!response.ok || data.error) {
      throw new Error(data.error || `HTTP ${response.status}: Failed to load accounts`);
    }

    this.accountData = {
      accounts: data.accounts || []
    };
  }

  private async loadTransactions() {
    const response = await fetch('/api/financial/transactions?limit=10');
    const data = await response.json();
    
    if (!response.ok || data.error) {
      throw new Error(data.error || `HTTP ${response.status}: Failed to load transactions`);
    }

    this.transactionData = {
      transactions: data.transactions || []
    };
  }

  private handleTabClick(tab: 'overview' | 'accounts' | 'transactions') {
    this.activeTab = tab;
    this.loadData();
  }

  private handleClose() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  render() {
    return html`
      <div class="dashboard" style="transform: translateX(${this.visible ? '0' : 'calc(100% + 40px)'})">
        <div class="header">
          <h2>
            💰 Financial Dashboard
          </h2>
          <button class="close-button" @click="${this.handleClose}">×</button>
        </div>

        <div class="tabs">
          <button 
            class="tab ${this.activeTab === 'overview' ? 'active' : ''}"
            @click="${() => this.handleTabClick('overview')}"
          >
            Overview
          </button>
          <button 
            class="tab ${this.activeTab === 'accounts' ? 'active' : ''}"
            @click="${() => this.handleTabClick('accounts')}"
          >
            Accounts
          </button>
          <button 
            class="tab ${this.activeTab === 'transactions' ? 'active' : ''}"
            @click="${() => this.handleTabClick('transactions')}"
          >
            Transactions
          </button>
        </div>

        <div class="content">
          ${this.error ? html`<div class="error">${this.error}</div>` : ''}
          ${this.loading ? html`<div class="loading">Loading...</div>` : ''}
          
          ${!this.loading && this.activeTab === 'overview' && this.portfolioData ? this.renderOverview() : ''}
          ${!this.loading && this.activeTab === 'accounts' && this.accountData ? this.renderAccounts() : ''}
          ${!this.loading && this.activeTab === 'transactions' && this.transactionData ? this.renderTransactions() : ''}
          
          <button class="refresh-button" @click="${() => this.loadData()}">
            🔄 Refresh Data
          </button>
        </div>
      </div>
    `;
  }

  private renderOverview() {
    if (!this.portfolioData) return '';

    const isPositive = this.portfolioData.totalGainLoss >= 0;

    return html`
      <div class="stat-card">
        <h3>Portfolio Value</h3>
        <div class="stat-value">${this.formatCurrency(this.portfolioData.totalValue)}</div>
        <div class="stat-change ${isPositive ? 'positive' : 'negative'}">
          ${isPositive ? '↑' : '↓'}
          ${this.formatCurrency(Math.abs(this.portfolioData.totalGainLoss))}
          (${isPositive ? '+' : ''}${this.portfolioData.totalGainLossPercent.toFixed(2)}%)
        </div>
        ${this.portfolioData.topPerformers && this.portfolioData.topPerformers.length > 0 ? html`
          <div class="performer-badge">
            🏆 Top: ${this.portfolioData.topPerformers[0].symbol} +${this.portfolioData.topPerformers[0].gainLossPercent.toFixed(2)}%
          </div>
        ` : ''}
      </div>

      <div class="stat-card">
        <h3>Asset Allocation</h3>
        <div class="allocation">
          <div 
            class="allocation-bar stocks" 
            style="width: ${this.portfolioData.assetAllocation.stocks}%"
          ></div>
          <div 
            class="allocation-bar crypto" 
            style="width: ${this.portfolioData.assetAllocation.crypto}%"
          ></div>
        </div>
        <div class="allocation-legend">
          <div class="legend-item">
            <div class="legend-dot" style="background: #2196f3"></div>
            Stocks ${this.portfolioData.assetAllocation.stocks.toFixed(1)}%
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #ff9800"></div>
            Crypto ${this.portfolioData.assetAllocation.crypto.toFixed(1)}%
          </div>
        </div>
      </div>
    `;
  }

  private renderAccounts() {
    if (!this.accountData) return '';

    return html`
      <div class="account-list">
        ${this.accountData.accounts.map(account => html`
          <div class="account-item">
            <div class="account-info">
              <div class="account-name">${account.name}</div>
              <div class="account-type">${account.type}</div>
            </div>
            <div class="account-balance ${account.balance >= 0 ? 'positive' : 'negative'}">
              ${this.formatCurrency(account.balance)}
            </div>
          </div>
        `)}
      </div>
    `;
  }

  private renderTransactions() {
    if (!this.transactionData) return '';

    return html`
      <div class="transaction-list">
        ${this.transactionData.transactions.map(txn => html`
          <div class="transaction-item">
            <div class="transaction-info">
              <div class="transaction-desc">${txn.description}</div>
              <div class="transaction-category">
                ${txn.category} · ${this.formatDate(txn.date)}
              </div>
            </div>
            <div class="transaction-amount ${txn.amount >= 0 ? 'positive' : 'negative'}">
              ${txn.amount >= 0 ? '+' : ''}${this.formatCurrency(txn.amount)}
            </div>
          </div>
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'financial-dashboard': FinancialDashboard;
  }
}
