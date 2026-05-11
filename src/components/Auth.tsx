import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Logo from './Logo';
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, CreditCard, Phone, Calendar, LayoutDashboard, AlertCircle, Eye, EyeOff, ArrowLeft, CheckCircle2, Sun, Moon } from 'lucide-react';
import { User } from '../types';
import { validateCPF, validateEmail, validatePhone, formatPhone, formatCPF } from '../utils/validation';
import { replaceRoute, navigateTo } from '../lib/routing';
import { saveAuthData } from '../lib/utils';

interface AuthProps {
  onLogin: (user: User, asAdmin?: boolean) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function Auth({ onLogin, theme, onToggleTheme }: AuthProps) {
  const [isLogin, setIsLogin] = useState(() => window.location.pathname !== '/register');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isRegisterSuccess, setIsRegisterSuccess] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    email: '',
    password: '',
    newPassword: '',
    confirmPassword: '',
    cpf: '',
    phone: '',
    birthDate: '',
    referrerId: '',
    referralCode: ''
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Garante que o URL reflete o estado inicial correto
    if (window.location.pathname === '/register' || new URLSearchParams(window.location.search).get('ref')) {
      setIsLogin(false);
      replaceRoute('register');
    } else {
      replaceRoute('login');
    }

    fetch('/api/settings/logo')
      .then(res => res.json())
      .then(data => setLogoUrl(data.url))
      .catch(err => console.error("Error fetching logo:", err));
    
    // Check for referral ID or Code in URL
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      // New format: hash/nickname
      const refParts = ref.split('/');
      const referralCode = refParts.length > 1 ? refParts[1] : ref;
      
      if (referralCode.startsWith('user_')) {
        setFormData(prev => ({ ...prev, referrerId: referralCode }));
      } else {
        setFormData(prev => ({ ...prev, referralCode: referralCode }));
      }

      if (isLogin) {
        setIsLogin(false);
        setSuccessMessage("Código de indicação aplicado!");
      }
    }
  }, []);

  const validateField = (name: string, value: string) => {
    let error = '';
    if (name === 'email' && value && !validateEmail(value)) {
      error = 'E-mail inválido';
    } else if (name === 'cpf' && value && !validateCPF(value)) {
      error = 'CPF inválido';
    } else if (name === 'phone' && value && !validatePhone(value)) {
      error = 'Telefone inválido (mínimo 10 dígitos)';
    } else if ((name === 'password' || name === 'newPassword') && value && value.length < 6) {
      error = 'A senha deve ter pelo menos 6 caracteres';
    } else if (name === 'confirmPassword' && value !== formData.newPassword) {
      error = 'As senhas não coincidem';
    }
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, (formData as any)[name]);
  };

  const handleChange = (name: string, value: string) => {
    let formattedValue = value;
    if (name === 'cpf') formattedValue = formatCPF(value);
    if (name === 'phone') formattedValue = formatPhone(value);

    setFormData(prev => ({ ...prev, [name]: formattedValue }));
    
    // Real-time validation for email as requested
    if (name === 'email' || touched[name]) {
      validateField(name, formattedValue);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, cpf: formData.cpf })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      setResetUserId(data.userId);
      setIsForgotPassword(false);
      setIsResetPassword(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetUserId, newPassword: formData.newPassword })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      
      setSuccessMessage("Senha redefinida com sucesso! Faça login.");
      setIsResetPassword(false);
      setIsLogin(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isForgotPassword) return handleForgotPassword(e);
    if (isResetPassword) return handleResetPassword(e);
    
    // Final validation check
    const newErrors: Record<string, string> = {};
    if (!validateEmail(formData.email)) newErrors.email = 'E-mail inválido';
    if (!isLogin) {
      if (!validateCPF(formData.cpf)) newErrors.cpf = 'CPF inválido';
      if (!validatePhone(formData.phone)) newErrors.phone = 'Telefone inválido';
      if (formData.password.length < 6) newErrors.password = 'Senha muito curta';
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setTouched({ email: true, cpf: true, phone: true, password: true });
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Sync with local backend
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar solicitação no servidor');
      }

      if (!isLogin) {
        setIsRegisterSuccess(true);
        setSuccessMessage("Cadastro realizado com sucesso! Você já pode entrar.");
        setIsLogin(true);
        // Reset form to a clean state
        setFormData({
          name: '',
          nickname: '',
          email: '',
          password: '',
          newPassword: '',
          confirmPassword: '',
          cpf: '',
          phone: '',
          birthDate: '',
          referrerId: '',
          referralCode: ''
        });
        setTouched({});
        setFieldErrors({});
        return;
      }

      localStorage.setItem('wayfy_user_id', data.id);
      // Save JWT token if provided by backend
      saveAuthData(data.id, data.token);
      onLogin(data);
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderFieldError = (name: string) => {
    // Show email errors in real-time as requested, others after touched
    if ((name === 'email' || touched[name]) && fieldErrors[name]) {
      return (
        <div className="flex items-center gap-1 mt-1 text-red-500 text-[10px] font-medium animate-in fade-in slide-in-from-top-1">
          <AlertCircle size={10} />
          {fieldErrors[name]}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-4 flex-col gap-8 transition-colors duration-300 relative">
      {/* Dev Auto-Login Button */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={async () => {
              setLoading(true);
              try {
                const res = await fetch('/api/auth/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: 'consultorcredenciado@gmail.com',
                    password: 'admin'
                  })
                });
                const data = await res.json();
                if (res.ok) {
                  onLogin(data.user);
                } else {
                  setError(data.error || 'Erro ao fazer login automático');
                }
              } catch (err) {
                setError('Erro de conexão');
              } finally {
                setLoading(false);
              }
            }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-[var(--text-main)] rounded-full shadow-lg flex items-center gap-2 text-sm font-medium transition-all transform hover:scale-105"
          >
            <LayoutDashboard className="w-4 h-4" />
            Iniciar Dashboard (Mobicycle)
          </button>
        </div>
      )}

      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <button 
          onClick={onToggleTheme}
          className="p-3 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl text-[var(--text-main)] hover:bg-[var(--glass-bg)] transition-all shadow-xl"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          <Logo size={64} className="mb-4" />
          <h1 className="text-2xl font-bold text-[var(--text-main)] tracking-tight">MOBICYCLE</h1>
          <p className="text-[var(--text-muted)] text-sm text-center px-4">
            {isForgotPassword ? 'Recupere sua senha informando seus dados' : 
             isResetPassword ? 'Defina uma nova senha segura para sua conta' :
             isLogin ? 'Bem-vindo de volta! Entre na sua conta' : 'Comece sua jornada na MOBICYCLE agora'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-2 shadow-sm"
            >
              <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
              <p className="text-emerald-500 text-sm font-bold leading-tight">{successMessage}</p>
            </motion.div>
          )}

          {isForgotPassword ? (
            <>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                <input 
                  type="email"
                  placeholder="E-mail da conta"
                  required
                  className={`w-full bg-[var(--bg-main)] border ${fieldErrors.email ? 'border-red-500/50' : 'border-[var(--border-main)]'} rounded-xl py-3 pl-12 pr-4 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-blue-500 outline-none transition-all`}
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                />
                {renderFieldError('email')}
              </div>
              <div className="relative group">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                <input 
                  type="text"
                  placeholder="CPF cadastrado"
                  required
                  maxLength={14}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl py-3 pl-12 pr-4 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-blue-500 outline-none transition-all"
                  value={formData.cpf}
                  onChange={(e) => handleChange('cpf', e.target.value)}
                />
              </div>
            </>
          ) : isResetPassword ? (
            <>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                <input 
                  type={showPassword ? "text" : "password"}
                  placeholder="Nova Senha"
                  required
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl py-3 pl-12 pr-12 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-blue-500 outline-none transition-all"
                  value={formData.newPassword}
                  onChange={(e) => handleChange('newPassword', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-blue-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                <input 
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirmar Nova Senha"
                  required
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl py-3 pl-12 pr-12 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-blue-500 outline-none transition-all"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              {!isLogin && (
                <>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                    <input 
                      type="text"
                      placeholder="Nome Completo"
                      required
                      className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl py-3 pl-12 pr-4 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-blue-500 outline-none transition-all"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                    />
                  </div>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                    <input 
                       type="text"
                       placeholder="Apelido de Login"
                       required
                       className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl py-3 pl-12 pr-4 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-blue-500 outline-none transition-all"
                       value={formData.nickname}
                       onChange={(e) => handleChange('nickname', e.target.value)}
                    />
                  </div>
                  <div className="relative group">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                    <input 
                      type="text"
                      placeholder="CPF"
                      required
                      maxLength={14}
                      className={`w-full bg-[var(--bg-main)] border ${touched.cpf && fieldErrors.cpf ? 'border-red-500/50' : 'border-[var(--border-main)]'} rounded-xl py-3 pl-12 pr-4 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-blue-500 outline-none transition-all`}
                      value={formData.cpf}
                      onChange={(e) => handleChange('cpf', e.target.value)}
                      onBlur={() => handleBlur('cpf')}
                    />
                    {renderFieldError('cpf')}
                  </div>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                    <input 
                      type="text"
                      placeholder="Telefone"
                      className={`w-full bg-[var(--bg-main)] border ${touched.phone && fieldErrors.phone ? 'border-red-500/50' : 'border-[var(--border-main)]'} rounded-xl py-3 pl-12 pr-4 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-blue-500 outline-none transition-all`}
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      onBlur={() => handleBlur('phone')}
                    />
                    {renderFieldError('phone')}
                  </div>
                  <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                    <input 
                      type="date"
                      placeholder="Data de Nascimento"
                      className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl py-3 pl-12 pr-4 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-blue-500 outline-none transition-all"
                      value={formData.birthDate}
                      onChange={(e) => handleChange('birthDate', e.target.value)}
                    />
                  </div>
                  <div className="relative group">
                    <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                    <input 
                      type="text"
                      placeholder="Código de Indicação (Opcional)"
                      className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl py-3 pl-12 pr-4 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-blue-500 outline-none transition-all"
                      value={formData.referralCode}
                      onChange={(e) => handleChange('referralCode', e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                <input 
                  type="email"
                  placeholder="E-mail"
                  required
                  className={`w-full bg-[var(--bg-main)] border ${fieldErrors.email ? 'border-red-500/50' : 'border-[var(--border-main)]'} rounded-xl py-3 pl-12 pr-4 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-blue-500 outline-none transition-all`}
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                />
                {renderFieldError('email')}
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                <input 
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha"
                  required
                  className={`w-full bg-[var(--bg-main)] border ${touched.password && fieldErrors.password ? 'border-red-500/50' : 'border-[var(--border-main)]'} rounded-xl py-3 pl-12 pr-12 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-blue-500 outline-none transition-all`}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-blue-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                {renderFieldError('password')}
              </div>
            </>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
            >
              <AlertCircle size={16} className="text-red-500 shrink-0" />
              <p className="text-red-500 text-xs font-medium">{error}</p>
            </motion.div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--neon-green)] hover:brightness-110 disabled:opacity-50 text-[#0a0f1e] font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(57,255,20,0.3)]"
          >
            {loading ? 'Processando...' : 
             isForgotPassword ? 'Verificar Dados' :
             isResetPassword ? 'Redefinir Senha' :
             (isLogin ? 'Entrar' : 'Cadastrar')}
          </button>

          {isLogin && !isForgotPassword && !isResetPassword && (
            <div className="text-right">
              <button 
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>
          )}

          {(isForgotPassword || isResetPassword) && (
            <button 
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setIsResetPassword(false);
                setIsLogin(true);
                navigateTo('login');
                setError(null);
                setSuccessMessage(null);
              }}
              className="w-full flex items-center justify-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs transition-colors py-2"
            >
              <ArrowLeft size={14} />
              Voltar para o Login
            </button>
          )}


        </form>

        <div className="mt-8 pt-6 border-t border-[var(--border-main)] text-center">
          <p className="text-[var(--text-muted)] text-xs mb-3">
            {isLogin ? 'Ainda não faz parte do ecossistema?' : 'Já possui uma conta ativa?'}
          </p>
          <button 
            onClick={() => {
              const nextState = !isLogin;
              setIsLogin(nextState);
              navigateTo(nextState ? 'login' : 'register');
              setSuccessMessage(null);
              setError(null);
              setIsForgotPassword(false);
              setIsResetPassword(false);
            }}
            className="w-full py-3 bg-[var(--border-main)] hover:bg-slate-700 text-[var(--text-main)] text-sm font-bold rounded-2xl transition-all uppercase tracking-widest shadow-lg"
          >
            {isLogin ? 'Criar Nova Conta' : 'Entrar na Minha Conta'}
          </button>
        </div>


      </motion.div>
    </div>
  );
}
