import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User as UserIcon, 
  Shield, 
  DollarSign, 
  Users, 
  History, 
  Star, 
  Trophy,
  Mail, 
  Phone, 
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  FileCheck,
  RefreshCw,
  Save,
  Trash2
} from 'lucide-react';
import { User, Transaction } from '../types';
import { formatCPF } from '../utils/validation';
import { getCareerLevel } from '../services/careerService';

interface UserDetailsModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onUpdateDetail?: (userId: string, field: string, value: any) => Promise<boolean>;
  onDeleteUser?: (userId: string) => void | Promise<void>;
  onViewReceipt?: (transaction: Transaction) => void;
}

export function UserDetailsModal({ user, isOpen, onClose, transactions, onUpdateDetail, onDeleteUser, onViewReceipt }: UserDetailsModalProps) {
  const [formData, setFormData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        cpf: user.cpf || '',
        birthDate: user.birthDate || '',
        nickname: user.nickname || '',
        pixKey: user.pixKey || '',
        status: user.status || 'PARTNER',
        documentStatus: user.documentStatus || 'PENDING',
        balance: user.balance || 0,
        cashback_balance: user.cashback_balance || 0,
        snack_fast_cashback: user.snack_fast_cashback || 0,
        energy_cashback: user.energy_cashback || 0,
        guincho_cashback: user.guincho_cashback || 0,
        hability_test_cashback: user.hability_test_cashback || 0,
        voucherBalance: user.voucherBalance || 0,
        debtBalance: (user as any).debtBalance || 0
      });
    }
  }, [user, isOpen]);

  if (!user || !formData) return null;

  const userTransactions = transactions.filter(t => t.userId === user.id);

  const handleSave = async () => {
    if (!onUpdateDetail) return;
    setIsSaving(true);
    try {
      const updates = [
        { field: 'name', value: formData.name },
        { field: 'email', value: formData.email },
        { field: 'phone', value: formData.phone },
        { field: 'cpf', value: formData.cpf },
        { field: 'birth_date', value: formData.birthDate },
        { field: 'nickname', value: formData.nickname },
        { field: 'pix_key', value: formData.pixKey },
        { field: 'status', value: formData.status },
        { field: 'document_status', value: formData.documentStatus },
        { field: 'balance', value: parseFloat(formData.balance) },
        { field: 'cashback_balance', value: parseFloat(formData.cashback_balance) },
        { field: 'snack_fast_cashback', value: parseFloat(formData.snack_fast_cashback) },
        { field: 'energy_cashback', value: parseFloat(formData.energy_cashback) },
        { field: 'guincho_cashback', value: parseFloat(formData.guincho_cashback) },
        { field: 'hability_test_cashback', value: parseFloat(formData.hability_test_cashback) },
        { field: 'voucher_balance', value: parseFloat(formData.voucherBalance) },
        { field: 'debt_balance', value: parseFloat(formData.debtBalance) }
      ];

      for (const update of updates) {
        // Only update if changed
        const originalValue = update.field === 'birth_date' ? user.birthDate : (user as any)[update.field === 'voucher_balance' ? 'voucherBalance' : update.field === 'debt_balance' ? 'debtBalance' : update.field];
        if (update.value !== originalValue) {
          await onUpdateDetail(user.id, update.field, update.value);
        }
      }
      alert("Cadastro atualizado com sucesso!");
    } catch (err) {
      alert("Erro ao salvar algumas alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-sidebar)] sticky top-0 z-10">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-[var(--border-main)] border border-[var(--text-muted)] flex items-center justify-center overflow-hidden shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={32} className="text-[var(--text-muted)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {onUpdateDetail ? (
                    <input 
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="text-2xl font-black text-[var(--text-main)] tracking-tight uppercase italic bg-transparent border-b border-[var(--neon-blue)]/20 outline-none focus:border-[var(--neon-blue)] w-full"
                    />
                  ) : (
                    <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight uppercase italic">{user.name}</h2>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-widest">ID: {user.id}</span>
                    <span className="w-1 h-1 bg-[var(--border-main)] rounded-full" />
                    {onUpdateDetail ? (
                      <select 
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="bg-transparent text-[10px] font-bold uppercase text-[var(--neon-blue)] outline-none border border-[var(--neon-blue)]/20 rounded px-1"
                      >
                        <option value="PARTNER">PARTNER</option>
                        <option value="ELITE">ELITE</option>
                        <option value="MASTER">MASTER</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        user.status === 'MASTER' ? 'bg-purple-500/20 text-purple-400' : 
                        user.status === 'ELITE' ? 'bg-yellow-500/20 text-yellow-400' : 
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {user.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onDeleteUser && (
                  <button
                    type="button"
                    onClick={() => void onDeleteUser(user.id)}
                    className="flex items-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-2xl text-sm font-bold transition-all"
                  >
                    <Trash2 size={18} />
                    Excluir
                  </button>
                )}
                {onUpdateDetail && (
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-[var(--neon-blue)] hover:bg-[var(--neon-blue)]/80 text-[#0a0f1e] rounded-2xl text-sm font-bold transition-all shadow-lg shadow-[var(--neon-blue)]/20 disabled:opacity-50"
                  >
                    {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="p-3 hover:bg-[var(--border-main)] rounded-2xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Personal Info */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoCard 
                      icon={<Mail size={16} />} 
                      label="E-mail" 
                      value={formData.email} 
                      onChange={onUpdateDetail ? (val) => setFormData({ ...formData, email: val }) : undefined}
                    />
                    <InfoCard 
                      icon={<Phone size={16} />} 
                      label="Telefone" 
                      value={formData.phone} 
                      onChange={onUpdateDetail ? (val) => setFormData({ ...formData, phone: val }) : undefined}
                    />
                    <InfoCard 
                      icon={<CreditCard size={16} />} 
                      label="CPF" 
                      value={formData.cpf} 
                      onChange={onUpdateDetail ? (val) => setFormData({ ...formData, cpf: val }) : undefined}
                    />
                    <InfoCard 
                      icon={<Calendar size={16} />} 
                      label="Data Nasc. (AAAA-MM-DD)" 
                      value={formData.birthDate} 
                      onChange={onUpdateDetail ? (val) => setFormData({ ...formData, birthDate: val }) : undefined}
                    />
                    <InfoCard icon={<Trophy size={16} />} label="Nível de Carreira" value={getCareerLevel(user.cycleSalesCount || 0).name} />
                    <InfoCard icon={<Users size={16} />} label="Indicações" value={`${user.referralsCount} Diretas`} />
                    <InfoCard icon={<RefreshCw size={16} />} label="Vendas Ciclo" value={`${(user as any).cycleSalesCount || 0}`} />
                    <InfoCard 
                      icon={<Shield size={16} />} 
                      label="Saldo Devedor" 
                      value={formData.debtBalance.toString()} 
                      onChange={onUpdateDetail ? (val) => setFormData({ ...formData, debtBalance: val }) : undefined}
                      type="number"
                    />
                    
                    {onUpdateDetail && (
                      <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] p-4 rounded-2xl flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--border-main)] flex items-center justify-center text-[var(--text-muted)] shrink-0">
                          <FileCheck size={16} />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest">Status Documentos</p>
                          <select 
                            value={formData.documentStatus}
                            onChange={(e) => setFormData({ ...formData, documentStatus: e.target.value })}
                            className="bg-transparent text-sm text-[var(--text-main)] font-bold outline-none w-full"
                          >
                            <option value="PENDING">Pendente</option>
                            <option value="VALIDATED">Validado</option>
                            <option value="REJECTED">Rejeitado</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Financial Summary */}
                  <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl p-6">
                    <h3 className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest mb-6 flex items-center gap-2">
                      <DollarSign size={16} />
                      Resumo Financeiro
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">Saldo Disponível</p>
                        {onUpdateDetail ? (
                          <input 
                            type="number"
                            value={formData.balance}
                            onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                            className="bg-transparent text-3xl font-black text-emerald-400 outline-none w-full"
                          />
                        ) : (
                          <p className="text-3xl font-black text-emerald-400">R$ {(user.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">Cashback Acumulado</p>
                        {onUpdateDetail ? (
                          <input 
                            type="number"
                            value={formData.cashback_balance}
                            onChange={(e) => setFormData({ ...formData, cashback_balance: e.target.value })}
                            className="bg-transparent text-3xl font-black text-blue-400 outline-none w-full"
                          />
                        ) : (
                          <p className="text-3xl font-black text-blue-400">R$ {(user.cashback_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">MOBICYCLE Snack Cashback</p>
                        {onUpdateDetail ? (
                          <input 
                            type="number"
                            value={formData.snack_fast_cashback}
                            onChange={(e) => setFormData({ ...formData, snack_fast_cashback: e.target.value })}
                            className="bg-transparent text-3xl font-black text-yellow-500 outline-none w-full"
                          />
                        ) : (
                          <p className="text-3xl font-black text-yellow-500">R$ {user.snack_fast_cashback?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">Energy Cashback</p>
                        {onUpdateDetail ? (
                          <input 
                            type="number"
                            value={formData.energy_cashback}
                            onChange={(e) => setFormData({ ...formData, energy_cashback: e.target.value })}
                            className="bg-transparent text-3xl font-black text-indigo-400 outline-none w-full"
                          />
                        ) : (
                          <p className="text-3xl font-black text-indigo-400">R$ {user.energy_cashback?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">MOBICYCLE Guincho Cashback</p>
                        {onUpdateDetail ? (
                          <input 
                            type="number"
                            value={formData.guincho_cashback}
                            onChange={(e) => setFormData({ ...formData, guincho_cashback: e.target.value })}
                            className="bg-transparent text-3xl font-black text-purple-400 outline-none w-full"
                          />
                        ) : (
                          <p className="text-3xl font-black text-purple-400">R$ {user.guincho_cashback?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">MOBICYCLE Hability Cashback</p>
                        {onUpdateDetail ? (
                          <input 
                            type="number"
                            value={formData.hability_test_cashback}
                            onChange={(e) => setFormData({ ...formData, hability_test_cashback: e.target.value })}
                            className="bg-transparent text-3xl font-black text-orange-400 outline-none w-full"
                          />
                        ) : (
                          <p className="text-3xl font-black text-orange-400">R$ {user.hability_test_cashback?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">Voucher</p>
                        {onUpdateDetail ? (
                          <input 
                            type="number"
                            value={formData.voucherBalance}
                            onChange={(e) => setFormData({ ...formData, voucherBalance: e.target.value })}
                            className="bg-transparent text-3xl font-black text-purple-400 outline-none w-full"
                          />
                        ) : (
                          <p className="text-3xl font-black text-purple-400">R$ {user.voucherBalance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats Sidebar */}
                <div className="space-y-4">
                  <div className="bg-[var(--border-main)] border border-[var(--border-main)] rounded-3xl p-6">
                    <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-tight mb-4">Informações Adicionais</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[var(--text-muted)]">Nickname</span>
                        {onUpdateDetail ? (
                          <input 
                            type="text"
                            value={formData.nickname}
                            onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                            className="bg-transparent text-xs text-[var(--text-main)] font-mono outline-none border-b border-[var(--neon-blue)]/20 text-right"
                          />
                        ) : (
                          <span className="text-xs text-[var(--text-main)] font-mono">{user.nickname || '-'}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[var(--text-muted)]">Chave PIX</span>
                        {onUpdateDetail ? (
                          <input 
                            type="text"
                            value={formData.pixKey}
                            onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })}
                            className="bg-transparent text-xs text-[var(--text-main)] font-mono outline-none border-b border-[var(--neon-blue)]/20 text-right"
                          />
                        ) : (
                          <span className="text-xs text-[var(--text-main)] font-mono">{user.pixKey || 'Não informada'}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[var(--text-muted)]">Código Ref.</span>
                        <span className="text-xs text-blue-400 font-bold">{user.referralCode || '-'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-600/5 border border-blue-500/20 rounded-3xl p-6">
                    <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-2">Status de Acesso</h3>
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-blue-500" />
                      <span className="text-sm text-[var(--text-main)] font-bold">{user.role === 'admin' ? 'Administrador Mobicycle' : 'Usuário Parceiro'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction History */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight flex items-center gap-2">
                    <History size={20} className="text-[var(--text-muted)]" />
                    Histórico de Transações
                  </h3>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">{userTransactions.length} Registros</span>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-[var(--bg-sidebar)] text-[var(--text-muted)] uppercase text-[10px] font-mono tracking-widest">
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4">Tipo</th>
                        <th className="px-6 py-4">Valor</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-main)]">
                      {userTransactions.length > 0 ? (
                        userTransactions.map((t) => (
                          <tr key={t.id} className="hover:bg-[var(--glass-bg)] transition-colors">
                            <td className="px-6 py-4 text-xs text-[var(--text-muted)] font-mono">
                              {new Date(t.createdAt).toLocaleString('pt-BR')}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-bold text-[var(--text-main)] uppercase">{t.type}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1">
                                {t.amount > 0 ? (
                                  <ArrowUpRight size={12} className="text-emerald-500" />
                                ) : (
                                  <ArrowDownRight size={12} className="text-red-500" />
                                )}
                                <span className={`font-bold ${t.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  R$ {Math.abs(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  t.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 
                                  t.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' : 
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {t.status}
                                </span>
                                {onViewReceipt && (
                                  <button 
                                    onClick={() => onViewReceipt(t)}
                                    className="p-1 hover:bg-[var(--border-main)] rounded text-[var(--text-muted)] hover:text-[var(--neon-blue)] transition-all"
                                    title="Ver Comprovante"
                                  >
                                    <ArrowUpRight size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-[var(--text-muted)] italic">
                            Nenhuma transação encontrada para este usuário.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function InfoCard({ icon, label, value, onChange, type = "text" }: { icon: React.ReactNode; label: string; value: string; onChange?: (val: string) => void; type?: string }) {
  return (
    <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] p-4 rounded-2xl flex items-center gap-4 transition-all hover:border-[var(--neon-blue)]/30">
      <div className="w-10 h-10 rounded-xl bg-[var(--border-main)] flex items-center justify-center text-[var(--text-muted)] shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest">{label}</p>
        {onChange ? (
          <input 
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent text-sm text-[var(--text-main)] font-bold outline-none border-b border-transparent focus:border-[var(--neon-blue)]/50 transition-all"
          />
        ) : (
          <p className="text-sm text-[var(--text-main)] font-bold truncate">{value}</p>
        )}
      </div>
    </div>
  );
}
