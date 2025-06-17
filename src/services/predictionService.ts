
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
    const lastDataDate = new Date(stockData[stockData.length - 1].date);

    console.log('Last data date:', lastDataDate.toISOString().split('T')[0]);
    console.log('Last data day of week:', lastDataDate.getDay()); // 0=Sunday, 1=Monday, etc.
    console.log('Today:', new Date().toISOString().split('T')[0]);

    // Average daily change
    const recentPrices = stockData.slice(-10).map(d => d.close);
    const avgDailyChange = recentPrices.length > 1 ? 
      (recentPrices[recentPrices.length - 1] - recentPrices[0]) / (recentPrices.length - 1) : 0;

    // Start predictions from the next business day after the last data point
    let currentDate = new Date(lastDataDate.getTime());
    currentDate.setDate(currentDate.getDate() + 1);
    
    // Skip to next weekday if we land on weekend
    while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('Starting predictions from:', currentDate.toISOString().split('T')[0]);
    console.log('Starting prediction day of week:', currentDate.getDay());

    let currentPrice = lastPrice;
    let predictionCount = 0;
    let daysAhead = 1;

    while (predictionCount < forecastDays) {
      // Only generate predictions for weekdays
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
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

        console.log(`Prediction ${predictionCount + 1}: ${currentDate.toISOString().split('T')[0]} (day ${currentDate.getDay()})`);

        predictions.push({
          date: currentDate.toISOString().split('T')[0],
          predicted_price: Number(currentPrice.toFixed(2)),
          confidence_interval_lower: Number((currentPrice - confidenceInterval).toFixed(2)),
          confidence_interval_upper: Number((currentPrice + confidenceInterval).toFixed(2)),
          trend
        });

        predictionCount++;
        daysAhead++;
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return predictions;
  }
}
