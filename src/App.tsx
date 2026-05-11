import React, { useEffect, useState, useRef, Suspense, lazy } from 'react';
import { RefreshCw, Bell, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './components/Logo';
import { User, Matrix as MatrixType, Notification as AppNotification } from './types';
import { navigateTo, replaceRoute, getViewFromPath, isAdminPath, isLoginPath, DASHBOARD_PATHS } from './lib/routing';
import { getAuthHeaders, saveAuthData, clearAuthData, getUserId, isAuthenticated } from './lib/utils';

// Lazy load components for performance
const Auth = lazy(() => import('./components/Auth').then(m => ({ default: m.Auth })));
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));

import { Skeleton, DashboardSkeleton } from './components/Skeleton';

// Loading fallback component
const LoadingScreen = ({ logoUrl }: { logoUrl?: string }) => (
  <div className="min-h-screen bg-[var(--bg-main)] flex flex-col lg:flex-row transition-colors duration-300">
    {/* Sidebar Skeleton */}
    <aside className="fixed left-0 top-0 h-full w-64 bg-[var(--bg-sidebar)] border-r border-[var(--border-main)] hidden lg:flex flex-col p-6 z-20 transition-colors duration-300">
      <div className="flex items-center gap-3 mb-12 px-2">
        <Logo size={40} animated={false} />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-2 w-32" />
        </div>
      </div>
      <div className="flex-1 space-y-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full bg-slate-800/10" />
        ))}
      </div>
    </aside>

    {/* Main Content Skeleton */}
    <main className="lg:ml-64 p-4 sm:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto w-full">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 opacity-50" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" className="w-10 h-10" />
          <Skeleton variant="circular" className="w-10 h-10" />
          <Skeleton className="w-32 h-10 rounded-xl" />
        </div>
      </div>
      
      <DashboardSkeleton />
    </main>
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [matrices, setMatrices] = useState<MatrixType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAutoReentry, setIsAutoReentry] = useState(false);
  const [isProcessingAutoReentry, setIsProcessingAutoReentry] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [bannerUrl, setBannerUrl] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [cycleHistory, setCycleHistory] = useState<any[]>([]);
  const [matrixSettings, setMatrixSettings] = useState<any>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationAmount, setCelebrationAmount] = useState<string>('3.990,00');
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('wayfy_theme');
    return (saved as 'light' | 'dark') || 'dark';
  });

  const isFetching = useRef(false);
  const prevNotificationsCount = useRef(0);
  const autoReentryAttempted = useRef(false);

  useEffect(() => {
    if (user) {
      registerPushNotifications();
    }
  }, [user]);

  const registerPushNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      console.warn('Push notifications are not supported in this browser');
      return;
    }

    // Check current permission status
    if (Notification.permission === 'denied') {
      console.warn('Push notification permission was previously denied');
      return;
    }

    try {
      // Request permission if not already granted
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.warn('Push notification permission denied by user');
          return;
        }
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered');

      const response = await fetch('/api/push/vapid-public-key', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch VAPID public key');
      const { publicKey } = await response.json();

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey
        });
      }

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          subscription,
          userId: user?.id
        })
      });
      console.log('Push notification subscription successful');
    } catch (err: any) {
      // Handle "permission denied" error specifically to avoid noisy logs
      if (err.name === 'NotAllowedError' || err.message?.includes('permission denied')) {
        console.warn('Push notification registration failed: permission denied');
      } else {
        console.error('Error registering push notifications:', err);
      }
    }
  };

  const fetchData = async (retryCount = 0) => {
    // Prevent concurrent fetches unless it's a retry
    if (isFetching.current && retryCount === 0) {
      console.log("Fetch already in progress, skipping...");
      return;
    }
    
    isFetching.current = true;
    
    // Only show full loading screen on first attempt of initial load
    if (retryCount === 0 && !user) {
      setLoading(true);
      setError(null);
    }
    
    // Always show refreshing indicator if we already have a user
    if (user) {
      setRefreshing(true);
    }

    try {
      const userId = getUserId();
      if (!userId) {
        setLoading(false);
        setRefreshing(false);
        isFetching.current = false;
        return;
      }

      const res = await fetch('/api/init', {
        headers: { 
          ...getAuthHeaders(),
          'Cache-Control': 'no-cache'
        }
      });

      if (res.status === 401) {
        console.warn("Session expired or invalid");
        clearAuthData();
        setUser(null);
        setLoading(false);
        setRefreshing(false);
        isFetching.current = false;
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro do servidor: ${res.status}`);
      }

      const data = await res.json();
      const { 
        user: userData, 
        matrices: matricesData, 
        notifications: notificationsData, 
        transactions: transactionsData, 
        banner: bannerData, 
        logo: logoData,
        history: historyData, 
        documents: docsData,
        matrixSettings: settingsData
      } = data;

      if (!userData) {
        throw new Error("Dados do usuário não encontrados no servidor");
      }

      // Update all states
      setUser(userData);
      // Se o usu\u00e1rio carregou com sucesso e o URL ainda \u00e9 /login ou /, redireciona
      const currentPath = window.location.pathname;
      if (currentPath === '/login' || currentPath === '/') {
        replaceRoute('dashboard');
      }
      setMatrices(Array.isArray(matricesData) ? matricesData : []);
      setNotifications(Array.isArray(notificationsData) ? notificationsData : []);
      setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
      setBannerUrl(bannerData?.url || '');
      setLogoUrl(logoData?.url || '');
      setCycleHistory(Array.isArray(historyData) ? historyData : []);
      setDocuments(Array.isArray(docsData) ? docsData : []);
      setMatrixSettings(settingsData);

      // Optimization: Load CASHBOARD matrices only after ONBORD is loaded and if qualified
      const isQualifiedForCashboard = userData.role === 'admin' || 
                                     historyData.some((m: any) => m.type === 'ONBORD') ||
                                     userData.status === 'MASTER';
      
      if (isQualifiedForCashboard) {
        try {
          const cashRes = await fetch('/api/matrices?type=CASHBOARD', {
            headers: getAuthHeaders()
          });
          if (cashRes.ok) {
            const cashMatrices = await cashRes.json();
            if (Array.isArray(cashMatrices) && cashMatrices.length > 0) {
              setMatrices(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const newMatrices = cashMatrices.filter(m => !existingIds.has(m.id));
                return [...prev, ...newMatrices];
              });
            }
          }
        } catch (cashErr) {
          console.error("Error fetching CASHBOARD matrices:", cashErr);
        }
      }
      
      // Check for new notifications to show toast
      if (notificationsData.length > prevNotificationsCount.current && prevNotificationsCount.current > 0) {
        const newNotifications = notificationsData.filter((n: any) => !n.isRead).slice(0, notificationsData.length - prevNotificationsCount.current);
        if (newNotifications.length > 0) {
          setToast({ message: newNotifications[0].message, type: 'info' });
          setTimeout(() => setToast(null), 5000);
        }
      }
      prevNotificationsCount.current = notificationsData.length;
      
      // Check for unread CashBoard cycle notifications to show celebration
      const cashBonus = settingsData?.cashboardBonus || 3990;
      const formattedCashBonus = cashBonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      const unreadCashCycle = notificationsData.find((n: any) => 
        !n.isRead && n.type === 'BONUS_AVAILABLE' && n.message.includes('Cash-Board') && n.message.includes(formattedCashBonus)
      );
      if (unreadCashCycle && !showCelebration) {
        setCelebrationAmount(formattedCashBonus);
        setShowCelebration(true);
      }

      setError(null);
      setLoading(false);
      setRefreshing(false);
      isFetching.current = false;
      
      console.log("Data initialization successful");
    } catch (err: any) {
      console.error(`Fetch attempt ${retryCount + 1} failed:`, err);
      
      if (retryCount < 3) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        setTimeout(() => {
          isFetching.current = false; // Reset flag so the retry can proceed
          fetchData(retryCount + 1);
        }, delay);
      } else {
        const msg = err.message || "Erro de conexão com o servidor. Verifique sua internet.";
        if (user) {
          setToast({ message: `Erro ao atualizar dados: ${msg}`, type: 'error' });
          setTimeout(() => setToast(null), 5000);
        } else {
          setError(`Falha ao carregar dados: ${msg}. Tente novamente.`);
        }
        setLoading(false);
        setRefreshing(false);
        isFetching.current = false;
      }
    }
  };

  const handleLogout = () => {
    clearAuthData();
    setUser(null);
    setAdminMode(false);
    setIsAdminView(false);
    navigateTo('login');
  };

  useEffect(() => {
    // Apply theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('wayfy_theme', theme);

    // Apply custom theme colors if available
    if (matrixSettings) {
      const root = document.documentElement;
      if (matrixSettings.themeNeonGreen) root.style.setProperty('--neon-green', matrixSettings.themeNeonGreen);
      if (matrixSettings.themeNeonBlue) root.style.setProperty('--neon-blue', matrixSettings.themeNeonBlue);
      if (matrixSettings.themeNeonPurple) root.style.setProperty('--neon-purple', matrixSettings.themeNeonPurple);
      if (matrixSettings.themeNeonOrange) root.style.setProperty('--neon-orange', matrixSettings.themeNeonOrange);
      if (matrixSettings.themeNeonPink) root.style.setProperty('--neon-pink', matrixSettings.themeNeonPink);
    }
  }, [theme, matrixSettings]);

  useEffect(() => {
    // Ao carregar, se não houver user e o path não é /login, redireciona
    const currentPath = window.location.pathname;
    if (currentPath === '/' || currentPath === '') {
      // Path raiz: verifica se tem sessão salva
      const savedUserId = getUserId();
      if (!savedUserId) {
        const params = new URLSearchParams(window.location.search);
        if (params.get('ref')) {
          replaceRoute('register');
        } else {
          replaceRoute('login');
        }
      }
    }
    fetchData();

    // Listener para botão voltar/avançar do browser
    const handlePopState = (e: PopStateEvent) => {
      const path = window.location.pathname;
      if (path === '/login') {
        setUser(null);
      } else if (path === '/admin') {
        setIsAdminView(true);
      } else if (DASHBOARD_PATHS.includes(path)) {
        setIsAdminView(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Automatic Re-entry Logic
  useEffect(() => {
    const checkAutoReentry = async () => {
      if (!isAutoReentry || !user || isProcessingAutoReentry || loading) return;

      const userInOnBoard = matrices.some(m => 
        m.type === 'ONBORD' && m.positions.some(p => p.userId === user.id)
      );

      const adhesionFee = matrixSettings?.adhesionFee || 650;
      if (!userInOnBoard && user.balance >= adhesionFee && !autoReentryAttempted.current) {
        setIsProcessingAutoReentry(true);
        autoReentryAttempted.current = true;
        try {
          const res = await fetch('/api/matrices/reentry', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...getAuthHeaders()
            },
            body: JSON.stringify({ userId: user.id })
          });
          if (res.ok) await fetchData();
        } catch (err) {
          console.error("Auto-reentry error:", err);
        } finally {
          setIsProcessingAutoReentry(false);
        }
      } else if (userInOnBoard) {
        autoReentryAttempted.current = false;
      }
    };
    checkAutoReentry();
  }, [isAutoReentry, user?.id, user?.balance, isProcessingAutoReentry, loading]);

  const handleFillMatrix = async (matrixId: string) => {
    try {
      const randomId = "u" + Math.floor(Math.random() * 1000);
      const res = await fetch('/api/admin/fill-matrix', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ matrixId, userId: randomId, referrerId: user?.id })
      });
      const data = await res.json();
      if (!res.ok) alert(data.message || data.error || "Erro ao preencher a matriz");
      if (data.cycleInfo && String(data.cycleInfo.userId) === String(user?.id) && data.cycleInfo.type === 'CASHBOARD_CYCLE') {
        setCelebrationAmount(data.cycleInfo.amount);
        setShowCelebration(true);
      }
      fetchData();
    } catch (err) {
      alert("Erro ao preencher a matriz");
    }
  };

  const handleJoinMatrix = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/matrices/join', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ 
          userId: user.id,
          referrerId: user.referrerId 
        })
      });
      const data = await res.json();
      if (!res.ok) alert(data.message || data.error || "Erro ao ingressar na matriz");
      if (data.cycleInfo && String(data.cycleInfo.userId) === String(user.id) && data.cycleInfo.type === 'CASHBOARD_CYCLE') {
        setCelebrationAmount(data.cycleInfo.amount);
        setShowCelebration(true);
      }
      fetchData();
    } catch (err) {
      alert("Erro de conexão");
    }
  };

  const handleReentry = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/matrices/reentry', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ 
          userId: user.id,
          referrerId: user.referrerId 
        })
      });
      const data = await res.json();
      if (!res.ok) alert(data.message || data.error || "Erro ao processar a reentrada");
      if (data.cycleInfo && String(data.cycleInfo.userId) === String(user.id) && data.cycleInfo.type === 'CASHBOARD_CYCLE') {
        setCelebrationAmount(data.cycleInfo.amount);
        setShowCelebration(true);
      }
      fetchData();
    } catch (err) {
      alert("Erro de conexão");
    }
  };

  const handleSeed = async () => {
    try {
      setLoading(true);
      await fetch('/api/admin/seed', { 
        method: 'POST',
        headers: getAuthHeaders()
      });
      setIsAutoReentry(false);
      setShowCelebration(false);
      await fetchData();
    } catch (err) {
      alert("Erro ao redefinir os dados");
      setLoading(false);
    }
  };

  const handleUpdateBanner = async (url: string) => {
    if (!user || (user.status !== 'MASTER' && user.role !== 'admin')) return;
    try {
      const res = await fetch('/api/settings/banner', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ url, userId: user.id })
      });
      if (res.ok) {
        setBannerUrl(url);
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao atualizar banner");
      }
    } catch (err) {
      alert("Erro de conexão");
    }
  };

  const [isAdminView, setIsAdminView] = useState(() => isAdminPath());
  const [adminMode, setAdminMode] = useState(() => isAdminPath());

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center gap-6 p-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-white mb-2">Erro ao Carregar</h2>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <button 
            onClick={() => fetchData()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const canViewAdmin = user?.email === 'consultorcredenciado@gmail.com';

  return (
    <div className="min-h-screen bg-[#0a0a0c]">
      <Suspense fallback={<LoadingScreen logoUrl={logoUrl} />}>
        {loading ? (
          <LoadingScreen logoUrl={logoUrl} />
        ) : !user ? (
          <AnimatePresence mode="wait">
            <motion.div
              key="auth"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-screen"
            >
              <Auth 
                onLogin={(u, asAdmin) => { 
                  setUser(u); 
                  const isAdminUser = u.email === 'consultorcredenciado@gmail.com';
                  const shouldBeAdmin = asAdmin || isAdminUser;
                  setAdminMode(!!shouldBeAdmin);
                  fetchData(); 
                  if (shouldBeAdmin) {
                    setIsAdminView(true);
                    navigateTo('admin');
                  } else {
                    navigateTo('dashboard');
                  }
                }} 
                theme={theme}
                onToggleTheme={toggleTheme}
              />
            </motion.div>
          </AnimatePresence>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={isAdminView ? 'admin' : 'dashboard'}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {canViewAdmin && isAdminView ? (
                <AdminDashboard 
                  user={user} 
                  onLogout={handleLogout} 
                  onUpdateUser={(u) => setUser(u)} 
                  onRefresh={fetchData}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  onSwitchView={() => { fetchData(); setIsAdminView(false); navigateTo('dashboard'); }}
                  matrixSettings={matrixSettings}
                  logoUrl={logoUrl}
                />
              ) : (
                <Dashboard 
                  user={user}
                  matrices={matrices}
                  notifications={notifications}
                  transactions={transactions}
                  cycleHistory={cycleHistory}
                  documents={documents}
                  bannerUrl={bannerUrl}
                  logoUrl={logoUrl}
                  onLogout={handleLogout}
                  onUpdateUser={(u) => setUser(u)}
                  onRefresh={fetchData}
                  onJoinMatrix={handleJoinMatrix}
                  onFillMatrix={handleFillMatrix}
                  onReentry={handleReentry}
                  onSeed={handleSeed}
                  onUpdateBanner={handleUpdateBanner}
                  isAutoReentry={isAutoReentry}
                  setIsAutoReentry={setIsAutoReentry}
                  showCelebration={showCelebration}
                  setShowCelebration={setShowCelebration}
                  celebrationAmount={celebrationAmount}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  canViewAdmin={canViewAdmin && adminMode}
                  onSwitchView={() => { setIsAdminView(true); navigateTo('admin'); }}
                  matrixSettings={matrixSettings}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </Suspense>
      
      <AnimatePresence>
        {refreshing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed top-4 right-4 z-[100] bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-2 rounded-full shadow-xl"
          >
            <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
          </motion.div>
        )}

        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-[100] bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-blue-400/30 backdrop-blur-md"
          >
            <Bell className="w-5 h-5" />
            <span className="text-sm font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
