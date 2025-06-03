
export interface StockData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose: number;
}

export interface Prediction {
  date: string;
  predicted_price: number;
  confidence_interval_lower: number;
  confidence_interval_upper: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface ModelParams {
  n_estimators: number;
  max_depth: number;
  min_samples_split: number;
  min_samples_leaf: number;
  regression_weight: number;
  feature_importance_threshold: number;
  lasso_penalty: number;
}
