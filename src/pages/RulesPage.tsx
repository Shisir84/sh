import { AlertTriangle, Gavel } from 'lucide-react';
import { useStore } from '../context/StoreContext';

const SEVERITY_STYLE: Record<string, string> = {
  Low: 'text-slate-300 border-slate-500/40 bg-slate-500/10',
  Medium: 'text-amber-300 border-amber-400/40 bg-amber-500/10',
  High: 'text-orange-300 border-orange-400/40 bg-orange-500/10',
  Critical: 'text-rose-300 border-rose-400/45 bg-rose-500/15',
};

export function RulesPage() {
  const { rules } = useStore();
  const sortedRules = [...rules].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <main className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div className="volex-panel rounded-2xl p-6 space-y-1">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-violet-300">
          <Gavel className="w-4 h-4" aria-hidden="true" />
          <span>Network Guidelines</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
          VOLEXMC Server &amp; Store Rules
        </h1>
        <p className="text-sm text-slate-300 max-w-2xl">
          Playing on play.volex.indevs.in or purchasing from the store indicates acceptance of these rules.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedRules.map((rule, idx) => (
          <article
            key={rule.id}
            className="volex-panel rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold text-violet-300">
                  {String(idx + 1).padStart(2, '0')}. {rule.category}
                </span>
                <h2 className="font-display text-lg font-bold text-white mt-0.5">
                  {rule.title}
                </h2>
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold shrink-0 ${
                  SEVERITY_STYLE[rule.severity] || SEVERITY_STYLE.Medium
                }`}
              >
                {rule.severity}
              </span>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              {rule.description}
            </p>

            <div className="pt-2 border-t border-white/10 flex items-center gap-2 text-xs text-slate-400">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
              <span>Penalty: <strong className="text-slate-200">{rule.punishment}</strong></span>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
