import { useMemo, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function WikiPage() {
  const { wikiArticles } = useStore();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');

  const published = useMemo(
    () =>
      wikiArticles
        .filter((a) => a.published)
        .filter((a) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return `${a.title} ${a.category} ${a.summary} ${a.content}`
            .toLowerCase()
            .includes(q);
        })
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [wikiArticles, search]
  );

  const activeArticle =
    published.find((a) => a.id === selectedId) || published[0] || null;

  return (
    <main className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div className="volex-panel rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-violet-300 mb-1">
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            <span>VOLEXMC Knowledge Base</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            Server Wiki &amp; Guides
          </h1>
        </div>

        <div className="relative w-full md:w-72">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search wiki articles..."
            aria-label="Search wiki articles"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#070918] border border-violet-500/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400"
          />
        </div>
      </div>

      {published.length === 0 ? (
        <div className="volex-panel rounded-2xl p-10 text-center text-sm text-slate-300">
          No wiki articles matched your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <aside className="lg:col-span-4 space-y-2.5">
            {published.map((article) => {
              const isActive = activeArticle?.id === article.id;
              return (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => setSelectedId(article.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-violet-600/20 border-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.25)]'
                      : 'volex-panel hover:border-violet-400/50'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-violet-300 mb-1">
                    {article.category}
                  </div>
                  <div className="font-display text-base font-bold text-white">
                    {article.title}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {article.summary}
                  </p>
                </button>
              );
            })}
          </aside>

          {activeArticle && (
            <article className="lg:col-span-8 volex-panel rounded-2xl p-6 sm:p-8 space-y-4">
              <div className="pb-4 border-b border-violet-500/20">
                <div className="text-xs font-semibold text-violet-300 mb-1">
                  {activeArticle.category}
                </div>
                <h2 className="font-display text-2xl font-extrabold text-white">
                  {activeArticle.title}
                </h2>
                <p className="text-sm text-slate-300 mt-2">
                  {activeArticle.summary}
                </p>
              </div>
              <div className="text-sm text-slate-200 leading-7 whitespace-pre-line">
                {activeArticle.content}
              </div>
            </article>
          )}
        </div>
      )}
    </main>
  );
}
