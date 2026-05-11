import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, Shield, Users, Crown, CheckCircle2, ArrowRight, Sparkles, RefreshCw, XCircle } from 'lucide-react';
import { getCareerLevel } from '../services/careerService';
import confetti from 'canvas-confetti';

interface MatrixNodeProps {
  position: number;
  user?: { 
    name: string; 
    userNickname?: string; 
    userId: string; 
    avatar?: string; 
    referralsCount?: number;
    cycleSalesCount?: number;
    status?: string;
    careerLevel?: string;
    balance?: number;
  };
  isTop?: boolean;
  matrixType: 'ONBORD' | 'CASHBOARD';
  currentUserId?: string;
  onClick?: (user: any) => void;
}

const MatrixNode: React.FC<MatrixNodeProps> = ({ position, user, isTop, matrixType, currentUserId, onClick }) => {
  const isYellow = matrixType === 'CASHBOARD';
  const isMe = user?.userId === currentUserId;
  const [isNew, setIsNew] = React.useState(false);
  
  // Track if user just entered
  React.useEffect(() => {
    if (user) {
      setIsNew(true);
      const timer = setTimeout(() => setIsNew(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [user?.userId]);

  const careerLevel = user ? getCareerLevel(user.cycleSalesCount || 0) : null;
  
  const vehicles = [
    { name: "Sedan Luxo", url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d" },
    { name: "Picape 4x4", url: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf" },
    { name: "Hatch Sport", url: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d" },
    { name: "Moto GP", url: "https://images.unsplash.com/photo-1558981806-ec527fa84c39" },
    { name: "SUV Family", url: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2" },
    { name: "Super Car", url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70" },
    { name: "Electric", url: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7" }
  ];
  
  const vehicle = vehicles[(position - 1) % vehicles.length];
  const carImageUrl = `${vehicle.url}?auto=format&fit=crop&q=80&w=400&h=300`;

  return (
    <motion.div
      layout
      initial={{ scale: 0.8, opacity: 0, y: 10 }}
      animate={{ 
        scale: 1, 
        opacity: 1, 
        y: 0,
        boxShadow: isNew 
          ? isYellow 
            ? "0 0 40px rgba(234, 179, 8, 0.6)" 
            : "0 0 40px rgba(59, 130, 246, 0.6)"
          : user
            ? isYellow
              ? "0 10px 25px -5px rgba(234, 179, 8, 0.4)"
              : "0 10px 25px -5px rgba(59, 130, 246, 0.4)"
            : "0 4px 6px -1px rgb(0 0 0 / 0.1)"
      }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 20,
        layout: { duration: 0.5 }
      }}
      whileHover={{ scale: 1.05, y: -4 }}
      onClick={() => user && onClick?.(user)}
      className={`relative flex flex-col items-center justify-center rounded-[1.5rem] sm:rounded-[2rem] w-20 sm:w-28 xl:w-24 2xl:w-32 h-16 sm:h-24 xl:h-20 2xl:h-28 transition-all duration-500 cursor-pointer overflow-hidden group/node ${
        user 
          ? isMe
            ? 'border-4 border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.6)]'
            : isYellow 
              ? 'border-2 border-yellow-400/80 shadow-[0_0_20px_rgba(234,179,8,0.2)]' 
              : 'border-2 border-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
          : 'border-2 border-[var(--text-muted)] border-dashed hover:border-slate-500/50'
      }`}
    >
      {/* Vehicle Background Image */}
      <div className="absolute inset-0 z-0">
        <motion.img 
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5 }}
          src={carImageUrl} 
          alt={vehicle.name} 
          className={`w-full h-full object-cover transition-all duration-700 ${
            user ? 'brightness-[0.35] group-hover/node:brightness-[0.5] group-hover/node:scale-110' : 'brightness-[0.2] grayscale group-hover/node:brightness-[0.3] group-hover/node:grayscale-0'
          }`}
          referrerPolicy="no-referrer"
        />
        <div className={`absolute inset-0 bg-gradient-to-t ${
          user 
            ? isMe 
              ? 'from-emerald-950/90 via-emerald-950/40 to-transparent' 
              : isYellow ? 'from-yellow-950/90 via-yellow-950/40 to-transparent' : 'from-blue-950/90 via-blue-950/40 to-transparent'
            : 'from-[var(--bg-card)]/90 via-slate-950/40 to-transparent'
        }`} />
      </div>

      {/* Vehicle Type Label */}
      <div className="absolute top-2 left-3 z-20">
        <span className={`text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] opacity-80 ${
          user ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'
        }`}>
          {vehicle.name}
        </span>
      </div>

      {isMe && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-blue-600 hover:bg-blue-500 text-white text-[6px] sm:text-[7px] font-black px-2 sm:px-3 py-0.5 sm:py-1 rounded-b-xl uppercase tracking-widest shadow-lg whitespace-nowrap z-30">
          PILOTO
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-1.5 sm:p-2 mt-1 sm:mt-2">
        <AnimatePresence mode="wait">
          {user ? (
            <motion.div 
              key={user.userId}
              initial={{ opacity: 0, scale: 0.5, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: -10 }}
              className="flex flex-col items-center gap-1.5 w-full"
            >
              <div className={`relative w-8 h-8 sm:w-10 sm:h-10 xl:w-8 xl:h-8 2xl:w-12 2xl:h-12 rounded-full border-2 overflow-hidden shadow-2xl ${
                isMe ? 'border-emerald-400' : isYellow ? 'border-yellow-400' : 'border-blue-400'
              }`}>
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-[var(--border-main)] flex items-center justify-center">
                    <UserIcon size={20} className="text-[var(--text-muted)]" />
                  </div>
                )}
                {isTop && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-1">
                    <Crown size={12} className="text-yellow-400 drop-shadow-lg" />
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center min-w-0 max-w-full">
                <span className="text-[8px] sm:text-[10px] lg:text-xs truncate uppercase tracking-tighter font-black leading-tight text-[var(--text-main)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] max-w-[80px] sm:max-w-[120px]">
                  {user.userNickname || (user.name ? user.name.split(' ')[0] : 'Usuário')}
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  {careerLevel ? (
                    <span className="text-[8px] uppercase font-mono text-[var(--text-main)]/50 tracking-widest drop-shadow-md">{careerLevel.name}</span>
                  ) : (
                    <span className="text-[8px] uppercase font-mono text-[var(--text-main)]/50 tracking-widest drop-shadow-md">Parceiro</span>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 opacity-40 group-hover/node:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 xl:w-8 xl:h-8 2xl:w-12 2xl:h-12 rounded-full border-2 border-slate-600/50 flex items-center justify-center bg-[var(--bg-sidebar)] backdrop-blur-sm">
                <UserIcon size={16} className="text-[var(--text-muted)] sm:w-5 sm:h-5 xl:w-4 xl:h-4 2xl:w-5 2xl:h-5" />
              </div>
              <span className="text-[8px] sm:text-[9px] lg:text-[10px] uppercase tracking-[0.2em] font-black text-[var(--text-main)]/40 group-hover/node:text-[var(--text-main)]/60">VAGO</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className={`absolute bottom-2 right-2 w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-black border z-10 shadow-lg ${
        user 
          ? isYellow ? 'bg-yellow-400 border-yellow-200 text-yellow-900' : ' text-white'
          : 'bg-[var(--bg-sidebar)] border-[var(--text-muted)] text-[var(--text-muted)]'
      }`}>
        {position}
      </div>

      {isNew && (
        <motion.div 
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 1 }}
          className={`absolute inset-0 rounded-2xl border-4 pointer-events-none ${isYellow ? 'border-yellow-400' : 'border-blue-400'}`}
        />
      )}

      {user && isTop && (
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`absolute -inset-1.5 rounded-2xl border-2 pointer-events-none ${isYellow ? 'border-yellow-400' : 'border-blue-400'}`}
        />
      )}
    </motion.div>
  );
};

interface MatrixProps {
  title: string;
  type: 'ONBORD' | 'CASHBOARD';
  positions: any[];
  onFill?: () => void;
  currentUserId?: string;
  onUserClick?: (user: any) => void;
}

export const MatrixView: React.FC<MatrixProps> = ({ title, type, positions, onFill, currentUserId, onUserClick }) => {
  const [selectedUser, setSelectedUser] = React.useState<any>(null);

  const handleUserClick = (user: any) => {
    if (onUserClick) {
      onUserClick(user);
    } else {
      setSelectedUser(user);
    }
  };
  const getPos = (p: number) => positions.find(pos => pos.position === p);
  const filledCount = positions.length;
  const maxPositions = 7;
  const isFull = filledCount === maxPositions;
  const prevIsFull = useRef(false);

  useEffect(() => {
    if (isFull && !prevIsFull.current) {
      // Trigger confetti from the matrix card position
      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
        colors: type === 'ONBORD' ? ['#3b82f6', '#60a5fa', '#ffffff'] : ['#eab308', '#facc15', '#ffffff'],
        zIndex: 100
      };

      function fire(particleRatio: number, opts: any) {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio)
        });
      }

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    }
    prevIsFull.current = isFull;
  }, [isFull, type]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        borderColor: isFull 
          ? type === 'ONBORD' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(234, 179, 8, 0.8)'
          : 'var(--border-main)',
        scale: isFull ? [1, 1.01, 1] : 1,
        boxShadow: isFull 
          ? type === 'ONBORD' 
            ? '0 0 60px rgba(59, 130, 246, 0.3), inset 0 0 20px rgba(59, 130, 246, 0.1)' 
            : '0 0 60px rgba(234, 179, 8, 0.3), inset 0 0 20px rgba(234, 179, 8, 0.1)'
          : '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}
      transition={{
        scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
        borderColor: { duration: 1 }
      }}
      className={`bg-[var(--bg-card)] border-2 rounded-[1.5rem] sm:rounded-[2.5rem] p-3 sm:p-6 lg:p-10 shadow-2xl relative overflow-hidden transition-colors duration-1000 group`}
    >
      {/* Sparkle overlay when full */}
      {isFull && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_70%)]"
        />
      )}
      {/* User Details Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setSelectedUser(null)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                  <XCircle size={24} />
                </button>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="relative w-24 h-24 rounded-3xl border-4 border-blue-500/30 overflow-hidden mb-6">
                  {selectedUser.avatar ? (
                    <img src={selectedUser.avatar} alt={selectedUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-[var(--border-main)] flex items-center justify-center text-slate-600">
                      <UserIcon size={48} />
                    </div>
                  )}
                </div>

                <h4 className="text-2xl font-black text-[var(--text-main)] uppercase italic tracking-tighter mb-1">
                  {selectedUser.userName || selectedUser.name}
                </h4>
                <p className="text-blue-400 font-mono text-xs uppercase tracking-widest mb-6">
                  @{selectedUser.userNickname || 'usuario'}
                </p>

                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="bg-[var(--border-main)] rounded-2xl p-4 border border-[var(--text-muted)]">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-1">Status</p>
                    <p className="text-sm font-bold text-[var(--text-main)] uppercase">{selectedUser.status || 'PARTNER'}</p>
                  </div>
                  <div className="bg-[var(--border-main)] rounded-2xl p-4 border border-[var(--text-muted)]">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-1">Carreira</p>
                    <p className="text-sm font-bold text-[var(--text-main)] uppercase">
                      {getCareerLevel((selectedUser as any).cycleSalesCount || 0).name}
                    </p>
                  </div>
                  <div className="bg-[var(--border-main)] rounded-2xl p-4 border border-[var(--text-muted)] col-span-2">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-1">Saldo</p>
                    <p className="text-xl font-black text-emerald-400">
                      R$ {(selectedUser.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex items-center gap-2 text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-widest">
                  <Users size={14} />
                  <span>{selectedUser.referralsCount || 0} Indicações Diretas</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Background Decorative Elements */}
      <AnimatePresence>
        {isFull && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 pointer-events-none opacity-20 ${
              type === 'ONBORD' ? 'bg-blue-600' : 'bg-yellow-600'
            }`}
            style={{ filter: 'blur(120px)' }}
          />
        )}
      </AnimatePresence>
      
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/5 blur-[100px] -ml-32 -mb-32 pointer-events-none" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-16 gap-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl ${
            type === 'ONBORD' ? 'bg-blue-600/10 text-blue-500 border border-blue-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
          }`}>
            <Shield size={28} />
          </div>
          <div>
            <h3 className="text-lg sm:text-2xl font-black text-[var(--text-main)] tracking-tighter uppercase italic">
              {title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md ${
                type === 'ONBORD' ? 'bg-blue-500/10 text-blue-500' : 'bg-yellow-500/10 text-yellow-500'
              }`}>
                {type} Matrix
              </span>
              <span className="w-1 h-1 bg-[var(--border-main)] rounded-full" />
              <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-widest">ID: {Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className="w-full sm:w-auto bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl p-4 flex items-center gap-6">
          <div className="text-left">
            <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-1">Progresso do Ciclo</p>
            <div className="flex items-center gap-3">
              <span className="text-xl font-black text-[var(--text-main)]">{filledCount}<span className="text-slate-600">/{maxPositions}</span></span>
              <div className="w-24 h-2 bg-[var(--border-main)] rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(filledCount / maxPositions) * 100}%` }}
                  className={`h-full ${type === 'ONBORD' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]'}`}
                />
              </div>
            </div>
          </div>
          {isFull && (
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500"
            >
              <RefreshCw size={20} />
            </motion.div>
          )}
        </div>
      </div>

      {/* Matrix Tree Visualization */}
      <div className="overflow-x-auto pb-4 sm:pb-8 -mx-3 sm:-mx-6 lg:-mx-10 px-3 sm:px-6 lg:px-10 scrollbar-hide">
        <div className="flex flex-col items-center py-4 sm:py-8 relative min-w-fit w-full">
          {/* SVG Connections for a cleaner look */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          <defs>
            <linearGradient id={`grad-${type}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={type === 'ONBORD' ? '#3b82f6' : '#eab308'} />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
                {/* Top to Middle (Left) */}
          <motion.path 
            d="M 50% 96 Q 50% 192, 30% 288" 
            stroke={getPos(2) ? (type === 'ONBORD' ? '#3b82f6' : '#eab308') : 'rgba(71, 85, 105, 0.2)'}
            strokeWidth={getPos(2) ? "3" : "2"}
            fill="none" 
            strokeDasharray={getPos(2) ? "none" : "5,5"}
            filter={getPos(2) ? "url(#glow)" : "none"}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1 }}
          />
          {/* Top to Middle (Right) */}
          <motion.path 
            d="M 50% 96 Q 50% 192, 70% 288" 
            stroke={getPos(3) ? (type === 'ONBORD' ? '#3b82f6' : '#eab308') : 'rgba(71, 85, 105, 0.2)'}
            strokeWidth={getPos(3) ? "3" : "2"}
            fill="none" 
            strokeDasharray={getPos(3) ? "none" : "5,5"}
            filter={getPos(3) ? "url(#glow)" : "none"}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1 }}
          />
          
          {/* Middle Left (Pos 2) to Bottom Left (Pos 4) */}
          <motion.path 
            d="M 30% 288 Q 30% 384, 20% 480" 
            stroke={getPos(4) ? (type === 'ONBORD' ? '#3b82f6' : '#eab308') : 'rgba(71, 85, 105, 0.2)'}
            strokeWidth={getPos(4) ? "3" : "2"}
            fill="none" 
            strokeDasharray={getPos(4) ? "none" : "5,5"}
            filter={getPos(4) ? "url(#glow)" : "none"}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          />
          {/* Middle Left (Pos 2) to Bottom Right (Pos 5) */}
          <motion.path 
            d="M 30% 288 Q 30% 384, 40% 480" 
            stroke={getPos(5) ? (type === 'ONBORD' ? '#3b82f6' : '#eab308') : 'rgba(71, 85, 105, 0.2)'}
            strokeWidth={getPos(5) ? "3" : "2"}
            fill="none" 
            strokeDasharray={getPos(5) ? "none" : "5,5"}
            filter={getPos(5) ? "url(#glow)" : "none"}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          />
          
          {/* Middle Right (Pos 3) to Bottom Left (Pos 6) */}
          <motion.path 
            d="M 70% 288 Q 70% 384, 60% 480" 
            stroke={getPos(6) ? (type === 'ONBORD' ? '#3b82f6' : '#eab308') : 'rgba(71, 85, 105, 0.2)'}
            strokeWidth={getPos(6) ? "3" : "2"}
            fill="none" 
            strokeDasharray={getPos(6) ? "none" : "5,5"}
            filter={getPos(6) ? "url(#glow)" : "none"}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          />
          {/* Middle Right (Pos 3) to Bottom Right (Pos 7) */}
          <motion.path 
            d="M 70% 288 Q 70% 384, 80% 480" 
            stroke={getPos(7) ? (type === 'ONBORD' ? '#3b82f6' : '#eab308') : 'rgba(71, 85, 105, 0.2)'}
            strokeWidth={getPos(7) ? "3" : "2"}
            fill="none" 
            strokeDasharray={getPos(7) ? "none" : "5,5"}
            filter={getPos(7) ? "url(#glow)" : "none"}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          />
        </svg>

        {/* Level 1: Top */}
        <div className="relative z-10 mb-8 sm:mb-16">
          <MatrixNode position={1} user={getPos(1)} isTop={true} matrixType={type} currentUserId={currentUserId} onClick={handleUserClick} />
        </div>

        {/* Level 2: Middle (2 on left, 3 on right) */}
        <div className="flex justify-center gap-8 sm:gap-16 md:gap-32 lg:gap-48 xl:gap-24 2xl:gap-40 mb-8 sm:mb-16 relative z-10 w-full px-2">
          {[2, 3].map(pos => (
            <MatrixNode key={pos} position={pos} user={getPos(pos)} matrixType={type} currentUserId={currentUserId} onClick={handleUserClick} />
          ))}
        </div>

        {/* Level 3: Base (4, 5, 6, 7 from left to right) */}
        <div className="flex justify-center gap-2 sm:gap-4 md:gap-8 lg:gap-12 xl:gap-4 2xl:gap-12 relative z-10 w-full px-2">
          {[4, 5, 6, 7].map(pos => (
            <MatrixNode key={pos} position={pos} user={getPos(pos)} matrixType={type} currentUserId={currentUserId} onClick={handleUserClick} />
          ))}
        </div>
      </div>
    </div>

    {/* Footer Actions */}
      <div className="mt-16 pt-8 border-t border-[var(--border-main)] flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-3 text-[var(--text-muted)]">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-[#0d0d0f] bg-[var(--border-main)]" />
            ))}
          </div>
          <span className="text-[10px] font-mono uppercase tracking-widest">Membros Ativos na Matriz</span>
        </div>

        {isFull ? (
          <motion.button 
            onClick={onFill}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ 
              scale: [1, 1.05, 1],
              opacity: 1,
              boxShadow: type === 'ONBORD' 
                ? ['0 0 0px rgba(59,130,246,0)', '0 0 20px rgba(59,130,246,0.4)', '0 0 0px rgba(59,130,246,0)']
                : ['0 0 0px rgba(234,179,8,0)', '0 0 20px rgba(234,179,8,0.4)', '0 0 0px rgba(234,179,8,0)']
            }}
            transition={{ 
              scale: { duration: 2, repeat: Infinity },
              boxShadow: { duration: 2, repeat: Infinity }
            }}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all active:scale-95 ${
              type === 'ONBORD' 
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            <Sparkles size={18} className="animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest">Matriz Pronta para Ciclar!</span>
            <ArrowRight size={16} />
          </motion.button>
        ) : onFill ? (
          <button 
            onClick={onFill}
            className="group flex items-center gap-3 px-8 py-4 bg-[var(--bg-sidebar)] hover:bg-[var(--border-main)] border border-[var(--border-main)] rounded-2xl transition-all active:scale-95"
          >
            <Users size={18} className="text-blue-500 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black text-[var(--text-main)] uppercase tracking-widest">Aguardando Preenchimento</span>
            <div className="flex gap-1">
              <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }} className="w-1 h-1 bg-blue-500 rounded-full" />
              <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1 h-1 bg-blue-500 rounded-full" />
              <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1 h-1 bg-blue-500 rounded-full" />
            </div>
          </button>
        ) : null}
      </div>
    </motion.div>
  );
};



