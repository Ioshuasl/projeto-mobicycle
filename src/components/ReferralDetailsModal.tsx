import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Mail, Calendar, Shield, TrendingUp, Award, MapPin, Phone, Users } from 'lucide-react';
import { getCareerLevel } from '../services/careerService';

interface ReferralDetailsModalProps {
  referral: any;
  onClose: () => void;
  onViewNetwork?: (userId: string) => void;
}

export function ReferralDetailsModal({ referral, onClose, onViewNetwork }: ReferralDetailsModalProps) {
  const career = getCareerLevel(referral.cycleSalesCount || 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[var(--bg-card)] backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-[2.5rem] shadow-2xl overflow-hidden"
        >
          {/* Header/Banner */}
          <div className="h-32 bg-gradient-to-r from-[var(--neon-blue)]/40 to-[var(--neon-purple)]/40 relative">
            <div className="absolute inset-0 bg-[var(--bg-main)]/40 backdrop-blur-sm" />
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 bg-black/20 hover:bg-black/40 text-[var(--text-main)] rounded-full flex items-center justify-center transition-colors z-10 border border-[var(--glass-border)]"
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-8 pb-8">
            {/* Profile Info */}
            <div className="relative -mt-16 mb-8 flex flex-col sm:flex-row items-end gap-6">
              <div className="w-32 h-32 rounded-3xl border-4 border-[var(--bg-card)] bg-[var(--border-main)] overflow-hidden shadow-2xl relative group">
                {referral.avatar ? (
                  <img src={referral.avatar} alt={referral.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 bg-[var(--bg-sidebar)]">
                    <User size={48} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--neon-blue)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight uppercase italic">{referral.name}</h3>
                  <div className="px-2 py-0.5 bg-[var(--neon-blue)]/10 border border-[var(--neon-blue)]/20 rounded text-[10px] font-black text-[var(--neon-blue)] uppercase tracking-widest shadow-[0_0_10px_rgba(0,243,255,0.1)]">
                    {referral.status}
                  </div>
                </div>
                <p className="text-[var(--text-muted)] font-mono text-xs uppercase tracking-widest">@{referral.nickname}</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-4 hover:border-[var(--neon-blue)]/30 transition-colors">
                <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">Indicados</p>
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-[var(--neon-blue)]" />
                  <span className="text-lg font-black text-[var(--text-main)]">{referral.referralsCount || 0}</span>
                </div>
              </div>
              <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-4 hover:border-[var(--neon-green)]/30 transition-colors">
                <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">Nível</p>
                <div className="flex items-center gap-2">
                  <Award size={16} className="text-[var(--neon-green)]" />
                  <span className="text-lg font-black text-[var(--text-main)]">{career.name}</span>
                </div>
              </div>
              <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-4 hover:border-[var(--neon-purple)]/30 transition-colors">
                <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">Desde</p>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-[var(--neon-purple)]" />
                  <span className="text-xs font-bold text-[var(--text-main)]">{new Date(referral.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </div>

            {/* Contact & Extra Info */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-[var(--text-main)] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Shield size={14} className="text-[var(--neon-blue)]" />
                Informações de Contato
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-2xl">
                  <Mail size={18} className="text-[var(--text-muted)]" />
                  <span className="text-sm text-[var(--text-main)]">{referral.email || 'Não informado'}</span>
                </div>
                <div className="flex items-center gap-3 p-4 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-2xl">
                  <Phone size={18} className="text-[var(--text-muted)]" />
                  <span className="text-sm text-[var(--text-main)]">(11) 9****-****</span>
                </div>
              </div>
            </div>

            {/* Performance Preview */}
            <div className="mt-8 pt-8 border-t border-[var(--border-main)]">
              <h4 className="text-xs font-black text-[var(--text-main)] uppercase tracking-widest mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-[var(--neon-green)]" />
                Atividade Recente
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)]">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[var(--neon-green)] shadow-[0_0_8px_rgba(57,255,20,0.5)]" />
                    <span className="text-xs text-[var(--text-muted)]">Completou ciclo On-Bord</span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">Há 3 dias</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)]">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[var(--neon-blue)] shadow-[0_0_8px_rgba(0,243,255,0.5)]" />
                    <span className="text-xs text-[var(--text-muted)]">Nova indicação direta</span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">Há 1 semana</span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <button className="flex-1 py-4 bg-[var(--neon-blue)] hover:bg-[var(--neon-blue)]/80 text-[#0a0f1e] font-black rounded-2xl transition-all uppercase tracking-widest text-xs shadow-lg shadow-[var(--neon-blue)]/20 active:scale-95">
                Enviar Mensagem
              </button>
              {onViewNetwork && (
                <button 
                  onClick={() => onViewNetwork(referral.id)}
                  className="flex-1 py-4 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-main)] font-black rounded-2xl transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 border border-[var(--border-main)] active:scale-95"
                >
                  <Shield size={14} className="text-[var(--neon-blue)]" />
                  Ver Matriz
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
