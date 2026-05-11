import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, User as UserIcon, Camera, Phone, CreditCard, Calendar, Save, Mail, AlertCircle, FileText, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { User } from '../types';
import { validateEmail, validatePhone, formatPhone } from '../utils/validation';
import { LEGAL_CLAUSES } from '../services/financialService';
import { DocumentManager } from './DocumentManager';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onUpdate: (updatedUser: User) => void;
  matrixSettings?: {
    adhesionFee: number;
    onboardBonus: number;
    cashboardBonus: number;
    referralBonus: number;
    minReferralsToCycle: number;
  };
}

export function ProfileModal({ user, onClose, onUpdate, matrixSettings }: ProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'documents'>('profile');
  const [formData, setFormData] = useState({
    id: user.id,
    name: user.name,
    nickname: user.nickname || '',
    email: user.email,
    phone: user.phone || '',
    pixKey: user.pixKey || '',
    birthDate: user.birthDate || '',
    avatar: user.avatar || '',
    reentryMode: user.reentryMode || 'AUTO',
    bankName: user.bankName || '',
    bankAgency: user.bankAgency || '',
    bankAccount: user.bankAccount || '',
    bankAccountType: user.bankAccountType || 'CORRENTE',
    password: '',
    confirmPassword: ''
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateField = (name: string, value: string) => {
    let error = '';
    if (name === 'email' && value && !validateEmail(value)) {
      error = 'E-mail inválido';
    } else if (name === 'phone' && value && !validatePhone(value)) {
      error = 'Telefone inválido (mínimo 10 dígitos)';
    } else if (name === 'confirmPassword' && value !== formData.password) {
      error = 'As senhas não coincidem';
    }
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, (formData as any)[name]);
  };

  const handleChange = (name: string, value: string) => {
    let formattedValue = value;
    if (name === 'phone') formattedValue = formatPhone(value);

    setFormData(prev => ({ ...prev, [name]: formattedValue }));
    if (touched[name]) {
      validateField(name, formattedValue);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation
    const newErrors: Record<string, string> = {};
    if (!validateEmail(formData.email)) newErrors.email = 'E-mail inválido';
    if (formData.phone && !validatePhone(formData.phone)) newErrors.phone = 'Telefone inválido';
    if (formData.password && formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'As senhas não coincidem';

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setTouched({ email: true, phone: true, confirmPassword: true });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': formData.id
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (response.ok) {
        onUpdate(data);
        onClose();
      } else {
        alert(data.error || 'Erro ao atualizar perfil');
      }
    } catch (err) {
      alert('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const renderFieldError = (name: string) => {
    if (touched[name] && fieldErrors[name]) {
      return (
        <div className="flex items-center gap-1 mt-1 text-red-500 text-[10px] font-medium animate-in fade-in slide-in-from-top-1">
          <AlertCircle size={10} />
          {fieldErrors[name]}
        </div>
      );
    }
    return null;
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
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-[var(--bg-card)] border border-[var(--border-main)] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-sidebar)] shrink-0">
          <h3 className="text-xl font-bold text-[var(--text-main)]">Meu Perfil</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--border-main)] bg-[var(--bg-sidebar)] shrink-0">
          <button 
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${activeTab === 'profile' ? 'text-blue-500 border-b-2 border-blue-500 text-[var(--text-main)]' : 'text-[var(--text-muted)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-main)]'}`}
          >
            <UserIcon size={14} />
            Dados do Perfil
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${activeTab === 'documents' ? 'text-blue-500 border-b-2 border-blue-500 text-[var(--text-main)]' : 'text-[var(--text-muted)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-main)]'}`}
          >
            <FileText size={14} />
            Documentos
            {user.documentStatus === 'VALIDATED' && <ShieldCheck size={12} className="text-emerald-500" />}
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {activeTab === 'profile' ? (
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <div className="w-28 h-28 rounded-full bg-[var(--bg-main)] border-4 border-blue-500/20 overflow-hidden flex items-center justify-center shadow-inner relative">
                {formData.avatar ? (
                  <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={48} className="text-[var(--text-muted)]" />
                )}
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={24} className="text-[var(--text-main)]" />
                </div>
              </div>
              
              <label className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-500 transition-colors shadow-xl border-4 border-[var(--bg-card)]">
                <Camera size={18} className="text-[var(--text-main)]" />
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
              </label>

              {formData.avatar && (
                <button 
                  type="button"
                  onClick={() => setFormData({ ...formData, avatar: '' })}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-white rounded-full flex items-center justify-center transition-all border border-red-500/20"
                  title="Remover foto"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="text-center mt-4">
              <p className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-widest">Foto de Perfil</p>
              <p className="text-[10px] text-slate-600 mt-1">PNG, JPG ou GIF (Max. 2MB)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Nome Completo</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                <input 
                  type="text"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl py-3 pl-10 pr-4 text-[var(--text-main)] text-sm focus:border-blue-500 outline-none transition-all"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Apelido de Login</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                <input 
                  type="text"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl py-3 pl-10 pr-4 text-[var(--text-main)] text-sm focus:border-blue-500 outline-none transition-all"
                  value={formData.nickname}
                  onChange={(e) => handleChange('nickname', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                <input 
                  type="email"
                  className={`w-full bg-[var(--bg-main)] border ${touched.email && fieldErrors.email ? 'border-red-500/50' : 'border-[var(--border-main)]'} rounded-xl py-3 pl-10 pr-4 text-[var(--text-main)] text-sm focus:border-blue-500 outline-none transition-all`}
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                />
                {renderFieldError('email')}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Telefone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                <input 
                  type="text"
                  className={`w-full bg-[var(--bg-main)] border ${touched.phone && fieldErrors.phone ? 'border-red-500/50' : 'border-[var(--border-main)]'} rounded-xl py-3 pl-10 pr-4 text-[var(--text-main)] text-sm focus:border-blue-500 outline-none transition-all`}
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  onBlur={() => handleBlur('phone')}
                />
                {renderFieldError('phone')}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Chave PIX</label>
              <div className="relative">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                <input 
                  type="text"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl py-3 pl-10 pr-4 text-[var(--text-main)] text-sm focus:border-blue-500 outline-none transition-all"
                  value={formData.pixKey}
                  onChange={(e) => handleChange('pixKey', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Data de Nascimento</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                <input 
                  type="date"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl py-3 pl-10 pr-4 text-[var(--text-main)] text-sm focus:border-blue-500 outline-none transition-all"
                  value={formData.birthDate}
                  onChange={(e) => handleChange('birthDate', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Nova Senha</label>
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                <input 
                  type="password"
                  placeholder="Deixe em branco para manter"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl py-3 pl-10 pr-4 text-[var(--text-main)] text-sm focus:border-blue-500 outline-none transition-all"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                <input 
                  type="password"
                  placeholder="Repita a nova senha"
                  className={`w-full bg-[var(--bg-main)] border ${touched.confirmPassword && fieldErrors.confirmPassword ? 'border-red-500/50' : 'border-[var(--border-main)]'} rounded-xl py-3 pl-10 pr-4 text-[var(--text-main)] text-sm focus:border-blue-500 outline-none transition-all`}
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                />
                {renderFieldError('confirmPassword')}
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl p-6 space-y-6">
            <div>
              <h4 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-widest flex items-center gap-2">
                <CreditCard size={16} className="text-blue-400" />
                Dados Bancários para Saque
              </h4>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Vincule sua conta bancária para recebimento de bônus e comissões</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Banco</label>
                <input 
                  type="text"
                  placeholder="Ex: Nubank, Itaú, Bradesco"
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl py-3 px-4 text-[var(--text-main)] text-sm focus:border-blue-500 outline-none transition-all"
                  value={formData.bankName}
                  onChange={(e) => handleChange('bankName', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Tipo de Conta</label>
                <select 
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl py-3 px-4 text-[var(--text-main)] text-sm focus:border-blue-500 outline-none transition-all"
                  value={formData.bankAccountType}
                  onChange={(e) => handleChange('bankAccountType', e.target.value)}
                >
                  <option value="CORRENTE">Conta Corrente</option>
                  <option value="POUPANCA">Conta Poupança</option>
                  <option value="PAGAMENTO">Conta de Pagamento</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Agência</label>
                <input 
                  type="text"
                  placeholder="0001"
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl py-3 px-4 text-[var(--text-main)] text-sm focus:border-blue-500 outline-none transition-all"
                  value={formData.bankAgency}
                  onChange={(e) => handleChange('bankAgency', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Número da Conta</label>
                <input 
                  type="text"
                  placeholder="12345-6"
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl py-3 px-4 text-[var(--text-main)] text-sm focus:border-blue-500 outline-none transition-all"
                  value={formData.bankAccount}
                  onChange={(e) => handleChange('bankAccount', e.target.value)}
                />
              </div>
            </div>

            <div className="p-3 bg-blue-600/5 border border-blue-500/10 rounded-xl flex items-start gap-3">
              <AlertCircle size={14} className="text-blue-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                Certifique-se de que a conta bancária informada pertence ao mesmo CPF cadastrado na MOBICYCLE para evitar atrasos no processamento dos saques.
              </p>
            </div>
          </div>

          <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[var(--text-main)]">Modo de Reentrada</h4>
                <p className="text-[10px] text-[var(--text-muted)]">Escolha como deseja reentrar no sistema após ciclar do Cash-Board</p>
              </div>
              <div className="flex bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border-main)]">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, reentryMode: 'AUTO' })}
                  className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${formData.reentryMode === 'AUTO' ? ' text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                  AUTOMÁTICO
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, reentryMode: 'MANUAL' })}
                  className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${formData.reentryMode === 'MANUAL' ? ' text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                  MANUAL
                </button>
              </div>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] italic leading-relaxed">
              {formData.reentryMode === 'AUTO' 
                ? `* No modo automático, o valor da reentrada (R$ ${(matrixSettings?.adhesionFee || 650).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) é descontado do seu bônus de ciclo e você retorna imediatamente para a matriz On-Board.`
                : "* No modo manual, você recebe o bônus total e deve adquirir uma nova licença manualmente se desejar retornar ao sistema."}
            </p>
          </div>

          {/* Terms of Use Section */}
          <div className="border border-[var(--border-main)] rounded-2xl overflow-hidden bg-[var(--bg-sidebar)]">
            <button 
              type="button"
              onClick={() => setShowTerms(!showTerms)}
              className="w-full p-4 flex items-center justify-between hover:bg-[var(--bg-sidebar)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-blue-400" />
                <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-widest">Termos de Uso e Condições</span>
              </div>
              {showTerms ? <ChevronUp size={18} className="text-[var(--text-muted)]" /> : <ChevronDown size={18} className="text-[var(--text-muted)]" />}
            </button>
            
            {showTerms && (
              <div className="p-4 border-t border-[var(--border-main)] space-y-4 max-h-48 overflow-y-auto bg-[var(--bg-card)]">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">Cláusula de Solidariedade de Rede</h4>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed italic">
                    "{LEGAL_CLAUSES.SOLIDARITY}"
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">Cláusula de Taxa Administrativa</h4>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed italic">
                    "{LEGAL_CLAUSES.ADMIN_TAX}"
                  </p>
                </div>
                <div className="p-3 bg-blue-600/5 border border-blue-500/10 rounded-xl">
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                    Ao manter seu cadastro ativo, você concorda com as regras de estorno e débito retroativo (Clawback) para garantir a neutralidade financeira da rede.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 space-y-3">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-900/20"
            >
              <Save size={20} />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>

            {user.status !== 'MASTER' && (
              <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Acesso de Desenvolvedor</h4>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      Como este é um ambiente de demonstração, você pode se promover a MASTER para testar as funcionalidades administrativas.
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={async () => {
                    if (confirm("Deseja se promover a MASTER para acessar o painel administrativo?")) {
                      setLoading(true);
                      try {
                        const res = await fetch(`/api/admin/users/${user.id}/status`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'MASTER' })
                        });
                        if (res.ok) {
                          window.location.reload();
                        }
                      } catch (err) {
                        alert("Erro ao promover");
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                  disabled={loading}
                  className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-3 border border-yellow-600/20"
                >
                  Promover a MASTER (Acesso Admin)
                </button>
              </div>
            )}
          </div>
        </form>
      ) : (
            <div className="p-8">
              <DocumentManager user={user} hideHeader={true} />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
