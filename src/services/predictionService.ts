
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

  static createFeatureMatrix(stockData: StockData[]): number[][] {
    // Extract enhanced features for RERF (Step 1 of algorithm)
    return stockData.slice(-60).map((data, index, arr) => {
      const sma5 = arr.slice(Math.max(0, index - 4), index + 1).reduce((sum, d) => sum + d.close, 0) / Math.min(5, index + 1);
      const sma20 = arr.slice(Math.max(0, index - 19), index + 1).reduce((sum, d) => sum + d.close, 0) / Math.min(20, index + 1);
      const rsi = this.calculateRSI(arr.slice(0, index + 1));
      const volatility = index > 0 ? Math.abs(data.close - arr[index - 1].close) / arr[index - 1].close : 0;
      const priceChange = index > 0 ? (data.close - arr[index - 1].close) / arr[index - 1].close : 0;
      const volumeRatio = data.volume / 40000000;
      
      // Add quadratic and interaction terms as mentioned in the paper
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
        data.close * volatility, // interaction term
        sma5 * rsi / 100 // interaction term
      ];
    });
  }

  static lassoRegression(X: number[][], y: number[], lambda: number): { coefficients: number[], residuals: number[] } {
    // Simplified Lasso implementation using coordinate descent
    const n = X.length;
    const p = X[0].length;
    let beta = new Array(p).fill(0);
    const maxIter = 100;
    const tolerance = 1e-4;

    // Standardize features (except intercept)
    const means = new Array(p).fill(0);
    const stds = new Array(p).fill(1);
    
    for (let j = 1; j < p; j++) {
      means[j] = X.reduce((sum, row) => sum + row[j], 0) / n;
      const variance = X.reduce((sum, row) => sum + Math.pow(row[j] - means[j], 2), 0) / n;
      stds[j] = Math.sqrt(variance) || 1;
    }

    // Standardize X
    const XStd = X.map(row => row.map((val, j) => j === 0 ? val : (val - means[j]) / stds[j]));
    
    // Coordinate descent
    for (let iter = 0; iter < maxIter; iter++) {
      const oldBeta = [...beta];
      
      for (let j = 0; j < p; j++) {
        // Calculate partial residual
        const partialResidual = y.map((yi, i) => {
          let sum = 0;
          for (let k = 0; k < p; k++) {
            if (k !== j) sum += XStd[i][k] * beta[k];
          }
          return yi - sum;
        });
        
        // Calculate correlation with feature j
        const correlation = partialResidual.reduce((sum, r, i) => sum + r * XStd[i][j], 0) / n;
        
        // Soft thresholding (Lasso penalty)
        if (j === 0) { // No penalty for intercept
          beta[j] = correlation;
        } else {
          const threshold = lambda / n;
          if (correlation > threshold) {
            beta[j] = correlation - threshold;
          } else if (correlation < -threshold) {
            beta[j] = correlation + threshold;
          } else {
            beta[j] = 0;
          }
        }
      }
      
      // Check convergence
      const change = beta.reduce((sum, b, j) => sum + Math.abs(b - oldBeta[j]), 0);
      if (change < tolerance) break;
    }

    // Calculate residuals
    const residuals = y.map((yi, i) => {
      const predicted = beta.reduce((sum, b, j) => sum + XStd[i][j] * b, 0);
      return yi - predicted;
    });

    return { coefficients: beta, residuals };
  }

  static simulateRandomForestOnResiduals(residuals: number[], features: number[][], nEstimators: number, daysAhead: number): number[] {
    const predictions = [];
    
    for (let tree = 0; tree < nEstimators; tree++) {
      // Bootstrap sample from residuals
      const bootstrapIndices = Array.from({ length: residuals.length }, () => 
        Math.floor(Math.random() * residuals.length)
      );
      
      const bootstrapResiduals = bootstrapIndices.map(i => residuals[i]);
      const meanResidual = bootstrapResiduals.reduce((sum, r) => sum + r, 0) / bootstrapResiduals.length;
      
      // Add some randomness based on tree depth and time
      const treeFactor = (Math.random() - 0.5) * 0.01 * Math.sqrt(daysAhead);
      const prediction = meanResidual + treeFactor;
      
      predictions.push(prediction);
    }
    
    return predictions;
  }

  static generatePredictions(stockData: StockData[], forecastDays: number, modelParams: ModelParams): Prediction[] {
    if (stockData.length === 0) return [];

    const predictions: Prediction[] = [];
    
    // Step 1: Create enhanced feature matrix
    const features = this.createFeatureMatrix(stockData);
    const targets = stockData.slice(-60).map(d => d.close);
    
    // Step 2: Apply Lasso regression
    const { coefficients, residuals } = this.lassoRegression(features, targets, modelParams.lasso_penalty);
    
    const lastPrice = stockData[stockData.length - 1].close;
    const lastDate = new Date(stockData[stockData.length - 1].date);

    console.log('RERF: Starting forecasts from last price:', lastPrice);

    // Calculate average daily change for trend continuation
    const recentPrices = stockData.slice(-10).map(d => d.close);
    const avgDailyChange = recentPrices.length > 1 ? 
      (recentPrices[recentPrices.length - 1] - recentPrices[0]) / (recentPrices.length - 1) : 0;

    // Step 3-5: RERF predictions starting from actual last price
    let currentPrice = lastPrice;
    let predictionCount = 0;
    let predictionDate = new Date(lastDate);

    while (predictionCount < forecastDays) {
      // Advance prediction date by 1 day
      predictionDate.setDate(predictionDate.getDate() + 1);

      // Skip if Saturday (6) or Sunday (0)
      const dayOfWeek = predictionDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue;
      }

      const daysAhead = predictionCount + 1;

      // Calculate small incremental change based on trend and volatility
      const trendComponent = avgDailyChange * 0.3; // Reduced trend impact
      const volatilityComponent = (Math.random() - 0.5) * lastPrice * 0.02; // 2% max daily volatility
      const timeDecay = Math.exp(-daysAhead * 0.05); // Reduce prediction confidence over time
      
      // Step 3: Build RF on residuals (nonparametric component)
      const rfResidualPredictions = this.simulateRandomForestOnResiduals(
        residuals, 
        features, 
        modelParams.n_estimators, 
        daysAhead
      );
      
      const meanRfResidual = rfResidualPredictions.reduce((sum, pred) => sum + pred, 0) / rfResidualPredictions.length;
      
      // Combine components for incremental change
      const dailyChange = (trendComponent + volatilityComponent * timeDecay + meanRfResidual * 0.1);
      currentPrice = currentPrice + dailyChange;

      // Calculate confidence intervals based on RF residual variance and *aggressive* time scaling
      const variance = rfResidualPredictions.reduce((sum, pred) => sum + Math.pow(pred - meanRfResidual, 2), 0) / rfResidualPredictions.length;

      // AGGRESSIVE time scaling
      const stdDev = Math.sqrt(variance) * Math.pow(daysAhead, 1.5);

      const confidenceInterval = 1.96 * stdDev; // 95% confidence

      const trend = currentPrice > lastPrice ? 'up' : currentPrice < lastPrice ? 'down' : 'neutral';

      predictions.push({
        date: predictionDate.toISOString().split('T')[0],
        predicted_price: Number(currentPrice.toFixed(2)),
        confidence_interval_lower: Number((currentPrice - confidenceInterval).toFixed(2)),
        confidence_interval_upper: Number((currentPrice + confidenceInterval).toFixed(2)),
        trend
      });

      predictionCount += 1;
    }

    console.log('RERF: First prediction:', predictions[0]);
    console.log('RERF: Forecast range:', predictions[0]?.predicted_price, 'to', predictions[predictions.length - 1]?.predicted_price);

    return predictions;
  }
}
