import React from 'react';
import { motion } from 'motion/react';
import { Car, Bike } from 'lucide-react';

interface BrandBannerProps {
  name?: string;
  subtitle?: string;
}

export const BrandBanner: React.FC<BrandBannerProps> = ({ 
  name = "MOBICYCLE", 
  subtitle = "MOBILIDADE,TECNOLOGIA & SUSTENTABILIDADE" 
}) => {
  return (
    <div className="relative w-full h-64 sm:h-80 bg-[var(--bg-card)] rounded-[2.5rem] overflow-hidden border border-[var(--border-main)] shadow-2xl group">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(var(--text-muted) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>

      {/* Main SVG Composition */}
      <svg 
        viewBox="0 0 1000 400" 
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#855d00" />
            <stop offset="50%" stopColor="#ffd700" />
            <stop offset="100%" stopColor="#855d00" />
          </linearGradient>
          <linearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4a4a4a" />
            <stop offset="50%" stopColor="#c0c0c0" />
            <stop offset="100%" stopColor="#4a4a4a" />
          </linearGradient>
          <radialGradient id="diamondGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#b9f2ff" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* The Road (3 Stripes) - Converging to the right */}
        <g opacity="0.6">
          {/* Left Gold Stripe */}
          <motion.path 
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            d="M 100 400 L 750 150" 
            stroke="url(#goldGradient)" 
            strokeWidth="8" 
            fill="none"
          />
          {/* Right Gold Stripe */}
          <motion.path 
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
            d="M 1100 400 L 750 150" 
            stroke="url(#goldGradient)" 
            strokeWidth="8" 
            fill="none"
          />
          {/* Middle Silver Stripe */}
          <motion.path 
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.8 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
            d="M 600 400 L 750 150" 
            stroke="url(#silverGradient)" 
            strokeWidth="4" 
            strokeDasharray="20,15"
            fill="none"
          />
        </g>

        {/* The Diamond Sparkle at the end */}
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.2, 1], opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          <circle cx="750" cy="150" r="15" fill="url(#diamondGlow)" />
          <path 
            d="M 750 130 L 755 145 L 770 150 L 755 155 L 750 170 L 745 155 L 730 150 L 745 145 Z" 
            fill="white" 
            filter="url(#glow)"
          />
        </motion.g>

        {/* Moving Car and Motorcycle */}
        <motion.g
          initial={{ x: 100, y: 400, opacity: 0, scale: 1 }}
          animate={{ 
            x: [100, 750], 
            y: [400, 150], 
            opacity: [0, 1, 1, 0],
            scale: [1, 0.2] 
          }}
          transition={{ 
            duration: 5, 
            repeat: Infinity, 
            ease: "linear",
            delay: 2
          }}
        >
          <foreignObject x="-20" y="-20" width="40" height="40">
            <Car className="text-[var(--neon-blue)]" size={32} />
          </foreignObject>
        </motion.g>

        <motion.g
          initial={{ x: 1100, y: 400, opacity: 0, scale: 1 }}
          animate={{ 
            x: [1100, 750], 
            y: [400, 150], 
            opacity: [0, 1, 1, 0],
            scale: [1, 0.2] 
          }}
          transition={{ 
            duration: 6, 
            repeat: Infinity, 
            ease: "linear",
            delay: 3.5
          }}
        >
          <foreignObject x="-20" y="-20" width="40" height="40">
            <Bike className="text-amber-400" size={32} />
          </foreignObject>
        </motion.g>

        {/* The Wheel with Arrows and $ - Positioned on the Right */}
        <motion.g 
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          {/* Main Wheel Circle */}
          <circle 
            cx="750" 
            cy="240" 
            r="60" 
            fill="none" 
            stroke="var(--text-main)" 
            strokeWidth="2" 
            strokeOpacity="0.2" 
          />
          
          {/* Clockwise Arrows */}
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            style={{ originX: "750px", originY: "240px" }}
          >
            {/* Arrow 1 */}
            <path 
              d="M 750 170 A 70 70 0 0 1 820 240" 
              stroke="var(--neon-blue, #00f3ff)" 
              strokeWidth="4" 
              fill="none" 
              strokeLinecap="round"
            />
            <path d="M 820 240 L 815 230 M 820 240 L 828 232" stroke="var(--neon-blue, #00f3ff)" strokeWidth="4" strokeLinecap="round" />
            
            {/* Arrow 2 */}
            <path 
              d="M 750 310 A 70 70 0 0 1 680 240" 
              stroke="var(--neon-blue, #00f3ff)" 
              strokeWidth="4" 
              fill="none" 
              strokeLinecap="round"
              transform="rotate(180 750 240)"
            />
            <path 
              d="M 820 240 L 815 230 M 820 240 L 828 232" 
              stroke="var(--neon-blue, #00f3ff)" 
              strokeWidth="4" 
              strokeLinecap="round" 
              transform="rotate(180 750 240)"
            />
          </motion.g>

          {/* Dollar Sign in the Center */}
          <text 
            x="750" 
            y="258" 
            textAnchor="middle" 
            fill="var(--text-main)" 
            fontSize="54" 
            fontWeight="900" 
            className="font-sans"
            style={{ filter: 'drop-shadow(0 0 8px rgba(0,243,255,0.5))' }}
          >
            $
          </text>
        </motion.g>
      </svg>

      {/* Text Overlay - Positioned on the Left */}
      <div className="absolute inset-0 flex flex-col items-start justify-center pl-12 sm:pl-20 bg-gradient-to-r from-[var(--bg-card)] via-[var(--bg-card)]/50 to-transparent">
        <motion.h1 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="text-[var(--text-main)] font-black text-5xl sm:text-7xl italic tracking-tighter uppercase text-left"
        >
          {name}
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="text-[var(--text-main)] text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] mt-2 text-left"
        >
          {subtitle}
        </motion.p>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-6 left-8 border-l-2 border-[var(--neon-blue)] pl-4">
        <div className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-widest">System Status</div>
        <div className="text-[var(--text-main)] text-xs font-bold uppercase tracking-tighter">Operational</div>
      </div>
      
      <div className="absolute top-6 right-8 text-right border-r-2 border-amber-400 pr-4">
        <div className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-widest">Network</div>
        <div className="text-[var(--text-main)] text-xs font-bold uppercase tracking-tighter">Active Nodes</div>
      </div>
    </div>
  );
};
