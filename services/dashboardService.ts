import { Lead, Opportunity, User, KanbanStatus, OpportunityStatus } from '../types';
import { leadService } from './leadService';
import { opportunityService } from './opportunityService';

export interface DashboardMetrics {
  opportunities: {
    total: number;
    byStatus: Record<OpportunityStatus, number>;
    conversionRate: number;
    averageTimeToContact: number;
    averageTimeToQuote: number;
  };
  proposals: {
    total: number;
    byStatus: Record<KanbanStatus, number>;
    conversionRate: number;
    averageValue: number;
  };
  sellers: {
    performance: SellerPerformance[];
    leaderboard: SellerRanking[];
  };
  trends: {
    opportunitiesOverTime: TimeSeriesData[];
    proposalsOverTime: TimeSeriesData[];
    conversionRates: TimeSeriesData[];
  };
}

export interface SellerPerformance {
  seller_id: number;
  seller_name: string;
  opportunities_assigned: number;
  opportunities_contacted: number;
  opportunities_quoted: number;
  opportunities_converted: number;
  proposals_won: number;
  total_value: number;
  conversion_rate: number;
}

export interface SellerRanking {
  seller_id: number;
  seller_name: string;
  score: number;
  rank: number;
}

export interface TimeSeriesData {
  name: string;
  value: number;
  date: string;
}

export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'custom';

export const dashboardService = {
  // Get comprehensive dashboard metrics
  getDashboardMetrics: async (currentUser: User, timeRange: TimeRange = '30d'): Promise<DashboardMetrics> => {
    const [opportunities, leads, canceledLeads] = await Promise.all([
      opportunityService.getOpportunities(currentUser),
      leadService.getLeads(currentUser),
      dashboardService.getCanceledLeads(currentUser),
    ]);

    const allLeads = [...leads, ...canceledLeads];

    // Filter data by time range
    const filteredOpportunities = dashboardService.filterByTimeRange(opportunities, timeRange);
    const filteredLeads = dashboardService.filterByTimeRange(allLeads, timeRange);

    return {
      opportunities: dashboardService.calculateOpportunityMetrics(filteredOpportunities),
      proposals: dashboardService.calculateProposalMetrics(filteredLeads),
      sellers: dashboardService.calculateSellerMetrics(filteredOpportunities, filteredLeads),
      trends: dashboardService.calculateTrends(opportunities, allLeads, timeRange),
    };
  },

  // Filter data by time range
  filterByTimeRange: <T extends { created_at: string }>(data: T[], timeRange: TimeRange): T[] => {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return data; // Return all data for custom or unknown ranges
    }

    return data.filter(item => new Date(item.created_at) >= startDate);
  },

  // Calculate opportunity metrics
  calculateOpportunityMetrics: (opportunities: Opportunity[]) => {
    const total = opportunities.length;
    const byStatus = opportunities.reduce((acc, opp) => {
      acc[opp.status] = (acc[opp.status] || 0) + 1;
      return acc;
    }, {} as Record<OpportunityStatus, number>);

    // Ensure all statuses are represented
    const completeByStatus: Record<OpportunityStatus, number> = {
      'OPORTUNIDADES': byStatus['OPORTUNIDADES'] || 0,
      'EM_CONTATO': byStatus['EM_CONTATO'] || 0,
      'NEGOCIAÇÃO': byStatus['NEGOCIAÇÃO'] || 0,
    };

    const converted = opportunities.filter(opp => opp.converted_to_proposal_at).length;
    const conversionRate = total > 0 ? (converted / total) * 100 : 0;

    // Calculate average time to contact
    const contactedOpportunities = opportunities.filter(opp => opp.first_contact_date);
    const averageTimeToContact = contactedOpportunities.length > 0
      ? contactedOpportunities.reduce((sum, opp) => {
          const created = new Date(opp.created_at).getTime();
          const contacted = new Date(opp.first_contact_date!).getTime();
          return sum + (contacted - created);
        }, 0) / contactedOpportunities.length / (1000 * 60 * 60) // Convert to hours
      : 0;

    // Calculate average time to quote
    const quotedOpportunities = opportunities.filter(opp => opp.quoted_at);
    const averageTimeToQuote = quotedOpportunities.length > 0
      ? quotedOpportunities.reduce((sum, opp) => {
          const created = new Date(opp.created_at).getTime();
          const quoted = new Date(opp.quoted_at!).getTime();
          return sum + (quoted - created);
        }, 0) / quotedOpportunities.length / (1000 * 60 * 60) // Convert to hours
      : 0;

    return {
      total,
      byStatus: completeByStatus,
      conversionRate,
      averageTimeToContact,
      averageTimeToQuote,
    };
  },

  // Calculate proposal metrics
  calculateProposalMetrics: (leads: Lead[]) => {
    const total = leads.length;
    const byStatus = leads.reduce((acc, lead) => {
      acc[lead.status_kanban] = (acc[lead.status_kanban] || 0) + 1;
      return acc;
    }, {} as Record<KanbanStatus, number>);

    // Ensure all statuses are represented
    const completeByStatus: Record<KanbanStatus, number> = {
      'ENVIADA': byStatus['ENVIADA'] || 0,
      'ANÁLISE': byStatus['ANÁLISE'] || 0,
      'IMPLANTADA': byStatus['IMPLANTADA'] || 0,
      'CANCELADA': byStatus['CANCELADA'] || 0,
      'PROPOSTA': byStatus['PROPOSTA'] || 0,
      'OPORTUNIDADES': byStatus['OPORTUNIDADES'] || 0,
      'EM_CONTATO': byStatus['EM_CONTATO'] || 0,
      'NEGOCIACAO': byStatus['NEGOCIACAO'] || 0,
    };

    // Conversion rate based on IMPLANTADA status only
    const implanted = byStatus['IMPLANTADA'] || 0;
    const conversionRate = total > 0 ? (implanted / total) * 100 : 0;

    // Calculate average proposal value
    const proposalsWithValue = leads.filter(lead => lead.valor_produto && lead.valor_produto > 0);
    const averageValue = proposalsWithValue.length > 0
      ? proposalsWithValue.reduce((sum, lead) => sum + (lead.valor_produto || 0), 0) / proposalsWithValue.length
      : 0;

    return {
      total,
      byStatus: completeByStatus,
      conversionRate,
      averageValue,
    };
  },

  // Calculate seller performance metrics
  calculateSellerMetrics: (opportunities: Opportunity[], leads: Lead[]) => {
    const sellerMap = new Map<number, SellerPerformance>();

    // Process opportunities
    opportunities.forEach(opp => {
      if (!sellerMap.has(opp.vendedor_id)) {
        sellerMap.set(opp.vendedor_id, {
          seller_id: opp.vendedor_id,
          seller_name: opp.vendedor,
          opportunities_assigned: 0,
          opportunities_contacted: 0,
          opportunities_quoted: 0,
          opportunities_converted: 0,
          proposals_won: 0,
          total_value: 0,
          conversion_rate: 0,
        });
      }

      const seller = sellerMap.get(opp.vendedor_id)!;
      seller.opportunities_assigned++;

      if (opp.first_contact_date) seller.opportunities_contacted++;
      if (opp.quoted_value) seller.opportunities_quoted++;
      if (opp.converted_to_proposal_at) seller.opportunities_converted++;
    });

    // Process leads (proposals)
    leads.forEach(lead => {
      if (sellerMap.has(lead.vendedor_id)) {
        const seller = sellerMap.get(lead.vendedor_id)!;
        
        if (lead.status_kanban === 'IMPLANTADA') {
          seller.proposals_won++;
          seller.total_value += lead.valor_produto || 0;
        }
      }
    });

    // Calculate conversion rates
    const performance = Array.from(sellerMap.values()).map(seller => ({
      ...seller,
      conversion_rate: seller.opportunities_assigned > 0 
        ? (seller.opportunities_converted / seller.opportunities_assigned) * 100 
        : 0,
    }));

    // Create leaderboard based on conversion rate and total value
    const leaderboard: SellerRanking[] = performance
      .map(seller => ({
        seller_id: seller.seller_id,
        seller_name: seller.seller_name,
        score: seller.conversion_rate * 0.7 + (seller.total_value / 10000) * 0.3, // Weighted score
        rank: 0,
      }))
      .sort((a, b) => b.score - a.score)
      .map((seller, index) => ({ ...seller, rank: index + 1 }));

    return {
      performance,
      leaderboard,
    };
  },

  // Calculate trend data over time
  calculateTrends: (opportunities: Opportunity[], leads: Lead[], timeRange: TimeRange): {
    opportunitiesOverTime: TimeSeriesData[];
    proposalsOverTime: TimeSeriesData[];
    conversionRates: TimeSeriesData[];
  } => {
    const periods = dashboardService.generateTimePeriods(timeRange);
    
    const opportunitiesOverTime = periods.map(period => ({
      name: period.label,
      value: opportunities.filter(opp => 
        dashboardService.isInPeriod(opp.created_at, period.start, period.end)
      ).length,
      date: period.start.toISOString(),
    }));

    const proposalsOverTime = periods.map(period => ({
      name: period.label,
      value: leads.filter(lead => 
        dashboardService.isInPeriod(lead.created_at, period.start, period.end)
      ).length,
      date: period.start.toISOString(),
    }));

    const conversionRates = periods.map(period => {
      const periodOpportunities = opportunities.filter(opp => 
        dashboardService.isInPeriod(opp.created_at, period.start, period.end)
      );
      const converted = periodOpportunities.filter(opp => opp.converted_to_proposal_at).length;
      const rate = periodOpportunities.length > 0 ? (converted / periodOpportunities.length) * 100 : 0;
      
      return {
        name: period.label,
        value: Math.round(rate * 10) / 10, // Round to 1 decimal place
        date: period.start.toISOString(),
      };
    });

    return {
      opportunitiesOverTime,
      proposalsOverTime,
      conversionRates,
    };
  },

  // Generate time periods for trend analysis
  generateTimePeriods: (timeRange: TimeRange) => {
    const now = new Date();
    const periods: { start: Date; end: Date; label: string }[] = [];

    switch (timeRange) {
      case '7d':
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          periods.push({
            start: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59),
            label: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
          });
        }
        break;

      case '30d':
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          periods.push({
            start: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59),
            label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          });
        }
        break;

      case '90d':
        for (let i = 12; i >= 0; i--) {
          const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
          const startDate = new Date(endDate.getTime() - 6 * 24 * 60 * 60 * 1000);
          periods.push({
            start: startDate,
            end: endDate,
            label: `${startDate.getDate()}/${startDate.getMonth() + 1}`,
          });
        }
        break;

      case '1y':
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          periods.push({
            start: date,
            end: endDate,
            label: date.toLocaleDateString('pt-BR', { month: 'short' }),
          });
        }
        break;
    }

    return periods;
  },

  // Check if a date is within a period
  isInPeriod: (dateStr: string, start: Date, end: Date): boolean => {
    const date = new Date(dateStr);
    return date >= start && date <= end;
  },

  // Check if user has dashboard access (Admin only)
  checkDashboardAccess: (user: User): boolean => {
    return user.role === 'ADMIN';
  },

  // Redirect sellers to opportunities page
  redirectSellersToOpportunities: (): void => {
    if (typeof window !== 'undefined') {
      window.location.href = '/opportunities';
    }
  },

  // Get canceled leads
  getCanceledLeads: async (currentUser: User): Promise<Lead[]> => {
    const { supabase } = await import('./supabaseClient');

    let query = supabase
      .from('leads')
      .select('*')
      .eq('status_kanban', 'CANCELADA')
      .order('created_at', { ascending: false });
    
    if (currentUser.role !== 'ADMIN') {
      query = query.eq('vendedor_id', currentUser.id);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  },
};