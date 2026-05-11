import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { Users, TrendingUp, DollarSign, PieChart as PieChartIcon } from 'lucide-react';

interface PerformanceChartsProps {
  networkGrowthData: any[];
  chartData: any[];
  networkDistribution: any[];
  bonusDistribution: any[];
  period: string;
  totalNet: number;
  totalGross: number;
  user: any;
}

export default function PerformanceCharts({ 
  networkGrowthData, 
  chartData, 
  networkDistribution, 
  bonusDistribution,
  period,
  totalNet,
  totalGross,
  user
}: PerformanceChartsProps) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Network Growth Chart */}
        <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-[2.5rem] p-8 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                <Users size={20} />
              </div>
              <h4 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest">Crescimento da Rede</h4>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest">Total Acumulado</p>
              <p className="text-lg font-black text-[var(--text-main)]">{(user.referralsCount * 4.3).toFixed(0)} Membros</p>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={networkGrowthData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Earnings Performance (Gross vs Net) */}
        <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-[2.5rem] p-8 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                <TrendingUp size={20} />
              </div>
              <h4 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest">Bônus Brutos vs Líquidos</h4>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest">Total Líquido ({period === 'week' ? 'Semana' : period === 'month' ? 'Mês' : 'Ano'})</p>
              <p className="text-lg font-black text-emerald-400">R$ {(totalNet || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="gross" name="Bruto" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorGross)" />
                <Area type="monotone" dataKey="net" name="Líquido" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorNet)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-6 flex items-center justify-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span className="text-xs text-[var(--text-muted)]">Bruto: R$ {totalGross.toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full" />
              <span className="text-xs text-[var(--text-muted)]">Líquido: R$ {totalNet.toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Network Distribution */}
        <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-[2.5rem] p-8 shadow-xl">
          <h4 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest mb-8 flex items-center gap-2">
            <PieChartIcon size={16} className="text-blue-500" />
            Distribuição de Rede
          </h4>
          
          <div className="h-[200px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={networkDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {networkDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono">Total</p>
              <p className="text-xl font-black text-[var(--text-main)]">{networkDistribution.reduce((a, b) => a + b.value, 0)}</p>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {networkDistribution.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-[var(--text-muted)]">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-[var(--text-main)]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bonus Distribution */}
        <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-[2.5rem] p-8 shadow-xl">
          <h4 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest mb-8 flex items-center gap-2">
            <DollarSign size={16} className="text-emerald-500" />
            Origem dos Ganhos
          </h4>
          
          <div className="h-[200px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bonusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {bonusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono">Total</p>
              <p className="text-lg font-black text-[var(--text-main)]">R$ {bonusDistribution.reduce((a, b) => a + b.value, 0).toLocaleString('pt-BR')}</p>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {bonusDistribution.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-[var(--text-muted)]">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-[var(--text-main)]">R$ {item.value.toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
