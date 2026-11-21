import React, { useEffect, useState } from 'react';
import {
  Activity,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  Server,
  ShieldCheck,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../ToastProvider';
import type { SiteConfig } from '../../types/store';

export function AdminSecurityTab({
  mode,
  onStatus,
}: {
  mode: 'server' | 'admin';
  onStatus: (msg: string) => void;
}) {
  const {
    siteConfig,
    saveSiteConfig,
    serverStatus,
    refreshServerStatus,
    serverAdmin,
    user,
    changeAdminPassword,
    activityLogs,
    refreshActivityLogs,
  } = useStore();
  const { showToast } = useToast();

  const [configDraft, setConfigDraft] = useState<SiteConfig>(siteConfig);
  const [copiedIp, setCopiedIp] = useState(false);

  // Admin password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [logSearch, setLogSearch] = useState('');

  useEffect(() => {
    setConfigDraft(siteConfig);
  }, [siteConfig]);

  const handleSaveServer = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSiteConfig(configDraft);
    onStatus('Server settings and announcement updated live.');
    showToast({ tone: 'success', title: 'Server settings saved' });
  };

  const handleCopyIp = async () => {
    try {
      await navigator.clipboard.writeText(configDraft.serverIp);
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 1600);
    } catch {
      // ignore clipboard errors
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New password and confirmation do not match.');
      return;
    }
    setPwSubmitting(true);
    try {
      const res = await changeAdminPassword({ currentPassword, newPassword });
      if (!res.ok) {
        setPwError(res.error || 'Failed to update password.');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      void refreshActivityLogs();
      onStatus('Administrator password updated and active session rotated.');
      showToast({
        tone: 'success',
        title: 'Password updated',
        description: 'Active session rotated cleanly.',
      });
    } finally {
      setPwSubmitting(false);
    }
  };

  if (mode === 'server') {
    return (
      <form onSubmit={handleSaveServer} className="volex-panel rounded-2xl p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-violet-400" />
            <div>
              <h2 className="font-display text-lg font-bold text-white">Server Settings</h2>
              <p className="text-xs text-slate-400">
                Manage public server IP, Minecraft version, Discord invite URL, and announcement ticker.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#070918] border border-white/10 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                serverStatus?.online ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            />
            <span className="font-mono-nums text-slate-200">
              {serverStatus?.online
                ? `${serverStatus.players.online}/${serverStatus.players.max} Players`
                : 'Server Offline'}
            </span>
            <button
              type="button"
              onClick={() => void refreshServerStatus()}
              aria-label="Ping server status"
              className="text-violet-300 hover:text-white cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="srv-ip" className="block text-xs text-slate-300 mb-1">
              Server IP Address
            </label>
            <div className="flex gap-1.5">
              <input
                id="srv-ip"
                type="text"
                required
                value={configDraft.serverIp}
                onChange={(e) => setConfigDraft({ ...configDraft, serverIp: e.target.value })}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white font-mono-nums"
              />
              <button
                type="button"
                onClick={() => void handleCopyIp()}
                className="px-2.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-slate-200 cursor-pointer"
                aria-label="Copy server IP"
              >
                {copiedIp ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="srv-ver" className="block text-xs text-slate-300 mb-1">
              Minecraft Version
            </label>
            <input
              id="srv-ver"
              type="text"
              required
              value={configDraft.minecraftVersion}
              onChange={(e) =>
                setConfigDraft({ ...configDraft, minecraftVersion: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white font-mono-nums"
            />
          </div>
          <div>
            <label htmlFor="srv-discord" className="block text-xs text-slate-300 mb-1">
              Discord Invite URL
            </label>
            <input
              id="srv-discord"
              type="url"
              required
              value={configDraft.discordUrl}
              onChange={(e) => setConfigDraft({ ...configDraft, discordUrl: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-white/10 space-y-2">
          <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={configDraft.announcementEnabled}
              onChange={(e) =>
                setConfigDraft({ ...configDraft, announcementEnabled: e.target.checked })
              }
            />
            <span>Enable Top Navbar Announcement Banner</span>
          </label>
          <input
            type="text"
            value={configDraft.announcementBanner || ''}
            onChange={(e) =>
              setConfigDraft({ ...configDraft, announcementBanner: e.target.value })
            }
            placeholder="Server-wide announcement banner message..."
            className="w-full px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white"
          />
        </div>

        <button
          type="submit"
          className="volex-glow-btn px-6 py-2.5 rounded-xl text-xs font-bold text-white cursor-pointer"
        >
          Save Server Settings
        </button>
      </form>
    );
  }

  // ADMIN SECURITY & ACTIVITY LOGS MODE
  const q = logSearch.trim().toLowerCase();
  const visibleLogs = q
    ? activityLogs.filter((l) =>
        `${l.actorEmail} ${l.action} ${l.target} ${l.details}`.toLowerCase().includes(q)
      )
    : activityLogs;

  return (
    <div className="space-y-6">
      <section className="volex-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <KeyRound className="w-5 h-5 text-amber-300" />
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              Admin Security &amp; Credentials
            </h2>
            <p className="text-xs text-slate-400">
              Active Administrator: {serverAdmin?.email || user?.email || 'Admin'}
            </p>
          </div>
        </div>

        {serverAdmin ? (
          <form onSubmit={handlePasswordSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <label htmlFor="sec-cur-pw" className="block text-[11px] text-slate-300 mb-1">
                Current Password
              </label>
              <input
                id="sec-cur-pw"
                type={showPw ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white pr-8"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide passwords' : 'Show passwords'}
                className="absolute right-2.5 top-[30px] text-slate-400 hover:text-white cursor-pointer"
              >
                {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div>
              <label htmlFor="sec-new-pw" className="block text-[11px] text-slate-300 mb-1">
                New Password (min 8 chars)
              </label>
              <input
                id="sec-new-pw"
                type={showPw ? 'text' : 'password'}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white"
              />
            </div>
            <div>
              <label htmlFor="sec-conf-pw" className="block text-[11px] text-slate-300 mb-1">
                Confirm New Password
              </label>
              <input
                id="sec-conf-pw"
                type={showPw ? 'text' : 'password'}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white"
              />
            </div>

            {pwError && (
              <div className="md:col-span-3 p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/35 text-xs text-rose-200">
                {pwError}
              </div>
            )}

            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={pwSubmitting}
                className="volex-glow-btn px-5 py-2 rounded-xl text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{pwSubmitting ? 'Rotating Password...' : 'Update Admin Password'}</span>
              </button>
            </div>
          </form>
        ) : (
          <p className="text-xs text-slate-400">
            Signed in via Google Firebase Admin. Local credential rotation applies when signed in with Admin Login credentials.
          </p>
        )}
      </section>

      <section className="volex-panel rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-400" />
            <h2 className="font-display text-lg font-bold text-white">
              Admin Activity Logs ({activityLogs.length})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Filter logs..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#070918] border border-white/15 text-xs text-white"
            />
            <button
              type="button"
              onClick={() => void refreshActivityLogs()}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-slate-200 inline-flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {visibleLogs.length === 0 ? (
          <p className="text-xs text-slate-400">No admin activity recorded yet.</p>
        ) : (
          <div className="overflow-x-auto max-h-[380px]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="py-2 pr-3">Timestamp</th>
                  <th className="py-2 pr-3">Actor</th>
                  <th className="py-2 pr-3">Action</th>
                  <th className="py-2 pr-3">Target</th>
                  <th className="py-2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visibleLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 pr-3 font-mono-nums text-[11px] text-slate-400 whitespace-nowrap">
                      {log.createdAt.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="py-2.5 pr-3 text-cyan-300">{log.actorEmail}</td>
                    <td className="py-2.5 pr-3 font-semibold text-violet-200">{log.action}</td>
                    <td className="py-2.5 pr-3 font-mono-nums text-slate-300">{log.target}</td>
                    <td className="py-2.5 text-slate-300">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
