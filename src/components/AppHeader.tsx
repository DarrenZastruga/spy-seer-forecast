
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface AppHeaderProps {
  currentPrice: number | null;
  dataSource: 'yahoo' | 'mock';
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentPrice,
  dataSource
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
          SPY Price Predictor
        </h1>
        <p className="text-slate-400">Advanced RERF Model for Financial Forecasting</p>
        <div className="flex items-center space-x-4">
          {dataSource === 'yahoo' ? (
            <p className="text-xs text-green-400 flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              Connected to Yahoo Finance API - Real SPY data
            </p>
          ) : (
            <p className="text-xs text-amber-400 flex items-center">
              <span className="w-2 h-2 bg-amber-400 rounded-full mr-2"></span>
              Using simulated data - Yahoo Finance unavailable
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-4">
        {currentPrice && (
          <Badge variant="outline" className={`px-4 py-2 text-lg ${
            dataSource === 'yahoo' 
              ? 'border-green-500 text-green-400' 
              : 'border-amber-500 text-amber-400'
          }`}>
            Current: ${currentPrice.toFixed(2)}
          </Badge>
        )}
      </div>
    </div>
  );
};
