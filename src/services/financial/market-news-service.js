/**
 * Market News Service
 * Fetches financial market news from Finnhub API
 */

class MarketNewsService {
  constructor() {
    this.cache = {};
    this.cacheTimeout = 300000; // 5 minutes
    this.apiKey = this.getApiKey();
    this.baseUrl = 'https://finnhub.io/api/v1';
  }

  getApiKey() {
    try {
      if (typeof process !== 'undefined' && process.env) {
        return process.env.FINNHUB_API_KEY || null;
      }
    } catch (e) {
      // Ignore
    }
    return null;
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  async getMarketNews(category = 'general', limit = 10) {
    const cacheKey = `${category}_${limit}`;
    const cached = this.cache[cacheKey];
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`[MarketNews] Cache hit for ${category}`);
      return cached.data;
    }

    if (!this.apiKey) {
      console.warn('[MarketNews] No API key configured, using mock data');
      return this.getMockNews(limit);
    }

    try {
      const url = `${this.baseUrl}/news?category=${category}&token=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data && Array.isArray(data)) {
        const newsItems = data.slice(0, limit).map(item => ({
          id: item.id,
          headline: item.headline,
          source: item.source,
          summary: item.summary || item.headline,
          url: item.url,
          category: item.category,
          timestamp: new Date(item.datetime * 1000).toISOString(),
          image: item.image,
          sentiment: this.analyzeSentiment(item.headline)
        }));

        this.cache[cacheKey] = {
          data: newsItems,
          timestamp: Date.now()
        };

        return newsItems;
      } else {
        throw new Error('Invalid response from Finnhub API');
      }
    } catch (error) {
      console.error('[MarketNews] Error fetching news:', error);
      return this.getMockNews(limit);
    }
  }

  async getCompanyNews(symbol, limit = 10) {
    const cacheKey = `company_${symbol}_${limit}`;
    const cached = this.cache[cacheKey];
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`[MarketNews] Cache hit for company ${symbol}`);
      return cached.data;
    }

    if (!this.apiKey) {
      console.warn('[MarketNews] No API key configured, using mock data');
      return this.getMockNews(limit);
    }

    try {
      const today = new Date();
      const weekAgo = new Date(today - 7 * 24 * 60 * 60 * 1000);
      
      const fromDate = weekAgo.toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];
      
      const url = `${this.baseUrl}/company-news?symbol=${symbol}&from=${fromDate}&to=${toDate}&token=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data && Array.isArray(data)) {
        const newsItems = data.slice(0, limit).map(item => ({
          id: item.id,
          headline: item.headline,
          source: item.source,
          summary: item.summary || item.headline,
          url: item.url,
          category: item.category,
          timestamp: new Date(item.datetime * 1000).toISOString(),
          image: item.image,
          sentiment: this.analyzeSentiment(item.headline),
          relatedSymbol: symbol
        }));

        this.cache[cacheKey] = {
          data: newsItems,
          timestamp: Date.now()
        };

        return newsItems;
      } else {
        throw new Error(`Invalid response for ${symbol}`);
      }
    } catch (error) {
      console.error(`[MarketNews] Error fetching company news for ${symbol}:`, error);
      return this.getMockNews(limit);
    }
  }

  analyzeSentiment(text) {
    if (!text) return 'neutral';
    
    const positiveWords = ['gain', 'surge', 'jump', 'rise', 'rally', 'soar', 'profit', 'growth', 'beat', 'strong'];
    const negativeWords = ['fall', 'drop', 'plunge', 'decline', 'loss', 'weak', 'miss', 'concern', 'worry', 'slump'];
    
    const lower = text.toLowerCase();
    const hasPositive = positiveWords.some(word => lower.includes(word));
    const hasNegative = negativeWords.some(word => lower.includes(word));
    
    if (hasPositive && !hasNegative) return 'positive';
    if (hasNegative && !hasPositive) return 'negative';
    return 'neutral';
  }

  getMockNews(limit = 10) {
    const mockNews = [
      {
        id: 1,
        headline: 'Tech Stocks Rally on Strong Earnings',
        source: 'Financial Times',
        summary: 'Major technology companies posted better-than-expected quarterly results.',
        url: '#',
        category: 'technology',
        timestamp: new Date().toISOString(),
        image: null,
        sentiment: 'positive'
      },
      {
        id: 2,
        headline: 'Federal Reserve Maintains Interest Rates',
        source: 'Reuters',
        summary: 'The Fed kept rates steady, signaling confidence in economic stability.',
        url: '#',
        category: 'forex',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        image: null,
        sentiment: 'neutral'
      },
      {
        id: 3,
        headline: 'Oil Prices Surge Amid Supply Concerns',
        source: 'Bloomberg',
        summary: 'Crude oil prices jumped 3% on worries about production cuts.',
        url: '#',
        category: 'commodity',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        image: null,
        sentiment: 'negative'
      },
      {
        id: 4,
        headline: 'Cryptocurrency Market Shows Renewed Strength',
        source: 'CoinDesk',
        summary: 'Bitcoin and major altcoins gain momentum as institutional interest grows.',
        url: '#',
        category: 'crypto',
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        image: null,
        sentiment: 'positive'
      },
      {
        id: 5,
        headline: 'Manufacturing Data Beats Expectations',
        source: 'Wall Street Journal',
        summary: 'Latest PMI data suggests stronger economic activity than forecasted.',
        url: '#',
        category: 'general',
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        image: null,
        sentiment: 'positive'
      }
    ];

    return mockNews.slice(0, limit);
  }

  clearCache() {
    this.cache = {};
  }
}

export const marketNewsService = new MarketNewsService();
