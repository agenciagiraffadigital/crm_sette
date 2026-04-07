import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Target,
  Clock,
  DollarSign,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { DashboardLayout, TimeRange } from './DashboardLayout';
import { MetricCard } from './MetricCard';
import { InteractiveChart, ChartData } from './InteractiveChart';
import { dashboardService, DashboardMetrics } from '../../services/dashboardService';
import { User } from '../../types';

interface EnhancedDashboardProps {
  currentUser: User;
}

export const EnhancedDashboard: React.FC<EnhancedDashboardProps> = ({ currentUser }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Check access control - redirect sellers
  useEffect(() => {
    if (!dashboardService.checkDashboardAccess(currentUser)) {
      dashboardService.redirectSellersToOpportunities();
      return;
    }
  }, [currentUser]);

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!dashboardService.checkDashboardAccess(currentUser)) return;
      
      try {
        setLoading(true);
        const data = await dashboardService.getDashboardMetrics(currentUser, timeRange);
        setMetrics(data);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [timeRange]); // Only reload when timeRange changes

  // Handle chart interactions
  const handleChartClick = (data: ChartData) => {
    console.log('Chart clicked:', data);
    // Implement drill-down functionality here
  };

  if (!dashboardService.checkDashboardAccess(currentUser)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
          <p className="text-slate-600">Redirecionando para a página de oportunidades...</p>
        </div>
      </div>
    );
  }

  if (loading || !metrics) {
    return (
      <DashboardLayout timeRange={timeRange} onTimeRangeChange={setTimeRange}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <MetricCard
              key={i}
              title=""
              value=""
              icon={<div />}
              color="bg-slate-400"
              loading={true}
            />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  // Prepare chart data
  const opportunityStatusData: ChartData[] = Object.entries(metrics.opportunities.byStatus).map(([status, count]) => ({
    name: status,
    value: count,
  }));

  const proposalStatusData: ChartData[] = Object.entries(metrics.proposals.byStatus)
    .filter(([status]) => ['ENVIADA', 'ANÁLISE', 'ANÁLISE_OPERADORA', 'IMPLANTADA', 'CANCELADA', 'PERDIDA'].includes(status))
    .map(([status, count]) => ({
      name: status,
      value: count,
    }));

  const sellerPerformanceData: ChartData[] = metrics.sellers.performance
    .slice(0, 10) // Top 10 sellers
    .map(seller => ({
      name: seller.seller_name,
      value: seller.conversion_rate,
      opportunities: seller.opportunities_assigned,
      converted: seller.opportunities_converted,
    }));

  return (
    <DashboardLayout timeRange={timeRange} onTimeRangeChange={setTimeRange}>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total de Leads"
          value={metrics.proposals.total}
          icon={<Target className="w-6 h-6" />}
          color="bg-blue-500"
        />
        
        <MetricCard
          title="Taxa de Conversão"
          value={`${metrics.proposals.conversionRate.toFixed(1)}%`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="bg-emerald-500"
        />
        
        <MetricCard
          title="Em Análise"
          value={metrics.proposals.byStatus.ANÁLISE || 0}
          icon={<Clock className="w-6 h-6" />}
          color="bg-amber-500"
        />
        
        <MetricCard
          title="Perdidos"
          value={metrics.proposals.byStatus.PERDIDA || 0}
          icon={<XCircle className="w-6 h-6" />}
          color="bg-red-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InteractiveChart
          title="Funil de Oportunidades"
          data={opportunityStatusData}
          type="bar"
          onDataPointClick={handleChartClick}
          colors={['#3b82f6', '#10b981', '#f59e0b']}
        />
        
        <InteractiveChart
          title="Status das Propostas"
          data={proposalStatusData}
          type="pie"
          onDataPointClick={handleChartClick}
          colors={['#06b6d4', '#f59e0b', '#10b981', '#ef4444']}
        />
      </div>

      {/* Hidden sections for future use */}
      <div className="hidden">
        {/* Secondary KPIs - Hidden */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total de Propostas"
            value={metrics.proposals.total}
            icon={<FileText className="w-6 h-6" />}
            color="bg-amber-500"
          />
          
          <MetricCard
            title="Tempo Médio p/ Contato"
            value={`${metrics.opportunities.averageTimeToContact.toFixed(1)}h`}
            icon={<Clock className="w-6 h-6" />}
            color="bg-cyan-500"
          />
          
          <MetricCard
            title="Tempo Médio p/ Cotação"
            value={`${metrics.opportunities.averageTimeToQuote.toFixed(1)}h`}
            icon={<Clock className="w-6 h-6" />}
            color="bg-indigo-500"
          />
          
          <MetricCard
            title="Propostas Canceladas"
            value={(metrics.proposals.byStatus.CANCELADA || 0)}
            icon={<XCircle className="w-6 h-6" />}
            color="bg-red-500"
          />
        </div>

        {/* Performance Charts - Hidden */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InteractiveChart
            title="Performance dos Vendedores (Taxa de Conversão %)"
            data={sellerPerformanceData}
            type="bar"
            onDataPointClick={handleChartClick}
            colors={['#8b5cf6']}
            height={400}
          />
          
          <InteractiveChart
            title="Tendência de Conversão"
            data={metrics.trends.conversionRates}
            type="line"
            onDataPointClick={handleChartClick}
            colors={['#10b981']}
            height={400}
          />
        </div>

        {/* Trends Section - Hidden */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InteractiveChart
            title="Oportunidades ao Longo do Tempo"
            data={metrics.trends.opportunitiesOverTime}
            type="area"
            onDataPointClick={handleChartClick}
            colors={['#3b82f6']}
            height={300}
          />
          
          <InteractiveChart
            title="Propostas ao Longo do Tempo"
            data={metrics.trends.proposalsOverTime}
            type="area"
            onDataPointClick={handleChartClick}
            colors={['#10b981']}
            height={300}
          />
        </div>

        {/* Seller Leaderboard - Hidden */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Ranking dos Vendedores
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Posição</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Vendedor</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Oportunidades</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Convertidas</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Taxa de Conversão</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {metrics.sellers.leaderboard.slice(0, 10).map((seller, index) => {
                  const performance = metrics.sellers.performance.find(p => p.seller_id === seller.seller_id);
                  return (
                    <tr key={seller.seller_id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          index === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {seller.rank}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{seller.seller_name}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{performance?.opportunities_assigned || 0}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{performance?.opportunities_converted || 0}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-emerald-600 font-medium">
                          {performance?.conversion_rate.toFixed(1) || 0}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        R$ {(performance?.total_value || 0).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};