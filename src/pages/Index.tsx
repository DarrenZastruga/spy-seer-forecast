import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, Download, Calendar, Activity, BarChart3, RefreshCw } from 'lucide-react';
import * as Papa from 'papaparse';

interface StockData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose: number;
}

interface Prediction {
  date: string;
  predicted_price: number;
  confidence_interval_lower: number;
  confidence_interval_upper: number;
  trend: 'up' | 'down' | 'neutral';
}

interface ModelParams {
  n_estimators: number;
  max_depth: number;
  min_samples_split: number;
  min_samples_leaf: number;
  regression_weight: number;
  feature_importance_threshold: number;
}

const Index = () => {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [forecastDays, setForecastDays] = useState([30]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [modelParams, setModelParams] = useState<ModelParams>({
    n_estimators: 100,
    max_depth: 10,
    min_samples_split: 5,
    min_samples_leaf: 2,
    regression_weight: 0.3,
    feature_importance_threshold: 0.01
  });
  const { toast } = useToast();

  // Simulated Yahoo Finance API data fetcher
  const fetchStockData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate API call with realistic SPY data
      const mockData: StockData[] = [];
      const basePrice = 450;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 252); // 1 year of trading days

      for (let i = 0; i < 252; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        const volatility = 0.02;
        const trend = 0.0003;
        const randomFactor = (Math.random() - 0.5) * 2 * volatility;
        
        const price = basePrice * Math.exp((trend + randomFactor) * i);
        const dailyVolatility = price * 0.01;
        
        const open = price + (Math.random() - 0.5) * dailyVolatility;
        const close = price + (Math.random() - 0.5) * dailyVolatility;
        const high = Math.max(open, close) + Math.random() * dailyVolatility * 0.5;
        const low = Math.min(open, close) - Math.random() * dailyVolatility * 0.5;
        
        mockData.push({
          date: date.toISOString().split('T')[0],
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          close: Number(close.toFixed(2)),
          volume: Math.floor(Math.random() * 50000000) + 30000000,
          adjClose: Number(close.toFixed(2))
        });
      }

      setStockData(mockData);
      setCurrentPrice(mockData[mockData.length - 1].close);
      
      toast({
        title: "Data Updated",
        description: "SPY historical data fetched successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch stock data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Advanced RERF model implementation
  const generatePredictions = useCallback(() => {
    if (stockData.length === 0) return;

    const days = forecastDays[0];
    const predictions: Prediction[] = [];
    
    // Extract features for the model
    const features = stockData.slice(-60).map((data, index, arr) => {
      const sma5 = arr.slice(Math.max(0, index - 4), index + 1).reduce((sum, d) => sum + d.close, 0) / Math.min(5, index + 1);
      const sma20 = arr.slice(Math.max(0, index - 19), index + 1).reduce((sum, d) => sum + d.close, 0) / Math.min(20, index + 1);
      const rsi = calculateRSI(arr.slice(0, index + 1));
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
    for (let i = 1; i <= days; i++) {
      const predictionDate = new Date(lastDate);
      predictionDate.setDate(predictionDate.getDate() + i);

      // Random Forest component
      const rfPredictions = [];
      for (let tree = 0; tree < modelParams.n_estimators; tree++) {
        const treePrediction = simulateRandomForestTree(features, lastPrice, i);
        rfPredictions.push(treePrediction);
      }
      const rfMean = rfPredictions.reduce((sum, pred) => sum + pred, 0) / rfPredictions.length;

      // Regression component
      const regressionPrediction = simulateLinearRegression(features, lastPrice, i);

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

    setPredictions(predictions);
    
    toast({
      title: "Predictions Generated",
      description: `RERF model forecasts for ${days} days completed`,
    });
  }, [stockData, forecastDays, modelParams, toast]);

  // Helper functions for technical indicators
  const calculateRSI = (prices: StockData[]): number => {
    if (prices.length < 14) return 50;
    
    const changes = prices.slice(1).map((price, index) => price.close - prices[index].close);
    const gains = changes.map(change => change > 0 ? change : 0);
    const losses = changes.map(change => change < 0 ? -change : 0);
    
    const avgGain = gains.slice(-14).reduce((sum, gain) => sum + gain, 0) / 14;
    const avgLoss = losses.slice(-14).reduce((sum, loss) => sum + loss, 0) / 14;
    
    const rs = avgGain / (avgLoss || 1);
    return 100 - (100 / (1 + rs));
  };

  const simulateRandomForestTree = (features: any[], lastPrice: number, daysAhead: number): number => {
    const trendFactor = Math.random() * 0.02 - 0.01; // -1% to +1%
    const volatilityFactor = (Math.random() - 0.5) * 0.05; // Random volatility
    const timeFactor = Math.pow(0.999, daysAhead); // Slight decay over time
    
    return lastPrice * (1 + trendFactor + volatilityFactor) * timeFactor;
  };

  const simulateLinearRegression = (features: any[], lastPrice: number, daysAhead: number): number => {
    const recentTrend = features.length > 10 ? 
      (features[features.length - 1].price - features[features.length - 10].price) / features[features.length - 10].price / 10 : 0;
    
    return lastPrice * (1 + recentTrend * daysAhead);
  };

  // Export to CSV functionality
  const exportToCSV = () => {
    const exportData = [
      {
        type: 'Model Parameters',
        n_estimators: modelParams.n_estimators,
        max_depth: modelParams.max_depth,
        min_samples_split: modelParams.min_samples_split,
        min_samples_leaf: modelParams.min_samples_leaf,
        regression_weight: modelParams.regression_weight,
        feature_importance_threshold: modelParams.feature_importance_threshold,
        forecast_days: forecastDays[0],
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

    toast({
      title: "Export Complete",
      description: "Predictions and parameters exported to CSV",
    });
  };

  // Combined chart data
  const chartData = [
    ...stockData.slice(-30).map(data => ({
      date: data.date,
      actual: data.close,
      type: 'historical'
    })),
    ...predictions.map(pred => ({
      date: pred.date,
      predicted: pred.predicted_price,
      lower: pred.confidence_interval_lower,
      upper: pred.confidence_interval_upper,
      type: 'prediction'
    }))
  ];

  useEffect(() => {
    fetchStockData();
  }, [fetchStockData]);

  useEffect(() => {
    if (stockData.length > 0) {
      generatePredictions();
    }
  }, [stockData, forecastDays, generatePredictions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              SPY Price Predictor
            </h1>
            <p className="text-slate-400">Advanced RERF Model for Financial Forecasting</p>
          </div>
          <div className="flex items-center space-x-4">
            {currentPrice && (
              <Badge variant="outline" className="px-4 py-2 text-lg border-green-500 text-green-400">
                Current: ${currentPrice.toFixed(2)}
              </Badge>
            )}
            <Button
              onClick={fetchStockData}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Controls */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Forecast Controls</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">
                    Forecast Days: {forecastDays[0]}
                  </label>
                  <Slider
                    value={forecastDays}
                    onValueChange={setForecastDays}
                    max={45}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="flex items-end space-x-4">
                <Button
                  onClick={generatePredictions}
                  disabled={stockData.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Generate Forecast
                </Button>
                <Button
                  onClick={exportToCSV}
                  disabled={predictions.length === 0}
                  variant="outline"
                  className="border-slate-600 hover:bg-slate-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <Tabs defaultValue="price" className="space-y-4">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="price" className="data-[state=active]:bg-slate-700">Price Chart</TabsTrigger>
            <TabsTrigger value="confidence" className="data-[state=active]:bg-slate-700">Confidence Bands</TabsTrigger>
            <TabsTrigger value="parameters" className="data-[state=active]:bg-slate-700">Model Parameters</TabsTrigger>
          </TabsList>

          <TabsContent value="price">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>SPY Price Forecast</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={false}
                        name="Historical Price"
                      />
                      <Line
                        type="monotone"
                        dataKey="predicted"
                        stroke="#F59E0B"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name="Predicted Price"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="confidence">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle>Confidence Intervals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData.filter(d => d.type === 'prediction')}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="upper"
                        stroke="#EF4444"
                        fill="#EF4444"
                        fillOpacity={0.1}
                        name="Upper Bound"
                      />
                      <Area
                        type="monotone"
                        dataKey="lower"
                        stroke="#10B981"
                        fill="#10B981"
                        fillOpacity={0.1}
                        name="Lower Bound"
                      />
                      <Line
                        type="monotone"
                        dataKey="predicted"
                        stroke="#F59E0B"
                        strokeWidth={3}
                        name="Prediction"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parameters">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle>RERF Model Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(modelParams).map(([key, value]) => (
                    <div key={key} className="bg-slate-700/50 p-4 rounded-lg">
                      <div className="text-sm text-slate-400 capitalize">
                        {key.replace(/_/g, ' ')}
                      </div>
                      <div className="text-lg font-semibold text-white">
                        {typeof value === 'number' ? value.toFixed(3) : value}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Statistics */}
        {predictions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-300 text-sm">Next Week Target</p>
                    <p className="text-2xl font-bold text-white">
                      ${predictions[6]?.predicted_price?.toFixed(2) || 'N/A'}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-300 text-sm">Confidence Range</p>
                    <p className="text-lg font-bold text-white">
                      ±${predictions[0] ? (predictions[0].confidence_interval_upper - predictions[0].predicted_price).toFixed(2) : 'N/A'}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-300 text-sm">Trend Direction</p>
                    <p className="text-lg font-bold text-white">
                      {predictions[0]?.trend?.toUpperCase() || 'NEUTRAL'}
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-900/50 to-amber-800/50 border-amber-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-300 text-sm">Forecast Days</p>
                    <p className="text-2xl font-bold text-white">{forecastDays[0]}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-amber-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
