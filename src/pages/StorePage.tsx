import { useMemo, useState } from 'react';
import { Search, ShoppingBag } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CategoryIcon } from '../components/CategoryIcon';
import { ProductCard } from '../components/ProductCard';
import { filterStoreProducts } from '../utils/storeLogic';

export function StorePage() {
  const { categories, products, openCheckout } = useStore();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const activeCategories = useMemo(
    () => categories.filter((c) => c.active).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const filteredProducts = useMemo(
    () =>
      filterStoreProducts(products, {
        category: selectedCategory,
        search: searchQuery,
      }),
    [products, selectedCategory, searchQuery]
  );

  return (
    <main className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div className="volex-panel rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-violet-300">
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            <span>VOLEXMC Official Catalog</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            All Server Ranks, Crates &amp; Companions
          </h1>
          <p className="text-sm text-slate-300">
            Browse every item across Ranks, Keys, Crates, Pets, Cosmetics, and Economy bundles.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ranks, crates, pets..."
            aria-label="Search store products"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#070918] border border-violet-500/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400"
          />
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            selectedCategory === 'all'
              ? 'volex-glow-btn text-white'
              : 'bg-[#0c0f24] border border-violet-500/25 text-slate-300 hover:text-white hover:border-violet-400/50'
          }`}
        >
          All Items
        </button>
        {activeCategories.map((cat) => {
          const active = selectedCategory.toLowerCase() === cat.name.toLowerCase();
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                active
                  ? 'volex-glow-btn text-white'
                  : 'bg-[#0c0f24] border border-violet-500/25 text-slate-300 hover:text-white hover:border-violet-400/50'
              }`}
            >
              <CategoryIcon icon={cat.icon} className="w-3.5 h-3.5" />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="volex-panel rounded-2xl p-12 text-center space-y-3">
          <p className="text-base font-semibold text-white">No matching products found</p>
          <p className="text-xs text-slate-400">
            Try clearing your search or choosing another category.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="volex-glow-btn px-5 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onBuy={openCheckout}
            />
          ))}
        </div>
      )}
    </main>
  );
}
