
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { fetchStockData, generateMockData } from '@/services/stockApi';
import { StockData } from '@/types/stock';

export const useStockData = () => {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [dataSource, setDataSource] = useState<'yahoo' | 'mock'>('mock');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFetchStockData = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('Attempting to fetch real Yahoo Finance data...');
      const data = await fetchStockData();
      setStockData(data);
      setCurrentPrice(data[data.length - 1].close);
      setDataSource('yahoo');
      
      toast({
        title: "✅ Real Yahoo Finance Data Loaded",
        description: `Successfully fetched ${data.length} days of real SPY data`,
      });
    } catch (error) {
      console.error('Yahoo Finance connection failed, using mock data:', error);
      
      const mockData = generateMockData();
      setStockData(mockData);
      setCurrentPrice(mockData[mockData.length - 1].close);
      setDataSource('mock');
      
      toast({
        title: "⚠️ Using Simulated Data",
        description: "Yahoo Finance connection failed. Using realistic mock data for demonstration.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    stockData,
    currentPrice,
    dataSource,
    isLoading,
    handleFetchStockData
  };
};
