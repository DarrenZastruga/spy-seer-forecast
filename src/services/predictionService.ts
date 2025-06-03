
import { StockData, Prediction, ModelParams } from '@/types/stock';

export class PredictionService {
  static calculateRSI(prices: StockData[]): number {
    if (prices.length < 14) return 50;
    
    const changes = prices.slice(1).map((price, index) => price.close - prices[index].close);
    const gains = changes.map(change => change > 0 ? change : 0);
    const losses = changes.map(change => change < 0 ? -change : 0);
    
    const avgGain = gains.slice(-14).reduce((sum, gain) => sum + gain, 0) / 14;
    const avgLoss = losses.slice(-14).reduce((sum, loss) => sum + loss, 0) / 14;
    
    const rs = avgGain / (avgLoss || 1);
    return 100 - (100 / (1 + rs));
  }

  static simulateRandomForestTree(features: any[], lastPrice: number, daysAhead: number): number {
    const trendFactor = Math.random() * 0.02 - 0.01; // -1% to +1%
    const volatilityFactor = (Math.random() - 0.5) * 0.05; // Random volatility
    const timeFactor = Math.pow(0.999, daysAhead); // Slight decay over time
    
    return lastPrice * (1 + trendFactor + volatilityFactor) * timeFactor;
  }

  static simulateLinearRegression(features: any[], lastPrice: number, daysAhead: number): number {
    const recentTrend = features.length > 10 ? 
      (features[features.length - 1].price - features[features.length - 10].price) / features[features.length - 10].price / 10 : 0;
    
    return lastPrice * (1 + recentTrend * daysAhead);
  }

  static generatePredictions(stockData: StockData[], forecastDays: number, modelParams: ModelParams): Prediction[] {
    if (stockData.length === 0) return [];

    const predictions: Prediction[] = [];
    
    // Extract features for the model
    const features = stockData.slice(-60).map((data, index, arr) => {
      const sma5 = arr.slice(Math.max(0, index - 4), index + 1).reduce((sum, d) => sum + d.close, 0) / Math.min(5, index + 1);
      const sma20 = arr.slice(Math.max(0, index - 19), index + 1).reduce((sum, d) => sum + d.close, 0) / Math.min(20, index + 1);
      const rsi = this.calculateRSI(arr.slice(0, index + 1));
      const volatility = index > 0 ? Math.abs(data.close - arr[index - 1].close) / arr[index - 1].close : 0;
      
      return {
        price: data.close,
        sma5,
        sma20,
        rsi,
        volatility,
        volume_ratio: data.volume / 40000000,
        price_change: index > 0 ? (data.close - arr[index - 1].close) / arr[index - 1].close : 0
      };
    });

    const lastPrice = stockData[stockData.length - 1].close;
    const lastDate = new Date(stockData[stockData.length - 1].date);

    // RERF model simulation with ensemble of regression and random forest
    for (let i = 1; i <= forecastDays; i++) {
      const predictionDate = new Date(lastDate);
      predictionDate.setDate(predictionDate.getDate() + i);

      // Random Forest component
      const rfPredictions = [];
      for (let tree = 0; tree < modelParams.n_estimators; tree++) {
        const treePrediction = this.simulateRandomForestTree(features, lastPrice, i);
        rfPredictions.push(treePrediction);
      }
      const rfMean = rfPredictions.reduce((sum, pred) => sum + pred, 0) / rfPredictions.length;

      // Regression component
      const regressionPrediction = this.simulateLinearRegression(features, lastPrice, i);

      // Combine RF and regression with weighted average
      const combinedPrediction = rfMean * (1 - modelParams.regression_weight) + regressionPrediction * modelParams.regression_weight;

      // Calculate confidence intervals
      const variance = rfPredictions.reduce((sum, pred) => sum + Math.pow(pred - rfMean, 2), 0) / rfPredictions.length;
      const stdDev = Math.sqrt(variance);
      const confidenceInterval = 1.96 * stdDev; // 95% confidence

      const trend = combinedPrediction > lastPrice ? 'up' : combinedPrediction < lastPrice ? 'down' : 'neutral';

      predictions.push({
        date: predictionDate.toISOString().split('T')[0],
        predicted_price: Number(combinedPrediction.toFixed(2)),
        confidence_interval_lower: Number((combinedPrediction - confidenceInterval).toFixed(2)),
        confidence_interval_upper: Number((combinedPrediction + confidenceInterval).toFixed(2)),
        trend
      });
    }

    return predictions;
  }
}
