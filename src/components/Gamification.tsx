import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Medal, Target, Users, RefreshCw, Star, Award, ChevronRight } from 'lucide-react';
import { Badge, UserProgress, User } from '../types';

interface GamificationProps {
  user: User;
}

export function Gamification({ user }: GamificationProps) {
  const [rankings, setRankings] = useState<{ topReferrers: any[], topCyclers: any[] } | null>(null);
  const [achievements, setAchievements] = useState<Badge[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [activeTab, setActiveTab] = useState<'referrals' | 'cycles'>('referrals');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rankRes, achRes, progRes] = await Promise.all([
          fetch('/api/rankings', { headers: { 'x-user-id': user.id } }),
          fetch('/api/user/achievements', { headers: { 'x-user-id': user.id } }),
          fetch('/api/user/progress', { headers: { 'x-user-id': user.id } })
        ]);

        if (rankRes.ok) setRankings(await rankRes.json());
        if (achRes.ok) setAchievements(await achRes.json());
        if (progRes.ok) setProgress(await progRes.json());
      } catch (err) {
        console.error("Error fetching gamification data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <RefreshCw size={40} className="text-blue-500 animate-spin" />
        <p className="text-[var(--text-muted)] font-mono text-[10px] uppercase tracking-widest">Carregando conquistas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Progress Panel */}
      {progress && (
        <section className="bg-gradient-to-br from-[var(--bg-sidebar)] to-black border border-[var(--border-main)] rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Target size={120} className="text-blue-500" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1.5 h-8 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
              <h3 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tighter italic">Seu Progresso</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">Próximo Nível</p>
                    <h4 className="text-xl font-black text-[var(--text-main)] uppercase italic">
                      {progress.nextMilestone?.level || 'Nível Máximo'}
                    </h4>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">Indicações</p>
                    <p className="text-xl font-black text-blue-400">
                      {progress.referrals} / {progress.nextMilestone?.count || progress.referrals}
                    </p>
                  </div>
                </div>

                <div className="h-4 bg-[var(--border-main)] rounded-full overflow-hidden border border-[var(--text-muted)] p-0.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.progressToNext}%` }}
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                  />
                </div>
                
                <p className="text-xs text-[var(--text-muted)] italic">
                  {progress.nextMilestone 
                    ? `Faltam ${progress.nextMilestone.count - progress.referrals} indicações para atingir ${progress.nextMilestone.level}.`
                    : 'Você atingiu o nível máximo de carreira!'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] p-6 rounded-3xl text-center">
                  <RefreshCw className="text-emerald-500 mx-auto mb-3" size={24} />
                  <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">Ciclos Concluídos</p>
                  <p className="text-3xl font-black text-[var(--text-main)]">{progress.cycles}</p>
                </div>
                <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] p-6 rounded-3xl text-center">
                  <Users className="text-blue-500 mx-auto mb-3" size={24} />
                  <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">Vendas na Rede</p>
                  <p className="text-3xl font-black text-[var(--text-main)]">{progress.networkSales}</p>
                  <p className="text-[8px] text-slate-600 uppercase font-mono mt-1">Meta: 88 para Ciclo</p>
                </div>
                <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] p-6 rounded-3xl text-center">
                  <Award className="text-yellow-500 mx-auto mb-3" size={24} />
                  <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">Conquistas</p>
                  <p className="text-3xl font-black text-[var(--text-main)]">{achievements.length}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Rankings */}
        <section className="lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-yellow-500 rounded-full" />
              <h3 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tighter italic">Ranking Global</h3>
            </div>
          </div>

          <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-[2rem] overflow-hidden">
            <div className="flex border-b border-[var(--border-main)]">
              <button 
                onClick={() => setActiveTab('referrals')}
                className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'referrals' ? 'text-blue-400 bg-blue-400/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
              >
                Indicações
              </button>
              <button 
                onClick={() => setActiveTab('cycles')}
                className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'cycles' ? 'text-emerald-400 bg-emerald-400/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
              >
                Ciclos
              </button>
            </div>

            <div className="p-4 space-y-2">
              {rankings && (activeTab === 'referrals' ? rankings.topReferrers : rankings.topCyclers).map((item, index) => (
                <div 
                  key={item.id} 
                  className={`flex items-center justify-between p-3 rounded-2xl transition-all ${item.id === user.id ? 'bg-blue-600/10 border border-blue-500/20' : 'hover:bg-[var(--glass-bg)]'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                      index === 0 ? ' text-white' : 'bg-[var(--border-main)] text-[var(--text-muted)]'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-[var(--border-main)] overflow-hidden flex items-center justify-center border border-[var(--text-muted)]">
                      {item.avatar ? (
                        <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Users size={14} className="text-slate-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[var(--text-main)] truncate max-w-[120px]">{item.nickname || item.name}</p>
                      {item.id === user.id && <span className="text-[8px] text-blue-400 font-bold uppercase tracking-widest">Você</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${activeTab === 'referrals' ? 'text-blue-400' : 'text-emerald-400'}`}>
                      {activeTab === 'referrals' ? item.referralsCount : item.cycleCount}
                    </p>
                    <p className="text-[8px] text-[var(--text-muted)] uppercase font-mono">{activeTab === 'referrals' ? 'Indicações' : 'Ciclos'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Achievements */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
              <h3 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tighter italic">Suas Conquistas</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {achievements.length > 0 ? achievements.map((badge) => (
              <motion.div 
                key={badge.id}
                whileHover={{ y: -5 }}
                className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] p-6 rounded-[2rem] flex items-start gap-4 group transition-all hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-900/10"
              >
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <Medal className="text-emerald-500" size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[var(--text-main)] uppercase tracking-tight mb-1">{badge.name}</h4>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">{badge.description}</p>
                  <p className="text-[8px] text-slate-600 font-mono mt-3 uppercase tracking-widest">
                    Conquistado em {new Date(badge.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </motion.div>
            )) : (
              <div className="col-span-2 bg-[var(--bg-sidebar)] border border-[var(--border-main)] border-dashed rounded-[2rem] p-12 text-center">
                <Medal size={40} className="text-slate-700 mx-auto mb-4 opacity-20" />
                <p className="text-[var(--text-muted)] italic text-sm">Continue sua jornada para desbloquear distintivos exclusivos!</p>
              </div>
            )}
          </div>

          {/* Locked Badges Preview */}
          <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-[2rem] p-8">
            <h5 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-6">Próximos Desafios</h5>
            <div className="flex flex-wrap gap-6 opacity-40 grayscale">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--border-main)] rounded-xl flex items-center justify-center">
                  <Star size={18} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Elite 100</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--border-main)] rounded-xl flex items-center justify-center">
                  <Trophy size={18} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Lenda dos Ciclos</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--border-main)] rounded-xl flex items-center justify-center">
                  <Award size={18} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Embaixador MOBICYCLE</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
