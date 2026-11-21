import { Shield, Users } from 'lucide-react';
import { useStore } from '../context/StoreContext';

const RANK_STYLE: Record<string, string> = {
  gold: 'border-amber-400/45 text-amber-300 bg-amber-500/10',
  purple: 'border-violet-400/45 text-violet-300 bg-violet-500/10',
  cyan: 'border-cyan-400/45 text-cyan-300 bg-cyan-500/10',
  pink: 'border-pink-400/45 text-pink-300 bg-pink-500/10',
};

export function StaffPage() {
  const { staff } = useStore();
  const activeStaff = staff
    .filter((s) => s.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <main className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div className="volex-panel rounded-2xl p-6 space-y-1">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-violet-300">
          <Users className="w-4 h-4" aria-hidden="true" />
          <span>VOLEXMC Leadership &amp; Moderation</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
          Meet the Staff Team
        </h1>
        <p className="text-sm text-slate-300 max-w-2xl">
          Dedicated administrators, developers, and moderators keeping VOLEXMC realms fair, secure, and active.
        </p>
      </div>

      {activeStaff.length === 0 ? (
        <div className="volex-panel rounded-2xl p-10 text-center text-sm text-slate-300">
          No staff members are currently listed.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {activeStaff.map((member) => {
            const badgeStyle = RANK_STYLE[member.rankColor] || RANK_STYLE.purple;
            return (
              <article
                key={member.id}
                className="volex-panel rounded-2xl p-5 flex flex-col gap-4 hover:border-violet-400/60 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-700/40 to-indigo-900/60 border border-violet-400/40 flex items-center justify-center shrink-0 overflow-hidden">
                    {member.photoUrl ? (
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Shield className="w-7 h-7 text-violet-200" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-bold text-white truncate">
                      {member.name}
                    </h2>
                    <span
                      className={`inline-block mt-1 px-2.5 py-0.5 rounded-md border text-[11px] font-bold ${badgeStyle}`}
                    >
                      {member.role}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 font-mono-nums">
                  IGN: <span className="text-cyan-300">{member.minecraftUsername}</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed flex-1">
                  {member.bio}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
