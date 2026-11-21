import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  Crown,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useToast } from '../components/ToastProvider';

export function AdminLoginPage() {
  const {
    user,
    adminAuthChecked,
    adminAuthStatus,
    isAdmin,
    loginAdmin,
  } = useStore();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (adminAuthChecked && isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [adminAuthChecked, isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await loginAdmin({
        identifier,
        password,
        rememberMe,
      });
      if (!result.ok) {
        setError(result.error || 'Authentication failed.');
        return;
      }
      showToast({
        tone: 'success',
        title: 'Admin session verified',
        description: 'Welcome to the VOLEXMC Command Console.',
      });
      navigate('/admin', { replace: true });
    } catch {
      setError('Unable to reach authentication server.');
    } finally {
      setSubmitting(false);
    }
  };

  const setupRequired = Boolean(adminAuthStatus?.setupRequired);

  return (
    <main className="max-w-md mx-auto px-4 py-12 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="volex-panel rounded-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden"
      >
        <div
          className="absolute -top-20 -right-20 w-44 h-44 rounded-full bg-violet-600/20 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="text-center space-y-2.5 relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-800 border border-violet-400/55 flex items-center justify-center mx-auto shadow-[0_0_28px_rgba(147,51,234,0.55)]">
            <Crown className="w-7 h-7 text-amber-300" aria-hidden="true" />
          </div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.2em] text-violet-300 uppercase">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
            <span>VOLEXMC Admin Portal</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            Administrator Sign In
          </h1>
          <p className="text-xs text-slate-300">
            Protected staff gateway for store, order proof, and network configuration.
          </p>
        </div>

        {user && !isAdmin && (
          <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-400/35 text-[11px] text-violet-200 text-center">
            Currently signed in as player <strong className="text-white">{user.email}</strong>. Enter administrator credentials below to elevate this session.
          </div>
        )}

        {!adminAuthChecked ? (
          <div className="py-6 flex flex-col items-center gap-2 text-xs text-slate-300">
            <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
            <span>Checking admin security status...</span>
          </div>
        ) : setupRequired ? (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-400/40 space-y-2.5 text-xs text-amber-100">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Initial Admin Setup Required</span>
            </div>
            <p className="leading-relaxed text-slate-200">
              No administrator account has been initialized yet. For security, VOLEXMC never creates a default password.
            </p>
            <p className="leading-relaxed text-slate-300">
              Set <code className="text-amber-300 font-mono-nums">ADMIN_EMAIL</code> and{' '}
              <code className="text-amber-300 font-mono-nums">ADMIN_PASSWORD</code> in your server environment variables, restart the server, and sign in here.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-identifier"
                className="block text-xs font-semibold text-slate-200 mb-1.5"
              >
                Admin Email or Username
              </label>
              <div className="relative">
                <Mail
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="admin-identifier"
                  type="text"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@volexmc.net"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#070918] border border-violet-500/35 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold text-slate-200 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#070918] border border-violet-500/35 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-violet-500/40 bg-[#070918]"
              />
              <span>Remember admin session (7 days)</span>
            </label>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-500/12 border border-rose-500/40 text-xs text-rose-200"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="volex-glow-btn w-full py-3 rounded-xl text-sm font-bold text-white inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Sign In to Admin Console</span>
            </button>
          </form>
        )}

        <div className="pt-2 border-t border-white/10 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-violet-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Return to VOLEXMC Store</span>
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
