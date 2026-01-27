import React, { useState, useCallback, useMemo } from 'react';
import { Search, Filter, Stethoscope, Calendar, DollarSign, Star, X, Save } from 'lucide-react';
import { Card } from '../src/components/ui/Card';
import { Input } from '../src/components/ui/Input';
import { Select } from '../src/components/ui/Select';
import { Button } from '../src/components/ui/Button';

export interface DateRange {
  start?: string;
  end?: string;
}

export interface ValueRange {
  min?: number;
  max?: number;
}

export interface FilterState {
  searchTerm: string;
  sellers: string[];
  operators: string[];
  dateRange: DateRange;
  status: string[];
  source: string[];
  valueRange: ValueRange;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: FilterState;
  createdAt: string;
}

interface SearchAndFiltersProps {
  title: string;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  sellers: string[];
  operators: string[];
  statusOptions: string[];
  sourceOptions: string[];
  showSellerFilter: boolean;
  savedFilters?: SavedFilter[];
  onSaveFilter?: (name: string, filters: FilterState) => void;
  onLoadFilter?: (filter: SavedFilter) => void;
  onDeleteFilter?: (filterId: string) => void;
}

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  title,
  filters,
  onFiltersChange,
  sellers,
  operators,
  statusOptions,
  sourceOptions,
  showSellerFilter,
  savedFilters = [],
  onSaveFilter,
  onLoadFilter,
  onDeleteFilter
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Debounced search handler
  const handleSearchChange = useCallback((value: string) => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    
    const timer = setTimeout(() => {
      onFiltersChange({ ...filters, searchTerm: value });
    }, 300); // 300ms debounce
    
    setSearchDebounceTimer(timer);
  }, [filters, onFiltersChange, searchDebounceTimer]);

  // Filter update helpers
  const updateFilter = useCallback((key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  }, [filters, onFiltersChange]);

  const updateArrayFilter = useCallback((key: keyof FilterState, value: string, checked: boolean) => {
    const currentArray = filters[key] as string[];
    const newArray = checked 
      ? [...currentArray, value]
      : currentArray.filter(item => item !== value);
    updateFilter(key, newArray);
  }, [filters, updateFilter]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    onFiltersChange({
      searchTerm: '',
      sellers: [],
      operators: [],
      dateRange: {},
      status: [],
      source: [],
      valueRange: {}
    });
  }, [onFiltersChange]);

  // Save filter
  const handleSaveFilter = useCallback(() => {
    if (saveFilterName.trim() && onSaveFilter) {
      onSaveFilter(saveFilterName.trim(), filters);
      setSaveFilterName('');
      setShowSaveDialog(false);
    }
  }, [saveFilterName, filters, onSaveFilter]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.sellers.length > 0) count++;
    if (filters.operators.length > 0) count++;
    if (filters.status.length > 0) count++;
    if (filters.source.length > 0) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.valueRange.min !== undefined || filters.valueRange.max !== undefined) count++;
    return count;
  }, [filters]);

  // Options for selects
  const sellerOptions = [
    { value: 'all', label: 'Todos os Vendedores' },
    ...sellers.map(seller => ({ value: seller, label: seller }))
  ];

  const operatorOptions = [
    { value: 'all', label: 'Todas Operadoras' },
    ...operators.map(operator => ({ value: operator, label: operator }))
  ];

  return (
    <div className="space-y-4">
      {/* Filtros Compactos */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou ID..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              defaultValue={filters.searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2">
            {/* Operator Filter */}
            {operators.length > 0 && (
              <div className="relative">
                <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                <select
                  className="pl-9 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white appearance-none"
                  value={filters.operators.length === 1 ? filters.operators[0] : 'all'}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateFilter('operators', value === 'all' ? [] : [value]);
                  }}
                >
                  <option value="all">Todas Operadoras</option>
                  {operators.map(op => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Seller Filter (Admin Only) */}
            {showSellerFilter && sellers.length > 0 && (
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                <select
                  className="pl-9 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white appearance-none"
                  value={filters.sellers.length === 1 ? filters.sellers[0] : 'all'}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateFilter('sellers', value === 'all' ? [] : [value]);
                  }}
                >
                  <option value="all">Todos Vendedores</option>
                  {sellers.map(seller => (
                    <option key={seller} value={seller}>{seller}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`relative px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                activeFiltersCount > 0 
                  ? 'bg-blue-50 border-blue-300 text-blue-700' 
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4 inline mr-2" />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              {statusOptions.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Status</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {statusOptions.map(status => (
                      <label key={status} className="flex items-center cursor-pointer hover:bg-slate-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={filters.status.includes(status)}
                          onChange={(e) => updateArrayFilter('status', status, e.target.checked)}
                          className="mr-2 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">{status}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Source Filter */}
              {sourceOptions.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Origem</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {sourceOptions.map(source => (
                      <label key={source} className="flex items-center cursor-pointer hover:bg-slate-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={filters.source.includes(source)}
                          onChange={(e) => updateArrayFilter('source', source, e.target.checked)}
                          className="mr-2 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">{source}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Date Range Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Período
                </label>
                <div className="space-y-2">
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={filters.dateRange.start || ''}
                    onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, start: e.target.value })}
                  />
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={filters.dateRange.end || ''}
                    onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, end: e.target.value })}
                  />
                </div>
              </div>

              {/* Value Range Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
                  <DollarSign className="w-3 h-3 inline mr-1" />
                  Valor
                </label>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Mínimo"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={filters.valueRange.min || ''}
                    onChange={(e) => updateFilter('valueRange', { 
                      ...filters.valueRange, 
                      min: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                  />
                  <input
                    type="number"
                    placeholder="Máximo"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={filters.valueRange.max || ''}
                    onChange={(e) => updateFilter('valueRange', { 
                      ...filters.valueRange, 
                      max: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                  />
                </div>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
              <button
                onClick={clearAllFilters}
                disabled={activeFiltersCount === 0}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <X className="w-4 h-4 inline mr-1" />
                Limpar Filtros
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};