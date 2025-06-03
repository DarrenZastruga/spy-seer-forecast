
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { TrendingUp, Download, BarChart3, RefreshCw } from 'lucide-react';

interface ForecastControlsProps {
  forecastDays: number[];
  setForecastDays: (days: number[]) => void;
  onGeneratePredictions: () => void;
  onExportCSV: () => void;
  onRefreshData: () => void;
  stockDataLength: number;
  predictionsLength: number;
  isLoading: boolean;
}

export const ForecastControls: React.FC<ForecastControlsProps> = ({
  forecastDays,
  setForecastDays,
  onGeneratePredictions,
  onExportCSV,
  onRefreshData,
  stockDataLength,
  predictionsLength,
  isLoading
}) => {
  return (
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
              onClick={onRefreshData}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Refresh Data
            </Button>
            <Button
              onClick={onGeneratePredictions}
              disabled={stockDataLength === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Generate Forecast
            </Button>
            <Button
              onClick={onExportCSV}
              disabled={predictionsLength === 0}
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
  );
};
