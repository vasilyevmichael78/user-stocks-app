import type { Stock, StockDetail } from '@user-stocks-app/shared-types';

export interface IStockProvider {
  searchStocks(query: string): Promise<Stock[]>;
  getStockDetail(symbol: string): Promise<StockDetail>;
  getStockQuote(symbol: string): Promise<Stock>;
  isAvailable(): Promise<boolean>;
  getProviderName(): string;
}

export interface StockProviderConfig {
  apiKey: string;
  baseUrl: string;
  rateLimitPerMinute?: number;
  timeout?: number;
}
