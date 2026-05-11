import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Mail, Calendar, Search, ChevronRight, ChevronDown, Map as MapIcon, Sparkles, Shield, Info, Plus, Minus, RefreshCw } from 'lucide-react';
import { ReferralDetailsModal } from './ReferralDetailsModal';
import { ReferralCard } from './ReferralCard';

interface Referral {
  id: string;
  name: string;
  nickname: string;
  email?: string;
  status: string;
  createdAt: string;
  referralsCount?: number;
  cycleSalesCount?: number;
  avatar?: string;
  children?: Referral[];
}

const CompactTreeNode: React.FC<{ node: Referral; level?: number; onSelect: (node: Referral) => void }> = ({ node, level = 0, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  const getLevelColor = (lvl: number) => {
    const colors = [
      'var(--neon-blue)',
      'var(--neon-green)',
      'var(--neon-purple)',
      'var(--neon-pink)',
      'var(--neon-orange)'
    ];
    return colors[lvl % colors.length];
  };

  const levelColor = getLevelColor(level);

  return (
    <div className="relative">
      <div 
        className={`flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-[var(--glass-bg)] transition-all group ${hasChildren ? 'cursor-pointer' : ''}`}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-center w-4">
          {hasChildren && (
            <div 
              className="transition-colors"
              style={{ color: isExpanded ? levelColor : 'var(--text-muted)' }}
            >
              {isExpanded ? <Minus size={12} /> : <Plus size={12} />}
            </div>
          )}
        </div>
        
        <div 
          className="w-6 h-6 rounded-md flex items-center justify-center overflow-hidden border"
          style={{ 
            backgroundColor: `${levelColor}15`,
            color: levelColor,
            borderColor: `${levelColor}30`
          }}
        >
          {node.avatar ? (
            <img src={node.avatar} alt={node.name} className="w-full h-full object-cover" />
          ) : (
            <Users size={12} />
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-1">
          <span className="text-[var(--text-main)] font-medium text-xs group-hover:text-[var(--neon-blue)] transition-colors">{node.name}</span>
          <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider">({node.nickname})</span>
          <span 
            className="text-[8px] px-1.5 py-0.5 rounded border font-bold uppercase"
            style={{ 
              backgroundColor: `${levelColor}10`, 
              color: levelColor,
              borderColor: `${levelColor}20`
            }}
          >
            {node.status}
          </span>
        </div>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            onSelect(node);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-[var(--neon-blue)] transition-all"
        >
          <Info size={12} />
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden ml-4 border-l"
            style={{ borderLeftColor: `${levelColor}20` }}
          >
            <div className="pl-2 py-1 space-y-0.5">
              {node.children!.map((child) => (
                <CompactTreeNode key={child.id} node={child} level={level + 1} onSelect={onSelect} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function ReferralsList({ referralLink, onViewNetwork }: { referralLink: string; onViewNetwork?: (userId: string) => void }) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [network, setNetwork] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'direct' | 'linear'>('direct');
  const [maxDepth, setMaxDepth] = useState(10);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = localStorage.getItem('wayfy_user_id');
        const headers = { 'x-user-id': userId || '' };

        const [refRes, netRes] = await Promise.all([
          fetch('/api/user/referrals', { headers }),
          fetch(`/api/user/network?depth=${maxDepth}`, { headers })
        ]);

        if (refRes.ok) setReferrals(await refRes.json());
        if (netRes.ok) setNetwork(await netRes.json());
      } catch (err) {
        console.error("Error fetching referral data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [maxDepth]);

  const filteredReferrals = referrals.filter(ref => 
    ref.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ref.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ref.nickname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-[var(--neon-blue)]/20 border-t-[var(--neon-blue)] animate-spin" />
          <div className="absolute inset-0 blur-md bg-[var(--neon-blue)]/20 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-[var(--text-main)]">Minha Rede MOBICYCLE</h3>
          <p className="text-[var(--text-muted)] text-sm">Gerencie seus indicados diretos e acompanhe o crescimento da sua rede.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex p-1 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl">
            <button 
              onClick={() => setViewMode('direct')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                viewMode === 'direct' 
                  ? 'bg-[var(--neon-blue)] text-[#0a0f1e] shadow-[0_0_15px_rgba(0,243,255,0.3)]' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Diretos
            </button>
            <button 
              onClick={() => setViewMode('linear')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                viewMode === 'linear' 
                  ? 'bg-[var(--neon-orange)] text-[var(--text-main)] shadow-[0_0_15px_rgba(255,103,0,0.3)]' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Linear
            </button>
          </div>
          
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
            <input 
              type="text"
              placeholder="Buscar..."
              className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl py-2 pl-10 pr-4 text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-[var(--neon-blue)] focus:ring-1 focus:ring-[var(--neon-blue)]/20 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {viewMode === 'direct' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReferrals.length > 0 ? (
            filteredReferrals.map((ref, index) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={ref.id}
                onClick={() => setSelectedReferral(ref)}
                className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-6 flex flex-col gap-4 hover:border-[var(--neon-blue)]/50 transition-all group cursor-pointer relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-[var(--neon-blue)]">
                  <Users size={48} />
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--neon-blue)]/10 border border-[var(--neon-blue)]/20 flex items-center justify-center text-[var(--neon-blue)] group-hover:bg-[var(--neon-blue)] group-hover:text-[#0a0f1e] transition-all overflow-hidden shadow-[0_0_15px_rgba(0,243,255,0.1)]">
                    {ref.avatar ? (
                      <img src={ref.avatar} alt={ref.name} className="w-full h-full object-cover" />
                    ) : (
                      <Users size={24} />
                    )}
                  </div>
                  <div>
                    <h4 className="text-[var(--text-main)] font-black text-sm uppercase italic tracking-tight group-hover:text-[var(--neon-blue)] transition-colors">{ref.name}</h4>
                    <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">@{ref.nickname}</p>
                  </div>
                </div>

                <div className="space-y-3 mt-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[var(--text-muted)] uppercase font-mono tracking-widest">Email</span>
                    <span className="text-[var(--text-main)] truncate max-w-[150px]">{ref.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[var(--text-muted)] uppercase font-mono tracking-widest">Cadastro</span>
                    <span className="text-[var(--text-main)]">{new Date(ref.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[var(--border-main)]/30 flex items-center justify-between">
                  <div className="px-3 py-1 bg-black/20 border border-[var(--border-main)] rounded-lg">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      ref.status === 'MASTER' ? 'text-[var(--neon-purple)]' : 
                      ref.status === 'EXECUTIVO' ? 'text-[var(--neon-blue)]' : 'text-[var(--text-muted)]'
                    }`}>
                      {ref.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[var(--neon-blue)]">
                    <RefreshCw size={12} className="animate-spin-slow" />
                    <span className="text-xs font-black">{ref.cycleSalesCount || 0}</span>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-20 text-center bg-[var(--bg-card)] border border-dashed border-[var(--border-main)] rounded-3xl">
              <Users className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4 opacity-20" />
              <p className="text-[var(--text-muted)] text-sm">Nenhuma indicação direta encontrada.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">Visualização Linear Expandível</span>
          </div>
          {network.length > 0 ? (
            <div className="space-y-1">
              {network.map((node) => (
                <CompactTreeNode key={node.id} node={node} onSelect={setSelectedReferral} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <Users className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4 opacity-20" />
              <p className="text-[var(--text-muted)] text-sm">Sua rede ainda não possui indicações para visualização linear.</p>
            </div>
          )}
        </div>
      )}
      {selectedReferral && (
        <ReferralDetailsModal 
          referral={selectedReferral} 
          onClose={() => setSelectedReferral(null)} 
          onViewNetwork={onViewNetwork} 
        />
      )}
    </div>
  );
}
