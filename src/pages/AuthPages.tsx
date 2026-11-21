import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Crown, Loader2, ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { validateMinecraftUsername } from '../utils/storeLogic';

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { user, userProfile, signInWithGoogle, updateMinecraftUsername } = useStore();
  const navigate = useNavigate();
  const [ign, setIgn] = useState(userProfile?.minecraftUsername || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      if (mode === 'login') {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIgn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const check = validateMinecraftUsername(ign);
    if (!check.valid) {
      setError(check.error || 'Enter a valid Minecraft username.');
      return;
    }
    setLoading(true);
    try {
      await updateMinecraftUsername(check.cleaned);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save Minecraft username.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-lg mx-auto px-4 py-14">
      <div className="volex-panel rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 border border-violet-400/50 flex items-center justify-center mx-auto shadow-[0_0_24px_rgba(139,92,246,0.45)]">
            <Crown className="w-6 h-6 text-amber-300" aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-white">
            {mode === 'login' ? 'Sign In to VOLEXMC' : 'Create VOLEXMC Account'}
          </h1>
          <p className="text-xs text-slate-300">
            Track orders, link your Minecraft username, and manage support tickets securely.
          </p>
        </div>

        {!user ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-violet-400" aria-hidden="true" />
              <span>Protected by Firebase Verified Authentication</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveIgn} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#070918] border border-violet-500/30 text-xs text-slate-300">
              Signed in as <strong className="text-white">{user.email}</strong>
            </div>

            <div>
              <label htmlFor="auth-ign" className="block text-xs font-semibold text-slate-200 mb-1.5">
                Link Your Minecraft Username (Optional)
              </label>
              <input
                id="auth-ign"
                type="text"
                value={ign}
                onChange={(e) => setIgn(e.target.value)}
                placeholder="e.g. Steve_99"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070918] border border-violet-500/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="volex-glow-btn flex-1 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer"
              >
                Save &amp; Go to Dashboard
              </button>
              <Link
                to="/store"
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 flex items-center"
              >
                Store
              </Link>
            </div>
          </form>
        )}

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/35 text-xs text-rose-200">
            {error}
          </div>
        )}

        <div className="pt-4 border-t border-white/10 text-center text-xs text-slate-400">
          {mode === 'login' ? (
            <>
              New to VOLEXMC Store?{' '}
              <Link to="/register" className="text-violet-300 hover:text-white font-semibold">
                Register here
              </Link>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Link to="/login" className="text-violet-300 hover:text-white font-semibold">
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
