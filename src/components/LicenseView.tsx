import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Users,
  TrendingUp,
  Award,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { User } from '../types';
import { PaymentService } from '../services/paymentService';

interface LicenseViewProps {
  user: User;
  onActivate: () => void;
  matrixSettings?: any;
}

type CheckoutPhase = 'idle' | 'opening' | 'awaiting_payment' | 'success';

const POLL_MS = 2500;
const POLL_MAX_MS = 20 * 60 * 1000;

export function LicenseView({ user, onActivate, matrixSettings }: LicenseViewProps) {
  const [checkoutPhase, setCheckoutPhase] = useState<CheckoutPhase>('idle');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingTimedOut, setAwaitingTimedOut] = useState(false);
  const pollDeadlineRef = useRef<number>(0);

  const adhesionFee = matrixSettings?.adhesionFee || 650;

  useEffect(() => {
    console.log('[debug:license][LicenseView] props.user', {
      id: user.id,
      isActivated: user.isActivated,
      checkoutPhase,
    });
  }, [user.id, user.isActivated, checkoutPhase]);

  useEffect(() => {
    if (checkoutPhase !== 'awaiting_payment') return;
    console.log('[debug:license][LicenseView] iniciando poll /api/me até licença ativa');

    pollDeadlineRef.current = Date.now() + POLL_MAX_MS;
    setAwaitingTimedOut(false);

    let intervalId: number | undefined;

    const tick = async () => {
      if (Date.now() > pollDeadlineRef.current) {
        if (intervalId !== undefined) window.clearInterval(intervalId);
        setAwaitingTimedOut(true);
        return;
      }
      try {
        const activated = await PaymentService.isUserLicenseActivated();
        if (activated) {
          console.log('[debug:license][LicenseView] poll: licença ATIVA — indo para success + onActivate');
          if (intervalId !== undefined) window.clearInterval(intervalId);
          setCheckoutPhase('success');
          setTimeout(() => onActivate(), 1500);
        }
      } catch {
        /* ignorar falhas pontuais de rede */
      }
    };

    void tick();
    intervalId = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [checkoutPhase, onActivate]);

  const handleActivate = async () => {
    console.log('[debug:license][LicenseView] Ativar agora clicado');
    setError(null);
    setIsBusy(true);
    setAwaitingTimedOut(false);

    // Não use `noopener` na string de features: em Chrome/Chromium isso faz `window.open` retornar `null`.
    const paymentTab = window.open('about:blank', '_blank');
    if (!paymentTab) {
      setError('Não foi possível abrir a nova aba. Permita pop-ups para este site e tente de novo.');
      setIsBusy(false);
      return;
    }
    try {
      paymentTab.opener = null;
    } catch {
      /* ignore */
    }

    setCheckoutPhase('opening');

    try {
      const result = await PaymentService.startLicenseCheckoutPro();
      if (result.ok === true) {
        console.log('[debug:license][LicenseView] redirecionando aba para checkoutUrl');
        paymentTab.location.href = result.checkoutUrl;
        setCheckoutPhase('awaiting_payment');
      } else {
        paymentTab.close();
        setError(result.error);
        setCheckoutPhase('idle');
        setIsBusy(false);
        return;
      }
    } catch (e) {
      paymentTab.close();
      console.error('License checkout:', e);
      setError('Erro de conexão ao iniciar o pagamento. Tente novamente.');
      setCheckoutPhase('idle');
    } finally {
      setIsBusy(false);
    }
  };

  const handleRecheckNow = async () => {
    console.log('[debug:license][LicenseView] Verificar agora (manual)');
    setIsBusy(true);
    setError(null);
    try {
      const activated = await PaymentService.isUserLicenseActivated();
      if (activated) {
        setCheckoutPhase('success');
        setTimeout(() => onActivate(), 1500);
      } else {
        setError('Pagamento ainda não confirmado. Conclua o pagamento na aba do Mercado Pago e aguarde alguns segundos.');
      }
    } catch {
      setError('Não foi possível verificar o status. Tente novamente.');
    } finally {
      setIsBusy(false);
    }
  };

  const benefits = [
    {
      icon: <Globe className="text-blue-400" size={20} />,
      title: 'Ecossistema Global',
      description: 'Acesso total a todas as ferramentas e serviços do ecossistema MOBICYCLE.',
    },
    {
      icon: <Users className="text-emerald-400" size={20} />,
      title: 'Programa de Expansão',
      description: 'Participe do programa de afiliados e construa sua própria rede de parceiros.',
    },
    {
      icon: <TrendingUp className="text-purple-400" size={20} />,
      title: 'Bônus e Cashback',
      description: 'Receba bônus por indicações e cashback em serviços parceiros.',
    },
    {
      icon: <Award className="text-yellow-400" size={20} />,
      title: 'Plano de Carreira',
      description: 'Evolua em nosso plano de carreira e alcance graduações exclusivas.',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight uppercase italic">Licença de Uso</h3>
          <p className="text-[var(--text-muted)] text-sm">Gerencie sua ativação e acesso ao ecossistema.</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl">
          <div
            className={`w-2 h-2 rounded-full ${user.isActivated ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]'}`}
          />
          <span className="text-[10px] font-bold text-[var(--text-main)] uppercase tracking-widest">
            Status: {user.isActivated ? 'Ativo' : 'Pendente'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                : 'Para começar a usufruir de todos os benefícios do ecossistema MOBICYCLE, participar do plano de carreira e receber bônus, você precisa ativar sua licença de uso. O pagamento é feito com segurança no Mercado Pago (cartão ou PIX).'}
            </p>

            {!user.isActivated && (
              <div className="space-y-6">
                <div className="p-6 bg-blue-600/5 border border-blue-500/10 rounded-3xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
                      Valor da Licença
                    </span>
                    <span className="text-2xl font-black text-[var(--text-main)]">
                      R$ {adhesionFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                    Pagamento único para acesso vitalício ao ecossistema básico.
                  </p>
                </div>

                <AnimatePresence mode="wait">
                  {(checkoutPhase === 'idle' || checkoutPhase === 'opening') && (
                    <motion.div
                      key="start"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-xs">
                          <AlertCircle size={14} />
                          {error}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleActivate}
                        disabled={isBusy || checkoutPhase === 'opening'}
                        className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:pointer-events-none text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 group"
                      >
                        {isBusy || checkoutPhase === 'opening' ? (
                          <Loader2 className="animate-spin" size={20} />
                        ) : (
                          <>
                            <ExternalLink size={20} className="group-hover:scale-110 transition-transform" />
                            Ativar agora
                          </>
                        )}
                      </button>
                      <p className="text-[10px] text-[var(--text-muted)] text-center uppercase tracking-wider">
                        Abriremos o Mercado Pago em uma nova aba para você concluir o pagamento.
                      </p>
                    </motion.div>
                  )}

                  {checkoutPhase === 'awaiting_payment' && (
                    <motion.div
                      key="await"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="py-8 flex flex-col items-center justify-center text-center space-y-4"
                    >
                      <Loader2 className="animate-spin text-blue-500" size={48} />
                      <div className="space-y-2 max-w-sm">
                        <h5 className="text-[var(--text-main)] font-bold">Aguardando confirmação do pagamento</h5>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                          Conclua o pagamento na aba do Mercado Pago. Quando for aprovado, sua licença será ativada
                          automaticamente aqui — não é necessário clicar em &quot;Já paguei&quot; no site do MP para esta
                          tela.
                        </p>
                        {awaitingTimedOut && (
                          <p className="text-[10px] text-amber-500/90">
                            Ainda não detectamos a ativação. Se já pagou, aguarde alguns instantes ou use o botão
                            abaixo.
                          </p>
                        )}
                      </div>
                      {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-xs max-w-sm">
                          <AlertCircle size={14} />
                          {error}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleRecheckNow}
                        disabled={isBusy}
                        className="px-6 py-3 bg-[var(--bg-card)] border border-[var(--border-main)] hover:border-[var(--text-muted)] text-[var(--text-main)] text-xs font-bold uppercase tracking-widest rounded-2xl transition-colors"
                      >
                        {isBusy ? <Loader2 className="animate-spin inline" size={16} /> : 'Verificar agora'}
                      </button>
                    </motion.div>
                  )}

                  {checkoutPhase === 'success' && (
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
                        <h5 className="text-[var(--text-main)] font-bold text-xl">Pagamento confirmado!</h5>
                        <p className="text-xs text-[var(--text-muted)]">Sua licença foi ativada. Atualizando…</p>
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

        <div className="space-y-4">
          <h5 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest px-4">
            Benefícios Inclusos
          </h5>
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
              O pagamento é processado pelo Mercado Pago. Após a confirmação, nosso servidor ativa sua licença
              automaticamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
