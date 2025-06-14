import { StockData } from '@/types/stock';
import { filterWeekendDays } from './formatters';

// Function to format Yahoo Finance API response data
export const formatYahooFinanceData = (data: any): StockData[] => {
  if (!data || !data.chart || !data.chart.result || data.chart.result.length === 0) {
    throw new Error('Invalid Yahoo Finance API response format');
  }
  
  const result = data.chart.result[0];
  const timestamps = result.timestamp;
  const quotes = result.indicators.quote[0];
  
  // Ensure we have closing prices
  if (!timestamps || !quotes || !quotes.close) {
    throw new Error('Yahoo Finance API data is missing timestamps or closing prices');
  }
  
  const formattedData = timestamps.map((timestamp: number, index: number) => {
    // Skip any missing/null prices
    if (quotes.close[index] === null || quotes.close[index] === undefined) {
      return null;
    }
    
    // Format date as YYYY-MM-DD (in UTC to avoid timezone issues)
    const date = new Date(timestamp * 1000);
    const dateString = date.toISOString().split('T')[0];
    
    return {
      date: dateString,
      open: parseFloat(quotes.open?.[index]?.toFixed(2) || quotes.close[index].toFixed(2)),
      high: parseFloat(quotes.high?.[index]?.toFixed(2) || quotes.close[index].toFixed(2)),
      low: parseFloat(quotes.low?.[index]?.toFixed(2) || quotes.close[index].toFixed(2)),
      close: parseFloat(quotes.close[index].toFixed(2)),
      volume: parseInt(quotes.volume?.[index] || '0'),
      adjClose: parseFloat(quotes.close[index].toFixed(2))
    };
  }).filter(Boolean); // Remove any null entries
  
  console.log('Raw data points before filtering:', formattedData.length);
  console.log('Sample dates before filtering:', formattedData.slice(0, 5).map(d => d?.date));
  
  // Filter out weekend days
  const filteredData = filterWeekendDays(formattedData);
  
  console.log('Data points after weekend filtering:', filteredData.length);
  console.log('Sample dates after filtering:', filteredData.slice(0, 5).map(d => d.date));
  
  return filteredData;
};

// Fetch historical data from Yahoo Finance API with proxy
export async function fetchStockData(symbol: string = 'SPY'): Promise<StockData[]> {
  try {
    // Calculate date range (1 year ago to now for more data)
    const now = new Date();
    const endDate = Math.floor(now.getTime() / 1000);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);
    const startDate = Math.floor(oneYearAgo.getTime() / 1000);

    const ticker = symbol.toUpperCase();
    const directUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${startDate}&period2=${endDate}&interval=1d`;
    
    console.log('Fetching', ticker, 'data from Yahoo Finance API');
    console.log('Date range:', new Date(startDate * 1000).toISOString(), 'to', new Date(endDate * 1000).toISOString());
    console.log('Direct Yahoo URL:', directUrl);
    
    const encodedUrl = encodeURIComponent(directUrl);
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const fullProxyUrl = `${proxyUrl}${encodedUrl}`;
    console.log('Full proxy URL:', fullProxyUrl);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(fullProxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Yahoo Finance API error (${response.status}):`, errorText);
        throw new Error(`Yahoo Finance API returned status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.chart && data.chart.error) {
        console.error('Yahoo Finance API returned an error:', data.chart.error);
        throw new Error(`Yahoo Finance API error: ${data.chart.error.description || 'Unknown error'}`);
      }
      
      const formattedData = formatYahooFinanceData(data);
      
      console.log('Fetched real', ticker, 'data:', formattedData.length, 'data points');
      
      if (formattedData.length === 0) {
        throw new Error('No data points returned from Yahoo Finance API');
      }
      
      return formattedData;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error('Error fetching', symbol, 'data from Yahoo Finance:', error);
    throw error;
  }
}

export const generateMockData = (symbol: string = 'SPY'): StockData[] => {
  console.log(`Generating realistic mock ${symbol.toUpperCase()} data...`);
  const mockData: StockData[] = [];
  let basePrice = 450;
  if (symbol.toUpperCase() === 'AAPL') basePrice = 175;
  if (symbol.toUpperCase() === 'GOOGL') basePrice = 2800;
  if (symbol.toUpperCase() === 'TSLA') basePrice = 800;
  if (symbol.toUpperCase() === 'MSFT') basePrice = 350;
  // (Add more stock defaults as desired.)

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 252);

  for (let i = 0; i < 252; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const volatility = 0.015;
    const trend = 0.0003;
    const randomFactor = (Math.random() - 0.5) * 2 * volatility;

    const price = basePrice * Math.exp((trend + randomFactor) * i);
    const dailyVolatility = price * 0.008;

    const open = price + (Math.random() - 0.5) * dailyVolatility;
    const close = price + (Math.random() - 0.5) * dailyVolatility;
    const high = Math.max(open, close) + Math.random() * dailyVolatility * 0.3;
    const low = Math.min(open, close) - Math.random() * dailyVolatility * 0.3;

    mockData.push({
      date: date.toISOString().split('T')[0],
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Math.floor(Math.random() * 40000000) + 35000000,
      adjClose: Number(close.toFixed(2)),
    });
  }

  return mockData;
};
