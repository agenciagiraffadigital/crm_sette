import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricChange {
  value: number;
  type: 'increase' | 'decrease' | 'neutral';
  period: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: MetricChange;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  color,
  loading = false,
}) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString('pt-BR');
    }
    return val;
  };

  const getTrendIcon = () => {
    if (!change) return null;
    
    switch (change.type) {
      case 'increase':
        return <TrendingUp className="w-4 h-4" />;
      case 'decrease':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getTrendColor = () => {
    if (!change) return '';
    
    switch (change.type) {
      case 'increase':
        return 'text-emerald-600 bg-emerald-50';
      case 'decrease':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-full ${color} animate-pulse`}>
            <div className="w-6 h-6 bg-white/30 rounded"></div>
          </div>
          <div className="flex-1">
            <div className="h-4 bg-slate-200 rounded animate-pulse mb-2"></div>
            <div className="h-8 bg-slate-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex items-center space-x-4">
        <div className={`p-3 rounded-full ${color}`}>
          <div className="w-6 h-6 text-white">
            {icon}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{formatValue(value)}</p>
          
          {change && (
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mt-2 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span>{Math.abs(change.value)}%</span>
              <span className="text-slate-500">vs {change.period}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};