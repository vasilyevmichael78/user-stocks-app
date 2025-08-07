import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Portfolio, PortfolioDocument } from './schemas/portfolio.schema';
import { StocksService } from '../stocks/stocks.service';
import type { Stock } from '@user-stocks-app/shared-types';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectModel(Portfolio.name) private portfolioModel: Model<PortfolioDocument>,
    private stocksService: StocksService,
  ) {}

  async getUserStocks(userId: string): Promise<Stock[]> {
    let portfolio = await this.portfolioModel.findOne({ userId });
    
    if (!portfolio) {
      // Create empty portfolio if it doesn't exist
      portfolio = new this.portfolioModel({ userId, stocks: [] });
      await portfolio.save();
      return [];
    }

    // Get current stock data for all symbols in user's portfolio
    const userStocks: Stock[] = [];
    
    for (const portfolioStock of portfolio.stocks) {
      try {
        const stockData = await this.stocksService.getStockQuote(portfolioStock.symbol);
        userStocks.push(stockData);
      } catch (error) {
        console.error(`Error fetching data for ${portfolioStock.symbol}:`, error);
        // Skip this stock if we can't get current data
      }
    }

    return userStocks;
  }

  async addStockToPortfolio(userId: string, symbol: string): Promise<Portfolio> {
    let portfolio = await this.portfolioModel.findOne({ userId });
    
    if (!portfolio) {
      portfolio = new this.portfolioModel({ userId, stocks: [] });
    }

    // Check if stock already exists in portfolio
    const existingStock = portfolio.stocks.find(
      stock => stock.symbol === symbol.toUpperCase()
    );

    if (existingStock) {
      // Stock already exists, no need to add again
      return portfolio;
    }

    // Add new stock to portfolio
    portfolio.stocks.push({
      symbol: symbol.toUpperCase(),
      addedDate: new Date(),
    });

    return portfolio.save();
  }

  async removeStockFromPortfolio(userId: string, symbol: string): Promise<Portfolio> {
    const portfolio = await this.portfolioModel.findOne({ userId });
    
    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    portfolio.stocks = portfolio.stocks.filter(
      stock => stock.symbol !== symbol.toUpperCase()
    );

    return portfolio.save();
  }
}
