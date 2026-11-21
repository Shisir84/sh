import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { GitCompare, Heart, Info, ShoppingCart, Sparkles } from 'lucide-react';
import type { AccentColor, ProductBadge, ProductItem } from '../types/store';
import { useStore } from '../context/StoreContext';
import { useToast } from './ToastProvider';

const ACCENT_MAP: Record<
  AccentColor,
  {
    border: string;
    glow: string;
    priceText: string;
    button: string;
  }
> = {
  gold: {
    border: 'border-amber-400/35 hover:border-amber-400/80',
    glow: 'hover:shadow-[0_18px_40px_-12px_rgba(245,158,11,0.48)]',
    priceText: 'text-amber-300',
    button:
      'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold shadow-[0_0_18px_rgba(245,158,11,0.35)]',
  },
  cyan: {
    border: 'border-cyan-400/35 hover:border-cyan-400/80',
    glow: 'hover:shadow-[0_18px_40px_-12px_rgba(34,211,238,0.48)]',
    priceText: 'text-cyan-300',
    button:
      'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold shadow-[0_0_18px_rgba(34,211,238,0.35)]',
  },
  purple: {
    border: 'border-violet-400/35 hover:border-violet-400/85',
    glow: 'hover:shadow-[0_18px_40px_-12px_rgba(147,51,234,0.55)]',
    priceText: 'text-violet-300',
    button: 'volex-glow-btn text-white font-semibold',
  },
  pink: {
    border: 'border-pink-400/35 hover:border-pink-400/80',
    glow: 'hover:shadow-[0_18px_40px_-12px_rgba(236,72,153,0.48)]',
    priceText: 'text-pink-300',
    button:
      'bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-semibold shadow-[0_0_18px_rgba(236,72,153,0.35)]',
  },
};

const BADGE_STYLE: Record<Exclude<ProductBadge, ''>, string> = {
  Popular: 'bg-amber-500/90 text-slate-950 border-amber-200/70',
  Limited: 'bg-fuchsia-600/90 text-white border-pink-300/70',
  'Best Value': 'bg-cyan-500/90 text-slate-950 border-cyan-200/70',
};

export function ProductCard({
  product,
  onBuy,
}: {
  product: ProductItem;
  onBuy: (product: ProductItem) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const {
    openProductDetail,
    addProductToCart,
    formatPrice,
    wishlistIds,
    toggleWishlist,
    compareIds,
    toggleCompareProduct,
    publishedWebsite,
  } = useStore();
  const { showToast } = useToast();
  const style = ACCENT_MAP[product.accentColor] || ACCENT_MAP.purple;
  const isWishlisted = wishlistIds.includes(product.id);
  const isCompared = compareIds.includes(product.id);
  const outOfStock = typeof product.stock === 'number' && product.stock <= 0;

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!publishedWebsite.theme.animationsEnabled) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: Math.round(-py * 7 * 10) / 10, ry: Math.round(px * 7 * 10) / 10 });
  };

  return (
    <motion.article
      data-cursor="card"
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.28 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
      style={{
        transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
      }}
      className={`group rounded-2xl bg-[#0c0f24]/92 border ${style.border} ${style.glow} transition-all duration-200 hover:-translate-y-1.5 flex flex-col overflow-hidden relative`}
    >
      <div className="relative aspect-[4/3] w-full bg-[#070917] overflow-hidden">
        <Link to={`/store/${encodeURIComponent(product.id)}`} className="block w-full h-full">
          {!imgError && product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-950 via-[#0e1330] to-indigo-950 flex flex-col items-center justify-center p-4 text-center">
              <Sparkles className="w-8 h-8 text-violet-400 mb-2" aria-hidden="true" />
              <span className="text-xs font-semibold text-violet-200">{product.name}</span>
            </div>
          )}
        </Link>
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#0c0f24] via-transparent to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {product.badge && (
          <span
            className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md border text-[10px] font-extrabold uppercase tracking-wider shadow-lg ${
              BADGE_STYLE[product.badge]
            }`}
          >
            {product.badge}
          </span>
        )}

        <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
          <button
            type="button"
            onClick={() => void toggleWishlist(product.id)}
            aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isWishlisted
                ? 'bg-pink-600/85 border-pink-300/70 text-white'
                : 'bg-[#080a1c]/80 hover:bg-pink-600/60 border-white/15 text-slate-200 hover:text-white'
            }`}
            title="Wishlist"
          >
            <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-current' : ''}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => toggleCompareProduct(product.id)}
            aria-label={isCompared ? `Remove ${product.name} from comparison` : `Compare ${product.name}`}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isCompared
                ? 'bg-cyan-500/85 border-cyan-200/80 text-slate-950'
                : 'bg-[#080a1c]/80 hover:bg-cyan-600/60 border-white/15 text-slate-200 hover:text-white'
            }`}
            title="Compare specs"
          >
            <GitCompare className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => openProductDetail(product)}
            aria-label={`Quick view ${product.name}`}
            className="p-1.5 rounded-lg bg-[#080a1c]/80 hover:bg-violet-600/80 border border-white/15 text-slate-200 hover:text-white transition-colors cursor-pointer"
            title="Quick view"
          >
            <Info className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-[11px] font-medium text-slate-400">{product.category}</p>
            {typeof product.stock === 'number' && (
              <span className={`text-[10px] font-semibold ${outOfStock ? 'text-rose-400' : 'text-amber-300'}`}>
                {outOfStock ? 'Sold Out' : `${product.stock} left`}
              </span>
            )}
          </div>
          <Link
            to={`/store/${encodeURIComponent(product.id)}`}
            className="font-display text-base font-bold tracking-wide text-white hover:text-violet-300 leading-snug block transition-colors"
          >
            {product.name}
          </Link>
          <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        <div className="pt-2 border-t border-white/10 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className={`font-mono-nums text-base font-bold ${style.priceText}`}>
              {formatPrice(product.priceInr)}
            </div>
            <Link
              to={`/store/${encodeURIComponent(product.id)}`}
              className="text-[11px] font-semibold text-violet-300 hover:text-white"
            >
              View Page
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={outOfStock}
              onClick={() => {
                addProductToCart(product, 1);
                showToast({
                  tone: 'success',
                  title: `${product.name} added to cart`,
                });
              }}
              aria-label={`Add ${product.name} to cart`}
              title="Add to Cart"
              className="p-2.5 rounded-xl bg-white/5 hover:bg-violet-600/25 border border-violet-500/30 text-violet-200 hover:text-white transition-colors cursor-pointer shrink-0 disabled:opacity-40"
            >
              <ShoppingCart className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={outOfStock}
              onClick={() => onBuy(product)}
              aria-label={`Buy Now ${product.name}`}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm tracking-wide transition-all cursor-pointer whitespace-nowrap disabled:opacity-40 ${style.button}`}
            >
              {outOfStock ? 'Out of Stock' : 'Buy Now'}
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
