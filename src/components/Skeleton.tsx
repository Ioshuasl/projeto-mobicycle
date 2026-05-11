import React from 'react';
import { motion } from 'motion/react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rectangular', ...props }) => {
  const baseClasses = "bg-[var(--border-main)] relative overflow-hidden";
  const variantClasses = {
    rectangular: "rounded-xl",
    circular: "rounded-full",
    text: "rounded h-4 w-full"
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: "linear"
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via text-white/5 to-transparent"
      />
    </div>
  );
};

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Banner Skeleton */}
      <Skeleton className="w-full h-48 sm:h-64 rounded-[2.5rem]" />

      {/* Profile Header Skeleton */}
      <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-8">
        <Skeleton variant="circular" className="w-24 h-24 shrink-0" />
        <div className="flex-1 space-y-4 w-full">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} variant="circular" className="w-4 h-4" />
            ))}
          </div>
          <Skeleton className="h-4 w-full max-w-xs" />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <Skeleton className="h-20 w-24" />
          <Skeleton className="h-20 w-24" />
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-[2rem]" />
        ))}
      </div>

      {/* Matrix Preview Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Skeleton className="h-[400px] rounded-[2.5rem]" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-[400px] rounded-[2.5rem]" />
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-10 circular" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-3xl" />
        ))}
      </div>

      <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-3xl p-6">
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-32 shrink-0" />
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PerformanceDashboardSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-3xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Skeleton className="h-[400px] rounded-[2.5rem]" />
        <Skeleton className="h-[400px] rounded-[2.5rem]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
