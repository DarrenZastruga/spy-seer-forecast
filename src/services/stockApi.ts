
import axios from 'axios';

export interface StockData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose: number;
}

export const fetchStockData = async (): Promise<StockData[]> => {
  console.log('Fetching real SPY data from Yahoo Finance...');
  
  try {
    // Multiple fallback approaches for Yahoo Finance data
    const approaches = [
      // Approach 1: Direct Yahoo Finance with proper headers
      async () => {
        const symbol = 'SPY';
        const period1 = Math.floor((Date.now() - 365 * 24 * 60 * 60 * 1000) / 1000);
        const period2 = Math.floor(Date.now() / 1000);
        
        const response = await axios.get(`https://query1.finance.yahoo.com/v7/finance/download/${symbol}`, {
          params: {
            period1,
            period2,
            interval: '1d',
            events: 'history',
            includeAdjustedClose: true
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/csv,application/json,*/*'
          }
        });
        return response.data;
      },
      
      // Approach 2: Alternative Yahoo Finance endpoint
      async () => {
        const response = await axios.get('https://query2.finance.yahoo.com/v8/finance/chart/SPY', {
          params: {
            range: '1y',
            interval: '1d',
            includePrePost: false,
            events: 'div%2Csplits'
          }
        });
        
        if (response.data?.chart?.result?.[0]) {
          const result = response.data.chart.result[0];
          const timestamps = result.timestamp;
          const quotes = result.indicators.quote[0];
          
          return timestamps.map((timestamp: number, index: number) => {
            const date = new Date(timestamp * 1000).toISOString().split('T')[0];
            return `${date},${quotes.open[index]},${quotes.high[index]},${quotes.low[index]},${quotes.close[index]},${quotes.volume[index]},${quotes.close[index]}`;
          }).join('\n');
        }
        throw new Error('Invalid response format');
      },
      
      // Approach 3: Using CORS proxy
      async () => {
        const symbol = 'SPY';
        const period1 = Math.floor((Date.now() - 365 * 24 * 60 * 60 * 1000) / 1000);
        const period2 = Math.floor(Date.now() / 1000);
        
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/download/${symbol}?period1=${period1}&period2=${period2}&interval=1d&events=history&includeAdjustedClose=true`;
        
        const response = await axios.get(proxyUrl + encodeURIComponent(yahooUrl));
        return response.data;
      }
    ];
    
    let csvData = '';
    let lastError = null;
    
    // Try each approach until one works
    for (let i = 0; i < approaches.length; i++) {
      try {
        console.log(`Trying Yahoo Finance approach ${i + 1}...`);
        csvData = await approaches[i]();
        console.log(`Approach ${i + 1} successful!`);
        break;
      } catch (error) {
        console.log(`Approach ${i + 1} failed:`, error);
        lastError = error;
        continue;
      }
    }
    
    if (!csvData) {
      throw lastError || new Error('All Yahoo Finance approaches failed');
    }
    
    // Parse CSV response
    const lines = csvData.split('\n').filter(line => line.trim());
    const formattedData: StockData[] = [];
    
    for (let i = 1; i < lines.length; i++) { // Skip header
      const values = lines[i].split(',');
      
      if (values.length >= 6 && values[0] !== '' && !values[1].includes('null')) {
        try {
          const stockDataPoint: StockData = {
            date: values[0].trim(),
            open: parseFloat(values[1]),
            high: parseFloat(values[2]),
            low: parseFloat(values[3]),
            close: parseFloat(values[4]),
            adjClose: parseFloat(values[5]),
            volume: parseInt(values[6]) || 0
          };
          
          // Validate data point
          if (!isNaN(stockDataPoint.open) && !isNaN(stockDataPoint.close) && 
              stockDataPoint.open > 0 && stockDataPoint.close > 0) {
            formattedData.push(stockDataPoint);
          }
        } catch (parseError) {
          console.warn('Error parsing line:', values, parseError);
          continue;
        }
      }
    }
    
    if (formattedData.length === 0) {
      throw new Error('No valid data parsed from Yahoo Finance response');
    }
    
    // Sort by date to ensure chronological order
    formattedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    console.log(`Successfully parsed ${formattedData.length} data points from Yahoo Finance`);
    return formattedData;
    
  } catch (error) {
    console.error('All Yahoo Finance approaches failed:', error);
    throw error;
  }
};

export const generateMockData = (): StockData[] => {
  console.log('Generating realistic mock SPY data...');
  const mockData: StockData[] = [];
  const basePrice = 450;
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
      adjClose: Number(close.toFixed(2))
    });
  }

  return mockData;
};
