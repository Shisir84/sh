import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  Loader2,
  QrCode,
  ShieldCheck,
  Tag,
  Upload,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useToast } from './ToastProvider';
import type { OrderItem } from '../types/store';
import {
  buildOrderReceiptText,
  calculateCartSummary,
  formatInrPrice,
  getEnabledPaymentMethods,
  validateMinecraftUsername,
} from '../utils/storeLogic';
import { compressImageToDataUrl } from '../utils/imageHelpers';

export function PurchaseModal() {
  const {
    selectedProduct,
    checkoutItems,
    isCartCheckout,
    closeCheckout,
    paymentMethods,
    user,
    userProfile,
    signInWithGoogle,
    submitOrder,
    submitCartOrder,
    currency,
    nprPerInrRate,
    formatPrice,
    appliedCoupon,
    validateCouponCode,
    clearAppliedCoupon,
    storeSettings,
  } = useStore();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const enabledMethods = useMemo(
    () => getEnabledPaymentMethods(paymentMethods),
    [paymentMethods]
  );

  const activeItems = useMemo(() => {
    if (checkoutItems.length > 0) return checkoutItems;
    return selectedProduct ? [{ product: selectedProduct, quantity: 1 }] : [];
  }, [checkoutItems, selectedProduct]);

  const summary = useMemo(() => calculateCartSummary(activeItems), [activeItems]);

  const [mcUsername, setMcUsername] = useState('');
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [proofName, setProofName] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderItem | null>(null);

  useEffect(() => {
    if (selectedProduct || checkoutItems.length > 0) {
      setMcUsername(userProfile?.minecraftUsername || '');
      setSelectedMethodId(enabledMethods[0]?.id || '');
      setTransactionRef('');
      setProofUrl('');
      setProofName('');
      setCouponError('');
      setError('');
      setConfirmedOrder(null);
    }
  }, [selectedProduct, checkoutItems.length, userProfile?.minecraftUsername, enabledMethods]);

  const isOpen = Boolean(selectedProduct || checkoutItems.length > 0);
  const activeMethod = enabledMethods.find((m) => m.id === selectedMethodId) || enabledMethods[0];
  const displayProduct = activeItems[0]?.product || selectedProduct;

  const discountInr = appliedCoupon
    ? Math.min(appliedCoupon.discountInr, Math.max(0, summary.totalInr - 1))
    : 0;
  const finalTotalInr = Math.max(1, summary.totalInr - discountInr);

  const handleApplyCoupon = async () => {
    setCouponError('');
    setApplyingCoupon(true);
    try {
      const res = await validateCouponCode(couponInput, summary.totalInr);
      if (!res.valid) {
        setCouponError(res.error || 'Invalid coupon.');
      } else {
        setCouponInput('');
        showToast({ tone: 'success', title: `Promo applied (-${formatPrice(res.discountInr)})` });
      }
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadingProof(true);
    try {
      const compressed = await compressImageToDataUrl(file, 960, 320_000);
      setProofUrl(compressed);
      setProofName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process screenshot.');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (storeSettings.maintenanceMode) {
      setError('Store checkout is temporarily paused during scheduled realm maintenance.');
      return;
    }

    const usernameCheck = validateMinecraftUsername(mcUsername);
    if (!usernameCheck.valid) {
      setError(usernameCheck.error || 'Enter a valid Minecraft username.');
      return;
    }

    if (!activeMethod) {
      setError('No payment methods are currently enabled.');
      return;
    }

    if (!proofUrl) {
      setError('Please upload a payment proof screenshot before submitting.');
      return;
    }

    if (!user) {
      setError('Please sign in with Google below so your order can be saved to your account.');
      return;
    }

    setSubmitting(true);
    try {
      const order =
        isCartCheckout || activeItems.length > 1 || (activeItems[0]?.quantity || 1) > 1
          ? await submitCartOrder({
              minecraftUsername: usernameCheck.cleaned,
              items: activeItems,
              paymentMethod: activeMethod,
              paymentProofUrl: proofUrl,
              transactionRef,
              couponCode: appliedCoupon?.code,
              discountInr,
            })
          : await submitOrder({
              minecraftUsername: usernameCheck.cleaned,
              product: displayProduct!,
              paymentMethod: activeMethod,
              paymentProofUrl: proofUrl,
              transactionRef,
              couponCode: appliedCoupon?.code,
              discountInr,
            });
      setConfirmedOrder(order);
      showToast({
        tone: 'success',
        title: 'Purchase request submitted!',
        description: `Order ${order.id} is Pending staff verification.`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyAccount = async (val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleDownloadReceipt = (order: OrderItem) => {
    const text = buildOrderReceiptText(order, currency, nprPerInrRate);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `volexmc-receipt-${order.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {isOpen && displayProduct && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2 }}
            className="volex-panel rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-4 sm:p-5 relative"
          >
            <button
              type="button"
              onClick={closeCheckout}
              aria-label="Close purchase modal"
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {confirmedOrder ? (
              <div className="py-4 text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-400/50 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-9 h-9 text-violet-300" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="checkout-modal-title" className="font-display text-2xl font-bold text-white">
                    Order Submitted for Verification
                  </h2>
                  <p className="text-sm text-slate-300 mt-1.5 max-w-md mx-auto">
                    Your payment proof has been recorded. Staff verify all screenshots manually before automated Paper 1.21.6 delivery.
                  </p>
                </div>

                <div className="rounded-xl bg-[#070918] border border-violet-500/25 p-4 text-left space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Order ID</span>
                    <span className="font-mono-nums text-white font-semibold">{confirmedOrder.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Items</span>
                    <span className="text-white font-semibold">{confirmedOrder.productName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Minecraft Username</span>
                    <span className="font-mono-nums text-cyan-300">{confirmedOrder.minecraftUsername}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment Method</span>
                    <span className="text-white">{confirmedOrder.paymentMethodName}</span>
                  </div>
                  {confirmedOrder.couponCode && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Promo ({confirmedOrder.couponCode})</span>
                      <span className="font-mono-nums text-emerald-300">
                        -{formatPrice(confirmedOrder.discountInr || 0)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Paid</span>
                    <span className="font-mono-nums text-amber-300 font-bold">
                      {formatPrice(confirmedOrder.amountInr)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <span className="text-slate-400">Current Status</span>
                    <span className="font-semibold text-amber-300">
                      {confirmedOrder.status} (Awaiting Staff Review)
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadReceipt(confirmedOrder)}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/35 text-cyan-200 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeCheckout();
                      navigate('/orders');
                    }}
                    className="volex-glow-btn px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer"
                  >
                    View Order History
                  </button>
                  <button
                    type="button"
                    onClick={closeCheckout}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 text-slate-200 cursor-pointer"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Selected Product / Cart Header */}
                <div className="flex items-center gap-3.5 pr-10 pb-3 border-b border-violet-500/20">
                  <img
                    src={displayProduct.imageUrl}
                    alt={displayProduct.name}
                    referrerPolicy="no-referrer"
                    className="w-20 h-16 rounded-xl object-cover border border-violet-500/30 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-violet-300">
                      {activeItems.length > 1
                        ? `Cart Checkout (${summary.itemCount} items)`
                        : displayProduct.category}
                    </p>
                    <h2 id="checkout-modal-title" className="font-display text-xl font-bold text-white truncate">
                      {activeItems.length > 1
                        ? `${displayProduct.name} + ${activeItems.length - 1} more`
                        : activeItems[0].quantity > 1
                          ? `${displayProduct.name} x${activeItems[0].quantity}`
                          : displayProduct.name}
                    </h2>
                    <p className="text-xs text-slate-300 truncate">{displayProduct.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11px] text-slate-400">Total Due</div>
                    <div className="font-mono-nums text-lg font-bold text-amber-300">
                      {formatPrice(finalTotalInr)}
                    </div>
                    {currency === 'NPR' && (
                      <div className="text-[10px] font-mono-nums text-slate-400">
                        Base: {formatInrPrice(finalTotalInr)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Promo Code Box */}
                <div className="rounded-xl bg-[#070918]/80 border border-white/10 p-3 space-y-1.5">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between text-xs text-emerald-300">
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <Tag className="w-3.5 h-3.5" />
                        Promo {appliedCoupon.code} applied (-{formatPrice(discountInr)})
                      </span>
                      <button
                        type="button"
                        onClick={clearAppliedCoupon}
                        className="text-slate-400 hover:text-white cursor-pointer"
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
                        placeholder="Promo code (e.g. VOLEX10 or CITADEL50)"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-[#0d1128] border border-violet-500/25 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400"
                      />
                      <button
                        type="button"
                        disabled={applyingCoupon || !couponInput.trim()}
                        onClick={() => void handleApplyCoupon()}
                        className="px-3 py-1.5 rounded-lg bg-violet-600/35 hover:bg-violet-600/55 border border-violet-400/40 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
                      >
                        {applyingCoupon ? 'Checking...' : 'Apply'}
                      </button>
                    </div>
                  )}
                  {couponError && <p className="text-[11px] text-rose-300">{couponError}</p>}
                </div>

                {/* Step 1: Minecraft Username */}
                <div>
                  <label
                    htmlFor="checkout-mc-username"
                    className="block text-xs font-semibold text-slate-200 mb-1.5"
                  >
                    1. Minecraft Username (Java 1.21.6)
                  </label>
                  <input
                    id="checkout-mc-username"
                    type="text"
                    required
                    value={mcUsername}
                    onChange={(e) => setMcUsername(e.target.value)}
                    placeholder="Enter your exact IGN (e.g. Steve_99)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070918] border border-violet-500/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400"
                  />
                </div>

                {/* Step 2: Select Payment Method */}
                <div>
                  <span className="block text-xs font-semibold text-slate-200 mb-2">
                    2. Select Supported Payment Method
                  </span>
                  {enabledMethods.length === 0 ? (
                    <p className="text-xs text-rose-300 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                      No payment methods are configured yet. Please contact an administrator.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {enabledMethods.map((method) => {
                        const active = activeMethod?.id === method.id;
                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setSelectedMethodId(method.id)}
                            className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              active
                                ? 'bg-violet-600/25 border-violet-400 text-white shadow-[0_0_16px_rgba(139,92,246,0.35)]'
                                : 'bg-[#070918] border-white/10 text-slate-300 hover:border-violet-500/40'
                            }`}
                          >
                            {method.type === 'qr' ? (
                              <QrCode className="w-3.5 h-3.5 text-violet-300" aria-hidden="true" />
                            ) : (
                              <CreditCard className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
                            )}
                            <span>{method.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Step 3: Payment Instructions & QR Display */}
                {activeMethod && (
                  <div className="rounded-xl bg-[#070918] border border-violet-500/30 p-4 flex flex-col sm:flex-row gap-4 items-center">
                    {activeMethod.qrImageUrl && (
                      <div className="shrink-0 bg-white p-1.5 rounded-xl shadow-lg">
                        <img
                          src={activeMethod.qrImageUrl}
                          alt={`${activeMethod.name} Payment QR Code`}
                          referrerPolicy="no-referrer"
                          className="w-28 h-28 object-contain"
                        />
                      </div>
                    )}
                    <div className="flex-1 space-y-2 text-xs text-slate-300">
                      <div className="font-semibold text-white text-sm">
                        Pay {formatPrice(finalTotalInr)} via {activeMethod.name}
                      </div>
                      <p className="leading-relaxed">{activeMethod.instructions}</p>
                      {activeMethod.accountValue && (
                        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#0d1128] border border-violet-500/25">
                          <div className="min-w-0">
                            <span className="text-[11px] text-slate-400 block">
                              {activeMethod.accountLabel || 'Account Details'}
                            </span>
                            <span className="font-mono-nums text-xs text-cyan-300 font-semibold truncate block">
                              {activeMethod.accountValue}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyAccount(activeMethod.accountValue || '')}
                            className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[11px] text-slate-200 inline-flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <Copy className="w-3 h-3" aria-hidden="true" />
                            <span>{copiedId ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 4: Upload Proof & Reference */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="checkout-proof-upload"
                      className="block text-xs font-semibold text-slate-200 mb-1.5"
                    >
                      3. Upload Payment Proof Screenshot
                    </label>
                    <label
                      htmlFor="checkout-proof-upload"
                      className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#070918] border border-dashed border-violet-500/45 hover:border-violet-400 text-xs text-slate-200 cursor-pointer transition-colors"
                    >
                      {uploadingProof ? (
                        <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                      ) : (
                        <Upload className="w-4 h-4 text-violet-400" aria-hidden="true" />
                      )}
                      <span className="truncate">
                        {proofName ? proofName : 'Choose screenshot (PNG/JPG)'}
                      </span>
                    </label>
                    <input
                      id="checkout-proof-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                    {proofUrl && (
                      <div className="mt-2 flex items-center gap-2">
                        <img
                          src={proofUrl}
                          alt="Uploaded payment proof preview"
                          className="w-12 h-12 rounded-lg object-cover border border-violet-500/40"
                        />
                        <span className="text-[11px] text-emerald-300">
                          Screenshot attached — ready for review
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="checkout-txn-ref"
                      className="block text-xs font-semibold text-slate-200 mb-1.5"
                    >
                      4. Transaction ID / UTR (Optional)
                    </label>
                    <input
                      id="checkout-txn-ref"
                      type="text"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="e.g. TXN8829104"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#070918] border border-violet-500/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400"
                    />
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/35 text-xs text-rose-200"
                  >
                    {error}
                  </div>
                )}

                {!user && (
                  <div className="p-3.5 rounded-xl bg-violet-600/15 border border-violet-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-xs text-violet-100">
                      Sign in with Google to bind this purchase to your account and track status updates.
                    </span>
                    <button
                      type="button"
                      onClick={() => void signInWithGoogle()}
                      className="px-4 py-2 rounded-lg bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                    >
                      Sign in with Google
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0" aria-hidden="true" />
                    <span>Manual staff proof verification protects every transaction</span>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || uploadingProof || !activeMethod}
                    className="volex-glow-btn px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 cursor-pointer w-full sm:w-auto inline-flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Submit Purchase Request</span>
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
