
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface AppHeaderProps {
  currentPrice: number | null;
  dataSource: 'yahoo' | 'mock';
  stockSymbol: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentPrice,
  dataSource,
  stockSymbol
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <p className="text-xl sm:text-2xl font-semibold text-slate-200">
          Advanced Regression-Enhanced Random Forest (RERF) Model for Financial Forecasting.
        </p>
        <div className="flex items-center space-x-4">
          <span className="text-xs text-slate-400">
            Symbol: <span className="font-semibold">{stockSymbol.toUpperCase()}</span>
          </span>
          {dataSource === 'yahoo' ? (
            <p className="text-xs text-green-400 flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              Connected to Yahoo Finance API - Real {stockSymbol.toUpperCase()} data
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
