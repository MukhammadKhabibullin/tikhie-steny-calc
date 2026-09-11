import React, { useState } from 'react';
import {
  Building2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Layers,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { signInWithEmail, signUpWithEmail } from '../services/supabaseClient';
import type { User, Session } from '../services/supabaseClient';

interface AuthScreenProps {
  onAuthSuccess: (user: User, session: Session, isNewRegistration?: boolean) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const translateError = (err: string): string => {
    const lower = err.toLowerCase();
    if (lower.includes('invalid login credentials')) {
      return 'Неверный адрес эл. почты или пароль. Проверьте правильность введенных данных.';
    }
    if (lower.includes('user already registered') || lower.includes('already exists')) {
      return 'Пользователь с таким email уже зарегистрирован. Переключитесь на вкладку «Вход».';
    }
    if (lower.includes('password should be at least')) {
      return 'Пароль должен содержать не менее 6 символов.';
    }
    if (lower.includes('email not confirmed')) {
      return 'Email не подтвержден. Проверьте почту или обратитесь к администратору Supabase.';
    }
    if (lower.includes('rate limit')) {
      return 'Слишком много попыток входа. Пожалуйста, подождите минуту.';
    }
    return err;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Пожалуйста, введите корректный адрес электронной почты.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Пароль должен содержать минимум 6 символов.');
      return;
    }

    if (mode === 'register') {
      if (!companyName.trim()) {
        setErrorMessage('Укажите название вашей компании или ИП.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Пароли не совпадают. Пожалуйста, проверьте подтверждение пароля.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await signInWithEmail(cleanEmail, password);
        if (res.error) {
          setErrorMessage(translateError(res.error));
        } else if (res.user && res.session) {
          onAuthSuccess(res.user, res.session, false);
        } else {
          setErrorMessage('Не удалось получить сессию после входа. Попробуйте еще раз.');
        }
      } else {
        // Регистрация
        const res = await signUpWithEmail(cleanEmail, password, companyName.trim());
        if (res.error) {
          setErrorMessage(translateError(res.error));
        } else if (res.user && res.session) {
          // Если сразу вернулась активная сессия (подтверждение почты отключено в Supabase)
          onAuthSuccess(res.user, res.session, true);
        } else if (res.user && !res.session) {
          // Если включено подтверждение email
          setSuccessMessage(
            'Аккаунт успешно создан! На ваш email отправлено письмо со ссылкой для подтверждения. После подтверждения выполните вход.'
          );
          setMode('login');
          setPassword('');
          setConfirmPassword('');
        }
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? translateError(err.message) : 'Произошла непредвиденная ошибка.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Декоративные фоновые элементы */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-md w-full mx-auto space-y-8">
        {/* Логотип и приветственный заголовок */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-xl shadow-blue-500/25 border border-blue-400/30">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Тихие Стены <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">PRO</span>
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Профессиональный калькулятор шумоизоляции и сметных спецификаций
            </p>
          </div>
        </div>

        {/* Карточка авторизации */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Табы переключения Режим: Вход / Регистрация */}
          <div className="grid grid-cols-2 p-1 bg-slate-900/60 rounded-xl border border-white/10 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2.5 rounded-lg transition-all text-center ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Вход в систему
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2.5 rounded-lg transition-all text-center ${
                mode === 'register'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Регистрация
            </button>
          </div>

          {/* Сообщения об успехе или ошибке */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* Форма */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Название компании / ИП <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="ООО Акустик Про / ИП Иванов"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Электронная почта <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@company.ru"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Пароль <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Подтверждение пароля <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/30 active:scale-[0.99] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Пожалуйста, подождите...</span>
                </>
              ) : mode === 'login' ? (
                <>
                  <span>Войти в систему</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Зарегистрировать компанию</span>
                </>
              )}
            </button>
          </form>

          {/* Информационный футер карточки */}
          <div className="pt-4 border-t border-white/10 text-center text-xs text-slate-400">
            {mode === 'login' ? (
              <p>
                Еще нет аккаунта?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2"
                >
                  Зарегистрировать компанию
                </button>
              </p>
            ) : (
              <p>
                Уже зарегистрированы?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2"
                >
                  Войти в существующий аккаунт
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Преимущества и trust-блок */}
        <div className="grid grid-cols-3 gap-3 text-center text-xs text-slate-300">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center gap-1.5">
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="font-medium text-[11px] leading-tight">Облачная база проектов</span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-400" />
            <span className="font-medium text-[11px] leading-tight">Каталог и прайсы</span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-medium text-[11px] leading-tight">Безопасность Supabase</span>
          </div>
        </div>
      </div>
    </div>
  );
};
