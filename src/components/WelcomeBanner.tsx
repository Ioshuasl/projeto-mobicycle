import React from 'react';
import { User } from '../types';
import { motion } from 'motion/react';
import { 
  Trophy, 
  Users, 
  Wallet, 
  ShieldCheck, 
  TrendingUp,
  Award
} from 'lucide-react';

interface WelcomeBannerProps {
  user: User;
}

export function WelcomeBanner({ user }: WelcomeBannerProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const careerLabels: Record<string, string> = {
    'LICENSED': 'Licenciado',
    'PARTNER': 'Parceiro',
    'EXECUTIVO_1': 'Bronze',
    'EXECUTIVO_2': 'Prata',
    'EXECUTIVO_3': 'Ouro',
    'EXECUTIVO_4': 'Esmeralda',
    'DIAMANTE': 'Diamante',
    'BLACK_DIAMANTE': 'Duplo Diamante',
    'VICE_PRESIDENTE': 'Black Diamond',
    'PRESIDENTE': 'Royal Black-Diamond',
    'CEO_PLE': 'CEO PLE'
  };

  const stats = [
    {
      label: 'Saldo Disponível',
      value: `R$ ${(user.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: Wallet,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10'
    },
    {
      label: 'Indicações Diretas',
      value: user.referralsCount.toString(),
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10'
    },
    {
      label: 'Nível de Carreira',
      value: careerLabels[user.careerLevel] || user.careerLevel,
      icon: Award,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10'
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-[2.5rem] p-8 mb-8 shadow-2xl"
    >
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600/10 rounded-full -ml-24 -mb-24 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-3xl font-black text-[var(--text-main)] shadow-xl shadow-blue-900/40 border-2 border-[var(--glass-border)]">
              {user.name.charAt(0)}
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full border-4 border-slate-900 flex items-center justify-center shadow-lg">
              <ShieldCheck size={14} className="text-[var(--text-main)]" />
            </div>
          </div>
          
          <div>
            <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight uppercase italic flex items-center gap-3">
              {getGreeting()}, {user.name.split(' ')[0]}!
              <TrendingUp className="text-emerald-500 animate-pulse" size={24} />
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                <Trophy size={12} /> {user.status}
              </span>
              <span className="px-3 py-1 bg-[var(--border-main)] border border-[var(--text-muted)] rounded-full text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1.5">
                ID: {user.id.slice(-6).toUpperCase()}
              </span>
              {user.documentStatus === 'VALIDATED' && (
                <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck size={12} /> Verificado
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                    <stat.icon size={14} className={stat.color} />
                  </div>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{stat.label}</span>
                </div>
                <span className="text-sm font-black text-[var(--text-main)] tracking-tight">{stat.value}</span>
              </div>
            ))}
          </div>


        </div>
      </div>
    </motion.div>
  );
}
