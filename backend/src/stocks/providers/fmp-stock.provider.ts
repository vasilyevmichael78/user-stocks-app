import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import type { Stock, StockDetail, FMPStock, FMPCompanyProfile } from '@user-stocks-app/shared-types';
import type { IStockProvider, StockProviderConfig } from '../interfaces/stock-provider.interface';

@Injectable()
export class FMPStockProvider implements IStockProvider {
  private config: StockProviderConfig;

  constructor(config: StockProviderConfig) {
    this.config = config;
  }

  getProviderName(): string {
    return 'Financial Modeling Prep';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/quote/AAPL?apikey=${this.config.apiKey}`);
      const data = await response.json() as any;
      
      // Check for API limit error
      return !data.hasOwnProperty('Error Message') && response.ok;
    } catch (error) {
      return false;
    }
  }

  async searchStocks(query: string): Promise<Stock[]> {
    try {
      const searchUrl = `${this.config.baseUrl}/search?query=${query}&limit=10&apikey=${this.config.apiKey}`;
      
      const response = await fetch(searchUrl);

      if (!response.ok) {
        throw new HttpException('Failed to search stocks', HttpStatus.BAD_REQUEST);
      }

      const data = await response.json() as any[];
      
      if (!data || data.length === 0) {
        return [];
      }

      // Check if we got an error from FMP API
      if (data.hasOwnProperty('Error Message')) {
        throw new HttpException('API limit reached', HttpStatus.TOO_MANY_REQUESTS);
      }

      // Filter to only US stocks (NASDAQ, NYSE, etc.)
      const usStocks = data.filter((item: any) => 
        item.exchangeShortName === 'NASDAQ' || 
        item.exchangeShortName === 'NYSE' || 
        item.exchangeShortName === 'AMEX'
      ).slice(0, 10);

      // Get individual quotes for real-time data
      const stockPromises = usStocks.map(async (item: any) => {
        try {
          const quoteResponse = await fetch(`${this.config.baseUrl}/quote/${item.symbol}?apikey=${this.config.apiKey}`);
          if (quoteResponse.ok) {
            const quoteData = await quoteResponse.json() as FMPStock[];
            if (quoteData && quoteData.length > 0) {
              return this.transformFMPStockToStock(quoteData[0]);
            }
          }
        } catch (error) {
          // Silently handle individual quote failures
        }
        
        // Fallback: return basic info from search
        return {
          symbol: item.symbol,
          name: item.name,
          price: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
          marketCap: 0,
          pe: 0,
          eps: 0,
        } as Stock;
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
        fetch(`${this.config.baseUrl}/quote/${symbol}?apikey=${this.config.apiKey}`),
        fetch(`${this.config.baseUrl}/profile/${symbol}?apikey=${this.config.apiKey}`)
      ]);

      if (!quoteResponse.ok) {
        throw new HttpException('Failed to fetch stock data', HttpStatus.BAD_REQUEST);
      }

      const quoteData = await quoteResponse.json() as FMPStock[];
      let profileData: FMPCompanyProfile[] = [];

      if (profileResponse.ok) {
        profileData = await profileResponse.json() as FMPCompanyProfile[];
      }

      if (!quoteData || quoteData.length === 0) {
        throw new HttpException('Stock not found', HttpStatus.NOT_FOUND);
      }

      const fmpStock = quoteData[0];
      const fmpProfile = profileData[0];

      return this.transformFMPDataToStockDetail(fmpStock, fmpProfile);
    } catch (error) {
      throw error;
    }
  }

  async getStockQuote(symbol: string): Promise<Stock> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/quote/${symbol}?apikey=${this.config.apiKey}`
      );
      
      if (!response.ok) {
        throw new HttpException('Failed to fetch stock data', HttpStatus.BAD_REQUEST);
      }

      const data = await response.json() as FMPStock[];
      
      if (!data || data.length === 0) {
        throw new HttpException('Stock not found', HttpStatus.NOT_FOUND);
      }

      const fmpStock = data[0];
      return this.transformFMPStockToStock(fmpStock);
    } catch (error) {
      throw error;
    }
  }

  private transformFMPStockToStock(fmpStock: FMPStock): Stock {
    return {
      symbol: fmpStock.symbol || '',
      name: fmpStock.name || fmpStock.symbol || '',
      price: fmpStock.price || 0,
      change: fmpStock.change || 0,
      changePercent: fmpStock.changesPercentage || 0,
      volume: fmpStock.volume || 0,
      marketCap: fmpStock.marketCap || 0,
      pe: fmpStock.pe || 0,
      eps: fmpStock.eps || 0,
    };
  }

  private transformFMPDataToStockDetail(fmpStock: FMPStock, fmpProfile?: FMPCompanyProfile): StockDetail {
    const baseStock = this.transformFMPStockToStock(fmpStock);
    
    return {
      ...baseStock,
      description: fmpProfile?.description,
      sector: fmpProfile?.sector,
      industry: fmpProfile?.industry,
      website: fmpProfile?.website,
      ceo: fmpProfile?.ceo,
      employees: fmpProfile?.fullTimeEmployees ? parseInt(fmpProfile.fullTimeEmployees) : undefined,
      headquarters: fmpProfile ? `${fmpProfile.city}, ${fmpProfile.state}` : undefined,
    };
  }
}
