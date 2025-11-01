/**
 * CoinMarketCap Data Service
 * 
 * Provides real-time crypto data from CoinMarketCap API
 * - Latest cryptocurrency prices
 * - Market cap and volume data
 * - Trending cryptocurrencies
 * - Global crypto market stats
 * 
 * API Key: COINMARKETCAP_API_KEY (from environment)
 * Free tier: 333 credits/day (~10,000 monthly API calls)
 */

class CoinMarketCapService {
  constructor() {
    this.baseUrl = 'https://pro-api.coinmarketcap.com/v1';
    this.apiKey = null;
    this.cache = new Map();
    this.cacheDuration = 60000; // 1 minute cache
  }

  /**
   * Initialize service (checks for API key)
   */
  init(apiKey) {
    this.apiKey = apiKey || process.env.COINMARKETCAP_API_KEY;
    
    if (!this.apiKey) {
      console.warn('[CoinMarketCap] No API key configured - using mock data');
      return false;
    }
    
    console.log('[CoinMarketCap] Service initialized');
    return true;
  }

  /**
   * Check if cache is still valid
   */
  isCacheValid(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    const age = Date.now() - cached.timestamp;
    return age < this.cacheDuration;
  }

  /**
   * Get cached data or null
   */
  getCached(key) {
    if (this.isCacheValid(key)) {
      console.log(`[CoinMarketCap] Cache hit for ${key}`);
      return this.cache.get(key).data;
    }
    return null;
  }

  /**
   * Set cache
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Make API request to CoinMarketCap
   */
  async makeRequest(endpoint, params = {}) {
    if (!this.apiKey) {
      throw new Error('CoinMarketCap API key not configured');
    }

    const queryParams = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${endpoint}${queryParams ? `?${queryParams}` : ''}`;

    const response = await fetch(url, {
      headers: {
        'X-CMC_PRO_API_KEY': this.apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`CoinMarketCap API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Get latest cryptocurrency quotes
   * @param {string[]} symbols - Array of crypto symbols (e.g., ['BTC', 'ETH'])
   * @param {string} convert - Conversion currency (default: USD)
   */
  async getLatestQuotes(symbols, convert = 'USD') {
    const cacheKey = `quotes_${symbols.join(',')}_${convert}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.makeRequest('/cryptocurrency/quotes/latest', {
        symbol: symbols.join(','),
        convert: convert
      });

      const quotes = Object.values(data.data).map(coin => ({
        symbol: coin.symbol,
        name: coin.name,
        price: coin.quote[convert].price,
        marketCap: coin.quote[convert].market_cap,
        volume24h: coin.quote[convert].volume_24h,
        change1h: coin.quote[convert].percent_change_1h,
        change24h: coin.quote[convert].percent_change_24h,
        change7d: coin.quote[convert].percent_change_7d,
        circulatingSupply: coin.circulating_supply,
        totalSupply: coin.total_supply,
        rank: coin.cmc_rank,
        lastUpdated: coin.quote[convert].last_updated
      }));

      this.setCache(cacheKey, quotes);
      return quotes;
    } catch (error) {
      console.error('[CoinMarketCap] Error fetching quotes:', error);
      return this.getMockQuotes(symbols);
    }
  }

  /**
   * Get trending cryptocurrencies
   * @param {number} limit - Number of trending coins to return
   */
  async getTrending(limit = 10) {
    const cacheKey = `trending_${limit}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.makeRequest('/cryptocurrency/trending/latest', {
        limit: limit,
        convert: 'USD'
      });

      const trending = data.data.map(coin => ({
        symbol: coin.symbol,
        name: coin.name,
        price: coin.quote.USD.price,
        marketCap: coin.quote.USD.market_cap,
        volume24h: coin.quote.USD.volume_24h,
        change24h: coin.quote.USD.percent_change_24h,
        rank: coin.cmc_rank
      }));

      this.setCache(cacheKey, trending);
      return trending;
    } catch (error) {
      console.error('[CoinMarketCap] Error fetching trending:', error);
      return this.getMockTrending(limit);
    }
  }

  /**
   * Get global crypto market stats
   */
  async getGlobalMetrics() {
    const cacheKey = 'global_metrics';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.makeRequest('/global-metrics/quotes/latest');

      const metrics = {
        totalMarketCap: data.data.quote.USD.total_market_cap,
        total24hVolume: data.data.quote.USD.total_volume_24h,
        btcDominance: data.data.btc_dominance,
        ethDominance: data.data.eth_dominance,
        activeCryptocurrencies: data.data.active_cryptocurrencies,
        totalCryptocurrencies: data.data.total_cryptocurrencies,
        activeExchanges: data.data.active_exchanges,
        lastUpdated: data.data.last_updated
      };

      this.setCache(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error('[CoinMarketCap] Error fetching global metrics:', error);
      return this.getMockGlobalMetrics();
    }
  }

  /**
   * Get price history for a cryptocurrency
   * @param {string} symbol - Crypto symbol (e.g., 'BTC')
   * @param {string} interval - Time interval (1h, 24h, 7d, 30d, 90d, 365d)
   */
  async getPriceHistory(symbol, interval = '24h') {
    const cacheKey = `history_${symbol}_${interval}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      // Note: Historical data requires a higher tier plan
      // For free tier, return mock historical data
      return this.getMockPriceHistory(symbol, interval);
    } catch (error) {
      console.error('[CoinMarketCap] Error fetching price history:', error);
      return this.getMockPriceHistory(symbol, interval);
    }
  }

  /**
   * Mock data for development/fallback
   */
  getMockQuotes(symbols) {
    const mockData = {
      'BTC': { symbol: 'BTC', name: 'Bitcoin', price: 67500.00, marketCap: 1320000000000, volume24h: 28000000000, change1h: 0.5, change24h: 2.3, change7d: 5.1, circulatingSupply: 19500000, totalSupply: 21000000, rank: 1 },
      'ETH': { symbol: 'ETH', name: 'Ethereum', price: 3800.00, marketCap: 456000000000, volume24h: 15000000000, change1h: 0.3, change24h: 1.8, change7d: 4.2, circulatingSupply: 120000000, totalSupply: null, rank: 2 },
      'BNB': { symbol: 'BNB', name: 'BNB', price: 620.00, marketCap: 92000000000, volume24h: 1800000000, change1h: 0.2, change24h: 1.2, change7d: 3.5, circulatingSupply: 148000000, totalSupply: 200000000, rank: 3 },
      'SOL': { symbol: 'SOL', name: 'Solana', price: 155.00, marketCap: 68000000000, volume24h: 2200000000, change1h: 0.8, change24h: 3.5, change7d: 8.2, circulatingSupply: 438000000, totalSupply: 573000000, rank: 4 },
      'XRP': { symbol: 'XRP', name: 'XRP', price: 0.52, marketCap: 28000000000, volume24h: 1100000000, change1h: 0.1, change24h: 0.9, change7d: 2.1, circulatingSupply: 53800000000, totalSupply: 100000000000, rank: 5 }
    };

    return symbols.map(symbol => mockData[symbol] || {
      symbol,
      name: symbol,
      price: 0,
      marketCap: 0,
      volume24h: 0,
      change1h: 0,
      change24h: 0,
      change7d: 0,
      circulatingSupply: 0,
      totalSupply: 0,
      rank: 999
    });
  }

  getMockTrending(limit) {
    const trending = [
      { symbol: 'BTC', name: 'Bitcoin', price: 67500.00, marketCap: 1320000000000, volume24h: 28000000000, change24h: 2.3, rank: 1 },
      { symbol: 'ETH', name: 'Ethereum', price: 3800.00, marketCap: 456000000000, volume24h: 15000000000, change24h: 1.8, rank: 2 },
      { symbol: 'SOL', name: 'Solana', price: 155.00, marketCap: 68000000000, volume24h: 2200000000, change24h: 3.5, rank: 4 },
      { symbol: 'DOGE', name: 'Dogecoin', price: 0.085, marketCap: 12000000000, volume24h: 580000000, change24h: 5.2, rank: 10 },
      { symbol: 'SHIB', name: 'Shiba Inu', price: 0.000023, marketCap: 13000000000, volume24h: 450000000, change24h: 8.1, rank: 11 }
    ];

    return trending.slice(0, limit);
  }

  getMockGlobalMetrics() {
    return {
      totalMarketCap: 2450000000000,
      total24hVolume: 95000000000,
      btcDominance: 53.8,
      ethDominance: 18.6,
      activeCryptocurrencies: 9850,
      totalCryptocurrencies: 26500,
      activeExchanges: 755,
      lastUpdated: new Date().toISOString()
    };
  }

  getMockPriceHistory(symbol, interval) {
    const points = interval === '1h' ? 60 : interval === '24h' ? 24 : 30;
    const now = Date.now();
    const basePrice = symbol === 'BTC' ? 67500 : symbol === 'ETH' ? 3800 : 100;
    
    return Array.from({ length: points }, (_, i) => ({
      timestamp: now - (points - i) * 3600000,
      price: basePrice * (1 + (Math.random() - 0.5) * 0.05),
      volume: Math.random() * 1000000000
    }));
  }
}

export const coinMarketCapService = new CoinMarketCapService();
