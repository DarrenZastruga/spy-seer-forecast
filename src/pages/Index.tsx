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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [forecastDays, setForecastDays] = useState([30]);
  const [modelParams, setModelParams] = useState<ModelParams>({
    n_estimators: 100,
    max_depth: 10,
    min_samples_split: 5,
    min_samples_leaf: 2,
    regression_weight: 0.3,
    feature_importance_threshold: 0.01,
    lasso_penalty: 0.1,
  });
  const [symbolInput, setSymbolInput] = useState('');

  const { toast } = useToast();
  const {
    stockSymbol,
    setStockSymbol,
    stockData,
    currentPrice,
    dataSource,
    isLoading,
    handleFetchStockData,
  } = useStockData();

  const handleGeneratePredictions = useCallback(() => {
    if (stockData.length === 0) return;
    const days = forecastDays[0];
    const newPredictions = PredictionService.generatePredictions(
      stockData,
      days,
      modelParams
    );
    setPredictions(newPredictions);

  }, [stockData, forecastDays, modelParams, toast, stockSymbol]);

  const handleParamsOptimized = (optimizedParams: ModelParams) => {
    setModelParams(optimizedParams);
    toast({
      title: 'Parameters Updated',
      description: 'Model will use optimized parameters for future predictions',
    });
  };

  const handleExportCSV = () => {
    exportPredictionsToCSV(
      predictions,
      modelParams,
      forecastDays[0],
      currentPrice
    );
    toast({
      title: 'Export Complete',
      description: 'Predictions and parameters exported to CSV',
    });
  };

  // Fetch on load
  useEffect(() => {
    handleFetchStockData();
  }, [handleFetchStockData]);

  // Generate predictions when new data/model/forecast is ready
  useEffect(() => {
    if (stockData.length > 0) {
      handleGeneratePredictions();
    }
  }, [stockData, forecastDays, modelParams, handleGeneratePredictions]);

  // When stockSymbol is updated, fetch new data
  useEffect(() => {
    if (stockSymbol) {
      handleFetchStockData(stockSymbol);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockSymbol]);

  // Handler for submitting new symbol
  const handleSymbolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const symbol = symbolInput.trim().toUpperCase();
    if (!symbol) {
      toast({
        title: "Please enter a valid stock symbol.",
        variant: "destructive",
      });
      return;
    }
    setStockSymbol(symbol);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <form
          onSubmit={handleSymbolSubmit}
          className="flex gap-4 items-center bg-slate-800/60 rounded-lg p-4 mb-4 border border-slate-700"
        >
          <label htmlFor="symbol-input" className="text-lg text-slate-300 font-semibold">
            Stock Symbol:
          </label>
          <Input
            id="symbol-input"
            type="text"
            value={symbolInput}
            placeholder={stockSymbol}
            onChange={(e) => setSymbolInput(e.target.value)}
            className="bg-slate-900 border-slate-700 w-32 text-white text-lg"
            autoComplete="off"
            maxLength={8}
          />
          <Button
            type="submit"
            variant="secondary"
            className="px-5"
            disabled={isLoading}
          >
            Load
          </Button>
          <span className="text-slate-400 text-xs pl-2">
            (e.g. AAPL, TSLA, GOOGL)
          </span>
        </form>
        <AppHeader currentPrice={currentPrice} dataSource={dataSource} stockSymbol={stockSymbol} />

        <ForecastControls
          forecastDays={forecastDays}
          setForecastDays={setForecastDays}
          onGeneratePredictions={handleGeneratePredictions}
          onExportCSV={handleExportCSV}
          onRefreshData={() => handleFetchStockData(stockSymbol)}
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
          stockSymbol={stockSymbol}
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
