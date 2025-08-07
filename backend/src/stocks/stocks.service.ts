import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Stock, StockDetail } from '@user-stocks-app/shared-types';
import { StockProviderFactory, StockProviderFactoryConfig } from './providers/stock-provider.factory';

@Injectable()
export class StocksService {
  private stockProviderFactory: StockProviderFactory;

  constructor(private configService: ConfigService) {
    // Initialize stock provider factory with configuration
    const config: StockProviderFactoryConfig = {
      fmp: {
        apiKey: this.configService.get<string>('FMP_API_KEY') || '',
        baseUrl: this.configService.get<string>('FMP_BASE_URL') || 'https://financialmodelingprep.com/api/v3',
        rateLimitPerMinute: 250,
        timeout: 10000,
      },
      finnhub: {
        apiKey: this.configService.get<string>('FINNHUB_API_KEY') || '',
        baseUrl: 'https://finnhub.io/api/v1',
        rateLimitPerMinute: 60,
        timeout: 10000,
      },
    };

    this.stockProviderFactory = new StockProviderFactory(config);
  }

  async searchStocks(query: string): Promise<Stock[]> {
    try {
      const provider = await this.stockProviderFactory.getCurrentProvider();
      console.log(`Using provider: ${provider.getProviderName()} for search`);
      
      return await provider.searchStocks(query);
    } catch (error) {
      console.error('Stock search failed:', error);
      
      // Return mock data as fallback if all providers fail
      if (error instanceof HttpException && error.getStatus() === HttpStatus.SERVICE_UNAVAILABLE) {
        console.log('All providers unavailable, returning mock data');
        return this.getMockSearchResults(query);
      }
      
      throw error;
    }
  }

  async getStockDetail(symbol: string): Promise<StockDetail> {
    try {
      const provider = await this.stockProviderFactory.getCurrentProvider();
      console.log(`Using provider: ${provider.getProviderName()} for stock detail`);
      
      return await provider.getStockDetail(symbol);
    } catch (error) {
      console.error('Stock detail fetch failed:', error);
      
      // Return mock data as fallback if all providers fail
      if (error instanceof HttpException && error.getStatus() === HttpStatus.SERVICE_UNAVAILABLE) {
        console.log('All providers unavailable, returning mock data');
        return this.getMockStockDetail(symbol);
      }
      
      throw error;
    }
  }

  async getStockQuote(symbol: string): Promise<Stock> {
    try {
      const provider = await this.stockProviderFactory.getCurrentProvider();
      console.log(`Using provider: ${provider.getProviderName()} for stock quote`);
      
      return await provider.getStockQuote(symbol);
    } catch (error) {
      console.error('Stock quote fetch failed:', error);
      
      // Return mock data as fallback if all providers fail
      if (error instanceof HttpException && error.getStatus() === HttpStatus.SERVICE_UNAVAILABLE) {
        console.log('All providers unavailable, returning mock data');
        return this.getMockStock(symbol);
      }
      
      throw error;
    }
  }

  async getProviderStatus(): Promise<Array<{ name: string; available: boolean }>> {
    return this.stockProviderFactory.getProviderStatus();
  }

  switchProvider(): void {
    this.stockProviderFactory.switchToNextProvider();
  }

  private getMockSearchResults(query: string): Stock[] {
    const mockStocks: Stock[] = [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 150.25,
        change: 2.45,
        changePercent: 1.66,
        volume: 52000000,
        marketCap: 2800000000000,
        pe: 28.5,
        eps: 5.27,
      },
      {
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        price: 2750.80,
        change: -12.30,
        changePercent: -0.44,
        volume: 1200000,
        marketCap: 1900000000000,
        pe: 22.8,
        eps: 120.65,
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        price: 405.90,
        change: 5.20,
        changePercent: 1.30,
        volume: 28000000,
        marketCap: 3000000000000,
        pe: 35.2,
        eps: 11.53,
      },
      {
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        price: 220.50,
        change: -8.75,
        changePercent: -3.82,
        volume: 45000000,
        marketCap: 700000000000,
        pe: 45.8,
        eps: 4.81,
      },
      {
        symbol: 'AMZN',
        name: 'Amazon.com Inc.',
        price: 135.25,
        change: 3.20,
        changePercent: 2.42,
        volume: 35000000,
        marketCap: 1400000000000,
        pe: 55.2,
        eps: 2.45,
      },
    ];

    // Filter based on query
    const filteredStocks = mockStocks.filter(stock => 
      stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
      stock.name.toLowerCase().includes(query.toLowerCase())
    );

    return filteredStocks.length > 0 ? filteredStocks : mockStocks.slice(0, 3);
  }

  private getMockStockDetail(symbol: string): StockDetail {
    const mockStock = this.getMockStock(symbol);
    
    return {
      ...mockStock,
      description: `${mockStock.name} is a leading technology company (Mock Data)`,
      sector: 'Technology',
      industry: 'Software',
      website: 'https://example.com',
      ceo: 'Mock CEO',
      employees: 150000,
      headquarters: 'Cupertino, CA',
    };
  }

  private getMockStock(symbol: string): Stock {
    const mockStocks = this.getMockSearchResults('');
    const found = mockStocks.find(stock => stock.symbol === symbol);
    
    return found || {
      symbol,
      name: `${symbol} Company (Mock)`,
      price: 100.00,
      change: 1.50,
      changePercent: 1.52,
      volume: 1000000,
      marketCap: 1000000000,
      pe: 20.0,
      eps: 5.00,
    };
  }
}
