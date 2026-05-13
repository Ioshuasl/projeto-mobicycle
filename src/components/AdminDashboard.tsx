import React, { useState, useEffect, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';
import { 
  Users, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Search, 
  Edit2, 
  Trash2, 
  Shield, 
  TrendingUp, 
  DollarSign, 
  RefreshCw,
  FileText,
  Image as ImageIcon,
  User as UserIcon,
  Save,
  X,
  Sun,
  Moon,
  AlertCircle,
  Activity,
  ChevronRight,
  ChevronLeft,
  XCircle,
  Wallet,
  Car,
  Zap,
  Trophy,
  ShieldCheck,
  Truck,
  Utensils,
  Upload,
  Phone,
  Maximize2,
  Gift,
  HandPlatter,
  CheckCircle2,
  Sparkles,
  Palette,
  Wrench
} from 'lucide-react';
import { User, Matrix, Transaction } from '../types';
import { getCacheBustedUrl } from '../lib/utils';
import { AdminDashboardSkeleton } from './Skeleton';
import { GoogleGenAI } from "@google/genai";
import { MatrixVisualization } from './MatrixPreview';
import { BrandBanner } from './BrandBanner';


// Lazy loaded components
const MatrixView = React.lazy(() => import('./Matrix').then(m => ({ default: m.MatrixView })));
const ProfileModal = React.lazy(() => import('./ProfileModal').then(m => ({ default: m.ProfileModal })));
const UserDetailsModal = React.lazy(() => import('./UserDetailsModal').then(m => ({ default: m.UserDetailsModal })));
const AdminCharts = React.lazy(() => import('./AdminCharts').then(m => ({ default: m.AdminCharts })));

const MatrixTree = ({ positions }: { positions: any[] }) => {
  const getParticipant = (pos: number) => positions?.find(p => p.position === pos);

  const Node = ({ pos, className = "" }: { pos: number, className?: string }) => {
    const p = getParticipant(pos);
    return (
      <div className={`flex flex-col items-center gap-1 ${className}`}>
        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500 shadow-lg ${
          p ? 'bg-[var(--neon-blue)] border text-white scale-110 shadow-[var(--neon-blue)]/40' : 'bg-[var(--bg-sidebar)] border-[var(--border-main)] text-[var(--text-muted)]'
        }`}>
          {p ? <UserIcon size={20} /> : <span className="text-[10px] font-mono">#{pos}</span>}
        </div>
        {p && (
          <div className="text-center">
            <p className="text-[9px] font-black text-[var(--text-main)] uppercase truncate max-w-[60px]">{p.nickname || p.name.split(' ')[0]}</p>
            <p className="text-[7px] text-[var(--neon-blue)] font-mono">ID: {p.userId.substring(0, 6)}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative py-8 flex flex-col items-center gap-8 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-main)] overflow-x-auto custom-scrollbar">
      <div className="flex flex-col items-center gap-8 min-w-[max-content] px-4">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(var(--neon-blue) 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' }} />
      
      {/* Level 1 */}
      <div className="relative z-10">
        <Node pos={1} />
      </div>

      {/* Connectors L1 -> L2 */}
      <svg className="absolute top-[72px] left-1/2 -translate-x-1/2 w-[200px] h-[40px] pointer-events-none opacity-20">
        <line x1="100" y1="0" x2="40" y2="40" stroke="var(--neon-blue)" strokeWidth="1" />
        <line x1="100" y1="0" x2="160" y2="40" stroke="var(--neon-blue)" strokeWidth="1" />
      </svg>

      {/* Level 2 */}
      <div className="flex gap-24 relative z-10">
        <Node pos={2} />
        <Node pos={3} />
      </div>

      {/* Connectors L2 -> L3 */}
      <svg className="absolute top-[168px] left-1/2 -translate-x-1/2 w-[320px] h-[40px] pointer-events-none opacity-20">
        <line x1="60" y1="0" x2="20" y2="40" stroke="var(--neon-blue)" strokeWidth="1" />
        <line x1="60" y1="0" x2="100" y2="40" stroke="var(--neon-blue)" strokeWidth="1" />
        <line x1="260" y1="0" x2="220" y2="40" stroke="var(--neon-blue)" strokeWidth="1" />
        <line x1="260" y1="0" x2="300" y2="40" stroke="var(--neon-blue)" strokeWidth="1" />
      </svg>

      {/* Level 3 */}
      <div className="flex gap-8 relative z-10">
        <Node pos={4} />
        <Node pos={5} />
        <Node pos={6} />
        <Node pos={7} />
      </div>
    </div>
    </div>
  );
};

// Loading Fallback
const AdminDashboardLoader = () => (
  <div className="w-full">
    <AdminDashboardSkeleton />
  </div>
);

import { PaymentReceipt } from './PaymentReceipt';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
  onRefresh?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onSwitchView?: () => void;
  matrixSettings?: any;
  logoUrl?: string;
}

export function AdminDashboard({ 
  user, 
  onLogout, 
  onUpdateUser,
  onRefresh,
  theme,
  onToggleTheme,
  onSwitchView,
  matrixSettings,
  logoUrl
}: AdminDashboardProps) {
  console.log("AdminDashboard: Component Rendering", { userId: user?.id, theme });
  const [users, setUsers] = useState<User[]>([]);
  const [matrices, setMatrices] = useState<Matrix[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS' | 'MATRICES' | 'TRANSACTIONS' | 'SETTINGS' | 'DOCUMENTS' | 'MOBICYCLE_SERVICES' | 'DESIGN' | 'USER_MANAGEMENT'>('OVERVIEW');
  const [stats, setStats] = useState<any>(null);
  const [matrixSummary, setMatrixSummary] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [bannerUrl, setBannerUrl] = useState('');
  const [newBannerUrl, setNewBannerUrl] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedMatrix, setSelectedMatrix] = useState<Matrix | null>(null);
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [systemSettings, setSystemSettings] = useState<any>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [onboardPage, setOnboardPage] = useState(1);
  const [cashboardPage, setCashboardPage] = useState(1);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [generatedLogo, setGeneratedLogo] = useState<string | null>(null);
  const [logoPrompt, setLogoPrompt] = useState('');
  const [networkUserId, setNetworkUserId] = useState('');
  const [userNetwork, setUserNetwork] = useState<any>(null);
  const [loadingNetwork, setLoadingNetwork] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [userLimit, setUserLimit] = useState(20);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);
  const matricesPerPage = 20;
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'USERS' || activeTab === 'USER_MANAGEMENT') {
      const timer = setTimeout(() => {
        fetchUsers(1, searchTerm);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchTerm]);

  useEffect(() => {
    console.log("AdminDashboard: useEffect mounted");
    fetchData();
  }, []);

  const [matrixDetails, setMatrixDetails] = useState<any>(null);
  const [loadingMatrixDetails, setLoadingMatrixDetails] = useState(false);

  useEffect(() => {
    if (showMatrixModal && selectedMatrix) {
      fetchMatrixDetails(selectedMatrix.id);
    } else {
      setMatrixDetails(null);
    }
  }, [showMatrixModal, selectedMatrix]);

  const fetchMatrixDetails = async (id: string) => {
    setLoadingMatrixDetails(true);
    try {
      const res = await fetch(`/api/admin/matrix/${id}/details`, {
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) {
        setMatrixDetails(await res.json());
      }
    } catch (err) {
      console.error("Error fetching matrix details:", err);
    } finally {
      setLoadingMatrixDetails(false);
    }
  };

  const fetchUserNetwork = async (userId: string) => {
    if (!userId) return;
    setLoadingNetwork(true);
    try {
      const res = await fetch(`/api/admin/user/network/${userId}`, {
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) {
        const data = await res.json();
        // Wrap in a root node for NetworkMap
        const targetUser = users.find(u => u.id === userId);
        setUserNetwork({
          id: userId,
          name: targetUser?.name || 'Usuário',
          nickname: targetUser?.nickname || 'Usuário',
          children: data
        });
      } else {
        const err = await res.json();
        setError(err.error || "Erro ao buscar rede");
      }
    } catch (err) {
      console.error("Error fetching user network:", err);
      setError("Erro de conexão ao buscar rede");
    } finally {
      setLoadingNetwork(false);
    }
  };

  const handleGenerateLogo = async () => {
    setIsGeneratingLogo(true);
    setGeneratedLogo(null);
    try {
      const res = await fetch('/api/admin/generate-logo', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Logo gerado com sucesso!");
        // We can't easily show the new logo immediately without a cache buster
        // but we can reload or just tell the user it's done.
        window.location.reload();
      } else {
        alert("Erro ao gerar logo: " + (data.error || "Erro desconhecido"));
      }
    } catch (err) {
      console.error("Error generating logo:", err);
      alert("Erro ao gerar logotipo. Tente novamente.");
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  const fetchUsers = async (page = 1, search = '') => {
    setIsFetchingUsers(true);
    try {
      const res = await fetch(`/api/admin/users?page=${page}&limit=${userLimit}&search=${encodeURIComponent(search)}`, {
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotalUsers(data.total);
        setUserPage(data.page);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setIsFetchingUsers(false);
    }
  };

  const fetchData = async () => {
    console.log("AdminDashboard: Starting fetchData...");
    setLoading(true);
    setError(null);
    try {
      const [usersRes, onboardRes, summaryRes, bannerRes, transRes, statsRes, docsRes, settingsRes] = await Promise.all([
        fetch(`/api/admin/users?page=1&limit=${userLimit}&search=${encodeURIComponent(searchTerm)}`, { headers: { 'x-user-id': user.id } }),
        fetch('/api/matrices?type=ONBORD', { headers: { 'x-user-id': user.id } }),
        fetch('/api/admin/matrices/summary', { headers: { 'x-user-id': user.id } }),
        fetch('/api/settings/banner'),
        fetch('/api/admin/transactions', { headers: { 'x-user-id': user.id } }),
        fetch('/api/admin/stats', { headers: { 'x-user-id': user.id } }),
        fetch('/api/admin/documents', { headers: { 'x-user-id': user.id } }),
        fetch('/api/settings/all', { headers: { 'x-user-id': user.id } })
      ]);
      
      console.log("AdminDashboard: Fetch responses received", {
        users: usersRes.status,
        onboard: onboardRes.status,
        summary: summaryRes.status,
        banner: bannerRes.status,
        trans: transRes.status,
        stats: statsRes.status,
        docs: docsRes.status,
        settings: settingsRes.status
      });

      if (!usersRes.ok || !onboardRes.ok || !summaryRes.ok || !bannerRes.ok || !transRes.ok || !statsRes.ok || !docsRes.ok || !settingsRes.ok) {
        throw new Error(`Server error: ${usersRes.status}/${onboardRes.status}/${summaryRes.status}/${bannerRes.status}/${transRes.status}/${statsRes.status}/${docsRes.status}/${settingsRes.status}`);
      }

      const usersData = await usersRes.json().catch(e => { console.error("Failed to parse users JSON", e); return null; });
      const onboardData = await onboardRes.json().catch(e => { console.error("Failed to parse onboard matrices JSON", e); return null; });
      const summaryData = await summaryRes.json().catch(e => { console.error("Failed to parse summary JSON", e); return null; });
      const bannerData = await bannerRes.json().catch(e => { console.error("Failed to parse banner JSON", e); return null; });
      const transData = await transRes.json().catch(e => { console.error("Failed to parse transactions JSON", e); return null; });
      const statsData = await statsRes.json().catch(e => { console.error("Failed to parse stats JSON", e); return null; });
      const docsData = await docsRes.json().catch(e => { console.error("Failed to parse documents JSON", e); return null; });
      const settingsData = await settingsRes.json().catch(e => { console.error("Failed to parse settings JSON", e); return null; });
      
      if (!usersData || !onboardData || !summaryData || !transData || !statsData || !docsData || !settingsData) {
        throw new Error("Falha ao processar dados do servidor. Verifique o console para mais detalhes.");
      }

      setUsers(usersData.users);
      setTotalUsers(usersData.total);
      setUserPage(usersData.page);
      setMatrices(onboardData);
      setMatrixSummary(summaryData);
      setBannerUrl(bannerData.url);
      setNewBannerUrl(bannerData.url || '');
      setTransactions(transData);
      setStats(statsData);
      setDocuments(docsData);
      setSystemSettings(settingsData);
      console.log("AdminDashboard: State updated successfully");

      // Load CASHBOARD matrices after ONBORD
      try {
        const cashRes = await fetch('/api/matrices?type=CASHBOARD', { headers: { 'x-user-id': user.id } });
        if (cashRes.ok) {
          const cashData = await cashRes.json();
          if (Array.isArray(cashData)) {
            setMatrices(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              const newMatrices = cashData.filter(m => !existingIds.has(m.id));
              return [...prev, ...newMatrices];
            });
          }
        }
      } catch (err) {
        console.error("Error fetching CASHBOARD matrices in AdminDashboard:", err);
      }
    } catch (err) {
      console.error("Error fetching admin data:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserStatus = async (userId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchData();
    } catch (err) {
      alert("Erro ao atualizar status");
    }
  };

  const handleUpdateUserDetail = async (userId: string, field: string, value: any) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/update`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ field, value })
      });
      if (res.ok) {
        fetchData();
        return true;
      }
      return false;
    } catch (err) {
      alert("Erro ao atualizar usuário");
      return false;
    }
  };

  const handleDeleteUsuario = async (userId: string, userName?: string) => {
    const label = userName?.trim() ? `"${userName.trim()}"` : userId;
    if (!window.confirm(`Excluir permanentemente o usuário ${label}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.id },
      });
      let errMsg = '';
      try {
        const body = await res.json();
        errMsg = typeof body?.error === 'string' ? body.error : '';
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        alert(errMsg || `Erro ${res.status} ao excluir usuário`);
        return;
      }
      if (selectedUser?.id === userId) {
        setShowUserModal(false);
        setSelectedUser(null);
      }
      await fetchUsers(userPage, searchTerm);
      fetchData();
    } catch {
      alert('Erro de rede ao excluir usuário');
    }
  };

  const handleUpdateBanner = async (url?: string) => {
    const bannerToSave = url || newBannerUrl;
    if (!bannerToSave) return;

    try {
      const res = await fetch('/api/settings/banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: bannerToSave, userId: user.id })
      });
      if (res.ok) {
        setBannerUrl(bannerToSave);
        setNewBannerUrl('');
        alert("Banner atualizado!");
      }
    } catch (err) {
      alert("Erro ao atualizar banner");
    }
  };

  const handleSaveLogo = async () => {
    if (!generatedLogo) return;
    
    try {
      const res = await fetch('/api/settings/update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ 
          settings: { ...systemSettings, logo_url: generatedLogo }, 
          userId: user.id 
        })
      });
      if (res.ok) {
        alert("Logo atualizado com sucesso!");
        onRefresh?.();
        setGeneratedLogo(null);
      }
    } catch (err) {
      console.error("Error saving logo:", err);
      alert("Erro ao salvar logo");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      handleUpdateBanner(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateSystemSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings/update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ settings: systemSettings, userId: user.id })
      });
      if (res.ok) {
        alert("Configurações atualizadas com sucesso!");
        onRefresh?.();
      } else {
        alert("Erro ao atualizar configurações");
      }
    } catch (err) {
      alert("Erro de conexão");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleClearImageCache = async () => {
    if (!window.confirm("Isso irá forçar o recarregamento de todas as imagens do sistema para todos os usuários. Continuar?")) return;
    
    try {
      const res = await fetch('/api/admin/clear-image-cache', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });
      if (res.ok) {
        const data = await res.json();
        alert("Cache de imagens limpo com sucesso!");
        // Update local settings to reflect the new version
        setSystemSettings(prev => ({ ...prev, image_cache_version: data.version }));
        onRefresh?.();
      } else {
        alert("Erro ao limpar cache de imagens");
      }
    } catch (err) {
      alert("Erro de conexão");
    }
  };

  const handleSeed = async () => {
    console.log("AdminDashboard: Seed requested");
    if (!window.confirm("Isso irá apagar TUDO e restaurar o estado inicial. Continuar?")) return;
    try {
      setLoading(true);
      const res = await fetch('/api/admin/seed', { 
        method: 'POST',
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) {
        localStorage.clear();
        alert("Sistema redefinido com sucesso! Recarregando...");
        window.location.reload();
      } else {
        alert("Erro ao redefinir sistema");
      }
    } catch (err) {
      console.error("Erro ao redefinir", err);
      alert("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    console.log("AdminDashboard: Clear cache requested");
    if (!window.confirm("Isso irá redefinir todo o sistema e limpar os dados locais. Deseja continuar?")) return;
    try {
      setLoading(true);
      const res = await fetch('/api/admin/reset-all', { 
        method: 'POST',
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) {
        localStorage.clear();
        alert("Cache limpo e sistema redefinido com sucesso! Recarregando...");
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao limpar cache");
      }
    } catch (err) {
      console.error("Erro de conexão ao limpar cache", err);
      alert("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  const handleResetAll = async () => {
    console.log("AdminDashboard: Reset all requested");
    if (!window.confirm("ATENÇÃO: Isso irá apagar TODAS as matrizes, bônus e transações. Esta ação é IRREVERSÍVEL. Deseja continuar?")) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/reset-all', { 
        method: 'POST',
        headers: { 
          'x-user-id': user.id,
          'Content-Type': 'application/json'
        }
      });

      let data: any = {};
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.warn("Response was not JSON:", text);
      }

      if (res.ok) {
        localStorage.clear();
        alert(data.message || "Sistema zerado com sucesso! A página será recarregada.");
        window.location.reload();
      } else {
        const errorMessage = data.error || "Erro ao zerar sistema. O servidor pode ter retornado um erro inesperado.";
        alert(errorMessage);
      }
    } catch (err) {
      console.error("Erro de conexão ao zerar sistema", err);
      alert("Erro de conexão ao zerar sistema. Verifique sua internet ou se o servidor está online.");
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (u: User) => {
    setSelectedUser(u);
    setShowUserModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] p-4 sm:p-8">
        <AdminDashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[var(--bg-card)] border border-red-500/20 rounded-[2rem] p-8 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
            <XCircle size={32} />
          </div>
          <h2 className="text-xl font-black text-[var(--text-main)] uppercase italic mb-2">Erro ao Carregar Dashboard</h2>
          <p className="text-[var(--text-muted)] text-sm mb-6">{error}</p>
          <button 
            onClick={fetchData}
            className="w-full py-4 bg-[var(--neon-blue)] hover:bg-[var(--neon-blue)]/80 text-[#0a0f1e] font-black uppercase tracking-widest rounded-2xl transition-all"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] flex transition-colors duration-300">
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-[var(--bg-sidebar)] border-b border-[var(--border-main)] px-4 py-3 flex items-center justify-between z-30 backdrop-blur-lg bg-opacity-80">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-[0_0_10px_rgba(0,243,255,0.3)] border border-[var(--neon-blue)]/30">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-8 h-8 bg-[var(--neon-blue)] rounded-lg flex items-center justify-center shadow-[0_0_10px_rgba(0,243,255,0.3)]">
              <Shield className="text-[#0a0f1e] w-5 h-5" />
            </div>
          )}
          <span className="text-[var(--text-main)] font-bold text-sm tracking-tight">MOBICYCLE Admin</span>
        </div>
        <div className="flex items-center gap-3">
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

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-[var(--bg-sidebar)] border-r border-[var(--border-main)] hidden lg:flex flex-col z-20 transition-colors duration-300">
        <div className="p-8 mb-4">
          <div className="flex items-center gap-3">
            <Logo size={40} />
            <div>
              <h1 className="text-[var(--text-main)] font-bold text-lg tracking-tight leading-none mb-1">MOBICYCLE</h1>
              <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-widest leading-none">Painel Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="px-4 py-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-[var(--neon-blue)]"></span>
            Principal
          </div>
          <button 
            onClick={() => setActiveTab('OVERVIEW')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-sm font-medium ${activeTab === 'OVERVIEW' ? 'bg-[var(--neon-blue)] text-[#0a0f1e] shadow-lg shadow-[var(--neon-blue)]/20' : 'text-[var(--text-muted)] hover:bg-[var(--border-main)] hover:text-[var(--text-main)]'}`}
          >
            <LayoutDashboard size={18} />
            Visão Geral
          </button>
          <button 
            onClick={() => setActiveTab('USERS')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-sm font-medium ${activeTab === 'USERS' ? 'bg-[var(--neon-blue)] text-[#0a0f1e] shadow-lg shadow-[var(--neon-blue)]/20' : 'text-[var(--text-muted)] hover:bg-[var(--border-main)] hover:text-[var(--text-main)]'}`}
          >
            <Users size={18} />
            Usuários
          </button>
          <button 
            onClick={() => setActiveTab('MATRICES')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-sm font-medium ${activeTab === 'MATRICES' ? 'bg-[var(--neon-blue)] text-[#0a0f1e] shadow-lg shadow-[var(--neon-blue)]/20' : 'text-[var(--text-muted)] hover:bg-[var(--border-main)] hover:text-[var(--text-main)]'}`}
          >
            <RefreshCw size={18} />
            Matrizes
          </button>
          <button 
            onClick={() => setActiveTab('TRANSACTIONS')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-sm font-medium ${activeTab === 'TRANSACTIONS' ? 'bg-[var(--neon-blue)] text-[#0a0f1e] shadow-lg shadow-[var(--neon-blue)]/20' : 'text-[var(--text-muted)] hover:bg-[var(--border-main)] hover:text-[var(--text-main)]'}`}
          >
            <DollarSign size={18} />
            Transações
          </button>
          <button 
            onClick={() => setActiveTab('DOCUMENTS')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-sm font-medium ${activeTab === 'DOCUMENTS' ? 'bg-[var(--neon-blue)] text-[#0a0f1e] shadow-lg shadow-[var(--neon-blue)]/20' : 'text-[var(--text-muted)] hover:bg-[var(--border-main)] hover:text-[var(--text-main)]'}`}
          >
            <FileText size={18} />
            Documentos
          </button>
          
          <div className="pt-6 pb-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-[var(--neon-blue)]"></span>
            ⚙️ Ecossistema MOBICYCLE
          </div>
          <button 
            onClick={() => setActiveTab('MOBICYCLE_SERVICES')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-sm font-medium ${activeTab === 'MOBICYCLE_SERVICES' ? 'bg-[var(--neon-blue)] text-[#0a0f1e] shadow-lg shadow-[var(--neon-blue)]/20' : 'text-[var(--text-muted)] hover:bg-[var(--border-main)] hover:text-[var(--text-main)]'}`}
          >
            <HandPlatter size={18} className={activeTab === 'MOBICYCLE_SERVICES' ? 'text-[#0a0f1e]' : 'text-[var(--neon-blue)]'} />
            Serviços MOBICYCLE
          </button>
          

          
          <div className="pt-6 pb-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-slate-500"></span>
            Sistema
          </div>
          <button 
            onClick={() => setActiveTab('SETTINGS')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-sm font-medium ${activeTab === 'SETTINGS' ? 'bg-[var(--neon-blue)] text-[#0a0f1e] shadow-lg shadow-[var(--neon-blue)]/20' : 'text-[var(--text-muted)] hover:bg-[var(--border-main)] hover:text-[var(--text-main)]'}`}
          >
            <Settings size={18} />
            Configurações
          </button>
          <button 
            onClick={() => setActiveTab('USER_MANAGEMENT')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-sm font-medium ${activeTab === 'USER_MANAGEMENT' ? 'bg-[var(--neon-blue)] text-[#0a0f1e] shadow-lg shadow-[var(--neon-blue)]/20' : 'text-[var(--text-muted)] hover:bg-[var(--border-main)] hover:text-[var(--text-main)]'}`}
          >
            <Shield size={18} />
            Gerenciar Cadastros
          </button>
        </nav>

        <div className="p-6 border-t border-[var(--border-main)] space-y-2">
          <button 
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-main)]"
          >
            <UserIcon size={18} />
            Meu Perfil
          </button>

          <button 
            onClick={onToggleTheme}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-main)]"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
          </button>
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 text-[var(--text-muted)] hover:text-red-400 transition-colors w-full text-sm font-medium"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 sm:p-8 pt-20 lg:pt-8 pb-24 lg:pb-8 overflow-y-auto">
        {/* Top Featured Banner */}
        <div className="mb-12">
          <BrandBanner name="MOBICYCLE" subtitle="MOBILIDADE,TECNOLOGIA & SUSTENTABILIDADE" />
        </div>

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-[var(--text-main)] tracking-tight uppercase italic leading-none">
              {activeTab === 'OVERVIEW' && `Olá, ${user.name.split(' ')[0]}!`}
              {activeTab === 'USERS' && 'Gestão de Usuários'}
              {activeTab === 'MATRICES' && 'Monitoramento de Matrizes'}
              {activeTab === 'TRANSACTIONS' && 'Histórico de Transações'}
              {activeTab === 'DOCUMENTS' && 'Gestão de Documentos'}
              {activeTab === 'MOBICYCLE_SERVICES' && '⚙️ Serviços MOBICYCLE'}

              {activeTab === 'SETTINGS' && 'Configurações do Sistema'}
              {activeTab === 'USER_MANAGEMENT' && 'Gestão de Cadastros'}
            </h2>
            <p className="text-[var(--text-muted)] text-sm font-medium">
              {activeTab === 'OVERVIEW' ? 'Bem-vindo ao centro de controle MOBICYCLE.' : 
               activeTab === 'MOBICYCLE_SERVICES' ? 'Gestão unificada de todos os serviços do ecossistema MOBICYCLE.' :
               'Gerencie e monitore as operações do ecossistema.'}
            </p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block space-y-0.5">
              <p className="text-sm font-bold text-[var(--text-main)]">{user.name}</p>
              <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-widest">{user.email}</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div 
                onClick={() => setShowProfileModal(true)}
                className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[var(--neon-blue)] to-indigo-600 p-0.5 cursor-pointer hover:scale-105 transition-all shadow-lg shadow-[var(--neon-blue)]/20"
              >
                <div className="w-full h-full rounded-[0.9rem] bg-[var(--bg-sidebar)] flex items-center justify-center overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="text-[var(--neon-blue)] w-6 h-6" />
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Admin Online</span>
              </div>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'OVERVIEW' && stats && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group transition-all hover:border-[var(--neon-blue)]/30">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Users size={64} />
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-[var(--neon-blue)]/10 rounded-xl flex items-center justify-center">
                      <Users className="text-[var(--neon-blue)] w-5 h-5" />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Total Usuários</span>
                  </div>
                  <p className="text-4xl font-black text-[var(--text-main)] tracking-tighter">{stats.totalUsers}</p>
                  <div className="mt-4 flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                    <TrendingUp size={12} />
                    <span>Crescimento constante</span>
                  </div>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group transition-all hover:border-indigo-500/30">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Activity size={64} />
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                      <Activity className="text-indigo-400 w-5 h-5" />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Ativos (30d)</span>
                  </div>
                  <p className="text-4xl font-black text-[var(--text-main)] tracking-tighter">{stats.activeUsers}</p>
                  <div className="mt-4 text-[10px] text-[var(--text-muted)] font-mono font-bold uppercase tracking-widest">
                    {((stats.activeUsers / (stats.totalUsers || 1)) * 100).toFixed(1)}% de retenção
                  </div>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group transition-all hover:border-emerald-500/30">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <DollarSign size={64} />
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                      <DollarSign className="text-emerald-400 w-5 h-5" />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Receita Total</span>
                  </div>
                  <p className="text-4xl font-black text-[var(--text-main)] tracking-tighter">R$ {(stats.totalRevenue || 0).toLocaleString('pt-BR')}</p>
                  <div className="mt-4 text-[10px] text-[var(--text-muted)] font-mono font-bold uppercase tracking-widest">Vendas de Adesão</div>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group transition-all hover:border-purple-500/30">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingUp size={64} />
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                      <TrendingUp className="text-purple-400 w-5 h-5" />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Total Ciclos</span>
                  </div>
                  <p className="text-4xl font-black text-[var(--text-main)] tracking-tighter">{stats.cycles}</p>
                  <div className="mt-4 text-[10px] text-[var(--text-muted)] font-mono font-bold uppercase tracking-widest">Bonificações pagas</div>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group transition-all hover:border-amber-500/30">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Wallet size={64} />
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                      <Wallet className="text-amber-400 w-5 h-5" />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Saldo Carteira</span>
                  </div>
                  <p className="text-4xl font-black text-[var(--text-main)] tracking-tighter">R$ {(stats.totalBalance || 0).toLocaleString('pt-BR')}</p>
                  <div className="mt-4 text-[10px] text-[var(--text-muted)] font-mono font-bold uppercase tracking-widest">Disponível para saque</div>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group transition-all hover:border-[var(--neon-blue)]/30">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Car size={64} />
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-[var(--neon-blue)]/10 rounded-xl flex items-center justify-center">
                      <Car className="text-[var(--neon-blue)] w-5 h-5" />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Cashback Corridas</span>
                  </div>
                  <p className="text-4xl font-black text-[var(--text-main)] tracking-tighter">R$ {(stats.totalCashback || 0).toLocaleString('pt-BR')}</p>
                  <div className="mt-4 text-[10px] text-[var(--text-muted)] font-mono font-bold uppercase tracking-widest">Acumulado corridas</div>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group transition-all hover:border-blue-500/30">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Zap size={64} />
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                      <Zap className="text-blue-400 w-5 h-5" />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">CASHBACK ENERGIA</span>
                  </div>
                  <p className="text-4xl font-black text-[var(--text-main)] tracking-tighter">R$ {(stats.totalEnergyCashback || 0).toLocaleString('pt-BR')}</p>
                  <div className="mt-4 text-[10px] text-[var(--text-muted)] font-mono font-bold uppercase tracking-widest">Energy</div>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group transition-all hover:border-purple-500/30">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Truck size={64} />
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                      <Truck className="text-purple-400 w-5 h-5" />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Cashback Guincho</span>
                  </div>
                  <p className="text-4xl font-black text-[var(--text-main)] tracking-tighter">R$ {(stats.totalGuinchoCashback || 0).toLocaleString('pt-BR')}</p>
                  <div className="mt-4 text-[10px] text-[var(--text-muted)] font-mono font-bold uppercase tracking-widest">MOBICYCLE Guincho</div>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group transition-all hover:border-orange-500/30">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <CheckCircle2 size={64} />
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="text-orange-400 w-5 h-5" />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Cashback Hability</span>
                  </div>
                  <p className="text-4xl font-black text-[var(--text-main)] tracking-tighter">R$ {(stats.totalHabilityCashback || 0).toLocaleString('pt-BR')}</p>
                  <div className="mt-4 text-[10px] text-[var(--text-muted)] font-mono font-bold uppercase tracking-widest">Bonus Hability Test</div>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group transition-all hover:border-yellow-500/30">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <HandPlatter size={64} />
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                      <HandPlatter className="text-yellow-400 w-5 h-5" />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Cashback Snack</span>
                  </div>
                  <p className="text-4xl font-black text-[var(--text-main)] tracking-tighter">R$ {(stats.totalSnackCashback || 0).toLocaleString('pt-BR')}</p>
                  <div className="mt-4 text-[10px] text-[var(--text-muted)] font-mono font-bold uppercase tracking-widest">MOBICYCLE Snack Fast</div>
                </div>


                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group transition-all hover:border-red-500/30">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Gift size={64} />
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <Gift className="text-red-400 w-5 h-5" />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Bônus Pagos</span>
                  </div>
                  <p className="text-4xl font-black text-[var(--text-main)] tracking-tighter">R$ {(stats.totalBonusPaid || 0).toLocaleString('pt-BR')}</p>
                  <div className="mt-4 text-[10px] text-[var(--text-muted)] font-mono font-bold uppercase tracking-widest">Total distribuído</div>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group transition-all hover:border-slate-500/30">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <FileText size={64} />
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-[var(--glass-bg)] rounded-xl flex items-center justify-center">
                      <FileText className="text-[var(--text-muted)] w-5 h-5" />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Impostos</span>
                  </div>
                  <p className="text-4xl font-black text-[var(--text-main)] tracking-tighter">R$ {(stats.totalTaxes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <div className="mt-4 text-[10px] text-[var(--text-muted)] font-mono font-bold uppercase tracking-widest">Estimativa 7,5%</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Quick Actions */}
              <div className="lg:col-span-1 space-y-8">
                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-5">
                    <Zap size={80} className="text-amber-400" />
                  </div>
                  <h3 className="text-[var(--text-main)] font-black text-xl mb-8 flex items-center gap-3 uppercase italic tracking-tight">
                    <div className="w-10 h-10 bg-amber-400/10 rounded-xl flex items-center justify-center">
                      <Zap size={20} className="text-amber-400" />
                    </div>
                    Ações Rápidas
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <button 
                      onClick={() => setActiveTab('USERS')}
                      className="group flex items-center justify-between p-5 bg-[var(--border-main)] hover:bg-[var(--neon-blue)]/10 border border-[var(--text-muted)] hover:border-[var(--neon-blue)]/30 rounded-2xl transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[var(--border-main)] rounded-xl flex items-center justify-center group-hover:bg-[var(--neon-blue)]/20 transition-colors">
                          <Users size={18} className="text-[var(--text-muted)] group-hover:text-[var(--neon-blue)]" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-[var(--text-main)] group-hover:text-[var(--neon-blue)] transition-colors">Gerenciar Usuários</p>
                          <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-widest">Acessar base completa</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--neon-blue)] group-hover:translate-x-1 transition-all" />
                    </button>
                    
                    <button 
                      onClick={() => setActiveTab('MATRICES')}
                      className="group flex items-center justify-between p-5 bg-[var(--border-main)] hover:bg-emerald-500/10 border border-[var(--text-muted)] hover:border-emerald-500/30 rounded-2xl transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[var(--border-main)] rounded-xl flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                          <ShieldCheck size={18} className="text-[var(--text-muted)] group-hover:text-emerald-400" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-[var(--text-main)] group-hover:text-emerald-400 transition-colors">Monitorar Matrizes</p>
                          <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-widest">Status em tempo real</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                    </button>

                    <button 
                      onClick={() => setActiveTab('SETTINGS')}
                      className="group flex items-center justify-between p-5 bg-[var(--border-main)] hover:bg-indigo-500/10 border border-[var(--text-muted)] hover:border-indigo-500/30 rounded-2xl transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[var(--border-main)] rounded-xl flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                          <Settings size={18} className="text-[var(--text-muted)] group-hover:text-indigo-400" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-[var(--text-main)] group-hover:text-indigo-400 transition-colors">Configurações</p>
                          <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-widest">Ajustes do sistema</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                    </button>

                    <button 
                      onClick={handleResetAll}
                      className="group flex items-center justify-between p-5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 rounded-2xl transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                          <RefreshCw size={18} className="text-red-400" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-red-400">Zerar Matrizes</p>
                          <p className="text-[10px] text-red-500/60 font-medium uppercase tracking-widest">Ação Irreversível</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-red-400 group-hover:translate-x-1 transition-all" />
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-sidebar)] border border-[var(--neon-blue)]/20 p-8 rounded-3xl text-[var(--text-main)] shadow-xl shadow-[var(--neon-blue)]/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[var(--neon-blue)]/20 rounded-xl flex items-center justify-center text-[var(--neon-blue)]">
                      <TrendingUp size={20} />
                    </div>
                    <h4 className="font-bold">Economia do Fluxo</h4>
                  </div>
                  <p className="text-3xl font-black tracking-tighter mb-2 text-[var(--neon-blue)]">
                    R$ {(stats.flowEconomy || 0).toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Valor total retido no ecossistema para garantir a sustentabilidade dos ciclos futuros.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-8">
                <Suspense fallback={<div className="h-[400px] bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-3xl animate-pulse" />}>
                  <AdminCharts stats={stats} />
                </Suspense>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] p-8 rounded-3xl">
                <h3 className="text-[var(--text-main)] font-bold mb-6 flex items-center gap-2">
                  <LayoutDashboard size={20} className="text-[var(--neon-blue)]" />
                  Distribuição de Matrizes
                </h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-[var(--text-muted)]">On-Board</span>
                      <span className="text-[var(--text-main)] font-bold">{stats.onBoardMatrices}</span>
                    </div>
                    <div className="w-full h-2 bg-[var(--border-main)] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[var(--neon-blue)]" 
                        style={{ width: `${(stats.onBoardMatrices / (stats.activeMatrices || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-[var(--text-muted)]">Cash-Board</span>
                      <span className="text-[var(--text-main)] font-bold">{stats.cashBoardMatrices}</span>
                    </div>
                    <div className="w-full h-2 bg-[var(--border-main)] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500" 
                        style={{ width: `${(stats.cashBoardMatrices / (stats.activeMatrices || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] p-8 rounded-3xl">
                <h3 className="text-[var(--text-main)] font-bold mb-6 flex items-center gap-2">
                  <DollarSign size={20} className="text-emerald-400" />
                  Resumo Financeiro
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)]">
                    <span className="text-[var(--text-muted)]">Cashback Total</span>
                    <span className="text-emerald-400 font-bold">R$ {stats.totalCashback.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)]">
                    <span className="text-[var(--text-muted)]">Saldo em Rede</span>
                    <span className="text-[var(--neon-blue)] font-bold">R$ {stats.totalBalance.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--neon-blue)]/10 border border-[var(--neon-blue)]/20 p-8 rounded-3xl">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-[var(--neon-blue)]/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="text-[var(--neon-blue)] w-5 h-5" />
                  </div>
                  <span className="text-xs text-[var(--neon-blue)] font-mono uppercase tracking-widest">Economia de Fluxo</span>
                </div>
                <p className="text-3xl font-bold text-[var(--text-main)]">R$ {(stats.flowEconomy || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-[var(--neon-blue)] mt-2 font-mono uppercase tracking-tighter">Valor retido pelo sistema para sustentabilidade</p>
                <div className="mt-6 p-3 bg-[var(--neon-blue)]/10 rounded-xl border border-[var(--neon-blue)]/10">
                  <p className="text-[10px] text-[var(--neon-blue)] leading-relaxed">
                    Este valor representa a margem operacional gerada pelos ciclos e taxas administrativas.
                  </p>
                </div>
              </div>
            </div>

            {/* Real-time Matrices Summary */}
            <div className="mt-20 pt-20 border-t border-[var(--border-main)]">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
                <div>
                  <h3 className="text-3xl font-black text-[var(--text-main)] tracking-tight uppercase italic mb-2 flex items-center gap-4">
                    <div className="w-12 h-12 bg-[var(--neon-blue)]/10 rounded-2xl flex items-center justify-center">
                      <RefreshCw size={24} className="text-[var(--neon-blue)]" />
                    </div>
                    Matrizes em Tempo Real
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] font-medium ml-16">Acompanhamento instantâneo do ecossistema MOBICYCLE.</p>
                </div>
                <button 
                  onClick={() => setActiveTab('MATRICES')}
                  className="px-8 py-4 bg-[var(--neon-blue)]/10 hover:bg-[var(--neon-blue)]/20 text-[var(--neon-blue)] text-xs font-black uppercase tracking-widest rounded-2xl border border-[var(--neon-blue)]/20 transition-all shadow-lg shadow-[var(--neon-blue)]/5"
                >
                  Ver Painel de Matrizes
                </button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-10 items-start">
                {/* Onboard Column */}
                <div className="space-y-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-3 h-3 bg-[var(--neon-blue)] rounded-full animate-pulse shadow-[0_0_10px_var(--neon-blue)]" />
                    <h4 className="text-lg font-black text-[var(--neon-blue)] uppercase italic tracking-widest">
                      Matrizes On-Board
                    </h4>
                  </div>
                  <div className="space-y-16">
                    {matrices.filter(m => m.type === 'ONBORD').slice(0, 3).map(m => (
                      <div key={m.id} className="relative group">
                        <div className="absolute -top-6 -left-6 z-20 flex gap-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                          <button 
                            onClick={() => {
                              setSelectedMatrix(m);
                              setShowMatrixModal(true);
                            }}
                            className="px-4 py-2 bg-[var(--neon-blue)] hover:bg-[var(--neon-blue)]/80 text-[#0a0f1e] rounded-xl text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-2 transition-all"
                          >
                            <FileText size={14} />
                            Detalhes
                          </button>
                        </div>
                        <Suspense fallback={<div className="h-80 flex items-center justify-center bg-[var(--bg-sidebar)] rounded-[3rem] border border-[var(--border-main)]"><RefreshCw className="animate-spin text-[var(--neon-blue)]" /></div>}>
                          <div className="bg-[var(--bg-sidebar)] p-2 sm:p-4 lg:p-6 rounded-[1.5rem] sm:rounded-[3rem] border border-[var(--border-main)] hover:border-[var(--neon-blue)]/30 transition-all duration-500 overflow-hidden">
                            <MatrixView 
                              title={`Matriz On-Board - ${m.id}`}
                              type={m.type}
                              positions={m.positions || []}
                            />
                          </div>
                        </Suspense>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cashboard Column */}
                <div className="space-y-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
                    <h4 className="text-lg font-black text-emerald-400 uppercase italic tracking-widest">
                      Matrizes Cash-Board
                    </h4>
                  </div>
                  <div className="space-y-16">
                    {matrices.filter(m => m.type === 'CASHBOARD').slice(0, 3).map(m => (
                      <div key={m.id} className="relative group">
                        <div className="absolute -top-6 -left-6 z-20 flex gap-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                          <button 
                            onClick={() => {
                              setSelectedMatrix(m);
                              setShowMatrixModal(true);
                            }}
                            className="px-4 py-2 bg-[var(--neon-blue)] hover:bg-[var(--neon-blue)]/80 text-[#0a0f1e] rounded-xl text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-2 transition-all"
                          >
                            <FileText size={14} />
                            Detalhes
                          </button>
                        </div>
                        <Suspense fallback={<div className="h-80 flex items-center justify-center bg-[var(--bg-sidebar)] rounded-[3rem] border border-[var(--border-main)]"><RefreshCw className="animate-spin text-emerald-500" /></div>}>
                          <div className="bg-[var(--bg-sidebar)] p-2 sm:p-4 lg:p-6 rounded-[1.5rem] sm:rounded-[3rem] border border-[var(--border-main)] hover:border-emerald-500/30 transition-all duration-500 overflow-hidden">
                            <MatrixView 
                              title={`Cash-Board - ${m.id}`}
                              type={m.type}
                              positions={m.positions || []}
                            />
                          </div>
                        </Suspense>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            </motion.div>
          )}

          {(activeTab === 'USERS' || activeTab === 'USER_MANAGEMENT') && (
            <motion.div 
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
                <input 
                  type="text"
                  placeholder="Buscar por nome, e-mail ou ID..."
                  className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-xl py-3 pl-12 pr-4 text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                onClick={fetchData}
                className="p-3 bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[var(--border-main)] text-[var(--text-muted)] uppercase text-[10px] font-mono tracking-widest">
                    <th className="px-6 py-4">Usuário</th>
                    <th className="px-6 py-4">Status / Nível</th>
                    <th className="px-6 py-4">Financeiro</th>
                    <th className="px-6 py-4">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map((u, i) => (
                    <tr 
                      key={u.id || `user-${i}`} 
                      className="hover:bg-[var(--glass-bg)] transition-colors cursor-pointer group"
                      onClick={() => handleUserClick(u)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[var(--border-main)] flex items-center justify-center overflow-hidden">
                            {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <Shield size={20} className="text-[var(--text-muted)]" />}
                          </div>
                          <div>
                            <p className="text-[var(--text-main)] font-bold group-hover:text-[var(--neon-blue)] transition-colors">{u.name}</p>
                            <p className="text-xs text-[var(--text-muted)]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit ${
                            u.status === 'MASTER' ? 'bg-purple-500/20 text-purple-400' : 
                            u.status === 'ELITE' ? 'bg-yellow-500/20 text-yellow-400' : 
                            'bg-[var(--neon-blue)]/20 text-[var(--neon-blue)]'
                          }`}>
                            {u.status}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">{u.careerLevel}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-emerald-400 font-bold">R$ {(u.balance || 0).toLocaleString('pt-BR')}</span>
                          <div className="flex flex-col gap-0.5 mt-1">
                            <span className="text-[10px] text-[var(--text-muted)]">Cashback: R$ {(u.cashback_balance || 0).toLocaleString('pt-BR')}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">Snack: R$ {(u.snack_fast_cashback || 0).toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            title="Editar (abre detalhes)"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUserClick(u);
                            }}
                            className="p-2 bg-[var(--border-main)] hover:bg-[var(--glass-bg)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            title="Excluir usuário"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDeleteUsuario(u.id, u.name);
                            }}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="bg-[var(--border-main)] px-6 py-4 flex items-center justify-between border-t border-[var(--border-main)]">
                <div className="text-xs text-[var(--text-muted)] font-mono">
                  Mostrando {users.length} de {totalUsers} usuários
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => fetchUsers(userPage - 1, searchTerm)}
                    disabled={userPage <= 1 || isFetchingUsers}
                    className="p-2 bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold text-[var(--text-main)] px-3">Página {userPage}</span>
                  <button 
                    onClick={() => fetchUsers(userPage + 1, searchTerm)}
                    disabled={userPage * userLimit >= totalUsers || isFetchingUsers}
                    className="p-2 bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
            </motion.div>
          )}

          {activeTab === 'MATRICES' && (
            <motion.div 
              key="matrices"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-12"
            >
              <div className="flex justify-between items-center bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl p-6">
                <div>
                  <h4 className="text-[var(--text-main)] font-bold">Monitoramento de Matrizes</h4>
                  <p className="text-xs text-[var(--text-muted)]">Resumo de todas as matrizes ativas no sistema.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={fetchData}
                    className="px-4 py-2 bg-[var(--neon-blue)] hover:bg-[var(--neon-blue)]/80 text-[#0a0f1e] rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Atualizar
                  </button>
                </div>
              </div>

              <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-[var(--border-main)] text-[var(--text-muted)] uppercase text-[10px] font-mono tracking-widest">
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Tipo</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Preenchimento</th>
                      <th className="px-6 py-4">Criada em</th>
                      <th className="px-6 py-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {matrixSummary.map((m) => (
                      <tr key={m.id} className="hover:bg-[var(--glass-bg)] transition-colors">
                        <td className="px-6 py-4 font-mono text-[var(--neon-blue)]">#{m.id}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            m.type === 'ONBORD' ? 'bg-[var(--neon-blue)]/20 text-[var(--neon-blue)]' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {m.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-[var(--text-muted)]">{m.status}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-[var(--border-main)] rounded-full overflow-hidden max-w-[100px]">
                              <div 
                                className={`h-full ${m.type === 'ONBORD' ? 'bg-[var(--neon-blue)]' : 'bg-emerald-500'}`}
                                style={{ width: `${(m.filledPositions / 7) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-[var(--text-main)]">{m.filledPositions}/7</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-[var(--text-muted)]">
                          {new Date(m.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                const fullMatrix = matrices.find(mat => mat.id === m.id);
                                if (fullMatrix) {
                                  setSelectedMatrix(fullMatrix);
                                  setShowMatrixModal(true);
                                } else {
                                  // If not in pre-loaded matrices, fetch it
                                  fetchMatrixDetails(m.id).then(() => {
                                    setSelectedMatrix({ id: m.id, type: m.type, status: m.status, createdAt: m.createdAt, positions: [] });
                                    setShowMatrixModal(true);
                                  });
                                }
                              }}
                              className="p-2 bg-[var(--border-main)] hover:bg-[var(--glass-bg)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
                              title="Ver Detalhes"
                            >
                              <LayoutDashboard size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'TRANSACTIONS' && (
            <motion.div 
              key="transactions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl overflow-hidden"
            >
              <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[var(--border-main)] text-[var(--text-muted)] uppercase text-[10px] font-mono tracking-widest">
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Tipo / Descrição</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {transactions.map((t, i) => (
                  <tr key={`${t.id}-${i}`} className="hover:bg-[var(--glass-bg)] transition-colors">
                    <td className="px-6 py-4 text-xs text-[var(--text-muted)] font-mono">
                      {new Date(t.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-[var(--text-main)] font-bold">{t.userName}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{t.userEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[var(--neon-blue)] font-bold text-xs">{t.type}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{t.description}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${t.amount < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        R$ {Math.abs(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          t.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 
                          t.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' : 
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {t.status}
                        </span>
                        {t.type === 'ADHESION' && t.status === 'COMPLETED' && (
                          <button 
                            onClick={async () => {
                              if (confirm("Deseja realmente estornar esta venda? Isso irá gerar débitos retroativos (Clawback) em 8 níveis da rede.")) {
                                try {
                                  const res = await fetch(`/api/admin/transactions/${t.id}/clawback`, { 
                                    method: 'POST',
                                    headers: { 'x-user-id': user.id }
                                  });
                                  if (res.ok) {
                                    alert("Estorno processado com sucesso!");
                                    fetchData();
                                  } else {
                                    const data = await res.json();
                                    alert(data.error || "Erro ao processar estorno");
                                  }
                                } catch (err) {
                                  alert("Erro de conexão");
                                }
                              }
                            }}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all border border-red-500/20"
                            title="Estornar Venda (Clawback)"
                          >
                            <RefreshCw size={12} />
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setSelectedTransaction(t);
                            setShowReceiptModal(true);
                          }}
                          className="p-1.5 bg-[var(--neon-blue)]/10 hover:bg-[var(--neon-blue)] text-[var(--neon-blue)] hover:text-[#0a0f1e] rounded-lg transition-all border border-[var(--neon-blue)]/20"
                          title="Ver Comprovante"
                        >
                          <FileText size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {activeTab === 'DOCUMENTS' && (
          <motion.div 
            key="documents"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[var(--text-main)]">Gerenciamento de Documentos</h3>
              <div className="flex items-center gap-2 bg-[var(--border-main)] border border-[var(--text-muted)] rounded-xl px-3 py-1.5">
                <Search size={16} className="text-[var(--text-muted)]" />
                <input 
                  type="text" 
                  placeholder="Buscar por usuário ou arquivo..." 
                  className="bg-transparent border-none outline-none text-xs text-[var(--text-main)] w-48"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-3xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-[var(--border-main)] bg-[var(--bg-card)]">
                    <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Usuário</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Arquivo</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Data</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Valor</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {documents
                    .filter(doc => 
                      doc.userName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      doc.filename?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((doc, i) => (
                    <tr key={`${doc.id}-${i}`} className="hover:bg-[var(--glass-bg)] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-[var(--text-main)]">{doc.userName}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">{doc.userEmail}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-[var(--text-main)]">{doc.filename}</span>
                      </td>
                      <td className="px-6 py-4 text-[10px] text-[var(--text-muted)] font-mono">
                        {new Date(doc.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-[var(--text-main)]">R$ {doc.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                          doc.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' : 
                          doc.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' : 
                          'bg-yellow-500/10 text-yellow-500'
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'MOBICYCLE_SERVICES' && (
          <motion.div 
            key="sese-services"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-3xl p-12 text-center">
              <HandPlatter size={64} className="text-[var(--neon-blue)] mx-auto mb-6 animate-pulse" />
              <h3 className="text-3xl font-black text-[var(--text-main)] uppercase tracking-tighter italic mb-4">Serviços MOBICYCLE</h3>
              <p className="text-[var(--text-muted)] max-w-md mx-auto">
                Módulo de gestão unificada do Ecossistema MOBICYCLE. 
                Aqui você poderá monitorar o uso de todos os serviços de cashback.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {[
                { name: 'Corridas', icon: <Car size={24} />, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { name: 'Energy', icon: <Zap size={24} />, color: 'text-[var(--neon-green)]', bg: 'bg-[var(--neon-green)]/10' },
                { name: 'Guincho', icon: <Truck size={24} />, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                { name: 'Hability Test', icon: <CheckCircle2 size={24} />, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                { name: 'Snack', icon: <HandPlatter size={24} />, color: 'text-amber-500', bg: 'bg-amber-500/10' }
              ].map((service) => (
                <div key={service.name} className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl p-6 hover:border-[var(--text-muted)] transition-all">
                  <div className={`w-12 h-12 ${service.bg} ${service.color} rounded-xl flex items-center justify-center mb-4`}>
                    {service.icon}
                  </div>
                  <h4 className="text-[var(--text-main)] font-bold mb-1">{service.name}</h4>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">Status: Ativo</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}



        {activeTab === 'SETTINGS' && (
          <motion.div 
            key="settings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl space-y-8"
          >
            <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl p-6">
              <h4 className="text-[var(--text-main)] font-bold mb-6 flex items-center gap-2">
                <ImageIcon size={20} className="text-[var(--neon-blue)]" />
                Identidade Visual
              </h4>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest">Banner do Sistema</label>
                  <div className="w-full h-32 rounded-xl overflow-hidden border border-[var(--border-main)] mb-4 bg-[var(--bg-card)]">
                    {bannerUrl ? (
                      <img src={getCacheBustedUrl(bannerUrl, systemSettings.image_cache_version)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <img src={getCacheBustedUrl("https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=2074&auto=format&fit=crop", systemSettings.image_cache_version)} className="w-full h-full object-cover opacity-50" referrerPolicy="no-referrer" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="URL da nova imagem..."
                      className="flex-1 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                      value={newBannerUrl}
                      onChange={(e) => setNewBannerUrl(e.target.value)}
                    />
                    <input 
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileUpload}
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-3 bg-[var(--border-main)] hover:bg-[var(--glass-bg)] text-[var(--text-main)] font-bold rounded-xl transition-all flex items-center gap-2"
                      title="Upload de Imagem"
                    >
                      <Upload size={18} />
                    </button>
                    <button 
                      onClick={() => handleUpdateBanner()}
                      className="px-6 py-3 bg-[var(--neon-blue)] hover:bg-[var(--neon-blue)]/80 text-[#0a0f1e] font-bold rounded-xl transition-all flex items-center gap-2"
                    >
                      <Save size={18} />
                      Salvar
                    </button>
                  </div>
                  <button 
                    onClick={() => {
                      const defaultUrl = 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=2074&auto=format&fit=crop';
                      handleUpdateBanner(defaultUrl);
                    }}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] hover:bg-[var(--bg-sidebar)] text-[var(--text-muted)] font-bold py-2 rounded-xl transition-all text-[10px] uppercase tracking-widest"
                  >
                    Restaurar Banner Padrão
                  </button>
                  
                    <div className="pt-4 border-t border-[var(--border-main)] space-y-4">
                      <button 
                        onClick={handleClearImageCache}
                        className="w-full bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 font-bold py-3 rounded-xl transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <RefreshCw size={14} />
                        Limpar Cache de Imagens
                      </button>
                      
                      <p className="text-[9px] text-[var(--text-muted)] text-center">
                        Força o recarregamento de todas as imagens do sistema.
                      </p>
                    </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest">Logotipo do Sistema</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="URL do novo logotipo..."
                      className="flex-1 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                      value={systemSettings.logo_url || ''}
                      onChange={(e) => setSystemSettings({...systemSettings, logo_url: e.target.value})}
                    />
                    <button 
                      onClick={handleUpdateSystemSettings}
                      className="px-6 py-3 bg-[var(--neon-blue)] hover:bg-[var(--neon-blue)]/80 text-[#0a0f1e] font-bold rounded-xl transition-all flex items-center gap-2"
                    >
                      <Save size={18} />
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl p-6">
              <h4 className="text-[var(--text-main)] font-bold mb-6 flex items-center gap-2">
                <RefreshCw size={20} className="text-[var(--neon-blue)]" />
                Parâmetros das Matrizes
              </h4>
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest">Licença de Uso (R$)</label>
                    <input 
                      type="number"
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                      value={systemSettings.matrix_adhesion_fee || ''}
                      onChange={(e) => setSystemSettings({...systemSettings, matrix_adhesion_fee: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest">Bônus On-Board (R$ - Cashback Corridas)</label>
                    <input 
                      type="number"
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                      value={systemSettings.matrix_onboard_bonus || ''}
                      onChange={(e) => setSystemSettings({...systemSettings, matrix_onboard_bonus: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest">Bônus Cash-Board (R$)</label>
                    <input 
                      type="number"
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                      value={systemSettings.matrix_cashboard_bonus || ''}
                      onChange={(e) => setSystemSettings({...systemSettings, matrix_cashboard_bonus: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest">Bônus Indicação Direta (R$ - Cashback Corridas)</label>
                    <input 
                      type="number"
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                      value={systemSettings.matrix_referral_bonus || ''}
                      onChange={(e) => setSystemSettings({...systemSettings, matrix_referral_bonus: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest">Cashback Snack (R$ - Fixo)</label>
                    <input 
                      type="number"
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                      value={systemSettings.matrix_cashback_snack_fixed || ''}
                      onChange={(e) => setSystemSettings({...systemSettings, matrix_cashback_snack_fixed: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest">Cashback Energy (R$ - Fixo)</label>
                    <input 
                      type="number"
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                      value={systemSettings.matrix_cashback_energy_fixed || ''}
                      onChange={(e) => setSystemSettings({...systemSettings, matrix_cashback_energy_fixed: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest">Cashback Guincho (R$ - Fixo)</label>
                    <input 
                      type="number"
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                      value={systemSettings.matrix_cashback_guincho_fixed || ''}
                      onChange={(e) => setSystemSettings({...systemSettings, matrix_cashback_guincho_fixed: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest">Cashback Hability (R$ - Fixo)</label>
                    <input 
                      type="number"
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                      value={systemSettings.matrix_cashback_hability_fixed || ''}
                      onChange={(e) => setSystemSettings({...systemSettings, matrix_cashback_hability_fixed: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest">Mín. Indicações p/ Ciclar</label>
                    <input 
                      type="number"
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                      value={systemSettings.matrix_min_referrals_to_cycle || ''}
                      onChange={(e) => setSystemSettings({...systemSettings, matrix_min_referrals_to_cycle: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest">Economia de Fluxo (%)</label>
                    <input 
                      type="number"
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                      value={systemSettings.flow_economy || ''}
                      onChange={(e) => setSystemSettings({...systemSettings, flow_economy: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest">Regra de Formação</label>
                    <select 
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                      value={systemSettings.matrix_formation_rule || 'FILL_BASE'}
                      onChange={(e) => setSystemSettings({...systemSettings, matrix_formation_rule: e.target.value})}
                    >
                      <option value="FILL_BASE">Preencher Base (Esquerda p/ Direita)</option>
                      <option value="FOLLOW_REFERRER">Seguir Patrocinador (Follow Me)</option>
                      <option value="JUMP">Pulo por Indicações (Mais indicações ciclam primeiro)</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleUpdateSystemSettings}
                  disabled={savingSettings}
                  className="w-full py-3 bg-[var(--neon-blue)] hover:bg-[var(--neon-blue)]/80 disabled:bg-[var(--border-main)] text-[#0a0f1e] font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {savingSettings ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  Salvar Parâmetros de Matrizes
                </button>

                <div className="pt-6 border-t border-[var(--border-main)]">
                  <h5 className="text-[var(--text-main)] text-xs font-bold mb-4 flex items-center gap-2">
                    <Trophy size={14} className="text-yellow-500" />
                    Bônus Infinito (Carreira)
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      { key: 'bonus_percent_partner', label: 'Parceiro (R$)', cyclesKey: 'cycles_required_partner' },
                      { key: 'bonus_percent_executivo_1', label: 'Bronze (R$)', cyclesKey: 'cycles_required_executivo_1' },
                      { key: 'bonus_percent_executivo_2', label: 'Prata (R$)', cyclesKey: 'cycles_required_executivo_2' },
                      { key: 'bonus_percent_executivo_3', label: 'Ouro (R$)', cyclesKey: 'cycles_required_executivo_3' },
                      { key: 'bonus_percent_executivo_4', label: 'Esmeralda (R$)', cyclesKey: 'cycles_required_executivo_4' },
                      { key: 'bonus_percent_diamante', label: 'Diamante (R$)', cyclesKey: 'cycles_required_diamante' },
                      { key: 'bonus_percent_black_diamante', label: 'Duplo Diamante (R$)', cyclesKey: 'cycles_required_black_diamante' },
                      { key: 'bonus_percent_vice_presidente', label: 'Black Diamond (R$)', cyclesKey: 'cycles_required_vice_presidente' },
                      { key: 'bonus_percent_presidente', label: 'Royal Black-Diamond (R$)', cyclesKey: 'cycles_required_presidente' },
                      { key: 'bonus_percent_ceo_ple', label: 'CEO PLE (R$)', cyclesKey: 'cycles_required_ceo_ple' },
                    ].map(item => (
                      <div key={item.key} className="space-y-4 p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)]">
                        <div className="space-y-2">
                          <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">{item.label}</label>
                          <input 
                            type="number"
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                            value={systemSettings[item.key] || ''}
                            onChange={(e) => setSystemSettings({...systemSettings, [item.key]: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Ciclos Necessários</label>
                          <input 
                            type="number"
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                            value={systemSettings[item.cyclesKey] || ''}
                            onChange={(e) => setSystemSettings({...systemSettings, [item.cyclesKey]: e.target.value})}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleUpdateSystemSettings}
                  disabled={savingSettings}
                  className="w-full py-3 bg-[var(--neon-blue)] hover:bg-[var(--neon-blue)]/80 disabled:bg-[var(--border-main)] text-[#0a0f1e] font-bold rounded-xl transition-all flex items-center justify-center gap-2 mb-6"
                >
                  {savingSettings ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  Salvar Parâmetros de Carreira
                </button>

                <div className="pt-6 border-t border-[var(--border-main)]">
                  <h5 className="text-[var(--text-main)] text-xs font-bold mb-4 flex items-center gap-2">
                    <Users size={14} className="text-blue-400" />
                    Taxa de Serviço (Parceiro Fornecedor)
                  </h5>
                  <p className="text-[10px] text-[var(--text-muted)] mb-4">
                    Taxa de Serviço cobrado do Parceiro Fornecedor em % (percentual) definida pelo Admin por categoria.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {[
                      { label: 'MOBICYCLE Corridas', key: 'service_fee_percent_corridas' },
                      { label: 'Energy', key: 'service_fee_percent_energy' },
                      { label: 'MOBICYCLE Snack', key: 'service_fee_percent_snack' },
                      { label: 'MOBICYCLE Guincho', key: 'service_fee_percent_guincho' },
                      { label: 'MOBICYCLE Hability', key: 'service_fee_percent_hability' },
                    ].map((item) => (
                      <div key={item.key} className="space-y-2">
                        <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">{item.label}</label>
                        <div className="relative">
                          <input 
                            type="number"
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none pr-8"
                            value={systemSettings[item.key] || ''}
                            onChange={(e) => setSystemSettings({...systemSettings, [item.key]: e.target.value})}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)] font-bold">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={handleUpdateSystemSettings}
                  disabled={savingSettings}
                  className="w-full py-3 bg-[var(--neon-blue)] hover:bg-[var(--neon-blue)]/80 disabled:bg-[var(--border-main)] text-[#0a0f1e] font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {savingSettings ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  Salvar Parâmetros
                </button>
              </div>
            </div>

            <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl p-6">
              <h4 className="text-[var(--text-main)] font-bold mb-6 flex items-center gap-2">
                <Palette size={20} className="text-[var(--neon-pink)]" />
                Tema da Aplicação
              </h4>
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { key: 'theme_neon_green', label: 'Neon Green' },
                    { key: 'theme_neon_blue', label: 'Neon Blue' },
                    { key: 'theme_neon_purple', label: 'Neon Purple' },
                    { key: 'theme_neon_orange', label: 'Neon Orange' },
                    { key: 'theme_neon_pink', label: 'Neon Pink' },
                  ].map(item => (
                    <div key={item.key} className="space-y-2">
                      <label className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest">{item.label}</label>
                      <div className="flex gap-2">
                        <input 
                          type="color"
                          className="w-10 h-10 bg-transparent border-none cursor-pointer"
                          value={systemSettings[item.key] || '#ffffff'}
                          onChange={(e) => setSystemSettings({...systemSettings, [item.key]: e.target.value})}
                        />
                        <input 
                          type="text"
                          className="flex-1 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                          value={systemSettings[item.key] || ''}
                          onChange={(e) => setSystemSettings({...systemSettings, [item.key]: e.target.value})}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      setSystemSettings({
                        ...systemSettings,
                        theme_neon_green: '#39ff14',
                        theme_neon_blue: '#00f3ff',
                        theme_neon_purple: '#bc13fe',
                        theme_neon_orange: '#ff6700',
                        theme_neon_pink: '#ff00ff'
                      });
                    }}
                    className="flex-1 py-3 bg-[var(--border-main)] hover:bg-[var(--glass-bg)] text-[var(--text-main)] font-bold rounded-xl transition-all text-sm"
                  >
                    Restaurar Padrões
                  </button>
                  <button 
                    onClick={handleUpdateSystemSettings}
                    disabled={savingSettings}
                    className="flex-[2] py-3 bg-[var(--neon-blue)] hover:bg-[var(--neon-blue)]/80 disabled:bg-[var(--border-main)] text-[#0a0f1e] font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {savingSettings ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                    Salvar Tema
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl p-6">
              <h4 className="text-[var(--text-main)] font-bold mb-2 flex items-center gap-2">
                <HandPlatter size={20} className="text-purple-400" />
                Serviços MOBICYCLE
              </h4>
              <p className="text-xs text-[var(--text-muted)] mb-6">
                Módulo de gestão unificada do Ecossistema MOBICYCLE. Aqui você poderá monitorar o uso de todos os serviços de cashback.
              </p>
              <div className="space-y-8">
                {/* Hability Test */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-orange-400 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle2 size={14} />
                      Bônus MOBICYCLE Hability
                    </h5>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono">Habilitar</span>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--neon-blue)] focus:ring-[var(--neon-blue)]"
                          checked={systemSettings.service_bonus_hability_test_enabled === 'true'}
                          onChange={(e) => setSystemSettings({...systemSettings, service_bonus_hability_test_enabled: e.target.checked ? 'true' : 'false'})}
                        />
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono">Revelar</span>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--neon-blue)] focus:ring-[var(--neon-blue)]"
                          checked={systemSettings.service_bonus_hability_test_visible !== 'false'}
                          onChange={(e) => setSystemSettings({...systemSettings, service_bonus_hability_test_visible: e.target.checked ? 'true' : 'false'})}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Teste Básico (R$)</label>
                      <input 
                        type="number"
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                        value={systemSettings.service_bonus_hability_test_price_1 || ''}
                        onChange={(e) => setSystemSettings({...systemSettings, service_bonus_hability_test_price_1: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Teste Interm. (R$)</label>
                      <input 
                        type="number"
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                        value={systemSettings.service_bonus_hability_test_price_2 || ''}
                        onChange={(e) => setSystemSettings({...systemSettings, service_bonus_hability_test_price_2: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Teste Avançado (R$)</label>
                      <input 
                        type="number"
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                        value={systemSettings.service_bonus_hability_test_price_3 || ''}
                        onChange={(e) => setSystemSettings({...systemSettings, service_bonus_hability_test_price_3: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Guincho */}
                <div className="space-y-4 pt-6 border-t border-[var(--border-main)]">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                      <Truck size={14} />
                      Bônus MOBICYCLE Guincho
                    </h5>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono">Habilitar</span>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--neon-blue)] focus:ring-[var(--neon-blue)]"
                          checked={systemSettings.service_guincho_enabled !== 'false'}
                          onChange={(e) => setSystemSettings({...systemSettings, service_guincho_enabled: e.target.checked ? 'true' : 'false'})}
                        />
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono">Revelar</span>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--neon-blue)] focus:ring-[var(--neon-blue)]"
                          checked={systemSettings.service_guincho_visible !== 'false'}
                          onChange={(e) => setSystemSettings({...systemSettings, service_guincho_visible: e.target.checked ? 'true' : 'false'})}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Guincho Urbano (R$)</label>
                      <input 
                        type="number"
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                        value={systemSettings.service_guincho_urbano_price || ''}
                        onChange={(e) => setSystemSettings({...systemSettings, service_guincho_urbano_price: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Guincho Interurb. (R$)</label>
                      <input 
                        type="number"
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                        value={systemSettings.service_guincho_interurbano_price || ''}
                        onChange={(e) => setSystemSettings({...systemSettings, service_guincho_interurbano_price: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Assist. Mensal (R$)</label>
                      <input 
                        type="number"
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                        value={systemSettings.service_assistencia_mensal_price || ''}
                        onChange={(e) => setSystemSettings({...systemSettings, service_assistencia_mensal_price: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Corridas */}
                <div className="space-y-4 pt-6 border-t border-[var(--border-main)]">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                      <Car size={14} />
                      MOBICYCLE Corridas Cashback
                    </h5>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono">Habilitar</span>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--neon-blue)] focus:ring-[var(--neon-blue)]"
                          checked={systemSettings.service_corridas_enabled !== 'false'}
                          onChange={(e) => setSystemSettings({...systemSettings, service_corridas_enabled: e.target.checked ? 'true' : 'false'})}
                        />
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono">Revelar</span>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--neon-blue)] focus:ring-[var(--neon-blue)]"
                          checked={systemSettings.service_corridas_visible !== 'false'}
                          onChange={(e) => setSystemSettings({...systemSettings, service_corridas_visible: e.target.checked ? 'true' : 'false'})}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Viagem Curta (R$)</label>
                      <input 
                        type="number"
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                        value={systemSettings.service_corridas_curta_price || ''}
                        onChange={(e) => setSystemSettings({...systemSettings, service_corridas_curta_price: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Viagem Média (R$)</label>
                      <input 
                        type="number"
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                        value={systemSettings.service_corridas_media_price || ''}
                        onChange={(e) => setSystemSettings({...systemSettings, service_corridas_media_price: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Viagem Longa (R$)</label>
                      <input 
                        type="number"
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                        value={systemSettings.service_corridas_longa_price || ''}
                        onChange={(e) => setSystemSettings({...systemSettings, service_corridas_longa_price: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Energy */}
                <div className="space-y-4 pt-6 border-t border-[var(--border-main)]">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-green-400 uppercase tracking-widest flex items-center gap-2">
                      <Zap size={14} />
                      Energy
                    </h5>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono">Habilitar</span>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--neon-blue)] focus:ring-[var(--neon-blue)]"
                          checked={systemSettings.service_energy_enabled !== 'false'}
                          onChange={(e) => setSystemSettings({...systemSettings, service_energy_enabled: e.target.checked ? 'true' : 'false'})}
                        />
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono">Revelar</span>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--neon-blue)] focus:ring-[var(--neon-blue)]"
                          checked={systemSettings.service_energy_visible !== 'false'}
                          onChange={(e) => setSystemSettings({...systemSettings, service_energy_visible: e.target.checked ? 'true' : 'false'})}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Energy Drink (R$)</label>
                      <input 
                        type="number"
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                        value={systemSettings.service_energy_drink_price || ''}
                        onChange={(e) => setSystemSettings({...systemSettings, service_energy_drink_price: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Kit Suplemento (R$)</label>
                      <input 
                        type="number"
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                        value={systemSettings.service_energy_kit_price || ''}
                        onChange={(e) => setSystemSettings({...systemSettings, service_energy_kit_price: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Plano Mensal (R$)</label>
                      <input 
                        type="number"
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                        value={systemSettings.service_energy_plano_price || ''}
                        onChange={(e) => setSystemSettings({...systemSettings, service_energy_plano_price: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Snack */}
                <div className="space-y-4 pt-6 border-t border-[var(--border-main)]">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-2">
                      <Utensils size={14} />
                      MOBICYCLE Snack
                    </h5>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono">Habilitar</span>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--neon-blue)] focus:ring-[var(--neon-blue)]"
                          checked={systemSettings.service_snack_enabled !== 'false'}
                          onChange={(e) => setSystemSettings({...systemSettings, service_snack_enabled: e.target.checked ? 'true' : 'false'})}
                        />
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono">Revelar</span>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--neon-blue)] focus:ring-[var(--neon-blue)]"
                          checked={systemSettings.service_snack_visible !== 'false'}
                          onChange={(e) => setSystemSettings({...systemSettings, service_snack_visible: e.target.checked ? 'true' : 'false'})}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Lanche Rápido (R$)</label>
                      <input 
                        type="number"
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                        value={systemSettings.service_snack_rapido_price || ''}
                        onChange={(e) => setSystemSettings({...systemSettings, service_snack_rapido_price: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Refeição Compl. (R$)</label>
                      <input 
                        type="number"
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                        value={systemSettings.service_snack_completa_price || ''}
                        onChange={(e) => setSystemSettings({...systemSettings, service_snack_completa_price: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Combo Família (R$)</label>
                      <input 
                        type="number"
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                        value={systemSettings.service_snack_familia_price || ''}
                        onChange={(e) => setSystemSettings({...systemSettings, service_snack_familia_price: e.target.value})}
                      />
                    </div>
                  </div>
                </div>


                <button 
                  onClick={handleUpdateSystemSettings}
                  disabled={savingSettings}
                  className="w-full py-4 bg-[var(--neon-blue)] hover:bg-[var(--neon-blue)]/80 disabled:bg-[var(--border-main)] text-[#0a0f1e] font-black uppercase italic tracking-tight rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  {savingSettings ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  Salvar Configurações de Serviços
                </button>
              </div>
            </div>

            <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl p-6">
              <h4 className="text-[var(--text-main)] font-bold mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-400" />
                Configurações de Cashback Uso de Serviços
              </h4>
              <div className="space-y-6">
                <p className="text-xs text-[var(--text-muted)] mb-4">
                  Defina as porcentagens de bônus unilevel distribuídas quando um licenciado utiliza seu saldo de cashback em serviços (Corridas, Snack, etc).
                </p>
                
                <div className="space-y-4">
                  <h5 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Porcentagem por Nível (8 Níveis)</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => {
                      const key = `usage_unilevel_l${i + 1}`;
                      return (
                        <div key={key} className="space-y-2">
                          <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Nível {i + 1} (%)</label>
                          <input 
                            type="number"
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:border-[var(--neon-blue)] outline-none"
                            value={systemSettings[key] || ''}
                            onChange={(e) => setSystemSettings({...systemSettings, [key]: e.target.value})}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button 
                  onClick={handleUpdateSystemSettings}
                  disabled={savingSettings}
                  className="w-full py-4 bg-[var(--neon-blue)] hover:bg-[var(--neon-blue)]/80 disabled:bg-[var(--border-main)] text-[#0a0f1e] font-black uppercase italic tracking-tight rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  {savingSettings ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  Salvar Regras de Cashback
                </button>
              </div>
            </div>

            <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl p-6">
              <h4 className="text-[var(--text-main)] font-bold mb-6 flex items-center gap-2">
                <Shield size={20} className="text-emerald-400" />
                Configuração de Chaves API
              </h4>
              <div className="space-y-4">
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Para o funcionamento correto do sistema (Firebase, Gemini, etc), as chaves devem ser configuradas nas <span className="text-[var(--text-main)] font-bold">Variáveis de Ambiente</span> da plataforma.
                </p>
                <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] font-mono text-[10px] text-[var(--text-muted)] space-y-2">
                  <p><span className="text-[var(--neon-blue)]">VITE_FIREBASE_API_KEY</span>=AIzaSy...</p>
                  <p><span className="text-[var(--neon-blue)]">GEMINI_API_KEY</span>=...</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-yellow-500 bg-yellow-500/5 p-3 rounded-lg border border-yellow-500/20">
                  <AlertCircle size={14} />
                  <span>Nunca compartilhe suas chaves privadas ou as cole diretamente no código fonte.</span>
                </div>
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
              <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                <RefreshCw size={20} />
                Zona de Perigo
              </h4>
              <p className="text-xs text-[var(--text-muted)] mb-6">
                Ações nesta seção são irreversíveis e afetam todo o sistema.
              </p>
              <div className="space-y-4">
                <button 
                  onClick={handleClearCache}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
                >
                  <RefreshCw size={18} />
                  LIMPAR CACHE E RESETAR SISTEMA
                </button>
                <button 
                  onClick={handleResetAll}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
                >
                  <Trash2 size={18} />
                  RESET TOTAL (LIMPAR TUDO)
                </button>
                <button 
                  onClick={async () => {
                    if (window.confirm("ATENÇÃO: Isso irá apagar TODAS as matrizes, bônus e transações. Deseja continuar?")) {
                      handleResetAll();
                    }
                  }}
                  className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} />
                  Resetar Testes de Matrizes (Zerar Bônus/Sistema)
                </button>
                <button 
                  onClick={handleSeed}
                  className="w-full py-4 bg-red-900/20 hover:bg-red-900 text-red-700 hover:text-[var(--text-main)] border border-red-900/40 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} />
                  Redefinir Todo o Sistema (Seed)
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </main>

      <Suspense fallback={null}>
        {showProfileModal && (
          <ProfileModal 
            user={user} 
            onClose={() => setShowProfileModal(false)} 
            onUpdate={onUpdateUser} 
          />
        )}
      </Suspense>

      {showMatrixModal && selectedMatrix && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[var(--bg-card)] backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--border-main)]">
              <div>
                <h3 className="text-xl font-black text-[var(--text-main)] uppercase italic tracking-tight">
                  Detalhes da Matriz
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-mono">ID: {selectedMatrix.id} • {selectedMatrix.type}</p>
              </div>
              <button 
                onClick={() => setShowMatrixModal(false)}
                className="p-2 hover:bg-[var(--border-main)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {loadingMatrixDetails ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <RefreshCw size={48} className="text-[var(--neon-blue)] animate-spin mb-4" />
                  <p className="text-[var(--text-muted)] font-mono text-xs uppercase tracking-widest">Carregando detalhes...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-main)]">
                      <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-2">Status da Matriz</p>
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${selectedMatrix.status === 'OPEN' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-lg font-black text-[var(--text-main)] uppercase italic">
                          {selectedMatrix.status === 'OPEN' ? 'Aberta' : 'Fechada'}
                        </span>
                      </div>
                    </div>

                    <div className="p-6 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-main)]">
                      <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-2">Preenchimento</p>
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-black text-[var(--text-main)]">{(matrixDetails?.positions?.length || 0)}</span>
                        <span className="text-[var(--text-muted)] font-bold mb-1">/ 7</span>
                        <div className="ml-auto w-12 h-12 rounded-2xl bg-[var(--neon-blue)]/10 flex items-center justify-center border border-[var(--neon-blue)]/20">
                          <Users size={20} className="text-[var(--neon-blue)]" />
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-main)]">
                      <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-2">Data de Abertura</p>
                      <p className="text-sm text-[var(--text-main)] font-bold">
                        {new Date(selectedMatrix.createdAt).toLocaleString('pt-BR')}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] font-mono mt-1">
                        {Math.floor((Date.now() - new Date(selectedMatrix.createdAt).getTime()) / (1000 * 60 * 60 * 24))} dias ativa
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                          <Maximize2 size={14} />
                          Estrutura Visual
                        </h4>
                        <MatrixTree positions={matrixDetails?.positions || []} />
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                          <Users size={14} />
                          Posições Atuais
                        </h4>
                        <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-main)] overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="bg-[var(--bg-sidebar)] text-[var(--text-muted)] uppercase text-[10px] font-mono tracking-widest">
                              <th className="px-4 py-3">Pos</th>
                              <th className="px-4 py-3">Usuário</th>
                              <th className="px-4 py-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900">
                            {[1, 2, 3, 4, 5, 6, 7].map(pos => {
                              const participant = matrixDetails?.positions?.find((p: any) => p.position === pos);
                              return (
                                <tr key={pos} className={participant ? 'bg-[var(--neon-blue)]/5' : 'opacity-20'}>
                                  <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                                    #{pos}
                                  </td>
                                  <td className="px-4 py-3">
                                    {participant ? (
                                      <div>
                                        <p className="text-[var(--text-main)] font-bold text-xs">{participant.name}</p>
                                        <p className="text-[10px] text-[var(--neon-blue)] font-mono">ID: {participant.userId}</p>
                                      </div>
                                    ) : (
                                      <span className="text-[var(--text-muted)] italic text-xs">Vazio</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    {participant && (
                                      <span className="px-2 py-0.5 rounded-full bg-[var(--neon-blue)]/10 text-[var(--neon-blue)] text-[9px] font-bold uppercase">
                                        {participant.status}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                      <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                        <Activity size={14} />
                        Histórico de Movimentação
                      </h4>
                      <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-main)] overflow-hidden h-[340px] overflow-y-auto custom-scrollbar">
                        {matrixDetails?.history?.length > 0 ? (
                          <div className="divide-y divide-slate-900">
                            {matrixDetails.history.map((hist: any) => (
                              <div key={hist.id} className="p-4 hover:bg-[var(--bg-sidebar)] transition-colors">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                                    {new Date(hist.created_at).toLocaleString('pt-BR')}
                                  </span>
                                  <span className="text-[9px] font-bold text-[var(--neon-blue)] uppercase bg-[var(--neon-blue)]/10 px-1.5 py-0.5 rounded">
                                    Posição #{hist.position}
                                  </span>
                                </div>
                                <p className="text-xs text-[var(--text-main)] font-medium">
                                  <span className="text-[var(--neon-blue)] font-bold">{hist.userName}</span> entrou na matriz
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] italic text-xs">
                            Nenhum histórico registrado
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {matrixDetails?.cycles?.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                        <Zap size={14} />
                        Ciclos Realizados
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {matrixDetails.cycles.map((cycle: any) => (
                          <div key={cycle.id} className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center justify-between">
                            <div>
                              <p className="text-xs text-[var(--text-main)] font-bold">{cycle.userName}</p>
                              <p className="text-[10px] text-[var(--text-muted)] font-mono">{new Date(cycle.created_at).toLocaleString('pt-BR')}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-emerald-400">R$ {(cycle.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              <p className="text-[9px] text-emerald-500/50 uppercase font-bold">Bônus de Ciclo</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 bg-[var(--border-main)] border-t border-[var(--border-main)] flex justify-end">
              <button 
                onClick={() => setShowMatrixModal(false)}
                className="px-8 py-3 bg-[var(--border-main)] hover:bg-[var(--glass-bg)] text-[var(--text-main)] rounded-2xl text-xs font-bold transition-all uppercase tracking-widest"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {showReceiptModal && selectedTransaction && (
          <PaymentReceipt 
            transaction={selectedTransaction}
            onClose={() => {
              setShowReceiptModal(false);
              setSelectedTransaction(null);
            }}
          />
        )}
      </AnimatePresence>

      <Suspense fallback={null}>
        <UserDetailsModal 
          user={selectedUser}
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          transactions={transactions}
          onUpdateDetail={handleUpdateUserDetail}
          onDeleteUser={(uid) => handleDeleteUsuario(uid, selectedUser?.name)}
          onViewReceipt={(t) => {
            setSelectedTransaction(t);
            setShowReceiptModal(true);
          }}
        />
      </Suspense>
      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-sidebar)] border-t border-[var(--border-main)] px-2 py-3 flex items-center justify-around z-40 backdrop-blur-lg bg-opacity-90">
        <button 
          onClick={() => setActiveTab('OVERVIEW')}
          className={`flex flex-col items-center gap-1 p-2 transition-all ${activeTab === 'OVERVIEW' ? 'text-[var(--neon-blue)]' : 'text-[var(--text-muted)]'}`}
        >
          <LayoutDashboard size={20} />
          <span className="text-[8px] font-bold uppercase tracking-widest">Início</span>
        </button>
        <button 
          onClick={() => setActiveTab('USERS')}
          className={`flex flex-col items-center gap-1 p-2 transition-all ${activeTab === 'USERS' ? 'text-[var(--neon-blue)]' : 'text-[var(--text-muted)]'}`}
        >
          <Users size={20} />
          <span className="text-[8px] font-bold uppercase tracking-widest">Usuários</span>
        </button>
        <button 
          onClick={() => setActiveTab('MATRICES')}
          className={`flex flex-col items-center gap-1 p-2 transition-all ${activeTab === 'MATRICES' ? 'text-[var(--neon-blue)]' : 'text-[var(--text-muted)]'}`}
        >
          <RefreshCw size={20} />
          <span className="text-[8px] font-bold uppercase tracking-widest">Matrizes</span>
        </button>
        <button 
          onClick={() => setActiveTab('MOBICYCLE_SERVICES')}
          className={`flex flex-col items-center gap-1 p-2 transition-all ${activeTab === 'MOBICYCLE_SERVICES' ? 'text-[var(--neon-blue)]' : 'text-[var(--text-muted)]'}`}
        >
          <HandPlatter size={20} />
          <span className="text-[8px] font-bold uppercase tracking-widest">Serviços</span>
        </button>
        <button 
          onClick={() => setActiveTab('DESIGN')}
          className={`flex flex-col items-center gap-1 p-2 transition-all ${activeTab === 'DESIGN' ? 'text-[var(--neon-blue)]' : 'text-[var(--text-muted)]'}`}
        >
          <ImageIcon size={20} />
          <span className="text-[8px] font-bold uppercase tracking-widest">Design</span>
        </button>
        <button 
          onClick={() => setActiveTab('SETTINGS')}
          className={`flex flex-col items-center gap-1 p-2 transition-all ${activeTab === 'SETTINGS' ? 'text-[var(--neon-blue)]' : 'text-[var(--text-muted)]'}`}
        >
          <Settings size={20} />
          <span className="text-[8px] font-bold uppercase tracking-widest">Config</span>
        </button>
      </div>
    </div>
  );
}
