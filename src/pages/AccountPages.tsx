import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Crown,
  ExternalLink,
  History,
  LayoutDashboard,
  LogOut,
  PackageCheck,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useToast } from '../components/ToastProvider';
import type { OrderStatus } from '../types/store';
import { formatInrPrice, validateMinecraftUsername } from '../utils/storeLogic';

const STATUS_STYLE: Record<OrderStatus, string> = {
  Pending: 'bg-amber-500/15 border-amber-400/40 text-amber-300',
  'Under Review': 'bg-violet-500/20 border-violet-400/45 text-violet-200',
  Approved: 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300',
  Delivered: 'bg-emerald-500/15 border-emerald-400/45 text-emerald-300',
  Rejected: 'bg-rose-500/15 border-rose-400/45 text-rose-300',
};

export function DashboardPage() {
  const {
    user,
    userProfile,
    isAdmin,
    orders,
    supportTickets,
    updateMinecraftUsername,
    signInWithGoogle,
    logout,
  } = useStore();
  const { showToast } = useToast();
  const [ign, setIgn] = useState(userProfile?.minecraftUsername || '');
  const [savedMsg, setSavedMsg] = useState('');
  const [errMsg, setErrMsg] = useState('');

  const purchasedOrders = useMemo(
    () => orders.filter((o) => o.status === 'Approved' || o.status === 'Delivered'),
    [orders]
  );

  if (!user) {
    return (
      <main className="max-w-lg mx-auto px-4 py-14 text-center">
        <div className="volex-panel rounded-2xl p-8 space-y-4">
          <h1 className="font-display text-2xl font-bold text-white">Player Dashboard</h1>
          <p className="text-sm text-slate-300">
            Sign in with Google to view your player profile, linked IGN, purchased ranks, and store orders.
          </p>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="volex-glow-btn px-6 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer"
          >
            Sign in with Google
          </button>
        </div>
      </main>
    );
  }

  const handleSaveIgn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMsg('');
    setErrMsg('');
    const check = validateMinecraftUsername(ign);
    if (!check.valid) {
      setErrMsg(check.error || 'Invalid Minecraft username.');
      return;
    }
    try {
      await updateMinecraftUsername(check.cleaned);
      setSavedMsg('Minecraft username saved!');
      showToast({
        tone: 'success',
        title: 'Minecraft IGN linked',
        description: `Active username set to ${check.cleaned}`,
      });
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Update failed.');
    }
  };

  return (
    <main className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-6">
      {/* Player Profile Header */}
      <div className="volex-panel rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Player'}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-2xl object-cover border border-violet-400/50"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-violet-700 flex items-center justify-center">
              <UserIcon className="w-7 h-7 text-white" />
            </div>
          )}
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-violet-300">
              <LayoutDashboard className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Player Account · {userProfile?.status || 'Active'}</span>
            </div>
            <h1 className="font-display text-2xl font-extrabold text-white">
              {user.displayName}
            </h1>
            <p className="text-xs text-slate-400">
              {user.email}
              {userProfile?.minecraftUsername
                ? ` · IGN: ${userProfile.minecraftUsername}`
                : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/orders"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white inline-flex items-center gap-1.5"
          >
            <History className="w-3.5 h-3.5 text-cyan-300" />
            <span>Order History ({orders.length})</span>
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="volex-glow-btn px-4 py-2 rounded-xl text-xs font-bold text-white inline-flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>Open Admin Dashboard</span>
            </Link>
          )}
        </div>
      </div>

      {/* KPI & Settings Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <section className="volex-panel rounded-2xl p-5 space-y-4">
          <h2 className="font-display text-base font-bold text-white">
            Account Settings &amp; Linked IGN
          </h2>
          <form onSubmit={handleSaveIgn} className="space-y-3">
            <input
              type="text"
              value={ign}
              onChange={(e) => setIgn(e.target.value)}
              placeholder={userProfile?.minecraftUsername || 'Enter Java IGN'}
              aria-label="Linked Minecraft Username"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070918] border border-violet-500/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400"
            />
            {savedMsg && <p className="text-xs text-emerald-300">{savedMsg}</p>}
            {errMsg && <p className="text-xs text-rose-300">{errMsg}</p>}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="volex-glow-btn flex-1 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer"
              >
                Save Username
              </button>
              <button
                type="button"
                onClick={() => void logout()}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 text-xs font-semibold text-rose-300 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </div>
          </form>
        </section>

        <section className="volex-panel rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
            <Clock className="w-4 h-4" aria-hidden="true" />
            <span>Orders Summary</span>
          </div>
          <div className="font-display text-3xl font-extrabold text-white font-mono-nums">
            {orders.length}
          </div>
          <p className="text-xs text-slate-400">
            {orders.filter((o) => o.status === 'Delivered').length} delivered ·{' '}
            {orders.filter((o) => o.status === 'Pending' || o.status === 'Under Review').length} awaiting review
          </p>
          <Link to="/orders" className="inline-block pt-2 text-xs font-semibold text-violet-300 hover:text-white">
            Inspect all orders →
          </Link>
        </section>

        <section className="volex-panel rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-violet-300">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            <span>Support Requests</span>
          </div>
          <div className="font-display text-3xl font-extrabold text-white font-mono-nums">
            {supportTickets.length}
          </div>
          <p className="text-xs text-slate-400">
            {supportTickets.filter((t) => t.status === 'Open').length} open requests
          </p>
          <Link to="/support" className="inline-block pt-2 text-xs font-semibold text-violet-300 hover:text-white">
            Open support center →
          </Link>
        </section>
      </div>

      {/* Purchased Products Showcase */}
      <section className="volex-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-white">
              Purchased Products &amp; Active Perks
            </h2>
          </div>
          <Link to="/store" className="text-xs font-semibold text-violet-300 hover:text-white">
            Browse Store →
          </Link>
        </div>

        {purchasedOrders.length === 0 ? (
          <div className="p-6 rounded-xl bg-[#070918] border border-white/10 text-center space-y-2">
            <Crown className="w-7 h-7 text-violet-400/70 mx-auto" aria-hidden="true" />
            <p className="text-sm font-semibold text-white">No approved purchases yet</p>
            <p className="text-xs text-slate-400">
              Your approved ranks, crates, keys, and companions will appear here once verified by staff.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {purchasedOrders.map((order) => (
              <div
                key={order.id}
                className="p-3.5 rounded-xl bg-[#070918] border border-emerald-500/30 flex items-center gap-3"
              >
                {order.productImage && (
                  <img
                    src={order.productImage}
                    alt={order.productName}
                    referrerPolicy="no-referrer"
                    className="w-14 h-12 rounded-lg object-cover border border-white/15 shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-display text-sm font-bold text-white truncate">
                    {order.productName}
                  </div>
                  <div className="text-[11px] text-cyan-300 font-mono-nums">
                    IGN: {order.minecraftUsername}
                  </div>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/40 text-[10px] font-bold text-emerald-300">
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export function OrderHistoryPage() {
  const { user, orders, signInWithGoogle } = useStore();
  const [previewProof, setPreviewProof] = useState<string | null>(null);

  if (!user) {
    return (
      <main className="max-w-lg mx-auto px-4 py-14 text-center">
        <div className="volex-panel rounded-2xl p-8 space-y-4">
          <h1 className="font-display text-2xl font-bold text-white">Order History</h1>
          <p className="text-sm text-slate-300">
            Sign in with Google to view your submitted purchases and verification statuses.
          </p>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="volex-glow-btn px-6 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer"
          >
            Sign in with Google
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div className="volex-panel rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-violet-300 mb-1">
            <History className="w-4 h-4" aria-hidden="true" />
            <span>Purchase Tracking</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            Order History
          </h1>
        </div>
        <Link
          to="/store"
          className="volex-glow-btn px-5 py-2.5 rounded-xl text-xs font-bold text-white self-start sm:self-auto"
        >
          Browse Store
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="volex-panel rounded-2xl p-10 text-center space-y-3">
          <p className="text-base font-semibold text-white">No orders placed yet</p>
          <p className="text-xs text-slate-400">
            Once you purchase a rank, key, crate, or pet, it will appear here with real-time verification status.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <article
              key={order.id}
              className="volex-panel rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                {order.productImage && (
                  <img
                    src={order.productImage}
                    alt={order.productName}
                    referrerPolicy="no-referrer"
                    className="w-16 h-14 rounded-xl object-cover border border-violet-500/30 shrink-0"
                  />
                )}
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono-nums text-slate-300">{order.id}</span>
                    <span>·</span>
                    <span>IGN: <strong className="text-cyan-300">{order.minecraftUsername}</strong></span>
                    <span>·</span>
                    <span>{order.paymentMethodName}</span>
                  </div>
                  <h2 className="font-display text-lg font-bold text-white truncate">
                    {order.productName}
                  </h2>
                  {order.adminNotes && (
                    <p className="text-xs text-violet-200">
                      Staff Note: {order.adminNotes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <span className="font-mono-nums text-base font-bold text-amber-300">
                  {formatInrPrice(order.amountInr)}
                </span>
                <span
                  className={`px-3 py-1 rounded-lg border text-xs font-bold ${
                    STATUS_STYLE[order.status] || STATUS_STYLE.Pending
                  }`}
                >
                  {order.status}
                </span>
                {order.paymentProofUrl && (
                  <button
                    type="button"
                    onClick={() => setPreviewProof(order.paymentProofUrl)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>View Proof</span>
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {previewProof && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewProof(null)}
        >
          <div
            className="volex-panel rounded-2xl p-4 max-w-lg w-full space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewProof}
              alt="Submitted Payment Proof"
              className="w-full max-h-[70vh] object-contain rounded-xl bg-black"
            />
            <button
              type="button"
              onClick={() => setPreviewProof(null)}
              className="volex-glow-btn w-full py-2 rounded-xl text-xs font-semibold text-white cursor-pointer"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
