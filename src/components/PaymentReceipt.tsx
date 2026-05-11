import React from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  Download, 
  X, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Shield,
  User as UserIcon,
  Calendar,
  DollarSign,
  Hash
} from 'lucide-react';
import { Transaction } from '../types';

interface PaymentReceiptProps {
  transaction: Transaction & { userName?: string; userEmail?: string };
  onClose: () => void;
}

export const PaymentReceipt: React.FC<PaymentReceiptProps> = ({ transaction, onClose }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-emerald-400 bg-emerald-500/10';
      case 'PENDING': return 'text-yellow-400 bg-yellow-500/10';
      case 'REJECTED': return 'text-red-400 bg-red-500/10';
      default: return 'text-[var(--text-muted)] bg-slate-500/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle2 size={24} />;
      case 'PENDING': return <Clock size={24} />;
      case 'REJECTED': return <XCircle size={24} />;
      default: return <Clock size={24} />;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a0f1e]/90 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-lg bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-[2.5rem] overflow-hidden shadow-2xl relative"
      >
        {/* Header */}
        <div className="p-8 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-card)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[var(--neon-blue)]/10 rounded-2xl flex items-center justify-center text-[var(--neon-blue)]">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-[var(--text-main)] uppercase italic tracking-tighter">Recibo de Pagamento</h3>
              <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-widest">ID: {transaction.id}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-[var(--border-main)] hover:bg-slate-700 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 print:p-0">
          {/* Status Badge */}
          <div className="flex justify-center">
            <div className={`flex flex-col items-center gap-3 p-6 rounded-3xl w-full border border text-white/5 ${getStatusColor(transaction.status)}`}>
              {getStatusIcon(transaction.status)}
              <span className="text-sm font-black uppercase tracking-widest">{transaction.status}</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border-main)]">
              <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
                <UserIcon size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Usuário</span>
              </div>
              <p className="text-sm font-bold text-[var(--text-main)] truncate">{transaction.userName || 'N/A'}</p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">{transaction.userEmail || 'N/A'}</p>
            </div>

            <div className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border-main)]">
              <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
                <Calendar size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Data</span>
              </div>
              <p className="text-sm font-bold text-[var(--text-main)]">
                {new Date(transaction.createdAt).toLocaleDateString('pt-BR')}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {new Date(transaction.createdAt).toLocaleTimeString('pt-BR')}
              </p>
            </div>

            <div className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border-main)]">
              <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
                <Hash size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Tipo</span>
              </div>
              <p className="text-sm font-bold text-[var(--neon-blue)]">{transaction.type}</p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">{transaction.description || 'Sem descrição'}</p>
            </div>

            <div className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border-main)]">
              <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
                <DollarSign size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Valor</span>
              </div>
              <p className={`text-lg font-black ${transaction.amount < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                R$ {Math.abs(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Security Note */}
          <div className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border-main)] flex items-start gap-3">
            <Shield size={18} className="text-slate-600 mt-1" />
            <div>
              <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                Este é um documento oficial gerado pelo sistema MOBICYCLE. 
                A validade deste recibo está sujeita à confirmação da transação no banco de dados central.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-[var(--bg-card)] border-t border-[var(--border-main)] flex gap-4">
          <button 
            onClick={handlePrint}
            className="flex-1 py-4 bg-[var(--border-main)] hover:bg-slate-700 text-[var(--text-main)] font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <Download size={16} />
            Baixar PDF / Imprimir
          </button>
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-[var(--neon-blue)] hover:bg-[var(--neon-blue)]/80 text-[#0a0f1e] font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
