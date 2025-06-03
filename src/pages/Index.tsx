
import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useStockData } from '@/hooks/useStockData';
import { StockData, Prediction, ModelParams } from '@/types/stock';
import { PredictionService } from '@/services/predictionService';
import { exportPredictionsToCSV } from '@/utils/exportUtils';
import { AppHeader } from '@/components/AppHeader';
import { PredictionCharts } from '@/components/PredictionCharts';
import { ForecastControls } from '@/components/ForecastControls';
import { PredictionStats } from '@/components/PredictionStats';
import { ParameterOptimizer } from '@/components/ParameterOptimizer';

const Index = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [forecastDays, setForecastDays] = useState([30]);
  const [modelParams, setModelParams] = useState<ModelParams>({
    n_estimators: 100,
    max_depth: 10,
    min_samples_split: 5,
    min_samples_leaf: 2,
    regression_weight: 0.3,
    feature_importance_threshold: 0.01
  });

  const { toast } = useToast();
  const {
    stockData,
    currentPrice,
    dataSource,
    isLoading,
    handleFetchStockData
  } = useStockData();

  const handleGeneratePredictions = useCallback(() => {
    if (stockData.length === 0) return;

    const days = forecastDays[0];
    const newPredictions = PredictionService.generatePredictions(stockData, days, modelParams);
    setPredictions(newPredictions);
    
    toast({
      title: "Predictions Generated",
      description: `RERF model forecasts for ${days} days completed`,
    });
  }, [stockData, forecastDays, modelParams, toast]);

  const handleParamsOptimized = (optimizedParams: ModelParams) => {
    setModelParams(optimizedParams);
    toast({
      title: "Parameters Updated",
      description: "Model will use optimized parameters for future predictions",
    });
  };

  const handleExportCSV = () => {
    exportPredictionsToCSV(predictions, modelParams, forecastDays[0], currentPrice);
    toast({
      title: "Export Complete",
      description: "Predictions and parameters exported to CSV",
    });
  };

  useEffect(() => {
    handleFetchStockData();
  }, [handleFetchStockData]);

  useEffect(() => {
    if (stockData.length > 0) {
      handleGeneratePredictions();
    }
  }, [stockData, forecastDays, modelParams, handleGeneratePredictions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <AppHeader currentPrice={currentPrice} dataSource={dataSource} />

        <ForecastControls
          forecastDays={forecastDays}
          setForecastDays={setForecastDays}
          onGeneratePredictions={handleGeneratePredictions}
          onExportCSV={handleExportCSV}
          onRefreshData={handleFetchStockData}
          stockDataLength={stockData.length}
          predictionsLength={predictions.length}
          isLoading={isLoading}
        />

        <ParameterOptimizer
          stockData={stockData}
          currentParams={modelParams}
          onParamsOptimized={handleParamsOptimized}
        />

        <PredictionCharts
          stockData={stockData}
          predictions={predictions}
          modelParams={modelParams}
        />

        <PredictionStats
          predictions={predictions}
          forecastDays={forecastDays[0]}
        />
      </div>
    </div>
  );
};

export default Index;
