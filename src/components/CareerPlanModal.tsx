import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, TrendingUp, Users, Award, ShieldCheck } from 'lucide-react';
import { getCareerPlan } from '../services/careerService';

interface CareerPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCycles: number;
  matrixSettings?: any;
}

export function CareerPlanModal({ isOpen, onClose, currentCycles, matrixSettings }: CareerPlanModalProps) {
  const careerPlan = getCareerPlan(matrixSettings);
  const unilevelBonuses = [
    { level: 1, percent: parseFloat(matrixSettings?.bonus_unilevel_l1 || '10') },
    { level: 2, percent: parseFloat(matrixSettings?.bonus_unilevel_l2 || '5') },
    { level: 3, percent: parseFloat(matrixSettings?.bonus_unilevel_l3 || '3') },
    { level: 4, percent: parseFloat(matrixSettings?.bonus_unilevel_l4 || '2') },
    { level: 5, percent: parseFloat(matrixSettings?.bonus_unilevel_l5 || '1') },
    { level: 6, percent: parseFloat(matrixSettings?.bonus_unilevel_l6 || '1') },
    { level: 7, percent: parseFloat(matrixSettings?.bonus_unilevel_l7 || '1') },
    { level: 8, percent: parseFloat(matrixSettings?.bonus_unilevel_l8 || '1') },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-[#0d0d0f] border border-[var(--border-main)] w-full max-w-4xl max-h-[90vh] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-sidebar)]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500">
                  <Trophy size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[var(--text-main)] uppercase italic tracking-tight">Plano de Carreira</h3>
                  <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">Regras de Bonificação e Qualificação</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-12 h-12 rounded-2xl bg-[var(--border-main)] hover:bg-slate-700 text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center justify-center transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-12">
              {/* Infinite Bonus Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <TrendingUp className="text-emerald-500" size={20} />
                  <h4 className="text-lg font-black text-[var(--text-main)] uppercase italic">Bônus Infinito (Carreira)</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {careerPlan.filter(q => q.cyclesRequired > 0).map((level, index) => {
                    const isAchieved = currentCycles >= level.cyclesRequired;
                    return (
                      <div 
                        key={index}
                        className={`p-6 rounded-[2rem] border transition-all ${
                          isAchieved 
                            ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]' 
                            : 'bg-[var(--bg-sidebar)] border-[var(--border-main)]'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isAchieved ? 'bg-emerald-500 text-[#0a0f1e]' : 'bg-[var(--border-main)] text-[var(--text-muted)]'
                          }`}>
                            <Award size={20} />
                          </div>
                          {isAchieved && (
                            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest rounded-lg">
                              Alcançado
                            </span>
                          )}
                        </div>
                        <h5 className="text-[var(--text-main)] font-black text-lg mb-3">{level.name}</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-[var(--text-muted)] uppercase font-bold">Ciclos</span>
                            <span className="text-[var(--text-main)] font-mono">{level.cyclesRequired}</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-[var(--text-muted)] uppercase font-bold">Bônus (R$)</span>
                            <span className="text-emerald-400 font-black">R$ {level.fixedValue}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Unilevel Bonus Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <Users className="text-blue-500" size={20} />
                  <h4 className="text-lg font-black text-[var(--text-main)] uppercase italic">Bônus Unilevel (Níveis)</h4>
                </div>
                
                <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-[2.5rem] overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[var(--bg-card)]">
                        <th className="px-8 py-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Nível</th>
                        <th className="px-8 py-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-right">Porcentagem (%)</th>
                        <th className="px-8 py-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Descrição</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {unilevelBonuses.map((bonus) => (
                        <tr key={bonus.level} className="hover:bg-[var(--glass-bg)] transition-colors">
                          <td className="px-8 py-4">
                            <span className="text-sm font-black text-[var(--text-main)]">Nível {bonus.level}</span>
                          </td>
                          <td className="px-8 py-4 text-right">
                            <span className="text-sm font-black text-blue-400">{bonus.percent}%</span>
                          </td>
                          <td className="px-8 py-4">
                            <span className="text-xs text-[var(--text-muted)]">Pago sobre o uso do Cashback e corridas pelo app</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Rules Footer */}
              <div className="p-8 bg-blue-600/5 border border-blue-500/10 rounded-[2.5rem] space-y-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-blue-500" size={20} />
                  <h5 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest">Regras Gerais</h5>
                </div>
                <ul className="space-y-2">
                  <li className="text-xs text-[var(--text-muted)] flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    O Bônus Infinito é pago sobre a adesão de novos licenciados na sua rede.
                  </li>
                  <li className="text-xs text-[var(--text-muted)] flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    O Bônus Unilevel é pago para todos os que indicaram pelo menos 1 licenciado.
                  </li>
                  <li className="text-xs text-[var(--text-muted)] flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    Os valores são creditados em tempo real no seu saldo disponível.
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
