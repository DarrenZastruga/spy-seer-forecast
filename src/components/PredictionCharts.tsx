import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Activity } from 'lucide-react';
import { StockData, Prediction, ModelParams } from '@/types/stock';

interface PredictionChartsProps {
  stockData: StockData[];
  predictions: Prediction[];
  modelParams: ModelParams;
}

export const PredictionCharts: React.FC<PredictionChartsProps> = ({
  stockData,
  predictions,
  modelParams
}) => {
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

  // Calculate Y-axis domain to center the data
  const calculateYDomain = (data: any[]) => {
    const values = data.flatMap(item => [
      item.actual,
      item.predicted,
      item.lower,
      item.upper
    ]).filter(val => val !== undefined && val !== null);
    
    if (values.length === 0) return [0, 100];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const padding = range * 0.15; // 15% padding on each side
    
    return [min - padding, max + padding];
  };

  const yDomain = calculateYDomain(chartData);
  const confidenceDomain = calculateYDomain(chartData.filter(d => d.type === 'prediction'));

  return (
    <Tabs defaultValue="price" className="space-y-4">
      <TabsList className="bg-slate-800 border-slate-700">
        <TabsTrigger value="price" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-300">Price Chart</TabsTrigger>
        <TabsTrigger value="confidence" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-300">Confidence Bands</TabsTrigger>
        <TabsTrigger value="parameters" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-300">Model Parameters</TabsTrigger>
      </TabsList>

      <TabsContent value="price">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-slate-100">
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
                  <YAxis 
                    stroke="#9CA3AF" 
                    domain={yDomain}
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                  />
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
            <CardTitle className="text-slate-100">Confidence Intervals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.filter(d => d.type === 'prediction')}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis 
                    stroke="#9CA3AF" 
                    domain={confidenceDomain}
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                  />
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
            <CardTitle className="text-slate-100">RERF Model Parameters</CardTitle>
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
  );
};
