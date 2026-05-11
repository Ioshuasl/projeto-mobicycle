import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  CreditCard, 
  Globe, 
  Users, 
  TrendingUp,
  Award,
  QrCode,
  CreditCard as CardIcon,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { User } from '../types';
import { PaymentService } from '../services/paymentService';

interface LicenseViewProps {
  user: User;
  onActivate: () => void;
  matrixSettings?: any;
}

type PaymentMethod = 'CREDIT_CARD' | 'PIX' | null;

export function LicenseView({ user, onActivate, matrixSettings }: LicenseViewProps) {
  const [isActivating, setIsActivating] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [paymentStep, setPaymentStep] = useState<'SELECT' | 'PROCESSING' | 'PIX_QR' | 'SUCCESS'>('SELECT');
  const [pixQr, setPixQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const adhesionFee = matrixSettings?.adhesionFee || 650;

  const handleActivate = async () => {
    if (!paymentMethod) return;
    
    setIsActivating(true);
    setError(null);
    
    try {
      if (paymentMethod === 'CREDIT_CARD') {
        setPaymentStep('PROCESSING');
        const result = await PaymentService.processCreditCard(user.id, adhesionFee, {});
        if (result.success) {
          await finalizeActivation();
        } else {
          setError(result.error || 'Erro no processamento do cartão');
          setPaymentStep('SELECT');
        }
      } else if (paymentMethod === 'PIX') {
        setPaymentStep('PROCESSING');
        const result = await PaymentService.generatePixQR(user.id, adhesionFee);
        if (result.success && result.qrCode) {
          setPixQr(result.qrCode);
          setPaymentStep('PIX_QR');
        } else {
          setError(result.error || 'Erro ao gerar PIX');
          setPaymentStep('SELECT');
        }
      }
    } catch (error) {
      console.error('Error in payment flow:', error);
      setError('Erro de conexão com o gateway de pagamento');
      setPaymentStep('SELECT');
    } finally {
      setIsActivating(false);
    }
  };

  const finalizeActivation = async () => {
    try {
      const response = await fetch('/api/user/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ userId: user.id })
      });

      if (!response.ok) {
        throw new Error('Falha ao ativar licença no servidor');
      }

      setPaymentStep('SUCCESS');
      setTimeout(() => {
        onActivate();
      }, 2000);
    } catch (error) {
      console.error('Error finalizing activation:', error);
      setError('Pagamento confirmado, mas houve um erro ao ativar sua conta. Entre em contato com o suporte.');
    }
  };

  const handlePixConfirm = async () => {
    setIsActivating(true);
    try {
      // In a real app, we'd poll or wait for a webhook
      const confirmed = await PaymentService.checkPixStatus('mock_id');
      if (confirmed) {
        await finalizeActivation();
      }
    } catch (err) {
      setError('Erro ao verificar status do PIX');
    } finally {
      setIsActivating(false);
    }
  };

  const benefits = [
    {
      icon: <Globe className="text-blue-400" size={20} />,
      title: "Ecossistema Global",
      description: "Acesso total a todas as ferramentas e serviços do ecossistema MOBICYCLE."
    },
    {
      icon: <Users className="text-emerald-400" size={20} />,
      title: "Programa de Expansão",
      description: "Participe do programa de afiliados e construa sua própria rede de parceiros."
    },
    {
      icon: <TrendingUp className="text-purple-400" size={20} />,
      title: "Bônus e Cashback",
      description: "Receba bônus por indicações e cashback em serviços parceiros."
    },
    {
      icon: <Award className="text-yellow-400" size={20} />,
      title: "Plano de Carreira",
      description: "Evolua em nosso plano de carreira e alcance graduações exclusivas."
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight uppercase italic">Licença de Uso</h3>
          <p className="text-[var(--text-muted)] text-sm">Gerencie sua ativação e acesso ao ecossistema.</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl">
          <div className={`w-2 h-2 rounded-full ${user.isActivated ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]'}`} />
          <span className="text-[10px] font-bold text-[var(--text-main)] uppercase tracking-widest">
            Status: {user.isActivated ? 'Ativo' : 'Pendente'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Main License Card */}
        <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-[3rem] p-8 shadow-2xl relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none" />
          
          <div className="relative z-10 flex-1">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20">
              <ShieldCheck className="text-blue-400 w-8 h-8" />
            </div>

            <h4 className="text-3xl font-black text-[var(--text-main)] tracking-tight mb-4">
              {user.isActivated ? 'Sua Licença está Ativa!' : 'Ative sua Licença MOBICYCLE'}
            </h4>
            
            <p className="text-[var(--text-muted)] leading-relaxed mb-8">
              {user.isActivated 
                ? 'Você já possui acesso total ao ecossistema. Aproveite todos os benefícios e ferramentas disponíveis para acelerar seu crescimento.'
                : 'Para começar a usufruir de todos os benefícios do ecossistema MOBICYCLE, participar do plano de carreira e receber bônus, você precisa ativar sua licença de uso.'}
            </p>

            {!user.isActivated && (
              <div className="space-y-6">
                <div className="p-6 bg-blue-600/5 border border-blue-500/10 rounded-3xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Valor da Licença</span>
                    <span className="text-2xl font-black text-[var(--text-main)]">R$ {adhesionFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Pagamento único para acesso vitalício ao ecossistema básico.</p>
                </div>

                <AnimatePresence mode="wait">
                  {paymentStep === 'SELECT' && (
                    <motion.div 
                      key="select"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => setPaymentMethod('CREDIT_CARD')}
                          className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${paymentMethod === 'CREDIT_CARD' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'}`}
                        >
                          <CardIcon size={24} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Cartão</span>
                        </button>
                        <button 
                          onClick={() => setPaymentMethod('PIX')}
                          className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${paymentMethod === 'PIX' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'}`}
                        >
                          <QrCode size={24} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">PIX</span>
                        </button>
                      </div>

                      {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-xs">
                          <AlertCircle size={14} />
                          {error}
                        </div>
                      )}

                      <button 
                        onClick={handleActivate}
                        disabled={isActivating || !paymentMethod}
                        className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 group"
                      >
                        {isActivating ? (
                          <Loader2 className="animate-spin" size={20} />
                        ) : (
                          <>
                            <Zap size={20} className="group-hover:scale-110 transition-transform" />
                            Ativar Agora
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}

                  {paymentStep === 'PROCESSING' && (
                    <motion.div 
                      key="processing"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="py-12 flex flex-col items-center justify-center text-center space-y-4"
                    >
                      <Loader2 className="animate-spin text-blue-500" size={48} />
                      <div>
                        <h5 className="text-[var(--text-main)] font-bold">Processando Pagamento</h5>
                        <p className="text-xs text-[var(--text-muted)]">Aguarde enquanto confirmamos sua transação...</p>
                      </div>
                    </motion.div>
                  )}

                  {paymentStep === 'PIX_QR' && (
                    <motion.div 
                      key="pix"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6 text-center"
                    >
                      <div className="bg text-white p-4 rounded-3xl inline-block mx-auto">
                        <img src={pixQr!} alt="PIX QR Code" className="w-48 h-48" />
                      </div>
                      <div>
                        <h5 className="text-[var(--text-main)] font-bold">Escaneie o QR Code</h5>
                        <p className="text-xs text-[var(--text-muted)] mb-4">Após o pagamento, clique no botão abaixo para confirmar.</p>
                        <button 
                          onClick={handlePixConfirm}
                          disabled={isActivating}
                          className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2"
                        >
                          {isActivating ? <Loader2 className="animate-spin" size={18} /> : 'Já paguei'}
                        </button>
                        <button 
                          onClick={() => setPaymentStep('SELECT')}
                          className="mt-4 text-[10px] text-[var(--text-muted)] uppercase font-bold hover:text-[var(--text-main)] transition-colors"
                        >
                          Voltar
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {paymentStep === 'SUCCESS' && (
                    <motion.div 
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="py-12 flex flex-col items-center justify-center text-center space-y-4"
                    >
                      <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
                        <CheckCircle2 className="text-emerald-500" size={40} />
                      </div>
                      <div>
                        <h5 className="text-[var(--text-main)] font-bold text-xl">Pagamento Confirmado!</h5>
                        <p className="text-xs text-[var(--text-muted)]">Sua licença foi ativada com sucesso. Redirecionando...</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {user.isActivated && (
              <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                  <CheckCircle2 className="text-emerald-400" size={24} />
                </div>
                <div>
                  <p className="text-[var(--text-main)] font-bold">Licença Vitalícia</p>
                  <p className="text-xs text-[var(--text-muted)]">Sua conta está totalmente verificada e ativa.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Benefits List */}
        <div className="space-y-4">
          <h5 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest px-4">Benefícios Inclusos</h5>
          <div className="grid grid-cols-1 gap-4">
            {benefits.map((benefit, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] p-6 rounded-3xl flex items-start gap-4 hover:border-[var(--text-muted)] transition-colors"
              >
                <div className="w-10 h-10 bg-[var(--border-main)] rounded-xl flex items-center justify-center shrink-0">
                  {benefit.icon}
                </div>
                <div>
                  <h6 className="text-sm font-bold text-[var(--text-main)] mb-1">{benefit.title}</h6>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">{benefit.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-[var(--bg-sidebar)] border border-[var(--border-main)] border-dashed rounded-3xl">
            <div className="flex items-center gap-3 text-[var(--text-muted)] mb-2">
              <Shield size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Segurança Garantida</span>
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              Todas as transações são processadas de forma segura através do nosso gateway de pagamento parceiro. Seus dados estão protegidos por criptografia de ponta a ponta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
