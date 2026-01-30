import React, { useState, useCallback, useMemo } from 'react';
import { Search, Filter, Stethoscope, Calendar, DollarSign, Star, X, Save, ArrowUpDown } from 'lucide-react';
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
  products: string[];
  dateRange: DateRange;
  status: string[];
  source: string[];
  valueRange: ValueRange;
  sortBy?: 'name-asc' | 'name-desc' | 'date-desc' | 'date-asc';
}

export const defaultFilters: FilterState = {
  searchTerm: '',
  sellers: [],
  operators: [],
  products: [],
  dateRange: {},
  status: [],
  source: [],
  valueRange: {},
  sortBy: 'date-desc'
};

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
  products: string[];
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
  products,
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
  const [showSortMenu, setShowSortMenu] = useState(false);

  const sortItems = [
    {
      label: 'A-Z',
      icon: filters.sortBy === 'name-asc' ? 'pi pi-check' : 'pi pi-sort-alpha-down',
      command: () => updateFilter('sortBy', 'name-asc')
    },
    {
      label: 'Z-A',
      icon: filters.sortBy === 'name-desc' ? 'pi pi-check' : 'pi pi-sort-alpha-up',
      command: () => updateFilter('sortBy', 'name-desc')
    },
    {
      label: 'Mais recente',
      icon: filters.sortBy === 'date-desc' ? 'pi pi-check' : 'pi pi-sort-amount-down',
      command: () => updateFilter('sortBy', 'date-desc')
    },
    {
      label: 'Mais antiga',
      icon: filters.sortBy === 'date-asc' ? 'pi pi-check' : 'pi pi-sort-amount-up',
      command: () => updateFilter('sortBy', 'date-asc')
    }
  ];

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
      products: [],
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
    if (filters.sellers && filters.sellers.length > 0) count++;
    if (filters.operators && filters.operators.length > 0) count++;
    if (filters.products && filters.products.length > 0) count++;
    if (filters.status && filters.status.length > 0) count++;
    if (filters.source && filters.source.length > 0) count++;
    if (filters.dateRange?.start || filters.dateRange?.end) count++;
    if (filters.valueRange?.min !== undefined || filters.valueRange?.max !== undefined) count++;
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
          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            {/* Sort Button */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className={`h-10 w-10 flex items-center justify-center border rounded-lg transition-colors ${
                  filters.sortBy 
                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' 
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
                title="Ordenar"
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
              {showSortMenu && (
                <div className="absolute top-full mt-1 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[160px]">
                  {sortItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        item.command?.();
                        setShowSortMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 first:rounded-t-lg last:rounded-b-lg"
                    >
                      <span className={item.icon?.includes('check') ? 'text-blue-600' : 'text-slate-400'}>
                        {item.icon?.includes('check') ? '✓' : ''}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Seller Filter (Admin Only) */}
            {showSellerFilter && sellers && sellers.length > 0 && (
              <div className="relative w-full sm:w-auto">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                <select
                  className="h-10 pl-9 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white appearance-none w-full sm:w-auto"
                  value={filters.sellers && filters.sellers.length === 1 ? filters.sellers[0] : 'all'}
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
              className={`relative h-10 px-4 py-2 border rounded-lg text-sm font-medium transition-colors w-full sm:w-auto ${
                activeFiltersCount > 0 
                  ? 'bg-blue-50 border-blue-300 text-blue-700' 
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4 inline mr-2" />
              Filtros Avançados
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status */}
              {statusOptions && statusOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                    value={filters.status && filters.status.length === 1 ? filters.status[0] : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateFilter('status', value ? [value] : []);
                    }}
                  >
                    <option value="">Selecione</option>
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Respostas (desabilitado por hora) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Respostas</label>
                <select disabled className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-100 cursor-not-allowed">
                  <option>Selecione</option>
                </select>
              </div>

              {/* Operadora */}
              {operators && operators.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Operadora</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                    value={filters.operators && filters.operators.length === 1 ? filters.operators[0] : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateFilter('operators', value ? [value] : []);
                    }}
                  >
                    <option value="">Selecione</option>
                    {operators.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Produto */}
              {products && products.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Produto</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                    value={filters.products && filters.products.length === 1 ? filters.products[0] : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateFilter('products', value ? [value] : []);
                    }}
                  >
                    <option value="">Selecione</option>
                    {products.map(prod => (
                      <option key={prod} value={prod}>{prod}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Canal de venda (Origem) */}
              {sourceOptions && sourceOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Canal de venda</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                    value={filters.source && filters.source.length === 1 ? filters.source[0] : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateFilter('source', value ? [value] : []);
                    }}
                  >
                    <option value="">Selecione</option>
                    {sourceOptions.map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Período */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Período</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="date"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={filters.dateRange.start || ''}
                    onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, start: e.target.value })}
                  />
                  <span className="text-slate-500">até</span>
                  <input
                    type="date"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={filters.dateRange.end || ''}
                    onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, end: e.target.value })}
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
                Limpar
              </button>
              <button
                onClick={() => setShowAdvancedFilters(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Filtrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};