
import { StockData } from '@/types/stock';

export function calculateRSI(prices: StockData[]): number {
  if (prices.length < 14) return 50;
  const changes = prices.slice(1).map((price, index) => price.close - prices[index].close);
  const gains = changes.map(change => change > 0 ? change : 0);
  const losses = changes.map(change => change < 0 ? -change : 0);

  const avgGain = gains.slice(-14).reduce((sum, gain) => sum + gain, 0) / 14;
  const avgLoss = losses.slice(-14).reduce((sum, loss) => sum + loss, 0) / 14;

  const rs = avgGain / (avgLoss || 1);
  return 100 - (100 / (1 + rs));
}

export function createFeatureMatrix(stockData: StockData[]): number[][] {
  // Extract features for RERF
  return stockData.slice(-60).map((data, index, arr) => {
    const sma5 = arr.slice(Math.max(0, index - 4), index + 1).reduce((sum, d) => sum + d.close, 0) / Math.min(5, index + 1);
    const sma20 = arr.slice(Math.max(0, index - 19), index + 1).reduce((sum, d) => sum + d.close, 0) / Math.min(20, index + 1);
    const rsi = calculateRSI(arr.slice(0, index + 1));
    const volatility = index > 0 ? Math.abs(data.close - arr[index - 1].close) / arr[index - 1].close : 0;
    const priceChange = index > 0 ? (data.close - arr[index - 1].close) / arr[index - 1].close : 0;
    const volumeRatio = data.volume / 40000000;
    // Quadratic and interaction terms
    const smaRatio = sma5 / sma20;
    const volatilitySquared = volatility * volatility;
    const rsiNormalized = (rsi - 50) / 50;

    return [
      1, // intercept
      data.close,
      sma5,
      sma20,
      rsi,
      volatility,
      priceChange,
      volumeRatio,
      smaRatio,
      volatilitySquared,
      rsiNormalized,
      data.close * volatility,
      sma5 * rsi / 100
    ];
  });
}
