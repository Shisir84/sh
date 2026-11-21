import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Minus, Plus, ShoppingCart, Sparkles, X, Zap } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useToast } from './ToastProvider';

export function ProductDetailModal() {
  const {
    detailProduct,
    closeProductDetail,
    addProductToCart,
    openCheckout,
    openCart,
    formatPrice,
  } = useStore();
  const { showToast } = useToast();
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setQty(1);
  }, [detailProduct?.id]);

  return (
    <AnimatePresence>
      {detailProduct && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/82 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-detail-title"
          onClick={closeProductDetail}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 14 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="volex-panel rounded-2xl max-w-xl w-full overflow-hidden relative"
          >
            <button
              type="button"
              onClick={closeProductDetail}
              aria-label="Close product details"
              className="absolute top-3.5 right-3.5 z-10 p-2 rounded-lg bg-black/55 hover:bg-black/80 text-slate-200 hover:text-white border border-white/15 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative h-52 sm:h-60 bg-[#070918] overflow-hidden">
              <img
                src={detailProduct.imageUrl}
                alt={detailProduct.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d24] via-transparent to-transparent" />
              {detailProduct.badge && (
                <span className="absolute top-3.5 left-3.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wider bg-violet-600/90 border border-violet-300/60 text-white shadow-[0_0_16px_rgba(147,51,234,0.6)]">
                  {detailProduct.badge}
                </span>
              )}
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">
                    {detailProduct.category}
                  </span>
                  <h2
                    id="product-detail-title"
                    className="font-display text-2xl font-extrabold text-white mt-0.5"
                  >
                    {detailProduct.name}
                  </h2>
                  <p className="text-sm text-slate-300 mt-1">{detailProduct.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-slate-400">Price</div>
                  <div className="font-mono-nums text-xl font-extrabold text-amber-300">
                    {formatPrice(detailProduct.priceInr)}
                  </div>
                </div>
              </div>

              {detailProduct.perks && detailProduct.perks.length > 0 && (
                <div className="rounded-xl bg-[#070918]/90 border border-violet-500/25 p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-violet-200 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                      <span>Included Perks &amp; Rewards</span>
                    </div>
                    <Link
                      to={`/store/${encodeURIComponent(detailProduct.id)}`}
                      onClick={closeProductDetail}
                      className="text-[11px] font-semibold text-cyan-300 hover:text-white"
                    >
                      Open Full Page →
                    </Link>
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-200">
                    {detailProduct.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2 bg-[#070918] border border-violet-500/30 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="p-2 rounded-lg hover:bg-white/10 text-slate-200 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-7 text-center font-mono-nums text-sm font-bold text-white">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(10, q + 1))}
                    aria-label="Increase quantity"
                    className="p-2 rounded-lg hover:bg-white/10 text-slate-200 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-1 sm:flex-initial items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      addProductToCart(detailProduct, qty);
                      showToast({
                        tone: 'success',
                        title: `Added ${detailProduct.name} x${qty} to cart`,
                        description: 'Open your cart anytime to review or checkout.',
                      });
                      closeProductDetail();
                      openCart();
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/15 border border-violet-400/40 text-xs font-bold text-white inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5 text-violet-300" aria-hidden="true" />
                    <span>Add to Cart</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      closeProductDetail();
                      openCheckout(detailProduct);
                    }}
                    className="flex-1 sm:flex-initial volex-glow-btn px-5 py-2.5 rounded-xl text-xs font-bold text-white inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                    <span>Buy Now</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
