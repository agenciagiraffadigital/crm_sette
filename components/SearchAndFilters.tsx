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
      <Card variant="outlined" padding="md">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">
            {title}
          </h2>
          
          <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
            {/* Search Input with Debounce */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
              <Input
                type="text"
                placeholder="Buscar por nome, email ou ID..."
                className="pl-9 w-full md:w-64"
                defaultValue={filters.searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>

            {/* Quick Filters */}
            <div className="flex gap-2">
              {/* Operator Filter */}
              <div className="relative">
                <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                <Select
                  className="pl-9 w-full md:w-40"
                  value={filters.operators.length === 1 ? filters.operators[0] : 'all'}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateFilter('operators', value === 'all' ? [] : [value]);
                  }}
                  options={operatorOptions}
                />
              </div>
              
              {/* Seller Filter (Admin Only) */}
              {showSellerFilter && (
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                  <Select
                    className="pl-9 w-full md:w-48"
                    value={filters.sellers.length === 1 ? filters.sellers[0] : 'all'}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateFilter('sellers', value === 'all' ? [] : [value]);
                    }}
                    options={sellerOptions}
                  />
                </div>
              )}

              {/* Advanced Filters Toggle */}
              <Button
                variant="outline"
                size="md"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`relative ${activeFiltersCount > 0 ? 'bg-blue-50 border-blue-300' : ''}`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtros
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <div className="space-y-2">
                  {statusOptions.map(status => (
                    <label key={status} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.status.includes(status)}
                        onChange={(e) => updateArrayFilter('status', status, e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm">{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Source Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Origem</label>
                <div className="space-y-2">
                  {sourceOptions.map(source => (
                    <label key={source} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.source.includes(source)}
                        onChange={(e) => updateArrayFilter('source', source, e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm">{source}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Período
                </label>
                <div className="space-y-2">
                  <Input
                    type="date"
                    placeholder="Data inicial"
                    value={filters.dateRange.start || ''}
                    onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, start: e.target.value })}
                  />
                  <Input
                    type="date"
                    placeholder="Data final"
                    value={filters.dateRange.end || ''}
                    onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, end: e.target.value })}
                  />
                </div>
              </div>

              {/* Value Range Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Valor
                </label>
                <div className="space-y-2">
                  <Input
                    type="number"
                    placeholder="Valor mínimo"
                    value={filters.valueRange.min || ''}
                    onChange={(e) => updateFilter('valueRange', { 
                      ...filters.valueRange, 
                      min: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                  />
                  <Input
                    type="number"
                    placeholder="Valor máximo"
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
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                disabled={activeFiltersCount === 0}
              >
                <X className="w-4 h-4 mr-1" />
                Limpar Filtros
              </Button>

              {onSaveFilter && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveDialog(true)}
                  disabled={activeFiltersCount === 0}
                >
                  <Save className="w-4 h-4 mr-1" />
                  Salvar Filtro
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Saved Filters */}
      {savedFilters.length > 0 && (
        <Card variant="outlined" padding="sm">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-slate-700">Filtros Salvos</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {savedFilters.map(savedFilter => (
              <div key={savedFilter.id} className="flex items-center gap-1 bg-slate-100 rounded-md px-2 py-1">
                <button
                  onClick={() => onLoadFilter?.(savedFilter)}
                  className="text-sm text-slate-700 hover:text-blue-600"
                >
                  {savedFilter.name}
                </button>
                {onDeleteFilter && (
                  <button
                    onClick={() => onDeleteFilter(savedFilter.id)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Save Filter Dialog */}
      {showSaveDialog && (
        <Card variant="elevated" padding="md" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Salvar Filtro</h3>
            <Input
              type="text"
              placeholder="Nome do filtro"
              value={saveFilterName}
              onChange={(e) => setSaveFilterName(e.target.value)}
              className="mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveFilterName('');
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveFilter}
                disabled={!saveFilterName.trim()}
              >
                Salvar
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};