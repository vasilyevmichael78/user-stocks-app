import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePortfolio, usePortfolioActions } from '../hooks/usePortfolio';
import { stockProvider } from '../services/stockProvider';
import type { Stock } from '@user-stocks-app/shared-types';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Modal,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Fade,
  Snackbar,
  IconButton,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Remove as RemoveIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface StockDetailModalProps {
  stock: Stock;
  isOpen: boolean;
  onClose: () => void;
  onRemoveFromPortfolio: (symbol: string) => void;
}

const StockDetailModal: React.FC<StockDetailModalProps> = ({ 
  stock, 
  isOpen, 
  onClose, 
  onRemoveFromPortfolio 
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
                  ${stockDetail.price.toFixed(2)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  {stockDetail.change >= 0 ? <TrendingUp color="success" /> : <TrendingDown color="error" />}
                  <Typography 
                    color={stockDetail.change >= 0 ? 'success.main' : 'error.main'}
                    variant="body2"
                  >
                    {stockDetail.change >= 0 ? '+' : ''}{stockDetail.change.toFixed(2)} 
                    ({stockDetail.changePercent.toFixed(2)}%)
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
                      ${(stockDetail.marketCap / 1e9).toFixed(1)}B
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
                color="error"
                fullWidth
                startIcon={<RemoveIcon />}
                onClick={() => {
                  onRemoveFromPortfolio(stock.symbol);
                  onClose();
                }}
                size="large"
              >
                Remove from User Stocks
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

const UserStocks: React.FC = () => {
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [removingStocks, setRemovingStocks] = useState<Set<string>>(new Set());
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });
  
  const { data: userStocks = [], isLoading, error, isFetching } = usePortfolio();
  const { removeStock } = usePortfolioActions();

  const handleRemoveFromPortfolio = useCallback(async (symbol: string) => {
    // Optimistically mark stock as being removed
    setRemovingStocks(prev => new Set(prev.add(symbol)));
    
    try {
      await removeStock.mutateAsync(symbol);
      setSnackbar({ 
        open: true, 
        message: `${symbol} removed from portfolio`, 
        severity: 'success' 
      });
    } catch (error) {
      // If removal fails, remove from removing set and show error
      setRemovingStocks(prev => {
        const newSet = new Set(prev);
        newSet.delete(symbol);
        return newSet;
      });
      setSnackbar({ 
        open: true, 
        message: `Failed to remove ${symbol} from portfolio`, 
        severity: 'error' 
      });
      console.error('Failed to remove stock from portfolio:', error);
    } finally {
      // Clean up after delay to allow animation to complete
      setTimeout(() => {
        setRemovingStocks(prev => {
          const newSet = new Set(prev);
          newSet.delete(symbol);
          return newSet;
        });
      }, 300);
    }
  }, [removeStock]);

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading your stocks...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Alert severity="error">
          Failed to load your stocks
        </Alert>
      </Box>
    );
  }

  // Filter out stocks that are being removed for smooth animation
  const visibleStocks = userStocks.filter(stock => !removingStocks.has(stock.symbol));
  const totalValue = visibleStocks.reduce((sum, stock) => sum + (stock.price || 0), 0);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold" sx={{ mb: 0 }}>
            Your Stocks
          </Typography>
          {isFetching && !isLoading && (
            <CircularProgress size={20} sx={{ opacity: 0.7 }} />
          )}
        </Box>
        <Typography variant="body1" color="text.secondary">
          Manage your stock watchlist
        </Typography>
      </Box>

      {visibleStocks.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 10 }}>
          <Typography variant="h6" gutterBottom>
            No stocks in your portfolio
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start by searching and adding stocks from the Stock Search page
          </Typography>
        </Box>
      ) : (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Your Portfolio ({visibleStocks.length} stocks)
            </Typography>
            <Chip 
              label={`Total Value: $${totalValue.toFixed(2)}`}
              color="primary"
              variant="outlined"
            />
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {userStocks.map((stock) => (
              <Fade
                key={stock.symbol}
                in={!removingStocks.has(stock.symbol)}
                timeout={300}
                unmountOnExit
              >
                <Card 
                  variant="outlined"
                  sx={{
                    transition: 'all 0.3s ease-in-out',
                    opacity: removingStocks.has(stock.symbol) ? 0.5 : 1,
                    transform: removingStocks.has(stock.symbol) ? 'scale(0.95)' : 'scale(1)',
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <CardActionArea 
                        onClick={() => setSelectedStock(stock)}
                        disabled={removingStocks.has(stock.symbol)}
                        sx={{ flex: 1, borderRadius: 1, p: 1, mr: 2 }}
                      >
                        <Box>
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
                      </CardActionArea>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                        
                        <IconButton
                          color="error"
                          onClick={() => handleRemoveFromPortfolio(stock.symbol)}
                          disabled={removingStocks.has(stock.symbol)}
                          sx={{
                            transition: 'all 0.2s ease',
                            opacity: removingStocks.has(stock.symbol) ? 0.5 : 1,
                          }}
                        >
                          {removingStocks.has(stock.symbol) ? (
                            <CircularProgress size={20} color="error" />
                          ) : (
                            <RemoveIcon />
                          )}
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Fade>
            ))}
          </Box>
        </Box>
      )}

      {/* Stock Detail Modal */}
      {selectedStock && (
        <StockDetailModal
          stock={selectedStock}
          isOpen={!!selectedStock}
          onClose={() => setSelectedStock(null)}
          onRemoveFromPortfolio={handleRemoveFromPortfolio}
        />
      )}

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserStocks;
