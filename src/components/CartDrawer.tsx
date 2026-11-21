import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Minus, Plus, ShoppingCart, Tag, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatInrPrice } from '../utils/storeLogic';

export function CartDrawer() {
  const {
    isCartOpen,
    closeCart,
    cartItems,
    cartCount,
    cartTotalInr,
    updateCartQty,
    removeCartProduct,
    clearCart,
    openCartCheckout,
    currency,
    formatPrice,
    appliedCoupon,
    validateCouponCode,
    clearAppliedCoupon,
  } = useStore();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const discountInr = appliedCoupon ? Math.min(appliedCoupon.discountInr, Math.max(0, cartTotalInr - 1)) : 0;
  const finalTotalInr = Math.max(0, cartTotalInr - discountInr);

  const handleApplyCoupon = async () => {
    setCouponError('');
    setCheckingCoupon(true);
    try {
      const res = await validateCouponCode(couponInput, cartTotalInr);
      if (!res.valid) {
        setCouponError(res.error || 'Invalid coupon.');
      } else {
        setCouponInput('');
      }
    } finally {
      setCheckingCoupon(false);
    }
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[75] bg-black/75 backdrop-blur-sm flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Shopping Cart"
          onClick={closeCart}
        >
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-full bg-[#090a1c] border-l border-violet-500/35 shadow-2xl flex flex-col"
          >
            <div className="p-4 sm:p-5 border-b border-violet-500/25 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-600/25 border border-violet-400/50 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-violet-200" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-white">
                    Realm Cart ({cartCount})
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Showing prices in {currency} {currency === 'NPR' ? '(Base INR)' : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Close shopping cart"
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-3">
                  <ShoppingCart className="w-10 h-10 text-violet-400/60" aria-hidden="true" />
                  <p className="font-display text-base font-bold text-white">
                    Your cart is empty
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Add ranks, crates, keys, bundles, or companions to check out together in one order.
                  </p>
                </div>
              ) : (
                cartItems.map(({ product, quantity }) => (
                  <div
                    key={product.id}
                    className="p-3 rounded-xl bg-[#0f1129] border border-violet-500/25 flex items-center gap-3"
                  >
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-14 rounded-lg object-cover border border-white/15 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-sm font-bold text-white truncate">
                        {product.name}
                      </div>
                      <div className="text-xs font-mono-nums text-amber-300">
                        {formatPrice(product.priceInr * quantity)}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="inline-flex items-center gap-1 bg-[#070918] border border-white/15 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => updateCartQty(product.id, quantity - 1)}
                            aria-label={`Decrease ${product.name} quantity`}
                            className="p-1 rounded hover:bg-white/10 text-slate-200 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center font-mono-nums text-xs font-bold text-white">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(product.id, quantity + 1)}
                            aria-label={`Increase ${product.name} quantity`}
                            className="p-1 rounded hover:bg-white/10 text-slate-200 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeCartProduct(product.id)}
                          aria-label={`Remove ${product.name}`}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-300 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="p-4 sm:p-5 border-t border-violet-500/25 bg-[#070816] space-y-3">
                {/* Coupon Input */}
                <div className="space-y-1.5">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/35 text-xs text-emerald-200">
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <Tag className="w-3.5 h-3.5" />
                        {appliedCoupon.code} (-{formatPrice(discountInr)})
                      </span>
                      <button
                        type="button"
                        onClick={clearAppliedCoupon}
                        className="text-slate-300 hover:text-white cursor-pointer text-[11px]"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Promo code (e.g. VOLEX10)"
                        className="flex-1 px-3 py-2 rounded-xl bg-[#0e1129] border border-violet-500/30 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400"
                      />
                      <button
                        type="button"
                        disabled={checkingCoupon || !couponInput.trim()}
                        onClick={() => void handleApplyCoupon()}
                        className="px-3 py-2 rounded-xl bg-violet-600/35 hover:bg-violet-600/55 border border-violet-400/40 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                  {couponError && <p className="text-[11px] text-rose-300">{couponError}</p>}
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Total ({cartCount} items)</span>
                    <span className="font-mono-nums text-lg font-extrabold text-amber-300">
                      {formatPrice(finalTotalInr)}
                    </span>
                  </div>
                  {currency === 'NPR' && (
                    <p className="text-right text-[10px] font-mono-nums text-slate-400">
                      Base billing total: {formatInrPrice(finalTotalInr)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={clearCart}
                    className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={openCartCheckout}
                    className="flex-1 volex-glow-btn py-2.5 px-4 rounded-xl text-xs font-bold text-white inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
