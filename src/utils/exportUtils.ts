
import * as Papa from 'papaparse';
import { Prediction, ModelParams } from '@/types/stock';

export const exportPredictionsToCSV = (
  predictions: Prediction[],
  modelParams: ModelParams,
  forecastDays: number,
  currentPrice: number | null
) => {
  const exportData = [
    {
      type: 'Model Parameters',
      n_estimators: modelParams.n_estimators,
      max_depth: modelParams.max_depth,
      min_samples_split: modelParams.min_samples_split,
      min_samples_leaf: modelParams.min_samples_leaf,
      regression_weight: modelParams.regression_weight,
      feature_importance_threshold: modelParams.feature_importance_threshold,
      forecast_days: forecastDays,
      current_price: currentPrice,
      export_date: new Date().toISOString()
    },
    ...predictions.map(pred => ({
      type: 'Prediction',
      date: pred.date,
      predicted_price: pred.predicted_price,
      confidence_lower: pred.confidence_interval_lower,
      confidence_upper: pred.confidence_interval_upper,
      trend: pred.trend
    }))
  ];

  const csv = Papa.unparse(exportData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `spy_predictions_${new Date().toISOString().split('T')[0]}.csv`);
  link.click();
};
