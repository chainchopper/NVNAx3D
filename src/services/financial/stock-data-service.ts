/**
 * Stock Data Service
 * Fetches real-time stock market data from Alpha Vantage API
 */

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: string;
}

interface StockCache {
  [symbol: string]: {
    data: StockQuote;
    timestamp: number;
  };
}

class StockDataService {
  private cache: StockCache = {};
  private cacheTimeout = 60000; // 1 minute cache
  private apiKey: string | null = null;
  private readonly baseUrl = 'https://www.alphavantage.co/query';

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || null;
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    const cached = this.cache[symbol];
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`[StockData] Cache hit for ${symbol}`);
      return cached.data;
    }

    if (!this.apiKey) {
      console.warn('[StockData] No API key configured, using mock data');
      return this.getMockQuote(symbol);
    }

    try {
      const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data['Global Quote']) {
        const quote = data['Global Quote'];
        const stockQuote: StockQuote = {
          symbol: symbol.toUpperCase(),
          price: parseFloat(quote['05. price'] || 0),
          change: parseFloat(quote['09. change'] || 0),
          changePercent: parseFloat((quote['10. change percent'] || '0').replace('%', '')),
          volume: parseInt(quote['06. volume'] || 0),
          high: parseFloat(quote['03. high'] || 0),
          low: parseFloat(quote['04. low'] || 0),
          open: parseFloat(quote['02. open'] || 0),
          previousClose: parseFloat(quote['08. previous close'] || 0),
          timestamp: quote['07. latest trading day'] || new Date().toISOString(),
        };

        this.cache[symbol] = {
          data: stockQuote,
          timestamp: Date.now(),
        };

        return stockQuote;
      } else {
        throw new Error(`No data found for ${symbol}`);
      }
    } catch (error) {
      console.error(`[StockData] Error fetching ${symbol}:`, error);
      return this.getMockQuote(symbol);
    }
  }

  private getMockQuote(symbol: string): StockQuote {
    const mockPrices: Record<string, number> = {
      'AAPL': 175.43,
      'GOOGL': 140.23,
      'MSFT': 378.91,
      'TSLA': 242.84,
      'AMZN': 145.32,
      'NVDA': 495.22,
      'META': 331.57,
      'BTC': 43250.00,
    };

    const basePrice = mockPrices[symbol.toUpperCase()] || 100;
    const change = (Math.random() - 0.5) * 10;
    const changePercent = (change / basePrice) * 100;

    return {
      symbol: symbol.toUpperCase(),
      price: parseFloat((basePrice + change).toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      volume: Math.floor(Math.random() * 10000000) + 1000000,
      high: parseFloat((basePrice + Math.abs(change) * 1.5).toFixed(2)),
      low: parseFloat((basePrice - Math.abs(change) * 1.5).toFixed(2)),
      open: parseFloat(basePrice.toFixed(2)),
      previousClose: parseFloat(basePrice.toFixed(2)),
      timestamp: new Date().toISOString().split('T')[0],
    };
  }

  clearCache() {
    this.cache = {};
  }
}

export const stockDataService = new StockDataService();
export type { StockQuote };
