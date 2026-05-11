import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Users, 
  Wallet, 
  TrendingUp, 
  RefreshCw, 
  ChevronRight,
  Award,
  Star,
  ArrowUpRight,
  ArrowRight,
  DollarSign,
  ExternalLink,
  CheckCircle2,
  Clock,
  Bell,
  XCircle,
  AlertCircle,
  History,
  QrCode,
  ShieldCheck,
  Car,
  Share2,
  Truck,
  Zap,
  HandPlatter,
  Image as ImageIcon,
  Wrench
} from 'lucide-react';
import { User, Matrix, Transaction, Notification, UserDocument } from '../types';
import { getCareerLevel, getNextCareerLevel } from '../services/careerService';
import { ReferralCard } from './ReferralCard';
import { WithdrawalModal } from './WithdrawalModal';
import { DepositModal } from './DepositModal';
import { CareerPlanModal } from './CareerPlanModal';
import { getCacheBustedUrl } from '../lib/utils';

interface UserDashboardViewProps {
  user: User;
  matrices: Matrix[];
  transactions: Transaction[];
  cycleHistory: any[];
  documents: UserDocument[];
  bannerUrl: string;
  onUpdateBanner: (url: string) => void;
  onJoinMatrix: () => void;
  onFillMatrix: (matrixId: string) => void;
  isJoining: boolean;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  isAutoReentry: boolean;
  setIsAutoReentry: (value: boolean) => void;
  setCurrentView: (view: any) => void;
  setFinanceiroTab?: (tab: 'resumo' | 'documentos' | 'licenca') => void;
  onViewNetwork: () => void;
  onUpdateUser: (user: User) => void;
  referralLink: string;
  logoUrl?: string;
  matrixSettings?: any;
  onSeed?: () => void;
  onManageBanner?: () => void;
}

export function UserDashboardView({ 
  user, 
  matrices, 
  transactions, 
  cycleHistory,
  documents,
  bannerUrl,
  onUpdateBanner,
  onJoinMatrix,
  onFillMatrix,
  isJoining,
  notifications,
  onMarkAsRead,
  isAutoReentry,
  setIsAutoReentry,
  setCurrentView,
  setFinanceiroTab,
  onViewNetwork,
  onUpdateUser,
  referralLink,
  logoUrl,
  matrixSettings,
  onSeed,
  onManageBanner
}: UserDashboardViewProps) {
  const [showWithdrawalModal, setShowWithdrawalModal] = React.useState(false);
  const [showDepositModal, setShowDepositModal] = React.useState(false);
  const [showCareerModal, setShowCareerModal] = React.useState(false);
  const career = getCareerLevel(user.cycleSalesCount || 0, matrixSettings);
  const nextCareer = getNextCareerLevel(user.cycleSalesCount || 0, matrixSettings);
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const [showNotifications, setShowNotifications] = React.useState(false);
  
  // Calculate Gross Bonus (Sum of all BONUS type transactions)
  const grossBonus = transactions
    .filter(t => t.type === 'BONUS' && t.status === 'COMPLETED')
    .reduce((acc, t) => acc + t.amount, 0);

  // Last Cycle
  const lastCycle = cycleHistory.length > 0 ? cycleHistory[0] : null;

  // Matrices
  const onBordMatrix = matrices.find(m => m.type === 'ONBORD' && m.positions.some(p => p.userId === user.id));
  const cashBoardMatrix = matrices.find(m => m.type === 'CASHBOARD' && m.positions.some(p => p.userId === user.id));
  
  // For MASTER users who want to see ALL matrices, they should use the Admin Panel.
  // In the User Dashboard, they should only see their own positions to avoid confusion.
  
  const onBordUserPos = onBordMatrix?.positions?.find(p => p.userId === user.id);
  const onBordFilled = onBordMatrix?.positions?.length || 0;
  
  const cashBoardUserPos = cashBoardMatrix?.positions?.find(p => p.userId === user.id);
  const cashBoardFilled = cashBoardMatrix?.positions?.length || 0;

  // Recent Transactions
  const recentTransactions = transactions.slice(0, 5);

  // XML Status
  const latestXml = documents.find(d => d.type === 'NFSE');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Admin Buttons */}
      {(user.email === 'consultorcredenciado@gmail.com' || user.status === 'MASTER' || user.role === 'admin') && (
        <div className="flex gap-4 mb-8">
          {onManageBanner && (
            <button 
              onClick={onManageBanner}
              className="bg-[var(--neon-blue)] hover:bg-[var(--neon-blue)]/80 text-[#0a0f1e] text-[10px] font-black px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 transition-all border border-[var(--neon-blue)]/30 uppercase tracking-widest"
            >
              <ImageIcon size={14} />
              Gerenciar Banner
            </button>
          )}
          {user.email === 'consultorcredenciado@gmail.com' && onSeed && (
            <button 
              onClick={() => {
                if (window.confirm("ATENÇÃO: Isso irá apagar TODO o sistema e restaurar o estado inicial. Deseja continuar?")) {
                  onSeed();
                }
              }}
              className=" text-white text-[10px] font-black px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 transition-all border border-red-400/30 uppercase tracking-widest"
            >
              <RefreshCw size={14} />
              Redefinir Sistema
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight uppercase italic">Painel de Controle</h3>
          <p className="text-[var(--text-muted)] text-sm">Acompanhe seu desempenho e ganhos em tempo real.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-4 bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-2xl text-[var(--text-main)] hover:bg-[var(--glass-bg-hover)] transition-all relative shadow-xl group"
            >
              <Bell size={22} className="group-hover:rotate-12 transition-transform" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[var(--bg-card)] shadow-lg">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-4 w-80 bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-3xl shadow-2xl z-50 overflow-hidden backdrop-blur-2xl"
                >
                  <div className="p-5 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-card)]">
                    <h4 className="text-sm font-black text-[var(--text-main)] uppercase tracking-tight">Notificações</h4>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest font-bold">{unreadCount} novas</span>
                  </div>
                  <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          onClick={() => onMarkAsRead(n.id)}
                          className={`p-5 border-b border-[var(--border-main)] cursor-pointer transition-all hover:bg-[var(--glass-bg)] ${!n.isRead ? 'bg-[var(--neon-blue)]/5' : ''}`}
                        >
                          <div className="flex gap-4">
                            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${!n.isRead ? 'bg-[var(--neon-blue)] shadow-[0_0_10px_var(--neon-blue)]' : 'bg-[var(--glass-bg)]'}`} />
                            <div>
                              <p className={`text-xs leading-relaxed ${!n.isRead ? 'text-[var(--text-main)] font-bold' : 'text-[var(--text-muted)] font-medium'}`}>
                                {n.message}
                              </p>
                              <span className="text-[9px] text-[var(--text-muted)] mt-2 block font-mono font-bold uppercase tracking-tighter">
                                {new Date(n.createdAt).toLocaleString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-12 text-center">
                        <Bell className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-20" />
                        <p className="text-xs text-[var(--text-muted)] font-medium">Nenhuma notificação encontrada.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>


        </div>
      </div>

      {/* Profile Header Section */}
      <motion.div 
        whileHover={{ y: -5 }}
        transition={{ duration: 0.3 }}
        className="bg-gradient-to-br from-[var(--bg-sidebar)] to-[var(--bg-card)] border border-[var(--border-main)] rounded-[3rem] p-10 relative overflow-hidden group shadow-2xl"
      >
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-[var(--neon-blue)]/10 rounded-full blur-[120px]" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10">
          <div className="relative">
            <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-tr from-[var(--neon-blue)] to-blue-600 p-1 rotate-3 group-hover:rotate-6 transition-transform shadow-2xl">
              <div className="w-full h-full rounded-[2.2rem] bg-[var(--bg-sidebar)] flex items-center justify-center overflow-hidden">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Award size={64} className="text-[var(--neon-blue)]" />
                )}
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-yellow-500 rounded-2xl border-4 border-[var(--bg-card)] flex items-center justify-center text-black shadow-2xl">
              <Trophy size={22} fill="currentColor" />
            </div>
          </div>

          <div className="text-center lg:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-3">
              <h2 className="text-4xl font-black text-[var(--text-main)] tracking-tight italic uppercase leading-none">{user.name}</h2>
              <div className="px-4 py-1.5 bg-[var(--neon-blue)]/10 border border-[var(--neon-blue)]/20 rounded-full">
                <span className="text-[10px] font-black text-[var(--neon-blue)] uppercase tracking-widest">
                  {career.name}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-1.5 mb-6">
              <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Status de Carreira</span>
            </div>
            
            {nextCareer && (
              <div className="max-w-md mx-auto lg:mx-0">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                  <span className="text-[var(--text-muted)]">Próxima Graduação: <span className="text-[var(--text-main)]">{nextCareer.name}</span></span>
                  <span className="text-[var(--neon-blue)]">{Math.round((user.cycleSalesCount / nextCareer.cyclesRequired) * 100)}%</span>
                </div>
                <div className="h-2.5 bg-[var(--border-main)] rounded-full overflow-hidden p-0.5 border border-[var(--border-main)]">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (user.cycleSalesCount / nextCareer.cyclesRequired) * 100)}%` }}
                    className="h-full bg-gradient-to-r from-[var(--neon-blue)] to-blue-600 rounded-full shadow-[0_0_15px_rgba(0,243,255,0.6)]"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6 w-full lg:w-auto">
            <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] p-6 rounded-3xl text-center shadow-xl min-w-[140px]">
              <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-2">Indicações</p>
              <p className="text-3xl font-black text-[var(--text-main)] tracking-tighter">{user.referralsCount}</p>
            </div>
            <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] p-6 rounded-3xl text-center shadow-xl min-w-[140px]">
              <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-2">Rede Global</p>
              <p className="text-3xl font-black text-[var(--text-main)] tracking-tighter">{(user.referralsCount * 3.5).toFixed(0)}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Referral Link Section */}
      <div className="w-full">
        <ReferralCard 
          referralLink={referralLink} 
          onViewNetwork={onViewNetwork} 
          showMaterialApoio={false}
          showQRCode={false}
        />
      </div>

      {/* Auto Reentry & XML Status Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Auto Reentry Toggle */}
        <motion.div 
          whileHover={{ y: -5 }}
          transition={{ duration: 0.3 }}
          className={`bg-gradient-to-br ${isAutoReentry ? 'from-[var(--neon-blue)]/20 to-indigo-900/20 border-[var(--neon-blue)]/30' : 'from-[var(--bg-sidebar)] to-[var(--bg-card)] border-[var(--border-main)]'} border rounded-[2rem] p-6 relative overflow-hidden group`}
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <RefreshCw size={48} className={isAutoReentry ? "animate-spin-slow" : ""} />
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAutoReentry ? 'bg-[var(--neon-blue)]/20 text-[var(--neon-blue)]' : 'bg-[var(--border-main)] text-[var(--text-muted)]'}`}>
                <RefreshCw size={20} className={isAutoReentry ? "animate-spin-slow" : ""} />
              </div>
              <h4 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest">Reentrada Automática</h4>
            </div>
            <button 
              onClick={() => setIsAutoReentry(!isAutoReentry)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isAutoReentry ? 'bg-[var(--neon-blue)]' : 'bg-[var(--glass-bg)]'}`}
            >
              <motion.div 
                animate={{ x: isAutoReentry ? 24 : 4 }}
                className="absolute top-1 w-4 h-4 bg text-white rounded-full shadow-lg"
              />
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
            {isAutoReentry 
              ? "Seu saldo será reinvestido automaticamente para novos ciclos." 
              : "Ative para automatizar sua participação em novas matrizes."}
          </p>
          {isAutoReentry && (
            <div className="space-y-2">
              <div className="flex justify-between text-[9px] font-mono uppercase tracking-widest">
                <span className="text-[var(--text-muted)]">Progresso</span>
                <span className="text-[var(--neon-blue)] font-bold">{Math.round(Math.min(100, (user.balance / (matrixSettings?.adhesionFee || 650)) * 100))}%</span>
              </div>
              <div className="h-1.5 bg-[var(--border-main)] rounded-full overflow-hidden border border-[var(--border-main)]">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (user.balance / (matrixSettings?.adhesionFee || 650)) * 100)}%` }}
                  className="h-full bg-[var(--neon-blue)] rounded-full"
                />
              </div>
            </div>
          )}
        </motion.div>

      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Gross Bonus */}
        <motion.div 
          whileHover={{ y: -5 }}
          transition={{ duration: 0.3 }}
          className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp size={80} />
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500 shadow-lg shadow-yellow-500/5">
              <TrendingUp size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Bônus Bruto</p>
              <p className="text-xs font-bold text-[var(--text-main)] uppercase tracking-tight">Acumulado</p>
            </div>
          </div>
          <h3 className="text-4xl font-black text-[var(--text-main)] tracking-tighter mb-2">
            R$ {(user.totalEarnings || grossBonus).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border-main)] mt-4">
            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Total histórico</p>
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          </div>
        </motion.div>

        {/* Net Bonus */}
        <motion.div 
          whileHover={{ y: -5 }}
          transition={{ duration: 0.3 }}
          className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Wallet size={80} />
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/5">
              <Wallet size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Saldo de Carteira</p>
              <p className="text-xs font-bold text-[var(--text-main)] uppercase tracking-tight">Disponível para Saque (Ciclo CashBoard)</p>
            </div>
          </div>
          <h3 className="text-4xl font-black text-emerald-400 tracking-tighter mb-2">
            R$ {(user.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border-main)] mt-4">
            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Saldo atual</p>
          </div>
        </motion.div>

        {/* Last Cycle Info */}
        <motion.div 
          whileHover={{ y: -5 }}
          transition={{ duration: 0.3 }}
          className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <RefreshCw size={80} />
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-[var(--neon-blue)]/10 rounded-2xl flex items-center justify-center text-[var(--neon-blue)] shadow-lg shadow-[var(--neon-blue)]/5">
              <RefreshCw size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Último Ciclo</p>
              <p className="text-xs font-bold text-[var(--text-main)] uppercase tracking-tight">Concluído</p>
            </div>
          </div>
          
          {lastCycle ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--text-main)]">{lastCycle.type === 'ONBORD' ? 'Matriz On-Bord' : 'CashBoard'}</span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">{new Date(lastCycle.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="p-4 bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl flex items-center justify-between shadow-inner">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Bônus Recebido</span>
                <span className="text-2xl font-black text-emerald-400">R$ {(lastCycle.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-emerald-500 font-black uppercase tracking-[0.2em]">
                <CheckCircle2 size={12} />
                Ciclo Finalizado
              </div>
            </div>
          ) : (
            <div className="h-28 flex flex-col items-center justify-center text-[var(--text-muted)] italic text-sm bg-[var(--bg-sidebar)] rounded-2xl border border-dashed border-[var(--border-main)]">
              <Clock size={24} className="mb-2 opacity-20" />
              Nenhum ciclo concluído
            </div>
          )}
        </motion.div>

        {/* Cashback Corridas */}
        {matrixSettings?.service_corridas_visible !== 'false' && (
          <motion.div 
          whileHover={{ y: -5 }}
          transition={{ duration: 0.3 }}
          className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Car size={80} />
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-[var(--neon-blue)]/10 rounded-2xl flex items-center justify-center text-[var(--neon-blue)] shadow-lg shadow-[var(--neon-blue)]/5">
              <Car size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">MOBICYCLE Corridas</p>
              <p className="text-xs font-bold text-[var(--text-main)] uppercase tracking-tight">Saldo Mobilidade</p>
            </div>
          </div>
          <h3 className="text-4xl font-black text-[var(--neon-blue)] tracking-tighter mb-2">
            R$ {(user.cashback_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border-main)] mt-4">
            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Saldo para uso</p>
            <div className="w-2 h-2 bg-[var(--neon-blue)] rounded-full animate-pulse" />
          </div>
        </motion.div>
        )}

        {/* MOBICYCLE Snack Cashback */}
        {matrixSettings?.service_snack_visible !== 'false' && (
          <motion.div 
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
            className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <HandPlatter size={80} />
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500 shadow-lg shadow-yellow-500/5">
                <HandPlatter size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">MOBICYCLE Snack</p>
                <p className="text-xs font-bold text-[var(--text-main)] uppercase tracking-tight">Cashback Alimentação</p>
              </div>
            </div>
            <h3 className="text-4xl font-black text-yellow-500 tracking-tighter mb-2">
              R$ {(user.snack_fast_cashback || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-main)] mt-4">
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Saldo para uso</p>
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            </div>
          </motion.div>
        )}

        {/* Energy Cashback */}
        {matrixSettings?.service_energy_visible !== 'false' && (
          <motion.div 
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
            className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Zap size={80} />
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 shadow-lg shadow-indigo-500/5">
                <Zap size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Energy</p>
                <p className="text-xs font-bold text-[var(--text-main)] uppercase tracking-tight">CASHBACK ENERGIA</p>
              </div>
            </div>
            <h3 className="text-4xl font-black text-indigo-400 tracking-tighter mb-2">
              R$ {(user.energy_cashback || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-main)] mt-4">
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Saldo para uso</p>
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            </div>
          </motion.div>
        )}

        {/* MOBICYCLE Guincho Cashback */}
        {matrixSettings?.service_guincho_visible !== 'false' && (
          <motion.div 
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
            className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Truck size={80} />
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 shadow-lg shadow-purple-500/5">
                <Truck size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">MOBICYCLE Guincho</p>
                <p className="text-xs font-bold text-[var(--text-main)] uppercase tracking-tight">Cashback Guincho</p>
              </div>
            </div>
            <h3 className="text-4xl font-black text-purple-400 tracking-tighter mb-2">
              R$ {(user.guincho_cashback || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-main)] mt-4">
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Saldo para uso</p>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            </div>
          </motion.div>
        )}

        {/* MOBICYCLE Hability Cashback */}
        {matrixSettings?.service_bonus_hability_test_visible !== 'false' && (
          <motion.div 
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
            className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <CheckCircle2 size={80} />
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 shadow-lg shadow-orange-500/5">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">MOBICYCLE Hability</p>
                <p className="text-xs font-bold text-[var(--text-main)] uppercase tracking-tight">Cashback Testes</p>
              </div>
            </div>
            <h3 className="text-4xl font-black text-orange-400 tracking-tighter mb-2">
              R$ {(user.hability_test_cashback || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-main)] mt-4">
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Saldo para uso</p>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            </div>
          </motion.div>
        )}


      </div>

      {/* Matrix Preview Section */}
      <div className="w-full space-y-8">
        {/* On-Bord Matrix - Only show if user is NOT in CashBoard */}
        {onBordMatrix && !cashBoardMatrix && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--neon-blue)]/5 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-12 gap-6 relative z-10">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-[var(--neon-blue)]/10 rounded-[1.5rem] flex items-center justify-center text-[var(--neon-blue)] shadow-lg shadow-[var(--neon-blue)]/5 border border-[var(--neon-blue)]/20">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight uppercase italic leading-none mb-1">Matriz On-Bord</h3>
                  <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-widest">Sua jornada de entrada na MOBICYCLE</p>
                </div>
              </div>
              <div className="px-4 py-1.5 bg-[var(--neon-blue)]/10 border border-[var(--neon-blue)]/20 rounded-full self-start sm:self-center">
                <span className="text-[10px] font-black text-[var(--neon-blue)] uppercase tracking-[0.2em]">Status: Ativa</span>
              </div>
            </div>

            <div className="relative py-12 bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-main)] shadow-inner">
              <MatrixVisualization 
                userPos={onBordUserPos} 
                positions={onBordMatrix?.positions || []} 
                type="ONBORD" 
              />
              
              <div className="mt-16 px-8 flex flex-col md:flex-row items-center justify-between gap-8">
                <MatrixProgressInfo filledCount={onBordFilled} type="ONBORD" />
                <button 
                  onClick={() => setCurrentView('ONBORD_MATRIX')}
                  className="w-full md:w-auto px-10 py-4 bg-[var(--neon-blue)] hover:bg-[var(--neon-blue)]/80 text-[#0a0f1e] font-black rounded-2xl transition-all active:scale-95 shadow-xl shadow-[var(--neon-blue)]/20 uppercase tracking-[0.2em] text-[10px]"
                >
                  Painel da Matriz
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CashBoard Matrix */}
        {cashBoardMatrix && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-12 gap-6 relative z-10">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-[1.5rem] flex items-center justify-center text-yellow-500 shadow-lg shadow-yellow-500/5 border border-yellow-500/20">
                  <DollarSign size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight uppercase italic leading-none mb-1">Matriz CashBoard</h3>
                  <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-widest">Sua fase de lucros e bonificações</p>
                </div>
              </div>
              <div className="px-4 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full self-start sm:self-center">
                <span className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em]">Status: Ativa</span>
              </div>
            </div>

            <div className="relative py-12 bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-main)] shadow-inner">
              <MatrixVisualization 
                userPos={cashBoardUserPos} 
                positions={cashBoardMatrix?.positions || []} 
                type="CASHBOARD" 
              />
              
              <div className="mt-16 px-8 flex flex-col md:flex-row items-center justify-between gap-8">
                <MatrixProgressInfo filledCount={cashBoardFilled} type="CASHBOARD" />
                <button 
                  onClick={() => setCurrentView('CASHBOARD_MATRIX')}
                  className="w-full md:w-auto px-10 py-4 bg-yellow-600 hover:bg-yellow-500 text-black font-black rounded-2xl transition-all active:scale-95 shadow-xl shadow-yellow-900/20 uppercase tracking-[0.2em] text-[10px]"
                >
                  Painel da Matriz
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawalModal && (
        <WithdrawalModal 
          user={user}
          onClose={() => setShowWithdrawalModal(false)}
          onSuccess={onUpdateUser}
        />
      )}

      {/* Deposit Modal */}
      {showDepositModal && (
        <DepositModal 
          user={user}
          onClose={() => setShowDepositModal(false)}
          onSuccess={onUpdateUser}
        />
      )}

      <CareerPlanModal 
        isOpen={showCareerModal}
        onClose={() => setShowCareerModal(false)}
        currentCycles={user.cycleSalesCount || 0}
        matrixSettings={matrixSettings}
      />
    </motion.div>
  );
}

function MatrixVisualization({ userPos, positions, type }: { userPos: any, positions: any[], type: 'ONBORD' | 'CASHBOARD' }) {
  const color = type === 'ONBORD' ? 'text-[var(--neon-blue)]' : 'text-yellow-500';
  const isFilled = (pos: number) => positions.some(p => p.position === pos);
  
  return (
    <>
      {/* Connecting Lines (SVG) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" style={{ zIndex: 0 }}>
        <line x1="50%" y1="60" x2="30%" y2="140" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className={color} />
        <line x1="50%" y1="60" x2="70%" y2="140" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className={color} />
        
        <line x1="30%" y1="140" x2="20%" y2="220" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className={color} />
        <line x1="30%" y1="140" x2="40%" y2="220" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className={color} />
        
        <line x1="70%" y1="140" x2="60%" y2="220" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className={color} />
        <line x1="70%" y1="140" x2="80%" y2="220" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className={color} />
      </svg>

      {/* Simple Matrix Visualization */}
      <div className="flex flex-col items-center gap-12 relative z-10">
        {/* Level 1 (Top) */}
        <div className="flex justify-center h-20">
          <MatrixNodePreview position={1} isUser={userPos?.position === 1} isFilled={isFilled(1)} type={type} />
        </div>
        
        {/* Level 2 (Middle) */}
        <div className="flex justify-center gap-12 sm:gap-32 h-20">
          <MatrixNodePreview position={2} isUser={userPos?.position === 2} isFilled={isFilled(2)} type={type} />
          <MatrixNodePreview position={3} isUser={userPos?.position === 3} isFilled={isFilled(3)} type={type} />
        </div>

        {/* Level 3 (Base) */}
        <div className="flex justify-center gap-4 sm:gap-12 h-20">
          <MatrixNodePreview position={4} isUser={userPos?.position === 4} isFilled={isFilled(4)} type={type} />
          <MatrixNodePreview position={5} isUser={userPos?.position === 5} isFilled={isFilled(5)} type={type} />
          <MatrixNodePreview position={6} isUser={userPos?.position === 6} isFilled={isFilled(6)} type={type} />
          <MatrixNodePreview position={7} isUser={userPos?.position === 7} isFilled={isFilled(7)} type={type} />
        </div>
      </div>
    </>
  );
}

function MatrixProgressInfo({ filledCount, type }: { filledCount: number, type?: 'ONBORD' | 'CASHBOARD' }) {
  const maxPositions = 7;
  return (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">Preenchimento</p>
        <p className="text-xl font-black text-[var(--text-main)]">{filledCount} / {maxPositions}</p>
      </div>
      <div className="w-px h-8 bg-[var(--border-main)]" />
      <div className="text-center">
        <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">Status</p>
        <p className={`text-xs font-bold uppercase tracking-widest ${filledCount === maxPositions ? 'text-emerald-400' : 'text-[var(--neon-blue)]'}`}>
          {filledCount === maxPositions ? 'Pronto para Ciclar' : 'Em Evolução'}
        </p>
      </div>
    </div>
  );
}

function MatrixNodePreview({ position, isUser, isFilled, type }: { position: number, isUser: boolean, isFilled: boolean, type: 'ONBORD' | 'CASHBOARD' }) {
  const carImages = [
    'sedan',
    'picape',
    'hatch',
    'moto',
    'suv',
    'esportivo',
    'eletrico'
  ];
  
  const carType = carImages[(position - 1) % carImages.length];
  const carImageUrl = `https://images.unsplash.com/photo-${
    carType === 'sedan' ? '1550355291-bbee04a92027' :
    carType === 'picape' ? '1533473359331-0135ef1b58bf' :
    carType === 'hatch' ? '1541899481282-d53bffe3c15d' :
    carType === 'moto' ? '1558981806-ec527fa84c39' :
    carType === 'suv' ? '1519641471654-76ce0107ad1b' :
    carType === 'esportivo' ? '1503376780353-7e6692767b70' :
    '1593941707882-a5bba14938c7'
  }?auto=format&fit=crop&q=80&w=100&h=100`;

  return (
    <div className="relative flex flex-col items-center">
      <motion.div 
        whileHover={{ scale: 1.1 }}
        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border-2 transition-all duration-500 overflow-hidden relative ${
          isUser 
            ? 'border text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] z-10' 
            : isFilled 
              ? type === 'ONBORD' ? 'border-[var(--neon-blue)]' : 'border-yellow-400'
              : 'bg-[var(--border-main)] border-[var(--text-muted)] text-[var(--text-muted)] border-dashed'
        }`}
      >
        {isFilled || isUser ? (
          <>
            <img 
              src={carImageUrl} 
              alt={carType}
              className={`absolute inset-0 w-full h-full object-cover ${isUser ? 'brightness-110' : 'brightness-50'}`}
              referrerPolicy="no-referrer"
            />
            <div className={`absolute inset-0 bg-gradient-to-t ${
              isUser 
                ? 'from-emerald-600/80 to-transparent' 
                : type === 'ONBORD' ? 'from-[var(--neon-blue)]/80 to-transparent' : 'from-yellow-900/80 to-transparent'
            }`} />
            {isUser ? (
              <Star size={16} fill="currentColor" className="relative z-10 text-[var(--text-main)]" />
            ) : (
              <span className="relative z-10 text-[10px] font-black text-[var(--text-main)]/80 uppercase italic">{carType}</span>
            )}
          </>
        ) : (
          <span className="text-[10px] font-bold">{position}</span>
        )}
      </motion.div>
      {isUser && (
        <div className="absolute -top-6 bg-blue-600 hover:bg-blue-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest whitespace-nowrap shadow-lg">
          Você
        </div>
      )}
    </div>
  );
}

function StepItem({ icon, label, done }: { icon: React.ReactNode, label: string, done: boolean }) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${done ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[var(--border-main)] text-[var(--text-muted)]'}`}>
          {icon}
        </div>
        <span className={`text-xs font-medium transition-colors ${done ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>{label}</span>
      </div>
      {done ? (
        <CheckCircle2 size={14} className="text-emerald-500" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-[var(--border-main)] group-hover:border-[var(--text-muted)] transition-colors" />
      )}
    </div>
  );
}
