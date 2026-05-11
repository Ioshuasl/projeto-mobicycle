import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, DollarSign, QrCode, AlertCircle, CheckCircle2, ArrowRight, Wallet, Copy, Info } from 'lucide-react';
import { User } from '../types';

interface DepositModalProps {
  user: User;
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
}

export function DepositModal({ user, onClose, onSuccess }: DepositModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPixInfo, setShowPixInfo] = useState(false);

  const handleCopyPix = () => {
    navigator.clipboard.writeText('47.123.456/0001-89');
    // We could add a toast here if we had a global toast system
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const depositAmount = parseFloat(amount.replace(',', '.'));
    
    if (isNaN(depositAmount) || depositAmount <= 0) {
      setError('Por favor, insira um valor válido para o depósito.');
      return;
    }

    if (!showPixInfo) {
      setShowPixInfo(true);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/financial/deposit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          amount: depositAmount
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess(data.user);
          onClose();
        }, 2000);
      } else {
        setError(data.error || 'Erro ao processar depósito.');
      }
    } catch (err) {
      setError('Erro de conexão ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-[var(--bg-card)] border border-[var(--border-main)] w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-sidebar)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--neon-blue)]/10 rounded-xl flex items-center justify-center text-[var(--neon-blue)]">
              <DollarSign size={20} />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-main)] uppercase italic tracking-tight">
              Depositar Fundos
            </h3>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-4"
              >
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                  <CheckCircle2 size={48} />
                </div>
                <h4 className="text-xl font-black text-[var(--text-main)] uppercase italic">Depósito Confirmado!</h4>
                <p className="text-[var(--text-muted)] text-sm">
                  Seu saldo foi atualizado com sucesso.
                </p>
              </motion.div>
            ) : (
              <motion.form 
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSubmit} 
                className="space-y-6"
              >
                {!showPixInfo ? (
                  <>
                    <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Saldo Atual</p>
                        <p className="text-2xl font-black text-[var(--text-main)]">
                          R$ {user.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <Wallet className="text-slate-700" size={32} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Valor do Depósito (R$)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                        <input 
                          type="text"
                          placeholder="0,00"
                          className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl py-4 pl-12 pr-4 text-[var(--text-main)] text-lg font-black focus:border-[var(--neon-blue)] outline-none transition-all placeholder:text-slate-800"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value.replace(/[^0-9,.]/g, ''))}
                          required
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-3">
                      <Info className="text-blue-400 shrink-0" size={18} />
                      <p className="text-[10px] text-[var(--text-muted)] leading-relaxed font-medium">
                        O valor depositado será creditado imediatamente em sua conta para uso no sistema.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center space-y-4">
                      <div className="w-48 h-48 bg text-white p-4 rounded-3xl mx-auto shadow-2xl">
                        <QrCode size="100%" className="text-slate-900" />
                      </div>
                      <p className="text-xs text-[var(--text-muted)] font-medium">
                        Escaneie o QR Code acima ou utilize a chave PIX abaixo para realizar o pagamento de <span className="text-[var(--text-main)] font-bold">R$ {parseFloat(amount.replace(',', '.')).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Chave PIX (CNPJ)</label>
                      <div className="relative group">
                        <input 
                          type="text"
                          readOnly
                          value="47.123.456/0001-89"
                          className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl py-4 px-4 text-[var(--text-main)] text-sm font-bold outline-none"
                        />
                        <button 
                          type="button"
                          onClick={handleCopyPix}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[var(--border-main)] hover:bg-slate-700 text-[var(--text-main)] rounded-lg transition-all"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl flex gap-3">
                      <AlertCircle className="text-yellow-500 shrink-0" size={18} />
                      <p className="text-[10px] text-[var(--text-muted)] leading-relaxed font-medium">
                        Após realizar o pagamento, clique no botão abaixo para confirmar. Em um ambiente real, a confirmação seria automática.
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400"
                  >
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-bold leading-relaxed">{error}</p>
                  </motion.div>
                )}

                <div className="pt-4 flex gap-3">
                  {showPixInfo && (
                    <button 
                      type="button"
                      onClick={() => setShowPixInfo(false)}
                      className="px-6 bg-[var(--border-main)] hover:bg-slate-700 text-[var(--text-main)] font-black rounded-2xl transition-all uppercase tracking-widest text-xs"
                    >
                      Voltar
                    </button>
                  )}
                  <button 
                    type="submit"
                    disabled={loading || !amount}
                    className="flex-1 bg-[var(--neon-blue)] hover:brightness-110 disabled:opacity-50 text-[#0a0f1e] font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20 uppercase tracking-widest text-xs"
                  >
                    {loading ? 'Processando...' : (
                      <>
                        {showPixInfo ? 'Confirmar Pagamento' : 'Continuar para Pagamento'}
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
