
import { StockData } from '@/types/stock';

// Function to filter out weekend days from stock data
export const filterWeekendDays = (data: StockData[]): StockData[] => {
  return data.filter(item => {
    const date = new Date(item.date);
    const dayOfWeek = date.getDay();
    // Filter out Saturday (6) and Sunday (0)
    return dayOfWeek !== 0 && dayOfWeek !== 6;
  });
};

// Additional utility functions for date formatting
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const isWeekend = (date: Date): boolean => {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
};
