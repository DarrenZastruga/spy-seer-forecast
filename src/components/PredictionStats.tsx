
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, BarChart3, Activity, Calendar } from 'lucide-react';
import { Prediction } from '@/types/stock';

interface PredictionStatsProps {
  predictions: Prediction[];
  forecastDays: number;
}

export const PredictionStats: React.FC<PredictionStatsProps> = ({
  predictions,
  forecastDays
}) => {
  if (predictions.length === 0) return null;

  return (
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
              <p className="text-2xl font-bold text-white">{forecastDays}</p>
            </div>
            <Calendar className="w-8 h-8 text-amber-400" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
