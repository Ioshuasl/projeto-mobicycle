import React from 'react';
import { motion } from 'motion/react';
import { Shield, Users, ArrowRight, ShieldCheck } from 'lucide-react';

export const MatrixNodePreview: React.FC<{ 
  position: number, 
  isUser: boolean, 
  isFilled: boolean, 
  type: 'ONBORD' | 'CASHBOARD', 
  onClick?: () => void 
}> = ({ position, isUser, isFilled, type, onClick }) => {
  const vehicles = [
    { name: "Sedan Luxo", url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d" },
    { name: "Picape 4x4", url: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf" },
    { name: "Hatch Sport", url: "https://images.unsplash.com/photo-1541899481282-d53bffe3c15d" },
    { name: "Moto GP", url: "https://images.unsplash.com/photo-1558981806-ec527fa84c39" },
    { name: "SUV Family", url: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2" },
    { name: "Super Car", url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70" },
    { name: "Electric", url: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7" }
  ];
  
  const vehicle = vehicles[(position - 1) % vehicles.length];
  const carImageUrl = `${vehicle.url}?auto=format&fit=crop&q=80&w=400&h=300`;

  return (
    <div className="relative flex flex-col items-center">
      <motion.div 
        whileHover={{ scale: 1.05, y: -4 }}
        onClick={onClick}
        className={`relative flex flex-col items-center justify-center rounded-[2rem] w-32 sm:w-44 h-24 sm:h-32 transition-all duration-500 overflow-hidden group/node ${
          onClick ? 'cursor-pointer' : ''
        } ${
          isUser 
            ? 'border-4 border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.6)] z-10' 
            : isFilled 
              ? type === 'ONBORD' ? 'border-2 border-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'border-2 border-yellow-400/80 shadow-[0_0_20px_rgba(234,179,8,0.2)]'
              : 'border-2 border-[var(--text-muted)] border-dashed hover:border-slate-500/50'
        }`}
      >
        {/* Vehicle Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={carImageUrl} 
            alt={vehicle.name} 
            className={`w-full h-full object-cover transition-all duration-700 ${
              isFilled || isUser ? 'brightness-[0.35] group-hover/node:brightness-[0.5]' : 'brightness-[0.2] grayscale group-hover/node:brightness-[0.3] group-hover/node:grayscale-0'
            }`}
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-2">
          {isFilled || isUser ? (
            <>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${
                isUser ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]' :
                type === 'ONBORD' ? 'bg-blue-600/20 text text-white border-blue-500/40' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
              }`}>
                {isUser ? <ShieldCheck size={24} /> : <Users size={20} />}
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-[var(--text-main)] uppercase italic tracking-tighter leading-none mb-1">
                  {isUser ? 'Você (Piloto)' : 'Membro Ativo'}
                </p>
                <p className="text-[8px] font-mono text-[var(--text-main)]/40 uppercase tracking-widest">
                  {vehicle.name}
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[var(--bg-sidebar)] border-2 border-[var(--border-main)] border-dashed flex items-center justify-center text-slate-700 group-hover/node:border-slate-600 group-hover/node:text-[var(--text-muted)] transition-all">
                <span className="text-sm font-black italic">{position}</span>
              </div>
              <p className="text-[9px] font-black text-slate-600 uppercase italic tracking-widest group-hover/node:text-[var(--text-muted)]">VAGO</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export const MatrixVisualization: React.FC<{ 
  userPos: any, 
  positions: any[], 
  type: 'ONBORD' | 'CASHBOARD', 
  onNodeClick?: (pos: number) => void 
}> = ({ userPos, positions, type, onNodeClick }) => {
  const isFilled = (pos: number) => positions.some(p => p.position === pos);
  
  return (
    <div className="relative flex flex-col items-center py-12">
      {/* Level 1: Top */}
      <div className="relative z-10 mb-16">
        <MatrixNodePreview position={1} isUser={userPos?.position === 1} isFilled={isFilled(1)} type={type} onClick={onNodeClick ? () => onNodeClick(1) : undefined} />
      </div>

      {/* Level 2: Middle */}
      <div className="flex justify-center gap-24 sm:gap-48 mb-16 relative z-10">
        {[2, 3].map(pos => (
          <MatrixNodePreview key={pos} position={pos} isUser={userPos?.position === pos} isFilled={isFilled(pos)} type={type} onClick={onNodeClick ? () => onNodeClick(pos) : undefined} />
        ))}
      </div>

      {/* Level 3: Base */}
      <div className="flex justify-center gap-4 sm:gap-8 relative z-10">
        {[4, 5, 6, 7].map(pos => (
          <MatrixNodePreview key={pos} position={pos} isUser={userPos?.position === pos} isFilled={isFilled(pos)} type={type} onClick={onNodeClick ? () => onNodeClick(pos) : undefined} />
        ))}
      </div>
    </div>
  );
}
