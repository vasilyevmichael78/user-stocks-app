import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import type { Stock, StockDetail } from '@user-stocks-app/shared-types';
import type { IStockProvider, StockProviderConfig } from '../interfaces/stock-provider.interface';

interface FinnhubQuote {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
}

interface FinnhubSymbolSearch {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}

interface FinnhubCompanyProfile {
  country: string;
  currency: string;
  estimateCurrency: string;
  exchange: string;
  finnhubIndustry: string;
  ipo: string;
  logo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
}

@Injectable()
export class FinnhubStockProvider implements IStockProvider {
  private config: StockProviderConfig;

  constructor(config: StockProviderConfig) {
    this.config = config;
  }

  getProviderName(): string {
    return 'Finnhub';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/quote?symbol=AAPL&token=${this.config.apiKey}`
      );
      const data = await response.json() as any;
      
      // Check for API error or if we get a valid response
      return response.ok && !data.hasOwnProperty('error') && data.hasOwnProperty('c');
    } catch (error) {
      return false;
    }
  }

  async searchStocks(query: string): Promise<Stock[]> {
    try {
      const searchUrl = `${this.config.baseUrl}/search?q=${encodeURIComponent(query)}&token=${this.config.apiKey}`;
      
      const response = await fetch(searchUrl);

      if (!response.ok) {
        throw new HttpException('Failed to search stocks', HttpStatus.BAD_REQUEST);
      }

      const data = await response.json() as FinnhubSymbolSearch;
      
      if (!data.result || data.result.length === 0) {
        return [];
      }

      // Filter to only US stocks and limit results
      const usStocks = data.result
        .filter(item => item.type === 'Common Stock' && !item.symbol.includes('.'))
        .slice(0, 10);

      // Get quotes for each symbol with company names
      const stockPromises = usStocks.map(async (item) => {
        try {
          const stock = await this.getStockQuote(item.symbol);
          // Use the description from search result as the name
          return {
            ...stock,
            name: item.description || stock.name,
          };
        } catch (error) {
          // Return basic info if quote fails
          return {
            symbol: item.symbol,
            name: item.description,
            price: 0,
            change: 0,
            changePercent: 0,
            volume: 0,
            marketCap: 0,
            pe: 0,
            eps: 0,
          } as Stock;
        }
      });

      const results = await Promise.all(stockPromises);
      return results.filter(stock => stock !== null);
      
    } catch (error) {
      throw error;
    }
  }

  async getStockDetail(symbol: string): Promise<StockDetail> {
    try {
      const [quoteResponse, profileResponse] = await Promise.all([
        fetch(`${this.config.baseUrl}/quote?symbol=${symbol}&token=${this.config.apiKey}`),
        fetch(`${this.config.baseUrl}/stock/profile2?symbol=${symbol}&token=${this.config.apiKey}`)
      ]);

      if (!quoteResponse.ok) {
        throw new HttpException('Failed to fetch stock data', HttpStatus.BAD_REQUEST);
      }

      const quoteData = await quoteResponse.json() as FinnhubQuote;
      let profileData: FinnhubCompanyProfile | null = null;

      if (profileResponse.ok) {
        profileData = await profileResponse.json() as FinnhubCompanyProfile;
      }

      if (!quoteData || quoteData.c === null || quoteData.c === undefined) {
        throw new HttpException('Stock not found', HttpStatus.NOT_FOUND);
      }

      return this.transformFinnhubDataToStockDetail(symbol, quoteData, profileData);
    } catch (error) {
      throw error;
    }
  }

  async getStockQuote(symbol: string): Promise<Stock> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/quote?symbol=${symbol}&token=${this.config.apiKey}`
      );
      
      if (!response.ok) {
        throw new HttpException('Failed to fetch stock data', HttpStatus.BAD_REQUEST);
      }

      const data = await response.json() as FinnhubQuote;
      
      if (!data || data.c === null || data.c === undefined) {
        throw new HttpException('Stock not found', HttpStatus.NOT_FOUND);
      }

      return this.transformFinnhubQuoteToStock(symbol, data);
    } catch (error) {
      throw error;
    }
  }

  private transformFinnhubQuoteToStock(symbol: string, quote: FinnhubQuote): Stock {
    return {
      symbol,
      name: symbol, // Finnhub quote doesn't include name, would need separate call
      price: quote.c || 0,
      change: quote.d || 0,
      changePercent: quote.dp || 0,
      volume: 0, // Not available in quote endpoint
      marketCap: 0, // Not available in quote endpoint
      pe: 0, // Not available in quote endpoint
      eps: 0, // Not available in quote endpoint
    };
  }

  private transformFinnhubDataToStockDetail(
    symbol: string, 
    quote: FinnhubQuote, 
    profile?: FinnhubCompanyProfile | null
  ): StockDetail {
    const baseStock = this.transformFinnhubQuoteToStock(symbol, quote);
    
    return {
      ...baseStock,
      name: profile?.name || symbol,
      marketCap: profile?.marketCapitalization ? profile.marketCapitalization * 1000000 : baseStock.marketCap,
      description: profile ? `${profile.name} is a company in the ${profile.finnhubIndustry} industry, based in ${profile.country}. Listed on ${profile.exchange}.` : undefined,
      sector: undefined, // Finnhub doesn't provide sector directly
      industry: profile?.finnhubIndustry,
      website: profile?.weburl,
      ceo: undefined, // Not available in Finnhub profile
      employees: undefined, // Not available in Finnhub profile
      headquarters: profile?.country,
      founded: profile?.ipo ? new Date(profile.ipo).getFullYear().toString() : undefined,
    };
  }
}
