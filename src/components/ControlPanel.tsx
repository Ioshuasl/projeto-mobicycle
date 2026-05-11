import React from 'react';
import { motion } from 'motion/react';
import { 
  Wallet, 
  Star, 
  Trophy,
  Users, 
  RefreshCw, 
  Ticket, 
  FileCheck, 
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { User } from '../types';
import { getNextCareerLevel } from '../services/careerService';

interface ControlPanelProps {
  user: User;
  cycleHistory: any[];
  matrixSettings?: any;
}

export function ControlPanel({ user, cycleHistory, matrixSettings }: ControlPanelProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VALIDATED': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'REJECTED': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'VALIDATED': return 'Validado';
      case 'REJECTED': return 'Rejeitado';
      default: return 'Pendente';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VALIDATED': return <CheckCircle2 size={14} />;
      case 'REJECTED': return <XCircle size={14} />;
      default: return <Clock size={14} />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Bonus Balance */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl p-6 shadow-xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-emerald-500/10 transition-colors" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Saldo de Bônus</p>
              <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tighter">
                R$ {(user.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border-main)]/50">
            <span className="text-[10px] text-[var(--text-muted)] font-medium">Disponível para saque</span>
            <ChevronRight size={14} className="text-[var(--text-muted)]" />
          </div>
        </motion.div>

        {/* Career Status */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl p-6 shadow-xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-yellow-500/10 transition-colors" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500">
              <Trophy size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Status de Carreira</p>
              <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tighter uppercase">
                {user.careerLevel || 'Licenciado'}
              </h3>
            </div>
          </div>
          
          {/* Progress to next level */}
          {(() => {
            const next = getNextCareerLevel(user.cycleSalesCount || 0, matrixSettings);
            if (!next) return null;
            const progress = Math.min(100, (user.cycleSalesCount / next.cyclesRequired) * 100);
            return (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[9px] font-mono uppercase tracking-widest">
                  <span className="text-[var(--text-muted)]">Progresso para {next.name}</span>
                  <span className="text-blue-400 font-bold">{Math.round(progress)}%</span>
                </div>
                <div className="h-1 bg-[var(--border-main)] rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-blue-500"
                  />
                </div>
                <p className="text-[9px] text-[var(--text-muted)] mt-1">
                  {user.cycleSalesCount} / {next.cyclesRequired} ciclos concluídos
                </p>
              </div>
            );
          })()}
        </motion.div>

        {/* Direct Referrals */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl p-6 shadow-xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-blue-500/10 transition-colors" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Indicados Diretos</p>
              <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tighter">
                {user.referralsCount} Consultores
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border-main)]/50">
            <span className="text-[10px] text-[var(--text-muted)] font-medium">Ver minha rede</span>
            <ChevronRight size={14} className="text-[var(--text-muted)]" />
          </div>
        </motion.div>

        {/* Cashback Balance */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl p-6 shadow-xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-purple-500/10 transition-colors" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500">
              <Ticket size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Bônus de Indicação</p>
              <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tighter">
                R$ {user.cashback_balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border-main)]/50">
            <span className="text-[10px] text-[var(--text-muted)] font-medium">Utilizar em corridas/compras</span>
            <ChevronRight size={14} className="text-[var(--text-muted)]" />
          </div>
        </motion.div>

        {/* Document Status */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl p-6 shadow-xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-slate-500/10 transition-colors" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-slate-500/10 rounded-2xl flex items-center justify-center text-[var(--text-muted)]">
              <FileCheck size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Validação de Documentos</p>
              <div className={`mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getStatusColor(user.documentStatus)}`}>
                {getStatusIcon(user.documentStatus)}
                {getStatusLabel(user.documentStatus)}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border-main)]/50">
            <span className="text-[10px] text-[var(--text-muted)] font-medium">Gerenciar documentos</span>
            <ChevronRight size={14} className="text-[var(--text-muted)]" />
          </div>
        </motion.div>
      </div>

      {/* Cycle History Section */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[32px] p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600">
              <RefreshCw size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-[var(--text-main)] tracking-tight">Histórico de Ciclos</h3>
              <p className="text-xs text-[var(--text-muted)]">Acompanhe sua evolução nas matrizes On-Bord e CashBoard</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl">
            <Clock size={14} className="text-[var(--text-muted)]" />
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Atualizado em tempo real</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-[var(--border-main)]/50">
                <th className="pb-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Tipo de Matriz</th>
                <th className="pb-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Data do Ciclo</th>
                <th className="pb-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-right">Bônus Gerado</th>
                <th className="pb-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-main)]/30">
              {cycleHistory.length > 0 ? (
                cycleHistory.map((cycle) => (
                  <tr key={cycle.id} className="group hover:bg-[var(--glass-bg)] transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cycle.type === 'ONBORD' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                          <RefreshCw size={14} />
                        </div>
                        <span className="text-sm font-bold text-[var(--text-main)]">
                          {cycle.type === 'ONBORD' ? 'On-Bord' : 'CashBoard'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="text-xs text-[var(--text-muted)] font-medium">
                        {new Date(cycle.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <span className={`text-sm font-black ${cycle.amount > 0 ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
                        {cycle.amount > 0 ? `+ R$ ${cycle.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                        <CheckCircle2 size={12} />
                        Concluído
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-30">
                      <RefreshCw size={40} className="text-[var(--text-muted)]" />
                      <p className="text-sm text-[var(--text-muted)] font-medium">Nenhum ciclo registrado ainda.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-[var(--text-main)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg text-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h4 className="text-2xl font-black tracking-tight mb-2">Pronto para o próximo nível?</h4>
            <p className="text-blue-100 text-sm max-w-md">Indique novos consultores e acelere seus ciclos para alcançar o status Elite e desbloquear bônus exclusivos.</p>
          </div>
          <button className="px-8 py-3 bg text-white text-blue-600 font-black rounded-2xl hover:bg-blue-50 transition-all active:scale-95 shadow-xl shadow-blue-900/20 uppercase tracking-wider text-xs">
            Indicar Agora
          </button>
        </div>
      </div>
    </div>
  );
}
