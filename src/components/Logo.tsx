import React from 'react';
import { motion } from 'motion/react';

interface LogoProps {
  className?: string;
  size?: number;
  animated?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 40, animated = true }) => {
  return (
    <div 
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="logoBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f3ff" />
            <stop offset="100%" stopColor="#0066ff" />
          </linearGradient>
          <linearGradient id="logoGreen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00ff88" />
            <stop offset="100%" stopColor="#00aa44" />
          </linearGradient>
          <linearGradient id="logoGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd700" />
            <stop offset="100%" stopColor="#ff8c00" />
          </linearGradient>
          <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* M - Stylized */}
        <motion.path
          d="M15 80 L35 20 L55 60 L75 20 L95 80"
          stroke="url(#logoBlue)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={animated ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 1 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          filter="url(#logoGlow)"
        />

        {/* C - Stylized wrapping the coin */}
        <motion.path
          d="M85 50 A 35 35 0 1 1 50 15"
          stroke="url(#logoGreen)"
          strokeWidth="12"
          strokeLinecap="round"
          initial={animated ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 1 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
          filter="url(#logoGlow)"
        />

        {/* Arrow head for C */}
        <motion.path
          d="M50 15 L60 5 M50 15 L40 5"
          stroke="url(#logoGreen)"
          strokeWidth="8"
          strokeLinecap="round"
          initial={animated ? { opacity: 0 } : { opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.8 }}
        />

        {/* Coin */}
        <motion.g
          initial={animated ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 1.2 }}
        >
          <circle cx="65" cy="55" r="18" fill="url(#logoGold)" />
          <circle cx="65" cy="55" r="14" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <text 
            x="65" 
            y="62" 
            fill="white" 
            fontSize="20" 
            fontWeight="black" 
            textAnchor="middle"
            style={{ fontFamily: 'monospace' }}
          >
            $
          </text>
        </motion.g>

        {/* Shine effect on coin */}
        <motion.circle
          cx="55"
          cy="45"
          r="2"
          fill="white"
          initial={animated ? { opacity: 0 } : { opacity: 0.8 }}
          animate={animated ? { opacity: [0, 1, 0] } : {}}
          transition={{ duration: 2, repeat: Infinity, delay: 2 }}
        />
      </svg>
    </div>
  );
};

export default Logo;
