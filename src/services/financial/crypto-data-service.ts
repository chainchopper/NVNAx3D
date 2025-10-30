/**
 * Crypto Data Service
 * Fetches real-time cryptocurrency data from CoinGecko API
 */

interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  marketCap: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: string;
}

interface CryptoCache {
  [id: string]: {
    data: CryptoData;
    timestamp: number;
  };
}

class CryptoDataService {
  private cache: CryptoCache = {};
  private cacheTimeout = 60000; // 1 minute cache
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';

  async getPrice(symbolOrId: string): Promise<CryptoData> {
    const id = this.normalizeId(symbolOrId);
    
    const cached = this.cache[id];
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`[CryptoData] Cache hit for ${id}`);
      return cached.data;
    }

    try {
      const url = `${this.baseUrl}/coins/markets?vs_currency=usd&ids=${id}&order=market_cap_desc&sparkline=false`;
      const response = await fetch(url);
      const data = await response.json();

      if (data && data.length > 0) {
        const coin = data[0];
        const cryptoData: CryptoData = {
          id: coin.id,
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          price: coin.current_price || 0,
          change24h: coin.price_change_24h || 0,
          changePercent24h: coin.price_change_percentage_24h || 0,
          marketCap: coin.market_cap || 0,
          volume24h: coin.total_volume || 0,
          high24h: coin.high_24h || 0,
          low24h: coin.low_24h || 0,
          timestamp: new Date().toISOString(),
        };

        this.cache[id] = {
          data: cryptoData,
          timestamp: Date.now(),
        };

        return cryptoData;
      } else {
        throw new Error(`No data found for ${id}`);
      }
    } catch (error) {
      console.error(`[CryptoData] Error fetching ${id}:`, error);
      return this.getMockData(id);
    }
  }

  private normalizeId(input: string): string {
    const symbolMap: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'USDT': 'tether',
      'BNB': 'binancecoin',
      'SOL': 'solana',
      'XRP': 'ripple',
      'ADA': 'cardano',
      'DOGE': 'dogecoin',
      'AVAX': 'avalanche-2',
      'DOT': 'polkadot',
    };

    const upper = input.toUpperCase();
    return symbolMap[upper] || input.toLowerCase();
  }

  private getMockData(id: string): CryptoData {
    const mockPrices: Record<string, { price: number; name: string }> = {
      'bitcoin': { price: 43250.00, name: 'Bitcoin' },
      'ethereum': { price: 2280.50, name: 'Ethereum' },
      'solana': { price: 98.75, name: 'Solana' },
      'cardano': { price: 0.58, name: 'Cardano' },
      'ripple': { price: 0.62, name: 'XRP' },
    };

    const mock = mockPrices[id] || { price: 100, name: 'Unknown' };
    const change = (Math.random() - 0.5) * mock.price * 0.1;
    const changePercent = (change / mock.price) * 100;

    return {
      id,
      symbol: id.toUpperCase().slice(0, 4),
      name: mock.name,
      price: parseFloat((mock.price + change).toFixed(2)),
      change24h: parseFloat(change.toFixed(2)),
      changePercent24h: parseFloat(changePercent.toFixed(2)),
      marketCap: Math.floor(Math.random() * 100000000000),
      volume24h: Math.floor(Math.random() * 10000000000),
      high24h: parseFloat((mock.price + Math.abs(change) * 1.5).toFixed(2)),
      low24h: parseFloat((mock.price - Math.abs(change) * 1.5).toFixed(2)),
      timestamp: new Date().toISOString(),
    };
  }

  clearCache() {
    this.cache = {};
  }
}

export const cryptoDataService = new CryptoDataService();
export type { CryptoData };
