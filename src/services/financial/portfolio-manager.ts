/**
 * Portfolio Manager Service
 * Manages investment portfolio tracking and analysis
 */

import { stockDataService, StockQuote } from './stock-data-service';
import { cryptoDataService, CryptoData } from './crypto-data-service';

interface PortfolioHolding {
  symbol: string;
  type: 'stock' | 'crypto';
  quantity: number;
  averageCost: number;
  currentPrice: number;
  totalValue: number;
  totalCost: number;
  gainLoss: number;
  gainLossPercent: number;
}

interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  holdings: PortfolioHolding[];
  assetAllocation: {
    stocks: number;
    crypto: number;
  };
  topPerformers: PortfolioHolding[];
  bottomPerformers: PortfolioHolding[];
}

interface Portfolio {
  holdings: Array<{
    symbol: string;
    type: 'stock' | 'crypto';
    quantity: number;
    averageCost: number;
  }>;
}

class PortfolioManager {
  private portfolio: Portfolio | null = null;
  private initialized = false;

  constructor() {
  }

  private ensureInitialized() {
    if (this.initialized) return;
    this.initialized = true;
    this.loadPortfolio();
  }

  private loadPortfolio() {
    try {
      if (typeof localStorage === 'undefined') {
        console.warn('[Portfolio] localStorage unavailable, using default portfolio');
        this.portfolio = this.getDefaultPortfolio();
        return;
      }

      const saved = localStorage.getItem('nirvana-portfolio');
      if (saved) {
        this.portfolio = JSON.parse(saved);
      } else {
        this.portfolio = this.getDefaultPortfolio();
        this.savePortfolio();
      }
    } catch (error) {
      console.error('[Portfolio] Failed to load portfolio:', error);
      this.portfolio = this.getDefaultPortfolio();
    }
  }

  private savePortfolio() {
    try {
      if (typeof localStorage === 'undefined') {
        console.warn('[Portfolio] localStorage unavailable, cannot persist portfolio');
        return;
      }

      localStorage.setItem('nirvana-portfolio', JSON.stringify(this.portfolio));
    } catch (error) {
      console.error('[Portfolio] Failed to save portfolio:', error);
    }
  }

  private getDefaultPortfolio(): Portfolio {
    return {
      holdings: [
        { symbol: 'AAPL', type: 'stock', quantity: 10, averageCost: 150.00 },
        { symbol: 'GOOGL', type: 'stock', quantity: 5, averageCost: 130.00 },
        { symbol: 'MSFT', type: 'stock', quantity: 8, averageCost: 350.00 },
        { symbol: 'bitcoin', type: 'crypto', quantity: 0.5, averageCost: 40000.00 },
        { symbol: 'ethereum', type: 'crypto', quantity: 2, averageCost: 2000.00 },
      ],
    };
  }

  async getSummary(): Promise<PortfolioSummary> {
    this.ensureInitialized();
    if (!this.portfolio) {
      throw new Error('[Portfolio] Not initialized');
    }

    const holdings: PortfolioHolding[] = [];
    let totalValue = 0;
    let totalCost = 0;

    for (const holding of this.portfolio.holdings) {
      try {
        let currentPrice = 0;
        
        if (holding.type === 'stock') {
          const quote = await stockDataService.getQuote(holding.symbol);
          currentPrice = quote.price;
        } else {
          const crypto = await cryptoDataService.getPrice(holding.symbol);
          currentPrice = crypto.price;
        }

        const holdingValue = currentPrice * holding.quantity;
        const holdingCost = holding.averageCost * holding.quantity;
        const gainLoss = holdingValue - holdingCost;
        const gainLossPercent = (gainLoss / holdingCost) * 100;

        const portfolioHolding: PortfolioHolding = {
          symbol: holding.symbol,
          type: holding.type,
          quantity: holding.quantity,
          averageCost: holding.averageCost,
          currentPrice,
          totalValue: holdingValue,
          totalCost: holdingCost,
          gainLoss,
          gainLossPercent,
        };

        holdings.push(portfolioHolding);
        totalValue += holdingValue;
        totalCost += holdingCost;
      } catch (error) {
        console.error(`[Portfolio] Error processing ${holding.symbol}:`, error);
      }
    }

    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    const stockValue = holdings
      .filter(h => h.type === 'stock')
      .reduce((sum, h) => sum + h.totalValue, 0);
    const cryptoValue = holdings
      .filter(h => h.type === 'crypto')
      .reduce((sum, h) => sum + h.totalValue, 0);

    const sorted = [...holdings].sort((a, b) => b.gainLossPercent - a.gainLossPercent);

    return {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      holdings,
      assetAllocation: {
        stocks: totalValue > 0 ? (stockValue / totalValue) * 100 : 0,
        crypto: totalValue > 0 ? (cryptoValue / totalValue) * 100 : 0,
      },
      topPerformers: sorted.slice(0, 3),
      bottomPerformers: sorted.slice(-3).reverse(),
    };
  }

  addHolding(symbol: string, type: 'stock' | 'crypto', quantity: number, averageCost: number) {
    this.ensureInitialized();
    if (!this.portfolio) {
      throw new Error('[Portfolio] Not initialized');
    }

    const existing = this.portfolio.holdings.find(
      h => h.symbol.toLowerCase() === symbol.toLowerCase() && h.type === type
    );

    if (existing) {
      const newQuantity = existing.quantity + quantity;
      const newCost = (existing.averageCost * existing.quantity + averageCost * quantity) / newQuantity;
      existing.quantity = newQuantity;
      existing.averageCost = newCost;
    } else {
      this.portfolio.holdings.push({ symbol, type, quantity, averageCost });
    }

    this.savePortfolio();
  }

  removeHolding(symbol: string, type: 'stock' | 'crypto') {
    this.ensureInitialized();
    if (!this.portfolio) {
      throw new Error('[Portfolio] Not initialized');
    }

    this.portfolio.holdings = this.portfolio.holdings.filter(
      h => !(h.symbol.toLowerCase() === symbol.toLowerCase() && h.type === type)
    );
    this.savePortfolio();
  }

  getHoldings() {
    this.ensureInitialized();
    if (!this.portfolio) {
      throw new Error('[Portfolio] Not initialized');
    }

    return [...this.portfolio.holdings];
  }
}

export const portfolioManager = new PortfolioManager();
export type { PortfolioHolding, PortfolioSummary };
