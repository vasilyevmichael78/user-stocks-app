import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import type { IStockProvider, StockProviderConfig } from '../interfaces/stock-provider.interface';
import { FMPStockProvider } from './fmp-stock.provider';
import { FinnhubStockProvider } from './finnhub-stock.provider';

export interface StockProviderFactoryConfig {
  fmp?: {
    apiKey: string;
    baseUrl: string;
    rateLimitPerMinute?: number;
    timeout?: number;
  };
  finnhub?: {
    apiKey: string;
    baseUrl: string;
    rateLimitPerMinute?: number;
    timeout?: number;
  };
}

@Injectable()
export class StockProviderFactory {
  private providers: IStockProvider[] = [];
  private currentProviderIndex = 0;

  constructor(private config: StockProviderFactoryConfig) {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Initialize FMP provider if configured
    if (this.config.fmp?.apiKey) {
      const fmpConfig: StockProviderConfig = {
        apiKey: this.config.fmp.apiKey,
        baseUrl: this.config.fmp.baseUrl || 'https://financialmodelingprep.com/api/v3',
        rateLimitPerMinute: this.config.fmp.rateLimitPerMinute || 250,
        timeout: this.config.fmp.timeout || 10000,
      };
      this.providers.push(new FMPStockProvider(fmpConfig));
    }

    // Initialize Finnhub provider if configured
    if (this.config.finnhub?.apiKey) {
      const finnhubConfig: StockProviderConfig = {
        apiKey: this.config.finnhub.apiKey,
        baseUrl: this.config.finnhub.baseUrl || 'https://finnhub.io/api/v1',
        rateLimitPerMinute: this.config.finnhub.rateLimitPerMinute || 60,
        timeout: this.config.finnhub.timeout || 10000,
      };
      this.providers.push(new FinnhubStockProvider(finnhubConfig));
    }

    if (this.providers.length === 0) {
      throw new Error('No stock providers configured. Please configure at least one provider (FMP or Finnhub).');
    }
  }

  async getCurrentProvider(): Promise<IStockProvider> {
    if (this.providers.length === 0) {
      throw new HttpException('No stock providers available', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // Check if current provider is available
    const currentProvider = this.providers[this.currentProviderIndex];
    if (await currentProvider.isAvailable()) {
      return currentProvider;
    }

    // Try to find an available provider
    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      if (await provider.isAvailable()) {
        this.currentProviderIndex = i;
        console.log(`Switched to provider: ${provider.getProviderName()}`);
        return provider;
      }
    }

    throw new HttpException('All stock providers are currently unavailable', HttpStatus.SERVICE_UNAVAILABLE);
  }

  async getProviderWithFallback(): Promise<IStockProvider> {
    try {
      return await this.getCurrentProvider();
    } catch (error) {
      // If all providers fail, return the first one for error handling
      if (this.providers.length > 0) {
        return this.providers[0];
      }
      throw error;
    }
  }

  getAvailableProviders(): string[] {
    return this.providers.map(provider => provider.getProviderName());
  }

  async getProviderStatus(): Promise<Array<{ name: string; available: boolean }>> {
    const statusPromises = this.providers.map(async (provider) => ({
      name: provider.getProviderName(),
      available: await provider.isAvailable()
    }));

    return Promise.all(statusPromises);
  }

  switchToNextProvider(): void {
    if (this.providers.length > 1) {
      this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
      console.log(`Manually switched to provider: ${this.providers[this.currentProviderIndex].getProviderName()}`);
    }
  }
}
