import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PortfolioService } from './portfolio.service';

interface AddStockDto {
  symbol: string;
}

@Controller('portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  async getUserStocks(@Request() req: any) {
    return this.portfolioService.getUserStocks(req.user.id);
  }

  @Post('stocks')
  async addStockToPortfolio(@Request() req: any, @Body() addStockDto: AddStockDto) {
    return this.portfolioService.addStockToPortfolio(req.user.id, addStockDto.symbol);
  }

  @Delete('stocks/:symbol')
  async removeStockFromPortfolio(@Request() req: any, @Param('symbol') symbol: string) {
    return this.portfolioService.removeStockFromPortfolio(req.user.id, symbol);
  }
}
