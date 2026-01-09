import React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'custom';

interface DashboardLayoutProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  children: React.ReactNode;
}

const timeRangeOptions = [
  { value: '7d' as const, label: 'Últimos 7 dias' },
  { value: '30d' as const, label: 'Últimos 30 dias' },
  { value: '90d' as const, label: 'Últimos 90 dias' },
  { value: '1y' as const, label: 'Último ano' },
  { value: 'custom' as const, label: 'Período personalizado' },
];

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  timeRange,
  onTimeRangeChange,
  children,
}) => {
  const currentOption = timeRangeOptions.find(opt => opt.value === timeRange);

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Dashboard Analítico</h1>
          <p className="text-slate-600 mt-1">Visão completa da performance e métricas do sistema</p>
        </div>
        
        <div className="relative">
          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value as TimeRange)}
            className="appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {timeRangeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
};