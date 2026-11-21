import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  GitCompare,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useToast } from '../components/ToastProvider';
import { ProductCard } from '../components/ProductCard';
import { formatInrPrice } from '../utils/storeLogic';

export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const {
    products,
    addProductToCart,
    openCheckout,
    openCart,
    formatPrice,
    currency,
    wishlistIds,
    toggleWishlist,
    compareIds,
    toggleCompareProduct,
  } = useStore();
  const { showToast } = useToast();
  const [qty, setQty] = useState(1);

  const product = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId]
  );

  const related = useMemo(() => {
    if (!product) return [];
    return products
      .filter((p) => p.active && p.id !== product.id && p.category === product.category)
      .concat(products.filter((p) => p.active && p.id !== product.id && p.category !== product.category))
      .slice(0, 4);
  }, [products, product]);

  if (!product) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="volex-panel rounded-2xl p-8 space-y-4">
          <h1 className="font-display text-2xl font-bold text-white">Product Not Found</h1>
          <p className="text-sm text-slate-300">
            This store item may have rotated out of season or been moved.
          </p>
          <Link
            to="/store"
            className="volex-glow-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Catalog</span>
          </Link>
        </div>
      </main>
    );
  }

  const isWishlisted = wishlistIds.includes(product.id);
  const isCompared = compareIds.includes(product.id);
  const outOfStock = typeof product.stock === 'number' && product.stock <= 0;
  const specEntries = product.compareSpecs ? Object.entries(product.compareSpecs) : [];

  return (
    <main className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/store"
          className="inline-flex items-center gap-2 text-xs font-semibold text-violet-300 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Full Store</span>
        </Link>
        <span className="text-xs text-slate-400">
          Catalog / <span className="text-violet-300">{product.category}</span>
        </span>
      </div>

      <section className="volex-panel rounded-2xl p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Artwork */}
        <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-violet-500/35 bg-[#070918]">
          <img
            src={product.imageUrl}
            alt={product.name}
            referrerPolicy="no-referrer"
            className="w-full aspect-[4/3] object-cover"
          />
          {product.badge && (
            <span className="absolute top-3.5 left-3.5 px-3 py-1 rounded-lg bg-violet-600/90 border border-violet-300/60 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg">
              {product.badge}
            </span>
          )}
        </div>

        {/* Details & Specs */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-violet-300">
                {product.category}
              </span>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white mt-1">
                {product.name}
              </h1>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed max-w-xl">
                {product.description}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Store Price</div>
              <div className="font-mono-nums text-2xl sm:text-3xl font-extrabold text-amber-300">
                {formatPrice(product.priceInr)}
              </div>
              {currency === 'NPR' && (
                <div className="text-[11px] font-mono-nums text-slate-400">
                  Base: {formatInrPrice(product.priceInr)}
                </div>
              )}
              {typeof product.stock === 'number' && (
                <div className={`text-xs font-semibold mt-1 ${outOfStock ? 'text-rose-400' : 'text-emerald-300'}`}>
                  {outOfStock ? 'Out of Stock' : `${product.stock} remaining this season`}
                </div>
              )}
            </div>
          </div>

          {product.perks && product.perks.length > 0 && (
            <div className="rounded-xl bg-[#070918]/90 border border-violet-500/25 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-violet-200 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-300" aria-hidden="true" />
                <span>Included In-Game Perks &amp; Rewards</span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-200">
                {product.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {specEntries.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {specEntries.map(([key, val]) => (
                <div
                  key={key}
                  className="p-3 rounded-xl bg-[#070918]/80 border border-white/10"
                >
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">{key}</div>
                  <div className="text-xs font-bold text-white mt-0.5">{val}</div>
                </div>
              ))}
            </div>
          )}

          {/* Purchase Controls */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2 bg-[#070918] border border-violet-500/30 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="p-2 rounded-lg hover:bg-white/10 text-slate-200 cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-mono-nums text-sm font-bold text-white">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(10, q + 1))}
                aria-label="Increase quantity"
                className="p-2 rounded-lg hover:bg-white/10 text-slate-200 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              disabled={outOfStock}
              onClick={() => {
                addProductToCart(product, qty);
                showToast({
                  tone: 'success',
                  title: `Added ${product.name} x${qty} to cart`,
                });
                openCart();
              }}
              className="px-5 py-3 rounded-xl bg-white/8 hover:bg-white/15 border border-violet-400/40 text-xs sm:text-sm font-bold text-white inline-flex items-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <ShoppingCart className="w-4 h-4 text-violet-300" />
              <span>Add to Cart</span>
            </button>

            <button
              type="button"
              disabled={outOfStock}
              onClick={() => openCheckout(product)}
              className="volex-glow-btn px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-white inline-flex items-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>{outOfStock ? 'Sold Out' : 'Buy Now'}</span>
            </button>

            <button
              type="button"
              onClick={() => void toggleWishlist(product.id)}
              className={`px-3.5 py-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                isWishlisted
                  ? 'bg-pink-600/25 border-pink-400 text-pink-200'
                  : 'bg-white/5 border-white/15 text-slate-200 hover:bg-white/10'
              }`}
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
              <span>{isWishlisted ? 'Saved' : 'Wishlist'}</span>
            </button>

            <button
              type="button"
              onClick={() => toggleCompareProduct(product.id)}
              className={`px-3.5 py-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                isCompared
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                  : 'bg-white/5 border-white/15 text-slate-200 hover:bg-white/10'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              <span>{isCompared ? 'Comparing' : 'Compare'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Delivered to play.volex.indevs.in (Java 1.21.6) after staff verification.
            </span>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-white">Related Realm Upgrades</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} onBuy={openCheckout} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
