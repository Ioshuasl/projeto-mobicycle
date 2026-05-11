import React, { useState, useEffect, useMemo, lazy, Suspense, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import md5 from 'md5';
import Logo from './Logo';
import { 
  LayoutDashboard, 
  Wallet, 
  Star, 
  ArrowUpRight, 
  FileText, 
  LogOut, 
  ChevronRight, 
  CheckCircle2, 
  Users as UsersIcon, 
  User as UserIcon, 
  Coins, 
  Trophy, 
  X, 
  Bell, 
  BellOff,
  Share2, 
  QrCode, 
  Ticket,
  Image as ImageIcon, 
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Sun,
  Moon,
  TrendingUp,
  DollarSign,
  Upload,
  HandPlatter,
  Truck,
  ShieldCheck,
  FileCode
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { User, Matrix as MatrixType, Notification, UserDocument } from '../types';
import { getCareerLevel, getNextCareerLevel, CAREER_PLAN } from '../services/careerService';
import { LEGAL_CLAUSES } from '../services/financialService';
import { getCacheBustedUrl } from '../lib/utils';
import { BrandBanner } from './BrandBanner';
import { navigateTo, getViewFromPath } from '../lib/routing';


// Lazy loaded components
const MatrixView = lazy(() => import('./Matrix').then(m => ({ default: m.MatrixView })));
const ProfileModal = lazy(() => import('./ProfileModal').then(m => ({ default: m.ProfileModal })));
const ReferralsList = lazy(() => import('./ReferralsList').then(m => ({ default: m.ReferralsList })));
const ControlPanel = lazy(() => import('./ControlPanel').then(m => ({ default: m.ControlPanel })));
const AffiliateProgram = lazy(() => import('./AffiliateProgram').then(m => ({ default: m.AffiliateProgram })));
const UserDashboardView = lazy(() => import('./UserDashboardView').then(m => ({ default: m.UserDashboardView })));
const PerformanceDashboard = lazy(() => import('./PerformanceDashboard').then(m => ({ default: m.PerformanceDashboard })));
const DocumentManager = lazy(() => import('./DocumentManager').then(m => ({ default: m.DocumentManager })));
const VoucherManager = lazy(() => import('./VoucherManager').then(m => ({ default: m.VoucherManager })));
const UserDetailsModal = lazy(() => import('./UserDetailsModal').then(m => ({ default: m.UserDetailsModal })));
const WithdrawalModal = lazy(() => import('./WithdrawalModal').then(m => ({ default: m.WithdrawalModal })));
const DepositModal = lazy(() => import('./DepositModal').then(m => ({ default: m.DepositModal })));
const Gamification = lazy(() => import('./Gamification').then(m => ({ default: m.Gamification })));
const WelcomeBanner = lazy(() => import('./WelcomeBanner').then(m => ({ default: m.WelcomeBanner })));
const ServiceUsage = lazy(() => import('./ServiceUsage').then(m => ({ default: m.ServiceUsage })));
const LicenseView = lazy(() => import('./LicenseView').then(m => ({ default: m.LicenseView })));


import { DashboardSkeleton } from './Skeleton';

// Loading Fallback
const DashboardLoader = () => (
  <div className="w-full">
    <DashboardSkeleton />
  </div>
);

interface DashboardProps {
  user: User;
  matrices: MatrixType[];
  notifications: Notification[];
  transactions: any[];
  cycleHistory: any[];
  documents: UserDocument[];
  bannerUrl: string;
  logoUrl: string;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
  onRefresh: () => void;
  onJoinMatrix: () => void;
  onFillMatrix: (matrixId: string) => void;
  onReentry: () => void;
  onSeed: () => void;
  onUpdateBanner: (url: string) => void;
  isAutoReentry: boolean;
  setIsAutoReentry: (val: boolean) => void;
  showCelebration: boolean;
  setShowCelebration: (val: boolean) => void;
  celebrationAmount?: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  canViewAdmin?: boolean;
  onSwitchView?: () => void;
  matrixSettings?: any;
}

export function Dashboard({
  user,
  matrices,
  notifications,
  transactions,
  cycleHistory,
  documents,
  bannerUrl,
  logoUrl,
  onLogout,
  onUpdateUser,
  onRefresh,
  onJoinMatrix,
  onFillMatrix,
  onReentry,
  onSeed,
  onUpdateBanner,
  isAutoReentry,
  setIsAutoReentry,
  showCelebration,
  setShowCelebration,
  celebrationAmount = '3.990,00',
  theme,
  onToggleTheme,
  canViewAdmin,
  onSwitchView,
  matrixSettings
}: DashboardProps) {
  const [currentView, setCurrentViewState] = useState<'dashboard' | 'financeiro' | 'rede' | 'afiliados' | 'vouchers' | 'ONBORD_MATRIX' | 'CASHBOARD_MATRIX' | 'notificacoes' | 'servicos' | 'perfil' | 'painel'>(() => {
    const viewFromPath = getViewFromPath('dashboard');
    // Valida se é um view válido do Dashboard
    const validViews = ['dashboard', 'financeiro', 'rede', 'afiliados', 'vouchers', 'ONBORD_MATRIX', 'CASHBOARD_MATRIX', 'notificacoes', 'servicos', 'perfil', 'painel'];
    return validViews.includes(viewFromPath) ? viewFromPath as any : 'dashboard';
  });
  const [financeiroTab, setFinanceiroTab] = useState<'resumo' | 'documentos' | 'licenca'>('resumo');
  const [viewingMatrixFor, setViewingMatrixFor] = useState<string | null>(null);
  const [targetMatrices, setTargetMatrices] = useState<MatrixType[]>([]);
  const [loadingTargetMatrix, setLoadingTargetMatrix] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [lastLevelUpName, setLastLevelUpName] = useState('');
  const [showBannerAdmin, setShowBannerAdmin] = useState(false);
  const [newBannerUrl, setNewBannerUrl] = useState('');
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);

  const bustedBannerUrl = useMemo(() => 
    getCacheBustedUrl(bannerUrl, matrixSettings?.image_cache_version),
    [bannerUrl, matrixSettings?.image_cache_version]
  );

  const bustedLogoUrl = useMemo(() => 
    getCacheBustedUrl(logoUrl, matrixSettings?.image_cache_version),
    [logoUrl, matrixSettings?.image_cache_version]
  );

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          setIsPushEnabled(!!subscription);
        });
      });
    }
  }, []);

  // Wrapper que sincroniza o state com o URL
  const setCurrentView = (view: typeof currentView) => {
    setCurrentViewState(view);
    navigateTo(view);
  };

  // Escuta popstate para sincronizar quando o usuário clica voltar/avançar
  useEffect(() => {
    const handlePopState = () => {
      const viewFromPath = getViewFromPath('dashboard');
      const validViews = ['dashboard', 'financeiro', 'rede', 'afiliados', 'vouchers', 'ONBORD_MATRIX', 'CASHBOARD_MATRIX', 'notificacoes', 'servicos', 'perfil', 'painel'];
      if (validViews.includes(viewFromPath)) {
        setCurrentViewState(viewFromPath as any);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleTogglePush = async () => {
    setIsPushLoading(true);
    try {
      if (isPushEnabled) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
        setIsPushEnabled(false);
        alert("Notificações desativadas.");
      } else {
        const registration = await navigator.serviceWorker.ready;
        const response = await fetch('/api/push/vapid-public-key', {
          headers: { 'x-user-id': user.id }
        });
        const { publicKey } = await response.json();
        
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey
        });

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id
          },
          body: JSON.stringify(subscription)
        });

        setIsPushEnabled(true);
        alert("Notificações ativadas com sucesso!");
      }
    } catch (err) {
      console.error("Error toggling push notifications:", err);
      alert("Erro ao configurar notificações. Verifique as permissões do seu navegador.");
    } finally {
      setIsPushLoading(false);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      onUpdateBanner(base64String);
      setShowBannerAdmin(false);
    };
    reader.readAsDataURL(file);
  };
  const [isJoining, setIsJoining] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPixKey, setWithdrawPixKey] = useState('');
  const [selectedUserForModal, setSelectedUserForModal] = useState<User | null>(null);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);

  React.useEffect(() => {
    if (showCelebration) {
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [showCelebration]);

  const handleJoin = async () => {
    setIsJoining(true);
    await onJoinMatrix();
    setIsJoining(false);
  };

  const handleViewReferralMatrix = async (userId: string) => {
    setViewingMatrixFor(userId);
    setLoadingTargetMatrix(true);
    setCurrentView('painel');
    try {
      const response = await fetch(`/api/user/matrix/${userId}`, {
        headers: { 'x-user-id': user.id }
      });
      if (response.ok) {
        setTargetMatrices(await response.json());
      }
    } catch (err) {
      console.error("Error fetching target matrix:", err);
    } finally {
      setLoadingTargetMatrix(false);
    }
  };

  const handleUserClick = async (matrixUser: any) => {
    try {
      // Fetch full user details from API
      const res = await fetch(`/api/users/${matrixUser.userId}`, {
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) {
        const fullUser = await res.json();
        setSelectedUserForModal(fullUser);
        setShowUserDetailsModal(true);
      }
    } catch (err) {
      console.error("Error fetching user details:", err);
    }
  };



  const unreadCount = notifications.filter(n => !n.isRead).length;
  const referralLink = `${window.location.origin}/?ref=${md5(user?.email || '')}/${user?.nickname || ''}`;

  const latestWithdrawal = transactions
    .filter(t => t.type === 'WITHDRAWAL')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const grossBonus = transactions
    .filter(t => t.type === 'BONUS')
    .reduce((acc, t) => acc + t.amount, 0);

  const netBonus = user.balance;

  const handleCloseCelebration = async () => {
    setShowCelebration(false);
    // Find all unread cycle notifications and mark them as read
    const cycleNotifications = notifications.filter(n => 
      !n.isRead && n.type === 'BONUS_AVAILABLE' && (n.message.includes('ciclou') || n.message.includes('Cash-Board'))
    );
    
    if (cycleNotifications.length > 0) {
      for (const n of cycleNotifications) {
        await markAsRead(n.id, true);
      }
      onRefresh();
    }
  };

  const markAsRead = async (id: string, skipRefresh = false) => {
    try {
      const notification = notifications.find(n => n.id === id);
      if (notification?.type === 'LEVEL_UP' && !notification.isRead) {
        const levelName = notification.message.split('para ')[1]?.split('!')[0] || 'Novo Nível';
        setLastLevelUpName(levelName);
        setShowLevelUpModal(true);
      }
      await fetch(`/api/notifications/${id}/read`, { 
        method: 'POST',
        headers: { 'x-user-id': user.id }
      });
      if (!skipRefresh) onRefresh();
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-sans selection:bg-blue-500/30 transition-colors duration-300">
      {/* Celebration Banner */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] p-4 flex justify-center pointer-events-none"
          >
            <div className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 p-0.5 rounded-2xl shadow-2xl shadow-yellow-500/20 pointer-events-auto max-w-2xl w-full">
              <div className="bg-[#0d0d0f] rounded-[14px] p-6 flex items-center justify-between gap-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                  <Coins size={80} className="text-yellow-500 rotate-12" />
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-yellow-500/20">
                    <Trophy className="text-yellow-500 w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-tight">
                      🏆 Parabéns! Você ciclou do Cashboard e recebeu <span className="text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">R$ {celebrationAmount}</span>
                    </h3>
                    <p className="text-yellow-500/80 font-bold text-sm mt-1 uppercase tracking-wider">
                      Bônus creditado com sucesso em sua conta MOBICYCLE
                    </p>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCloseCelebration();
                  }}
                  className="p-2 hover:bg-[var(--glass-bg)] rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer relative z-50 pointer-events-auto"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {showLevelUpModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="bg-gradient-to-b from-[var(--bg-sidebar)] to-black border border-[var(--neon-blue)]/30 rounded-[2.5rem] p-12 max-w-lg w-full text-center relative overflow-hidden shadow-2xl shadow-[var(--neon-blue)]/20"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--neon-blue)]/20 blur-[100px] rounded-full pointer-events-none" />
              
              <div className="relative z-10">
                <div className="w-24 h-24 bg-[var(--neon-blue)]/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-[var(--neon-blue)]/20 shadow-inner">
                  <ArrowUpRight className="text-[var(--neon-blue)] w-12 h-12" />
                </div>
                
                <h2 className="text-4xl font-black text-[var(--text-main)] tracking-tighter uppercase italic mb-4">
                  Level Up! 🚀
                </h2>
                
                <p className="text-[var(--text-muted)] mb-8 leading-relaxed">
                  Parabéns! Você alcançou a graduação de <br />
                  <span className="text-[var(--neon-blue)] font-black text-xl uppercase tracking-widest">{lastLevelUpName}</span>
                </p>

                <button 
                  onClick={() => setShowLevelUpModal(false)}
                  className="w-full py-4 bg-[var(--neon-blue)] hover:bg-[var(--neon-blue)]/80 text-[#0a0f1e] font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-[var(--neon-blue)]/40 active:scale-95"
                >
                  Continuar Jornada
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Top Bar */}
      <div className="lg:hidden sticky top-0 left-0 right-0 bg-[var(--bg-sidebar)] border-b border-[var(--border-main)] px-4 py-3 flex items-center justify-between z-30 backdrop-blur-lg bg-opacity-80">
        <div className="flex items-center gap-2">
          <Logo size={32} />
          <span className="text-[var(--text-main)] font-bold text-sm tracking-tight">MOBICYCLE</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg text-[var(--text-muted)] relative"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 hover:bg-blue-500 text-white text-[8px] font-bold flex items-center justify-center rounded-full border-2 border-[var(--bg-sidebar)]">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
          <button 
            onClick={() => setShowProfileModal(true)}
            className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-main)] flex items-center justify-center overflow-hidden"
          >
            {user.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="text-[var(--text-muted)] w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Sidebar - Desktop */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-[var(--bg-sidebar)] border-r border-[var(--border-main)] hidden lg:flex flex-col p-6 z-20 transition-colors duration-300">
        <div className="flex items-center gap-3 mb-12 px-2">
          <Logo size={40} />
          <div>
            <h1 className="text-[var(--text-main)] font-bold text-lg tracking-tight">MOBICYCLE</h1>
            <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-widest">Ecossistema MOBICYCLE</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem 
            icon={<LayoutDashboard size={18} />} 
            label="Dashboard" 
            active={currentView === 'dashboard'} 
            onClick={() => setCurrentView('dashboard')}
          />
          <NavItem 
            icon={<Wallet size={18} />} 
            label="Financeiro" 
            active={currentView === 'financeiro'} 
            onClick={() => {
              setCurrentView('financeiro');
              setFinanceiroTab('resumo');
            }}
          />
          <NavItem 
            icon={<Trophy size={18} />} 
            label="Afiliados" 
            active={currentView === 'afiliados'} 
            onClick={() => setCurrentView('afiliados')}
          />
          <NavItem 
            icon={<LayoutDashboard size={18} />} 
            label="Matrizes ONBORD" 
            active={currentView === 'ONBORD_MATRIX'} 
            onClick={() => setCurrentView('ONBORD_MATRIX')}
          />
          <NavItem 
            icon={<Ticket size={18} />} 
            label="Vouchers" 
            active={currentView === 'vouchers'} 
            onClick={() => setCurrentView('vouchers')}
          />
          {(matrixSettings?.service_corridas_visible !== 'false' || 
            matrixSettings?.service_snack_visible !== 'false' || 
            matrixSettings?.service_energy_visible !== 'false' || 
            matrixSettings?.service_guincho_visible !== 'false' || 
            matrixSettings?.service_bonus_hability_test_visible !== 'false') && (
            <NavItem 
              icon={<HandPlatter size={18} />} 
              label="Serviços MOBICYCLE" 
              active={currentView === 'servicos'} 
              onClick={() => setCurrentView('servicos')}
            />
          )}
          <NavItem 
            icon={<Bell size={18} />} 
            label="Notificações" 
            active={currentView === 'notificacoes'} 
            onClick={() => setCurrentView('notificacoes')}
          />
          <NavItem 
            icon={<UserIcon size={18} />} 
            label="Meu Perfil" 
            active={currentView === 'perfil'} 
            onClick={() => setCurrentView('perfil')}
          />

        </nav>

        <div className="mt-auto pt-6 border-t border-[var(--border-main)] space-y-2">
          {canViewAdmin && onSwitchView && (
            <button 
              onClick={onSwitchView}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-sm font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/30"
            >
              <LayoutDashboard size={18} />
              Painel Admin
            </button>
          )}
          <button 
            onClick={onToggleTheme}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-main)]"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
          </button>
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 text-[var(--text-muted)] hover:text-red-400 transition-colors w-full text-sm"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 p-4 sm:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto">
        {/* MOBICYCLE ECOSYSTEM Banner */}
        <div className="mb-12">
          <BrandBanner name="MOBICYCLE" subtitle="MOBILIDADE,TECNOLOGIA & SUSTENTABILIDADE" />
        </div>

        <WelcomeBanner user={user} />
        <Suspense fallback={<DashboardLoader />}>
          {currentView === 'notificacoes' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight uppercase italic">Notificações</h3>
                  <p className="text-[var(--text-muted)] text-sm">Gerencie seus alertas e avisos do sistema</p>
                </div>
                <button 
                  onClick={handleTogglePush}
                  disabled={isPushLoading}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
                    isPushEnabled 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' 
                      : 'bg-blue-600 text text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20'
                  }`}
                >
                  {isPushLoading ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : isPushEnabled ? (
                    <BellOff size={18} />
                  ) : (
                    <Bell size={18} />
                  )}
                  {isPushEnabled ? 'Desativar Push' : 'Ativar Push'}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`p-6 rounded-3xl border transition-all ${
                        notif.isRead 
                          ? 'bg-[var(--bg-sidebar)] border-[var(--border-main)] opacity-60' 
                          : 'bg-[var(--bg-sidebar)] border-[var(--border-main)] shadow-xl'
                      }`}
                    >
                      <div className="flex gap-4">
                        <div className={`p-3 rounded-2xl ${
                          notif.type === 'BONUS_AVAILABLE' ? 'bg-emerald-500/10 text-emerald-400' :
                          notif.type === 'MATRIX_FILL' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-[var(--border-main)] text-[var(--text-muted)]'
                        }`}>
                          <Bell size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                              {new Date(notif.createdAt).toLocaleString('pt-BR')}
                            </span>
                            {!notif.isRead && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                            )}
                          </div>
                          <p className="text-[var(--text-main)] text-sm font-medium leading-relaxed">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 bg-[var(--bg-sidebar)] rounded-3xl border border-dashed border-[var(--border-main)]">
                    <Bell className="text-slate-700 mb-4" size={48} />
                    <p className="text-[var(--text-muted)] font-medium">Nenhuma notificação encontrada</p>
                  </div>
                )}
              </div>
            </div>
          ) : currentView === 'financeiro' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight uppercase italic">Gestão Financeira</h3>
                <p className="text-[var(--text-muted)] text-sm">Acompanhe seus ganhos, estornos e histórico de transações.</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <button 
                  onClick={() => setShowDepositModal(true)}
                  className="px-6 py-3 bg-[var(--neon-blue)] hover:brightness-110 text-[#0a0f1e] font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-900/40 flex items-center gap-2"
                >
                  <DollarSign size={16} />
                  Depositar
                </button>
                <button 
                  onClick={() => setShowWithdrawModal(true)}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-emerald-900/40 flex items-center gap-2"
                >
                  <Wallet size={16} />
                  Solicitar Saque
                </button>
                <div className="p-4 bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">Saldo Líquido</p>
                  <p className="text-xl font-black text-emerald-400">R$ {(user.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="p-4 bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">Cashback Corridas</p>
                  <p className="text-xl font-black text-blue-400">R$ {(user.cashback_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                {user.debtBalance > 0 && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                    <p className="text-[10px] text-red-400 uppercase font-mono tracking-widest mb-1">Saldo Devedor</p>
                    <p className="text-xl font-black text-red-500">R$ {(user.debtBalance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Financeiro Tabs */}
            <div className="flex p-1 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl w-fit overflow-x-auto max-w-full">
              <button 
                onClick={() => setFinanceiroTab('resumo')}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${
                  financeiroTab === 'resumo' 
                    ? 'bg-[var(--neon-blue)] text-[#0a0f1e] shadow-[0_0_20px_rgba(0,243,255,0.3)]' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Wallet size={14} />
                Resumo Financeiro
              </button>
              <button 
                onClick={() => setFinanceiroTab('licenca')}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${
                  financeiroTab === 'licenca' 
                    ? 'bg-[var(--neon-blue)] text-[#0a0f1e] shadow-[0_0_20px_rgba(0,243,255,0.3)]' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <ShieldCheck size={14} />
                Licença de Uso
              </button>
            </div>

            {financeiroTab === 'resumo' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2rem] overflow-hidden shadow-xl">
                  <div className="p-6 border-b border-[var(--border-main)] bg-[var(--bg-sidebar)] flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-widest">Histórico de Transações</h4>
                    <button className="text-[10px] font-bold text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors">Ver Tudo</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left border-b border-[var(--border-main)]/30">
                          <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Data</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Tipo</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Status</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-main)]/20">
                        {transactions.length > 0 ? (
                          transactions.map((t) => (
                            <tr key={t.id} className="hover:bg-[var(--glass-bg)] transition-colors">
                              <td className="px-6 py-4 text-xs text-[var(--text-muted)] font-mono">
                                {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                                  t.type === 'BONUS' ? 'text-emerald-400 bg-emerald-400/10' :
                                  t.type === 'CLAWBACK' ? 'text-red-400 bg-red-400/10' :
                                  t.type === 'WITHDRAWAL' ? 'text-blue-400 bg-blue-400/10' :
                                  'text-[var(--text-muted)] bg-slate-400/10'
                                }`}>
                                  {t.type === 'BONUS' ? 'Bônus' : 
                                   t.type === 'CLAWBACK' ? 'Estorno (Clawback)' : 
                                   t.type === 'WITHDRAWAL' ? 'Saque' : 
                                   t.type === 'REFUND' ? 'Reembolso' : t.type}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-[10px] font-bold uppercase ${
                                  t.status === 'COMPLETED' ? 'text-emerald-500' : 'text-yellow-500'
                                }`}>
                                  {t.status === 'COMPLETED' ? 'Concluído' : 'Pendente'}
                                </span>
                              </td>
                              <td className={`px-6 py-4 text-right font-black text-sm ${
                                t.amount > 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {t.amount > 0 ? '+' : ''} R$ {(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-slate-600 italic text-sm">Nenhuma transação registrada.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-br from-[var(--bg-sidebar)] to-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl p-6 shadow-xl">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Regras de Estorno & Saques</h4>
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                      <p className="text-[10px] text-emerald-400 uppercase font-mono tracking-widest mb-2">Regra de Saques</p>
                      <div className="flex items-start gap-3">
                        <FileCode size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-[var(--text-main)] font-bold leading-relaxed">
                          Obrigatório enviar NFS-E XML para processamento de qualquer solicitação de saque.
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl">
                      <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-2">Clawback (Débito Retroativo)</p>
                      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed italic">
                        "{LEGAL_CLAUSES.SOLIDARITY}"
                      </p>
                    </div>
                    <div className="p-4 bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl">
                      <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-2">Taxa Administrativa</p>
                      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed italic">
                        "{LEGAL_CLAUSES.ADMIN_TAX}"
                      </p>
                    </div>
                    <div className="p-4 bg-blue-600/5 border border-blue-500/10 rounded-2xl">
                      <p className="text-[10px] text-blue-400 font-bold uppercase mb-1">Impacto no Ciclo</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Cada estorno subtrai 1 unidade do contador de vendas do ciclo vigente.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-600/5 border border-emerald-500/10 rounded-3xl p-6">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4">Cálculo de Reembolso</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-muted)]">Licença de Uso</span>
                      <span className="text-[var(--text-main)] font-mono">R$ {(matrixSettings?.adhesionFee || 650).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-muted)]">Taxa Admin (5%)</span>
                      <span className="text-red-400 font-mono">- R$ 32,50</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-muted)]">Cashback Consumido</span>
                      <span className="text-red-400 font-mono">- R$ 0,00</span>
                    </div>
                    <div className="pt-3 border-t border-emerald-500/20 flex justify-between items-center">
                      <span className="text-xs font-bold text-[var(--text-main)] uppercase">Líquido a Devolver</span>
                      <span className="text-lg font-black text-emerald-400">R$ 617,50</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            ) : (
              <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2.5rem] p-8 shadow-xl">
                <Suspense fallback={<DashboardLoader />}>
                  <LicenseView 
                    user={user} 
                    onActivate={() => {
                      onUpdateUser({ ...user, isActivated: true });
                      onRefresh();
                    }}
                    matrixSettings={matrixSettings}
                  />
                </Suspense>
              </div>
            )}
          </div>
        ) : currentView === 'ONBORD_MATRIX' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight uppercase italic">Matrizes ONBORD</h3>
                <p className="text-[var(--text-muted)] text-sm">Acompanhe seu progresso nas matrizes de entrada.</p>
              </div>
              <button 
                onClick={() => setCurrentView('dashboard')}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-2 text-sm transition-colors"
              >
                <ChevronRight size={16} className="rotate-180" />
                Voltar ao Dashboard
              </button>
            </div>

            <div className="grid grid-cols-1 gap-12">
              <div className="space-y-6">
                {matrices.filter(m => m.type === 'ONBORD').length > 0 ? (
                  matrices.filter(m => m.type === 'ONBORD').map((matrix) => (
                    <MatrixView 
                      key={matrix.id}
                      title="Matriz On-Bord"
                      type="ONBORD"
                      positions={matrix.positions}
                      currentUserId={user.id}
                      onFill={() => onFillMatrix(matrix.id)}
                      onUserClick={handleUserClick}
                    />
                  ))
                ) : (
                  <div className="bg-[var(--bg-sidebar)] rounded-[2.5rem] border border-[var(--border-main)] p-12 text-center">
                    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mx-auto mb-6">
                      <LayoutDashboard size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-[var(--text-main)] uppercase italic mb-4">Nenhuma Matriz Ativa</h3>
                    <p className="text-[var(--text-muted)] max-w-md mx-auto mb-8">
                      Você ainda não possui matrizes ativas. Ative sua licença de uso para ingressar no ecossistema e começar a ciclar.
                    </p>
                    <button 
                      onClick={() => {
                        setCurrentView('financeiro');
                        setFinanceiroTab('licenca');
                      }}
                      className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl transition-all uppercase tracking-widest shadow-xl shadow-blue-900/40"
                    >
                      Ativar Licença Agora
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : currentView === 'CASHBOARD_MATRIX' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight uppercase italic">Matrizes CASHBOARD</h3>
                <p className="text-[var(--text-muted)] text-sm">Acompanhe seu progresso nas matrizes de lucro.</p>
              </div>
              <button 
                onClick={() => setCurrentView('dashboard')}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-2 text-sm transition-colors"
              >
                <ChevronRight size={16} className="rotate-180" />
                Voltar ao Dashboard
              </button>
            </div>

            <div className="grid grid-cols-1 gap-12">
              <div className="space-y-6">
                {matrices.filter(m => m.type === 'CASHBOARD').length > 0 ? (
                  matrices.filter(m => m.type === 'CASHBOARD').map((matrix) => (
                    <MatrixView 
                      key={matrix.id}
                      title="Matriz Cash-Board"
                      type="CASHBOARD"
                      positions={matrix.positions}
                      currentUserId={user.id}
                      onFill={() => onFillMatrix(matrix.id)}
                      onUserClick={handleUserClick}
                    />
                  ))
                ) : (
                  <div className="bg-[var(--bg-sidebar)] rounded-[2.5rem] border border-[var(--border-main)] p-12 text-center">
                    <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500 mx-auto mb-6">
                      <ShieldCheck size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-[var(--text-main)] uppercase italic mb-4">Acesso Restrito</h3>
                    <p className="text-[var(--text-muted)] max-w-md mx-auto mb-8">
                      Você ainda não ingressou na Matriz CashBoard. Complete sua jornada na Matriz On-Bord para desbloquear este nível.
                    </p>
                    <button 
                      onClick={() => setCurrentView('ONBORD_MATRIX')}
                      className="px-8 py-3 bg-[var(--border-main)] hover:bg-slate-700 text-[var(--text-main)] text-xs font-bold rounded-xl transition-all uppercase tracking-widest"
                    >
                      Ver Minha Matriz On-Bord
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : currentView === 'perfil' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight uppercase italic">Meu Perfil</h3>
                <p className="text-[var(--text-muted)] text-sm">Gerencie seus dados e documentos.</p>
              </div>
              <button 
                onClick={() => setShowProfileModal(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-900/40 flex items-center gap-2"
              >
                <UserIcon size={16} />
                Editar Dados
              </button>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2.5rem] p-8 shadow-xl">
                <h4 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest mb-6 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-blue-500" />
                  Validação de Documentos
                </h4>
                <DocumentManager user={user} hideHeader={false} />
              </div>
            </div>
          </div>
        ) : currentView === 'afiliados' ? (
          <AffiliateProgram 
            user={user} 
            referralLink={referralLink}
            onViewNetwork={handleViewReferralMatrix}
            matrixSettings={matrixSettings}
          />
        ) : currentView === 'vouchers' ? (
          <VoucherManager user={user} onRefresh={onRefresh} />
        ) : currentView === 'servicos' ? (
          <Suspense fallback={<DashboardLoader />}>
            <ServiceUsage user={user} onRefresh={onRefresh} matrixSettings={matrixSettings} />
          </Suspense>
        ) : (
          <UserDashboardView
            user={user}
            matrices={matrices}
            transactions={transactions}
            cycleHistory={cycleHistory}
            documents={documents}
            bannerUrl={bannerUrl}
            onUpdateBanner={onUpdateBanner}
            {...(canViewAdmin ? { 
              onManageBanner: () => {
                setNewBannerUrl(bannerUrl);
                setShowBannerAdmin(true);
              },
              onSeed: onSeed 
            } : {})}
            onJoinMatrix={handleJoin}
            onFillMatrix={onFillMatrix}
            isJoining={isJoining}
            notifications={notifications}
            onMarkAsRead={markAsRead}
            isAutoReentry={isAutoReentry}
            setIsAutoReentry={setIsAutoReentry}
            setCurrentView={setCurrentView}
            setFinanceiroTab={setFinanceiroTab}
            onViewNetwork={() => setCurrentView('afiliados')}
            referralLink={referralLink}
            logoUrl={logoUrl}
            matrixSettings={matrixSettings}
            onUpdateUser={onUpdateUser}
          />
        )}
        </Suspense>
      </main>

      {/* Profile Modal */}
      {showProfileModal && (
        <Suspense fallback={null}>
          <ProfileModal 
            user={user} 
            onClose={() => setShowProfileModal(false)} 
            onUpdate={onUpdateUser} 
            matrixSettings={matrixSettings}
          />
        </Suspense>
      )}

      {/* Banner Admin Modal */}
      {showBannerAdmin && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div 
            onClick={() => setShowBannerAdmin(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <div className="relative bg-[#0d0d0f] border border-[var(--border-main)] w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <h4 className="text-2xl font-bold text-[var(--text-main)] mb-2">Gerenciar Banner</h4>
            <p className="text-[var(--text-muted)] text-sm mb-8">Insira a URL da imagem que será exibida para todos os usuários.</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-1 block">URL da Imagem</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newBannerUrl}
                    onChange={(e) => setNewBannerUrl(e.target.value)}
                    placeholder="https://exemplo.com/imagem.jpg"
                    className="flex-1 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-4 py-3 text-[var(--text-main)] text-sm outline-none focus:border-blue-500/50 transition-all"
                  />
                  <input 
                    type="file"
                    ref={bannerInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleBannerUpload}
                  />
                  <button 
                    onClick={() => bannerInputRef.current?.click()}
                    className="px-4 py-3 bg-[var(--border-main)] hover:bg-slate-700 text-[var(--text-main)] font-bold rounded-xl transition-all flex items-center gap-2"
                    title="Upload de Imagem"
                  >
                    <Upload size={18} />
                  </button>
                </div>
              </div>
              
              <div className="pt-4 flex flex-col gap-3">
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      onUpdateBanner(newBannerUrl);
                      setShowBannerAdmin(false);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all"
                  >
                    Salvar Alterações
                  </button>
                  <button 
                    onClick={() => setShowBannerAdmin(false)}
                    className="flex-1 bg-[var(--border-main)] hover:bg-slate-700 text-[var(--text-main)] font-bold py-3 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                </div>
                <button 
                  onClick={() => {
                    const defaultUrl = 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?q=80&w=2070&auto=format&fit=crop';
                    onUpdateBanner(defaultUrl);
                    setShowBannerAdmin(false);
                  }}
                  className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-main)] hover:bg-[var(--border-main)] text-[var(--text-muted)] font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-widest"
                >
                  Restaurar Padrão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-sidebar)] border-t border-[var(--border-main)] px-2 py-3 flex items-center justify-around z-40 backdrop-blur-lg bg-opacity-90">
        <MobileNavItem 
          icon={<LayoutDashboard size={20} />} 
          label="Início" 
          active={currentView === 'dashboard'} 
          onClick={() => setCurrentView('dashboard')} 
        />
        <MobileNavItem 
          icon={<Trophy size={20} />} 
          label="Afiliados" 
          active={currentView === 'afiliados'} 
          onClick={() => setCurrentView('afiliados')} 
        />
        <MobileNavItem 
          icon={<LayoutDashboard size={20} />} 
          label="ONBORD" 
          active={currentView === 'ONBORD_MATRIX'} 
          onClick={() => setCurrentView('ONBORD_MATRIX')} 
        />
        <MobileNavItem 
          icon={<Wallet size={20} />} 
          label="Finanças" 
          active={currentView === 'financeiro'} 
          onClick={() => {
            setCurrentView('financeiro');
            setFinanceiroTab('resumo');
          }} 
        />
        <MobileNavItem 
          icon={<HandPlatter size={20} />} 
          label="Serviços" 
          active={currentView === 'servicos'} 
          onClick={() => setCurrentView('servicos')} 
        />
      </div>


      {showWithdrawModal && (
        <Suspense fallback={null}>
          <WithdrawalModal 
            user={user}
            onClose={() => setShowWithdrawModal(false)}
            onSuccess={onUpdateUser}
            matrixSettings={matrixSettings}
          />
        </Suspense>
      )}

      {showDepositModal && (
        <Suspense fallback={null}>
          <DepositModal 
            user={user}
            onClose={() => setShowDepositModal(false)}
            onSuccess={onUpdateUser}
          />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <UserDetailsModal 
          user={selectedUserForModal}
          isOpen={showUserDetailsModal}
          onClose={() => setShowUserDetailsModal(false)}
          transactions={transactions}
        />
      </Suspense>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-sm font-medium group ${
        active 
          ? 'bg-[var(--neon-blue)]/10 text-[var(--neon-blue)] shadow-[inset_0_0_20px_rgba(0,243,255,0.05)]' 
          : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--glass-bg)]'
      }`}
    >
      {active && (
        <motion.div 
          layoutId="activeNavIndicator"
          className="absolute left-0 w-1 h-5 bg-[var(--neon-blue)] rounded-r-full shadow-[0_0_10px_rgba(0,243,255,0.5)]"
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
        />
      )}
      <div className={`transition-all duration-300 ${active ? 'text-[var(--neon-blue)] scale-110' : 'group-hover:text-[var(--text-main)] group-hover:scale-110'}`}>
        {icon}
      </div>
      <span className="relative z-10">{label}</span>
    </button>
  );
}

function MobileNavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 flex-1 transition-all relative py-1 ${active ? 'text-[var(--neon-blue)]' : 'text-[var(--text-muted)]'}`}
    >
      <div className={`p-2 rounded-xl transition-all duration-300 ${active ? 'bg-[var(--neon-blue)]/15 scale-110 shadow-[0_0_15px_rgba(0,243,255,0.1)]' : 'group-hover:bg-[var(--glass-bg)]'}`}>
        {icon}
      </div>
      <span className={`text-[9px] font-black uppercase tracking-tighter transition-all ${active ? 'opacity-100 scale-105' : 'opacity-50'}`}>
        {label}
      </span>
      {active && (
        <motion.div 
          layoutId="mobileActiveIndicator"
          className="absolute bottom-0 w-1 h-1 bg-[var(--neon-blue)] rounded-full shadow-[0_0_5px_rgba(0,243,255,0.5)]"
        />
      )}
    </button>
  );
}

function StatCard({ icon, label, value, subValue, subValueColor, trend, progress }: any) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-[var(--bg-card)] border border-[var(--border-main)] p-6 rounded-3xl shadow-xl relative overflow-hidden group transition-colors duration-300"
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        {icon}
      </div>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-main)]">
          {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 18 }) : icon}
        </div>
        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight mb-1">{value}</h3>
          {subValue && <p className={`text-xs ${subValueColor || 'text-[var(--text-muted)]'} font-medium`}>{subValue}</p>}
        </div>
        {trend}
      </div>
      {progress !== undefined && (
        <div className="mt-4 w-full bg-[var(--bg-sidebar)] h-1.5 rounded-full overflow-hidden border border-[var(--border-main)]">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-500"
          />
        </div>
      )}
    </motion.div>
  );
}
