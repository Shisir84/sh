import React, { useState } from 'react';
import { Calendar, Flame, Megaphone, Search, Shield, Sparkles, Trophy, UserCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatInrPrice } from '../utils/storeLogic';

interface PlayerLookupResult {
  minecraftUsername: string;
  currentRank: string;
  playtimeHours: number;
  questsCompleted: number;
  realmBalance: number;
  online: boolean;
  lastSeenAt: string | null;
  verifiedPurchasesCount: number;
  source: string;
}

export function AnnouncementsPage() {
  const { announcements, serverEvents, recentPurchases, storeSettings, formatPrice } = useStore();
  const [lookupIgn, setLookupIgn] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupResult, setLookupResult] = useState<PlayerLookupResult | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    setLookupResult(null);
    if (!lookupIgn.trim()) return;
    setLookupLoading(true);
    try {
      const res = await fetch(`/api/player-lookup?ign=${encodeURIComponent(lookupIgn.trim())}`);
      const data = (await res.json()) as PlayerLookupResult & { error?: string };
      if (!res.ok) {
        setLookupError(data.error || 'Unable to look up player.');
      } else {
        setLookupResult(data);
      }
    } catch {
      setLookupError('Network error while checking player.');
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <main className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <section className="volex-panel rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-violet-300">
            <Megaphone className="w-4 h-4" aria-hidden="true" />
            <span>VOLEXMC Network Broadcasts</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            Realm Announcements, Events &amp; Community Hub
          </h1>
          <p className="text-sm text-slate-300">
            Patch notes, weekend Citadel raid schedules, community goal progress, and privacy-safe IGN lookup.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-[#070918] border border-violet-500/30 min-w-[260px] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-violet-200 inline-flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
              <span>{storeSettings.communityGoalLabel}</span>
            </span>
            <span className="font-mono-nums font-bold text-amber-300">
              {storeSettings.communityGoalPercent}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 rounded-full"
              style={{ width: `${storeSettings.communityGoalPercent}%` }}
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Announcements + Events Column */}
        <div className="lg:col-span-8 space-y-6">
          <section className="space-y-4">
            <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <span>Latest Realm Announcements</span>
            </h2>
            {announcements.length === 0 ? (
              <div className="volex-panel rounded-2xl p-6 text-sm text-slate-400">
                No announcements published yet.
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((item) => (
                  <article
                    key={item.id}
                    className="volex-panel rounded-2xl overflow-hidden border border-violet-500/25"
                  >
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-48 sm:h-56 object-cover"
                      />
                    )}
                    <div className="p-5 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="px-2.5 py-0.5 rounded-md bg-violet-600/25 border border-violet-400/40 font-bold text-violet-200 uppercase">
                          {item.tag}
                        </span>
                        <span className="text-slate-400 font-mono-nums">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-display text-xl font-bold text-white">{item.title}</h3>
                      <p className="text-xs text-violet-200 font-medium">{item.summary}</p>
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line pt-1">
                        {item.content}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <span>Upcoming Server Events</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {serverEvents.map((evt) => (
                <article
                  key={evt.id}
                  className="volex-panel rounded-2xl p-5 border border-cyan-500/25 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/40 font-bold text-cyan-200">
                      {evt.category}
                    </span>
                    <span className="font-mono-nums text-slate-400">
                      {new Date(evt.startsAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-bold text-white">{evt.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{evt.description}</p>
                  <div className="pt-2 border-t border-white/10 text-xs font-semibold text-amber-300 inline-flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Rewards: {evt.rewardSummary}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Player Lookup + Privacy-Protected Recent Supporters */}
        <aside className="lg:col-span-4 space-y-6">
          <section className="volex-panel rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cyan-300" />
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                Minecraft Player Lookup
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Check verified realm rank &amp; synced Paper 1.21.6 stats for any Java IGN.
            </p>
            <form onSubmit={handleLookup} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={lookupIgn}
                  onChange={(e) => setLookupIgn(e.target.value)}
                  placeholder="Enter Java IGN (e.g. Shisir)"
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#070918] border border-violet-500/30 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400"
                />
              </div>
              <button
                type="submit"
                disabled={lookupLoading}
                className="volex-glow-btn px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer disabled:opacity-50"
              >
                {lookupLoading ? '...' : 'Lookup'}
              </button>
            </form>
            {lookupError && <p className="text-xs text-rose-300">{lookupError}</p>}
            {lookupResult && (
              <div className="rounded-xl bg-[#070918] border border-cyan-400/35 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-white text-sm">
                    {lookupResult.minecraftUsername}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-violet-600/30 border border-violet-400/40 text-violet-200 font-bold">
                    {lookupResult.currentRank}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
                  <div>Playtime: <strong className="text-white">{lookupResult.playtimeHours}h</strong></div>
                  <div>Quests: <strong className="text-white">{lookupResult.questsCompleted}</strong></div>
                  <div>Store Orders: <strong className="text-emerald-300">{lookupResult.verifiedPurchasesCount}</strong></div>
                  <div>Status: <strong className={lookupResult.online ? 'text-emerald-300' : 'text-slate-400'}>{lookupResult.online ? 'In-Game' : 'Offline'}</strong></div>
                </div>
              </div>
            )}
          </section>

          <section className="volex-panel rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                  Recent Realm Supporters
                </h2>
              </div>
              <span className="text-[10px] text-slate-400">Privacy Masked</span>
            </div>
            {recentPurchases.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">
                Verified purchases appear here with masked player names once approved by staff.
              </p>
            ) : (
              <div className="space-y-2">
                {recentPurchases.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-[#070918] border border-white/10 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{item.maskedPlayer}</div>
                      <div className="text-[11px] text-violet-300 truncate">{item.productName}</div>
                    </div>
                    <span
                      title={formatInrPrice(item.amountInr)}
                      className="font-mono-nums font-bold text-amber-300 shrink-0"
                    >
                      {formatPrice(item.amountInr)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
