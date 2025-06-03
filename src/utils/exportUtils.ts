
import * as Papa from 'papaparse';
import { Prediction, ModelParams } from '@/types/stock';

export const exportPredictionsToCSV = (
  predictions: Prediction[],
  modelParams: ModelParams,
  forecastDays: number,
  currentPrice: number | null
) => {
  // Create model parameters section
  const modelParamsData = {
    type: 'RERF Model Parameters',
    date: '',
    predicted_price: '',
    confidence_lower: '',
    confidence_upper: '',
    trend: '',
    n_estimators: modelParams.n_estimators,
    max_depth: modelParams.max_depth,
    min_samples_split: modelParams.min_samples_split,
    min_samples_leaf: modelParams.min_samples_leaf,
    regression_weight: modelParams.regression_weight,
    feature_importance_threshold: modelParams.feature_importance_threshold,
    lasso_penalty: modelParams.lasso_penalty,
    forecast_days: forecastDays,
    current_price: currentPrice || '',
    export_date: new Date().toISOString().split('T')[0]
  };

  // Create prediction data with consistent structure
  const predictionData = predictions.map(pred => ({
    type: 'Prediction',
    date: pred.date,
    predicted_price: pred.predicted_price,
    confidence_lower: pred.confidence_interval_lower,
    confidence_upper: pred.confidence_interval_upper,
    trend: pred.trend,
    n_estimators: '',
    max_depth: '',
    min_samples_split: '',
    min_samples_leaf: '',
    regression_weight: '',
    feature_importance_threshold: '',
    lasso_penalty: '',
    forecast_days: '',
    current_price: '',
    export_date: ''
  }));

  // Combine all data
  const exportData = [modelParamsData, ...predictionData];

  console.log('RERF Export data structure:', exportData);
  console.log('First prediction:', exportData[1]);

  const csv = Papa.unparse(exportData, {
    header: true,
    skipEmptyLines: false
  });

  console.log('Generated RERF CSV preview:', csv.substring(0, 500));

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `spy_rerf_predictions_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
