import { Controller, Get, Param, Query, UseGuards, Post } from '@nestjs/common';
import { StocksService } from './stocks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Stock, StockDetail } from '@user-stocks-app/shared-types';

@Controller('stocks')
@UseGuards(JwtAuthGuard)
export class StocksController {
  constructor(private stocksService: StocksService) {}

  @Get('search')
  async searchStocks(@Query('q') query: string): Promise<Stock[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }
    return this.stocksService.searchStocks(query.trim());
  }

  @Get('detail/:symbol')
  async getStockDetail(@Param('symbol') symbol: string): Promise<StockDetail> {
    return this.stocksService.getStockDetail(symbol.toUpperCase());
  }

  @Get('quote/:symbol')
  async getStockQuote(@Param('symbol') symbol: string): Promise<Stock> {
    return this.stocksService.getStockQuote(symbol.toUpperCase());
  }

  @Get('providers/status')
  async getProviderStatus(): Promise<Array<{ name: string; available: boolean }>> {
    return this.stocksService.getProviderStatus();
  }

  @Post('providers/switch')
  switchProvider(): { message: string } {
    this.stocksService.switchProvider();
    return { message: 'Provider switched successfully' };
  }
}
