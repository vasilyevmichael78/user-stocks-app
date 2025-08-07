import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '../hooks/useDebounce';
import { stockProvider } from '../services/stockProvider';
import { usePortfolioActions } from '../hooks/usePortfolio';
import type { Stock } from '@user-stocks-app/shared-types';
import {
  Box,
  TextField,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Modal,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Add as AddIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface StockDetailModalProps {
  stock: Stock;
  isOpen: boolean;
  onClose: () => void;
  onAddToPortfolio: (symbol: string) => void;
}

const StockDetailModal: React.FC<StockDetailModalProps> = ({ 
  stock, 
  isOpen, 
  onClose, 
  onAddToPortfolio 
}) => {
  const { data: stockDetail, isLoading } = useQuery({
    queryKey: ['stockDetail', stock.symbol],
    queryFn: () => stockProvider.getStockDetail(stock.symbol),
    enabled: isOpen,
  });

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Card sx={{ maxWidth: 600, width: '90%', maxHeight: '80vh', overflow: 'auto', m: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" component="h2" fontWeight="bold">
              {stock.symbol}
            </Typography>
            <Button onClick={onClose} sx={{ minWidth: 'auto', p: 1 }}>
              <CloseIcon />
            </Button>
          </Box>
          
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : stockDetail ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  {stockDetail.name}
                </Typography>
                <Typography variant="h4" component="div" color="primary" fontWeight="bold">
                  ${stockDetail.price?.toFixed(2) || 'N/A'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  {(stockDetail.change || 0) >= 0 ? <TrendingUp color="success" /> : <TrendingDown color="error" />}
                  <Typography 
                    color={(stockDetail.change || 0) >= 0 ? 'success.main' : 'error.main'}
                    variant="body2"
                  >
                    {(stockDetail.change || 0) >= 0 ? '+' : ''}{stockDetail.change?.toFixed(2) || '0.00'} 
                    ({stockDetail.changePercent?.toFixed(2) || '0.00'}%)
                  </Typography>
                </Box>
              </Box>
              
              {stockDetail.description && (
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stockDetail.description.length > 300 
                      ? `${stockDetail.description.substring(0, 300)}...`
                      : stockDetail.description
                    }
                  </Typography>
                </Box>
              )}
              
              <Grid container spacing={2}>
                {stockDetail.sector && (
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Sector
                    </Typography>
                    <Typography variant="body2">
                      {stockDetail.sector}
                    </Typography>
                  </Grid>
                )}
                {stockDetail.industry && (
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Industry
                    </Typography>
                    <Typography variant="body2">
                      {stockDetail.industry}
                    </Typography>
                  </Grid>
                )}
                {stockDetail.marketCap && (
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Market Cap
                    </Typography>
                    <Typography variant="body2">
                      ${stockDetail.marketCap ? (stockDetail.marketCap / 1e9).toFixed(1) : 'N/A'}B
                    </Typography>
                  </Grid>
                )}
                <Grid size={{ xs: 6 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    P/E Ratio
                  </Typography>
                  <Typography variant="body2">
                    {stockDetail.pe ? stockDetail.pe.toFixed(2) : 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
              
              <Button
                variant="contained"
                fullWidth
                startIcon={<AddIcon />}
                onClick={() => {
                  onAddToPortfolio(stock.symbol);
                  onClose();
                }}
                size="large"
              >
                Add to User Stocks
              </Button>
            </Box>
          ) : (
            <Alert severity="error">
              Unable to load stock details
            </Alert>
          )}
        </CardContent>
      </Card>
    </Modal>
  );
};

const StockSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const { addStock } = usePortfolioActions();

  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ['stockSearch', debouncedSearchTerm],
    queryFn: () => stockProvider.searchStocks(debouncedSearchTerm),
    enabled: debouncedSearchTerm.length >= 2,
  });

  const handleAddToPortfolio = async (symbol: string) => {
    try {
      await addStock.mutateAsync(symbol);
    } catch (error) {
      console.error('Failed to add stock to portfolio:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* Left side - Search input */}
      <Box sx={{ width: '33%', p: 3, borderRight: 1, borderColor: 'divider' }}>
        <Box sx={{ mb: 4 }}>
         
          <Typography variant="body1" color="text.primary" fontWeight="bold" gutterBottom>
            Search for stocks and add them to your portfolio
          </Typography>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="Search Stocks"
            placeholder="Enter stock symbol or company name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            variant="outlined"
            sx={{ mb: 2 }}
          />
        </Box>
        
        {searchTerm.length >= 2 && (
          <Typography variant="body2" color="text.secondary">
            {isLoading ? 'Searching...' : `Found ${searchResults.length} results`}
          </Typography>
        )}
      </Box>

      {/* Right side - Results list */}
      <Box sx={{ flex: 1, p: 3 }}>
        {searchTerm.length < 2 ? (
          <Box sx={{ textAlign: 'center', mt: 10 }}>
            <Typography variant="h6" gutterBottom>
              Start typing to search
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter at least 2 characters to see results
            </Typography>
          </Box>
        ) : isLoading ? (
          <Box sx={{ textAlign: 'center', mt: 10 }}>
            <CircularProgress />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Searching...
            </Typography>
          </Box>
        ) : searchResults.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 10 }}>
            <Typography variant="h6" gutterBottom>
              No results found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try a different search term
            </Typography>
          </Box>
        ) : (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Search Results
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {searchResults.map((stock) => (
                <Card key={stock.symbol} variant="outlined">
                  <CardActionArea onClick={() => setSelectedStock(stock)}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Typography variant="h6" component="span" fontWeight="bold">
                              {stock.symbol}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {stock.name}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h5" fontWeight="bold">
                              ${stock.price?.toFixed(2) || 'N/A'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {(stock.change || 0) >= 0 ? <TrendingUp color="success" /> : <TrendingDown color="error" />}
                              <Typography 
                                color={(stock.change || 0) >= 0 ? 'success.main' : 'error.main'}
                                variant="body2"
                              >
                                {(stock.change || 0) >= 0 ? '+' : ''}{stock.change?.toFixed(2) || '0.00'} 
                                ({stock.changePercent?.toFixed(2) || '0.00'}%)
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" color="text.secondary">
                            Volume: {stock.volume?.toLocaleString() || 'N/A'}
                          </Typography>
                          {stock.marketCap && (
                            <Typography variant="body2" color="text.secondary">
                              Market Cap: ${(stock.marketCap / 1e9).toFixed(1)}B
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* Stock Detail Modal */}
      {selectedStock && (
        <StockDetailModal
          stock={selectedStock}
          isOpen={!!selectedStock}
          onClose={() => setSelectedStock(null)}
          onAddToPortfolio={handleAddToPortfolio}
        />
      )}
    </Box>
  );
};

export default StockSearch;
