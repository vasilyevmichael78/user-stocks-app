import axios from 'axios';
import type { 
  LoginDto, 
  RegisterDto, 
  AuthResponse, 
  Stock, 
  StockDetail, 
  AddStockToPortfolioDto
} from '@user-stocks-app/shared-types';

const API_BASE_URL = 'http://localhost:3000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (data: LoginDto): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterDto): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },
};

// Stocks API
export const stocksAPI = {
  getQuote: async (symbol: string): Promise<Stock> => {
    const response = await api.get(`/stocks/quote/${symbol}`);
    return response.data;
  },

  getDetail: async (symbol: string): Promise<StockDetail> => {
    const response = await api.get(`/stocks/detail/${symbol}`);
    return response.data;
  },

  search: async (query: string): Promise<Stock[]> => {
    const response = await api.get(`/stocks/search?q=${query}`);
    return response.data;
  },

  getMarketMovers: async (): Promise<{ gainers: Stock[]; losers: Stock[] }> => {
    const response = await api.get('/stocks/market-movers');
    return response.data;
  },
};

// Portfolio API  
export const portfolioAPI = {
  getPortfolio: async (): Promise<Stock[]> => {
    const response = await api.get('/portfolio');
    return response.data;
  },

  addStock: async (data: AddStockToPortfolioDto): Promise<void> => {
    await api.post('/portfolio/stocks', data);
  },

  removeStock: async (symbol: string): Promise<void> => {
    await api.delete(`/portfolio/stocks/${symbol}`);
  },
};

export default api;
