import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Lead } from '../types';
import { Users, FileText, CheckCircle, XCircle } from 'lucide-react';

interface DashboardProps {
  leads: Lead[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const Dashboard: React.FC<DashboardProps> = ({ leads }) => {
  
  // Calculate Stats
  const total = leads.length;
  const converted = leads.filter(l => l.status_kanban === 'IMPLANTADA').length;
  const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0';
  
  const statusCounts = leads.reduce((acc, lead) => {
    acc[lead.status_kanban] = (acc[lead.status_kanban] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeCounts = leads.reduce((acc, lead) => {
    acc[lead.tipo_cliente] = (acc[lead.tipo_cliente] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const barData = Object.keys(statusCounts).map(key => ({
    name: key,
    count: statusCounts[key]
  }));

  const pieData = Object.keys(typeCounts).map(key => ({
    name: key,
    value: typeCounts[key]
  }));

  const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: string, icon: any, color: string }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
      <div className={`p-3 rounded-full ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total de Leads" 
          value={total.toString()} 
          icon={Users} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Taxa de Conversão" 
          value={`${conversionRate}%`} 
          icon={CheckCircle} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Em Análise" 
          value={(statusCounts['ANÁLISE'] || 0).toString()} 
          icon={FileText} 
          color="bg-amber-500" 
        />
        <StatCard 
          title="Perdidos" 
          value={(statusCounts['CANCELADA'] || 0).toString()} 
          icon={XCircle} 
          color="bg-red-500" 
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Funil de Vendas</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Tipos de Cliente</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
