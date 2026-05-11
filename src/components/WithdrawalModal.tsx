import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, DollarSign, CreditCard, AlertCircle, CheckCircle2, ArrowRight, Wallet, FileText, RefreshCw, FileCode } from 'lucide-react';
import { User } from '../types';
import { validateNFS } from '../services/fiscalService';

interface WithdrawalModalProps {
  user: User;
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
  matrixSettings?: any;
}

export function WithdrawalModal({ user, onClose, onSuccess, matrixSettings }: WithdrawalModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState<string>('');
  const [pixKey, setPixKey] = useState<string>(user.pixKey || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // XML States
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [isValidatingXml, setIsValidatingXml] = useState(false);
  const [xmlValidationResult, setXmlValidationResult] = useState<{ valid: boolean; message: string } | null>(null);

  const handleXmlValidation = async () => {
    if (!xmlFile) return;
    
    setIsValidatingXml(true);
    setXmlValidationResult(null);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        // Using a dummy CNPJ for MOBICYCLE
        const result = await validateNFS(content, user.referralsCount || 0, '47.123.456/0001-89', matrixSettings?.cashboardBonus || 3990);
        setXmlValidationResult(result);
        setIsValidatingXml(false);
        
        if (result.valid) {
          setTimeout(() => {
            setStep(2);
          }, 1000);
        }
      };
      reader.readAsText(xmlFile);
    } catch (err) {
      setXmlValidationResult({ valid: false, message: 'Erro ao ler o arquivo.' });
      setIsValidatingXml(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const withdrawalAmount = parseFloat(amount.replace(',', '.'));
    
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      setError('Por favor, insira um valor válido para o saque.');
      return;
    }

    if (withdrawalAmount > user.balance) {
      setError('Saldo insuficiente para realizar este saque.');
      return;
    }

    if (!pixKey.trim()) {
      setError('Por favor, insira uma chave PIX válida.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/financial/withdraw', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          amount: withdrawalAmount,
          pixKey: pixKey
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
        setError(data.error || 'Erro ao processar solicitação de saque.');
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
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
              <DollarSign size={20} />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-main)] uppercase italic tracking-tight">
              {step === 1 ? 'Validar NFS-e XML' : 'Solicitar Saque'}
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
                <h4 className="text-xl font-black text-[var(--text-main)] uppercase italic">Solicitação Enviada!</h4>
                <p className="text-[var(--text-muted)] text-sm">
                  Seu pedido de saque foi registrado com sucesso e será processado em breve.
                </p>
              </motion.div>
            ) : step === 1 ? (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2 mb-6">
                  <p className="text-[var(--text-muted)] text-sm">
                    Para liberar o saque, é necessário validar o XML da sua NFS-e.
                  </p>
                </div>

                <div 
                  className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer ${
                    xmlFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-[var(--border-main)] hover:border-blue-500/50 hover:bg-blue-500/5'
                  }`}
                  onClick={() => document.getElementById('xml-upload-withdrawal')?.click()}
                >
                  <input 
                    type="file" 
                    id="xml-upload-withdrawal" 
                    className="hidden" 
                    accept=".xml"
                    onChange={(e) => setXmlFile(e.target.files?.[0] || null)}
                  />
                  {xmlFile ? (
                    <>
                      <FileCode className="w-12 h-12 text-emerald-500 mb-4" />
                      <span className="text-emerald-400 font-bold text-sm truncate max-w-full px-4">{xmlFile.name}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setXmlFile(null); setXmlValidationResult(null); }}
                        className="mt-2 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-main)] uppercase font-black"
                      >
                        Trocar arquivo
                      </button>
                    </>
                  ) : (
                    <>
                      <FileText className="w-12 h-12 text-slate-700 mb-4" />
                      <span className="text-[var(--text-muted)] font-bold">Selecionar XML</span>
                      <span className="text-[10px] text-slate-600 mt-2 uppercase font-black tracking-widest">NFS-e Obrigatória</span>
                    </>
                  )}
                </div>

                {xmlValidationResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl text-xs font-bold flex items-center gap-3 ${
                      xmlValidationResult.valid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}
                  >
                    {xmlValidationResult.valid ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {xmlValidationResult.message}
                  </motion.div>
                )}

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={handleXmlValidation}
                    disabled={!xmlFile || isValidatingXml}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20 uppercase tracking-widest text-xs"
                  >
                    {isValidatingXml ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        Validando...
                      </>
                    ) : (
                      <>
                        Validar XML
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
                
                <button 
                  onClick={() => setStep(2)}
                  className="w-full text-[var(--text-muted)] hover:text-[var(--text-main)] text-[10px] font-black uppercase tracking-widest py-2 transition-colors"
                >
                  Pular validação (Apenas se já validado)
                </button>
              </motion.div>
            ) : (
              <motion.form 
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSubmit} 
                className="space-y-6"
              >
                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Saldo Disponível (Ciclo CashBoard)</p>
                    <p className="text-2xl font-black text-emerald-400">
                      R$ {user.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <Wallet className="text-slate-700" size={32} />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Valor do Saque (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                    <input 
                      type="text"
                      placeholder="0,00"
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl py-4 pl-12 pr-4 text-[var(--text-main)] text-lg font-black focus:border-emerald-500 outline-none transition-all placeholder:text-slate-800"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9,.]/g, ''))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Chave PIX para Recebimento</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                    <input 
                      type="text"
                      placeholder="CPF, E-mail, Telefone ou Chave Aleatória"
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl py-4 pl-12 pr-4 text-[var(--text-main)] text-sm font-bold focus:border-emerald-500 outline-none transition-all placeholder:text-slate-800"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      required
                    />
                  </div>
                </div>

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
                  <button 
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-6 bg-[var(--border-main)] hover:bg-slate-700 text-[var(--text-main)] font-black rounded-2xl transition-all uppercase tracking-widest text-xs"
                  >
                    Voltar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading || !amount || !pixKey}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-[#0a0f1e] font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/20 uppercase tracking-widest text-xs"
                  >
                    {loading ? 'Processando...' : (
                      <>
                        Solicitar Saque
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[10px] text-[var(--text-muted)] text-center leading-relaxed">
                  * O prazo para processamento de saques é de até 24 horas úteis. 
                  Certifique-se de que a chave PIX está correta.
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
