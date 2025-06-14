
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { fetchStockData, generateMockData } from '@/services/stockApi';
import { StockData } from '@/types/stock';

export const useStockData = () => {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [dataSource, setDataSource] = useState<'yahoo' | 'mock'>('mock');
  const [isLoading, setIsLoading] = useState(false);
  const [stockSymbol, setStockSymbol] = useState<string>('SPY');
  const { toast } = useToast();

  const handleFetchStockData = useCallback(
    async (symbol?: string) => {
      setIsLoading(true);
      const querySymbol = symbol || stockSymbol;
      try {
        console.log(`Attempting to fetch real Yahoo Finance data for ${querySymbol}...`);
        const data = await fetchStockData(querySymbol);
        setStockData(data);
        setCurrentPrice(data[data.length - 1].close);
        setDataSource('yahoo');
        toast({
          title: `✅ Real Yahoo Finance Data Loaded for ${querySymbol}`,
          description: `Successfully fetched ${data.length} days of real ${querySymbol} data`,
        });
      } catch (error) {
        console.error(`Yahoo Finance connection failed for ${querySymbol}, using mock data:`, error);

        const mockData = generateMockData(querySymbol);
        setStockData(mockData);
        setCurrentPrice(mockData[mockData.length - 1].close);
        setDataSource('mock');
        toast({
          title: `⚠️ Using Simulated Data for ${querySymbol}`,
          description: "Yahoo Finance connection failed. Using realistic mock data for demonstration.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [stockSymbol, toast]
  );

  // Expose stockSymbol and a setter to components
  return {
    stockSymbol,
    setStockSymbol,
    stockData,
    currentPrice,
    dataSource,
    isLoading,
    handleFetchStockData,
  };
};
