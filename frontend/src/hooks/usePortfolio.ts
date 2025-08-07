import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portfolioAPI } from '../services/api';
import { useIsAuthenticated } from './useAuth';
import type { Stock } from '@user-stocks-app/shared-types';

// Query Keys
export const portfolioKeys = {
  all: ['portfolio'] as const,
  userStocks: () => [...portfolioKeys.all, 'user-stocks'] as const,
};

// Get User Stocks Hook
export const usePortfolio = (enabled: boolean = true) => {
  const isAuthenticated = useIsAuthenticated();
  
  return useQuery({
    queryKey: portfolioKeys.userStocks(),
    queryFn: () => portfolioAPI.getPortfolio(),
    enabled: enabled && isAuthenticated,
    staleTime: 5 * 1000, // 5 seconds - shorter stale time for more responsive updates
    gcTime: 30 * 1000, // Keep in cache for 30 seconds
  });
};

// Portfolio actions with optimistic updates
export const usePortfolioActions = () => {
  const queryClient = useQueryClient();

  const addStock = useMutation({
    mutationFn: (symbol: string) => portfolioAPI.addStock({ symbol }),
    onMutate: async (symbolToAdd: string) => {
      // Cancel any outgoing refetches to prevent overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: portfolioKeys.userStocks() });

      // Snapshot the previous value
      const previousStocks = queryClient.getQueryData<Stock[]>(portfolioKeys.userStocks());

      // Optimistically add a placeholder stock (we'll get real data from server)
      if (previousStocks) {
        const placeholderStock: Stock = {
          symbol: symbolToAdd,
          name: `Loading ${symbolToAdd}...`,
          price: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
          // Add any other required Stock properties with default values
        };

        queryClient.setQueryData<Stock[]>(
          portfolioKeys.userStocks(),
          (old) => old ? [...old, placeholderStock] : [placeholderStock]
        );
      }

      // Return a context object with the snapshotted value
      return { previousStocks };
    },
    onSuccess: () => {
      // Invalidate to get the real stock data from the server
      queryClient.invalidateQueries({ queryKey: portfolioKeys.userStocks() });
    },
    onError: (error: any, symbolToAdd: string, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousStocks) {
        queryClient.setQueryData(portfolioKeys.userStocks(), context.previousStocks);
      }
      console.error('Failed to add stock to portfolio:', error);
    },
  });

  const removeStock = useMutation({
    mutationFn: (symbol: string) => portfolioAPI.removeStock(symbol),
    onMutate: async (symbolToRemove: string) => {
      // Cancel any outgoing refetches to prevent overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: portfolioKeys.userStocks() });

      // Snapshot the previous value
      const previousStocks = queryClient.getQueryData<Stock[]>(portfolioKeys.userStocks());

      // Optimistically update to the new value
      if (previousStocks) {
        queryClient.setQueryData<Stock[]>(
          portfolioKeys.userStocks(),
          (old) => old?.filter(stock => stock.symbol !== symbolToRemove) || []
        );
      }

      // Return a context object with the snapshotted value
      return { previousStocks };
    },
    onError: (error: any, symbolToRemove: string, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousStocks) {
        queryClient.setQueryData(portfolioKeys.userStocks(), context.previousStocks);
      }
      console.error('Failed to remove stock from portfolio:', error);
    },
    onSettled: () => {
      // Always refetch after error or success to sync with server state
      queryClient.invalidateQueries({ queryKey: portfolioKeys.userStocks() });
    },
  });

  return {
    addStock,
    removeStock,
  };
};
