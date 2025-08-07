// Abstract interface for stock data providers
export interface StockProvider {
  searchStocks(query: string): Promise<Stock[]>;
  getStockDetail(symbol: string): Promise<StockDetail>;
  getStockQuote(symbol: string): Promise<Stock>;
}

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  pe?: number;
  eps?: number;
}

export interface StockDetail extends Stock {
  description?: string;
  sector?: string;
  industry?: string;
  website?: string;
  ceo?: string;
  employees?: number;
  headquarters?: string;
}

// FMP API Implementation via Backend
class BackendStockProvider implements StockProvider {
  private baseURL = 'http://localhost:3000/api/stocks';

  private getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async searchStocks(query: string): Promise<Stock[]> {
    const response = await fetch(`${this.baseURL}/search?q=${encodeURIComponent(query)}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to search stocks');
    return response.json();
  }

  async getStockDetail(symbol: string): Promise<StockDetail> {
    const response = await fetch(`${this.baseURL}/detail/${symbol}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to get stock detail');
    return response.json();
  }

  async getStockQuote(symbol: string): Promise<Stock> {
    const response = await fetch(`${this.baseURL}/quote/${symbol}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to get stock quote');
    return response.json();
  }
}

// Export the current provider instance
export const stockProvider = new BackendStockProvider();

// Easy way to switch providers in the future
export const setStockProvider = (provider: StockProvider) => {
  Object.assign(stockProvider, provider);
};
