import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { TrendingUp, DollarSign } from 'lucide-react';

interface AdminChartsProps {
  stats: any;
}

export function AdminCharts({ stats }: AdminChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* User Growth Chart */}
      <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] p-8 rounded-3xl">
        <h3 className="text-[var(--text-main)] font-bold mb-6 flex items-center gap-2">
          <TrendingUp size={20} className="text-[var(--neon-blue)]" />
          Crescimento de Usuários (7 dias)
        </h3>
        <div className="h-[300px] w-full">
          {stats?.growthData && stats.growthData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.growthData}>
                <defs>
                  <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--neon-blue)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--neon-blue)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#475569', fontWeight: 700 }}
                  tickFormatter={(str) => str.split('-').slice(1).reverse().join('/')}
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#475569', fontWeight: 700 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-card)', 
                    border: '1px solid var(--border-main)', 
                    borderRadius: '1rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                  }}
                  itemStyle={{ color: 'var(--neon-blue)', fontWeight: 900, fontSize: '12px' }}
                  labelStyle={{ color: 'var(--text-muted)', marginBottom: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="var(--neon-blue)" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorGrowth)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
              Nenhum dado de crescimento disponível
            </div>
          )}
        </div>
      </div>

      {/* Revenue History Chart */}
      <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] p-8 rounded-3xl">
        <h3 className="text-[var(--text-main)] font-bold mb-6 flex items-center gap-2">
          <DollarSign size={20} className="text-emerald-400" />
          Receita Diária (7 dias)
        </h3>
        <div className="h-[300px] w-full">
          {stats?.revenueHistory && stats.revenueHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenueHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickFormatter={(str) => str.split('-').slice(1).reverse().join('/')}
                />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px' }}
                  itemStyle={{ color: 'var(--text-main)', fontSize: '12px' }}
                  labelStyle={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '4px' }}
                  formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita']}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {stats.revenueHistory.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.amount > 0 ? '#10b981' : '#334155'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
              Nenhum dado de receita disponível
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
