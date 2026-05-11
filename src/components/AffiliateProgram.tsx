import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Target, Medal, Users, ArrowUpRight, Gift, ChevronRight, Zap, Shield, Gem, Crown, Rocket, Search, History, Award } from 'lucide-react';
import { User } from '../types';
import { getCareerLevel, getCareerPlan } from '../services/careerService';
import { ReferralsList } from './ReferralsList';
import { CareerPlanModal } from './CareerPlanModal';

interface AffiliateProgramProps {
  user: User;
  referralLink: string;
  onViewNetwork?: (userId: string) => void;
  matrixSettings?: any;
}

export function AffiliateProgram({ user, referralLink, onViewNetwork, matrixSettings }: AffiliateProgramProps) {
  const [activeTab, setActiveTab] = useState<'carreira' | 'rede'>('carreira');
  const [showCareerModal, setShowCareerModal] = useState(false);

  const currentLevel = getCareerLevel(user.cycleSalesCount || 0, matrixSettings);
  const careerPlan = getCareerPlan(matrixSettings);

  const getBadgeIcon = (level: string) => {
    switch (level) {
      case 'LICENSED': return <Shield size={24} />;
      case 'PARTNER': return <Users size={24} />;
      case 'EXECUTIVO_1':
      case 'EXECUTIVO_2':
      case 'EXECUTIVO_3':
      case 'EXECUTIVO_4': return <Trophy size={24} />;
      case 'DIAMANTE':
      case 'BLACK_DIAMANTE': return <Gem size={24} />;
      case 'VICE_PRESIDENTE':
      case 'PRESIDENTE': return <Crown size={24} />;
      case 'CEO_PLE': return <Rocket size={24} className="animate-pulse" />;
      default: return <Award size={24} />;
    }
  };

  const getBadgeColor = (level: string) => {
    switch (level) {
      case 'LICENSED': return { color: 'text-[var(--text-muted)]', bg: 'bg-slate-400/10', border: 'border-slate-400/20' };
      case 'PARTNER': return { color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' };
      case 'EXECUTIVO_1': return { color: 'text-amber-600', bg: 'bg-amber-600/10', border: 'border-amber-600/20' };
      case 'EXECUTIVO_2': return { color: 'text-[var(--text-main)]', bg: 'bg-slate-300/10', border: 'border-slate-300/20' };
      case 'EXECUTIVO_3': return { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' };
      case 'EXECUTIVO_4': return { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' };
      case 'DIAMANTE': return { color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20' };
      case 'BLACK_DIAMANTE': return { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
      case 'VICE_PRESIDENTE': return { color: 'text-slate-900', bg: 'bg-[var(--bg-sidebar)]', border: 'border-slate-900/20' };
      case 'PRESIDENTE': return { color: 'text-purple-600', bg: 'bg-purple-600/10', border: 'border-purple-600/20' };
      case 'CEO_PLE': return { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' };
      default: return { color: 'text-[var(--text-muted)]', bg: 'bg-slate-400/10', border: 'border-slate-400/20' };
    }
  };

  const badges = careerPlan.map(q => ({
    id: q.level,
    name: q.name,
    desc: q.benefit,
    icon: getBadgeIcon(q.level),
    unlocked: (user.cycleSalesCount || 0) >= q.cyclesRequired,
    ...getBadgeColor(q.level)
  }));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight uppercase italic flex items-center gap-3">
            <Trophy className="text-yellow-500" />
            Programa de Afiliados
          </h3>
          <p className="text-[var(--text-muted)] text-sm">Recompensas, rankings e desafios para impulsionar sua rede.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl shadow-[0_0_15px_rgba(234,179,8,0.15)]">
            <p className="text-[10px] text-yellow-500 uppercase font-mono tracking-widest mb-1">Seu Nível Atual</p>
            <div className="text-xl font-black text-[var(--text-main)] flex flex-col">
              {currentLevel.name}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('carreira')}
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
            activeTab === 'carreira' 
              ? 'bg-[var(--neon-blue)] text-[#0a0f1e] shadow-[0_0_20px_rgba(0,243,255,0.3)]' 
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <Medal size={14} />
          Plano de Carreira
        </button>
        <button 
          onClick={() => setActiveTab('rede')}
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
            activeTab === 'rede' 
              ? 'bg-[var(--neon-blue)] text-[#0a0f1e] shadow-[0_0_20px_rgba(0,243,255,0.3)]' 
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <Users size={14} />
          Minha Rede
        </button>
      </div>

      {activeTab === 'carreira' ? (
        <div className="space-y-8">
          {/* Career Plan - Horizontal */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2.5rem] p-8 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight flex items-center gap-2">
                  <Gift size={20} className="text-emerald-400" />
                  Plano de Carreira
                </h4>
                <p className="text-xs text-[var(--text-muted)] italic">As qualificações são baseadas em ciclos da sua rede em diante.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest bg-[var(--bg-sidebar)] px-3 py-1.5 rounded-full border border-[var(--border-main)]">
                  <ArrowUpRight size={12} />
                  Arraste para o lado
                </div>
                <button 
                  onClick={() => setShowCareerModal(true)}
                  className="px-4 py-1.5 bg-blue-600/10 border border-blue-600/20 rounded-full text-[10px] font-black text-blue-400 uppercase tracking-widest hover:bg-blue-600/20 transition-all"
                >
                  Ver Detalhes
                </button>
              </div>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x">
              {badges.map(badge => (
                <motion.div 
                  key={badge.id}
                  whileHover={{ y: -5 }}
                  className={`relative flex-shrink-0 w-48 snap-start p-6 rounded-3xl border flex flex-col items-center text-center transition-all duration-500 cursor-pointer group ${badge.bg} ${badge.border} ${
                    badge.unlocked 
                      ? 'opacity-100 shadow-[0_0_20px_rgba(0,0,0,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:border text-white/30' 
                      : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-80'
                  }`}
                  title={badge.desc}
                >
                  {/* Inner glow on hover */}
                  <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[var(--glass-bg)] pointer-events-none" />
                  
                  <div className={`mb-4 relative z-10 transition-transform duration-500 group-hover:scale-110 ${badge.color}`}>
                    {badge.icon}
                  </div>
                  <h5 className={`text-sm font-black mb-1 relative z-10 transition-colors duration-300 ${badge.unlocked ? 'text-[var(--text-main)]' : 'text-[var(--text-main)]'}`}>
                    {badge.name}
                  </h5>
                  <div className="mt-auto pt-4 relative z-10">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                      badge.unlocked 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                        : 'bg-[var(--border-main)] text-[var(--text-muted)] border-[var(--text-muted)]'
                    }`}>
                      {badge.unlocked ? 'Conquistado' : 'Bloqueado'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2.5rem] p-8 shadow-xl">
          <ReferralsList 
            referralLink={referralLink} 
            onViewNetwork={onViewNetwork}
          />
        </div>
      )}
      <CareerPlanModal 
        isOpen={showCareerModal} 
        onClose={() => setShowCareerModal(false)} 
        currentCycles={user.cycleSalesCount || 0}
        matrixSettings={matrixSettings}
      />
    </div>
  );
}
