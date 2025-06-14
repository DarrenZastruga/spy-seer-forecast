
// Top-level RERF stock prediction orchestrator

import { StockData, Prediction, ModelParams } from '@/types/stock';
import { calculateRSI, createFeatureMatrix } from './featureEngineering';
import { lassoRegression, simulateRandomForestOnResiduals } from './modelAlgorithms';

export class PredictionService {
  static generatePredictions(stockData: StockData[], forecastDays: number, modelParams: ModelParams): Prediction[] {
    if (stockData.length === 0) return [];

    const predictions: Prediction[] = [];

    // Step 1: Feature creation
    const features = createFeatureMatrix(stockData);
    const targets = stockData.slice(-60).map(d => d.close);

    // Step 2: Lasso
    const { coefficients, residuals } = lassoRegression(features, targets, modelParams.lasso_penalty);

    const lastPrice = stockData[stockData.length - 1].close;
    const lastDate = new Date(stockData[stockData.length - 1].date);

    // Average daily change
    const recentPrices = stockData.slice(-10).map(d => d.close);
    const avgDailyChange = recentPrices.length > 1 ? 
      (recentPrices[recentPrices.length - 1] - recentPrices[0]) / (recentPrices.length - 1) : 0;

    // main prediction loop
    let currentPrice = lastPrice;
    let predictionCount = 0;
    let daysAhead = 1;

    let currentDate = new Date(lastDate.getTime());
    currentDate.setDate(currentDate.getDate() + 1);

    while (predictionCount < forecastDays) {
      // skip weekends only, include all weekdays (including Mondays)
      while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const trendComponent = avgDailyChange * 0.3;
      const volatilityComponent = (Math.random() - 0.5) * lastPrice * 0.02;
      const timeDecay = Math.exp(-daysAhead * 0.05);

      const rfResidualPredictions = simulateRandomForestOnResiduals(
        residuals,
        features,
        modelParams.n_estimators,
        daysAhead
      );
      const meanRfResidual = rfResidualPredictions.reduce((sum, pred) => sum + pred, 0) / rfResidualPredictions.length;

      const dailyChange = (trendComponent + volatilityComponent * timeDecay + meanRfResidual * 0.1);
      currentPrice = currentPrice + dailyChange;

      const variance = rfResidualPredictions.reduce((sum, pred) => sum + Math.pow(pred - meanRfResidual, 2), 0) / rfResidualPredictions.length;
      const stdDev = Math.sqrt(variance) * Math.pow(daysAhead, 1.5);
      const confidenceInterval = 1.96 * stdDev;

      const trend = currentPrice > lastPrice ? 'up' : currentPrice < lastPrice ? 'down' : 'neutral';

      predictions.push({
        date: currentDate.toISOString().split('T')[0],
        predicted_price: Number(currentPrice.toFixed(2)),
        confidence_interval_lower: Number((currentPrice - confidenceInterval).toFixed(2)),
        confidence_interval_upper: Number((currentPrice + confidenceInterval).toFixed(2)),
        trend
      });

      predictionCount++;
      daysAhead++;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return predictions;
  }
}
