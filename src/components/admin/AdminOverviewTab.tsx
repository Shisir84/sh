import { useMemo } from 'react';
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Globe,
  IndianRupee,
  Package,
  Palette,
  Plus,
  ShoppingCart,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import {
  computeAdminOverviewKpis,
  computeDailyRevenueSeries,
  formatInrPrice,
  parseTimestampToIsoDate,
} from '../../utils/storeLogic';

export type AdminSectionId =
  | 'overview'
  | 'website-editor'
  | 'products'
  | 'categories'
  | 'orders'
  | 'payments'
  | 'users'
  | 'staff'
  | 'wiki'
  | 'rules'
  | 'tickets'
  | 'server-settings'
  | 'payment-settings'
  | 'admin-settings';

export function AdminOverviewTab({
  onNavigateTab,
}: {
  onNavigateTab: (tab: AdminSectionId) => void;
}) {
  const { allUsers, products, orders, serverStatus, supportTickets } = useStore();

  const kpis = useMemo(
    () =>
      computeAdminOverviewKpis({
        users: allUsers,
        products,
        orders,
      }),
    [allUsers, products, orders]
  );

  const revenueSeries = useMemo(() => computeDailyRevenueSeries(orders, 7), [orders]);
  const maxDayRevenue = useMemo(
    () => Math.max(500, ...revenueSeries.map((d) => d.revenueInr)),
    [revenueSeries]
  );

  const pendingApprovals = useMemo(
    () =>
      orders.filter((o) => o.status === 'Pending' || o.status === 'Under Review').slice(0, 5),
    [orders]
  );

  const recentRegistrations = useMemo(
    () =>
      [...allUsers]
        .sort(
          (a, b) =>
            parseTimestampToIsoDate(b.createdAt).getTime() -
            parseTimestampToIsoDate(a.createdAt).getTime()
        )
        .slice(0, 5),
    [allUsers]
  );

  const onlinePlayersLabel = serverStatus?.online
    ? `${serverStatus.players.online} / ${serverStatus.players.max}`
    : '0';

  const statCards = [
    {
      label: 'Total Revenue',
      value: formatInrPrice(kpis.totalRevenueInr),
      sub: 'Approved & delivered orders',
      icon: <IndianRupee className="w-4 h-4 text-emerald-400" aria-hidden="true" />,
      tone: 'text-emerald-300',
    },
    {
      label: 'Total Orders',
      value: String(kpis.totalOrders),
      sub: 'All checkout submissions',
      icon: <ShoppingCart className="w-4 h-4 text-violet-300" aria-hidden="true" />,
      tone: 'text-white',
    },
    {
      label: 'Pending Orders',
      value: String(kpis.pendingOrders),
      sub: 'Awaiting proof verification',
      icon: <Clock className="w-4 h-4 text-amber-300" aria-hidden="true" />,
      tone: 'text-amber-300',
    },
    {
      label: 'Completed Orders',
      value: String(kpis.completedOrders),
      sub: 'Approved or delivered',
      icon: <CheckCircle2 className="w-4 h-4 text-cyan-300" aria-hidden="true" />,
      tone: 'text-cyan-300',
    },
    {
      label: 'Registered Users',
      value: String(kpis.totalUsers),
      sub: 'Synced player profiles',
      icon: <Users className="w-4 h-4 text-fuchsia-300" aria-hidden="true" />,
      tone: 'text-white',
    },
    {
      label: 'Active Products',
      value: String(kpis.totalProducts),
      sub: 'Live catalog items',
      icon: <Package className="w-4 h-4 text-indigo-300" aria-hidden="true" />,
      tone: 'text-white',
    },
    {
      label: 'Online Players',
      value: onlinePlayersLabel,
      sub: serverStatus?.online ? 'Server online' : 'Live Minecraft query',
      icon: <Activity className="w-4 h-4 text-emerald-300" aria-hidden="true" />,
      tone: serverStatus?.online ? 'text-emerald-300' : 'text-slate-300',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Actions Strip */}
      <div className="volex-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-bold text-white">Quick Actions</h2>
          <p className="text-xs text-slate-400">
            Jump directly into high-priority store workflows.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('website-editor')}
            className="volex-glow-btn px-3.5 py-2 rounded-xl text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Open Website Editor</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('products')}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-violet-600/25 border border-violet-500/30 text-xs font-semibold text-slate-100 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-violet-300" aria-hidden="true" />
            <span>Manage Products</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('orders')}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-amber-400/30 text-xs font-semibold text-amber-200 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Review Orders ({kpis.pendingOrders})</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('payment-settings')}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-cyan-400/30 text-xs font-semibold text-cyan-200 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Payment QR &amp; Gateways</span>
          </button>
        </div>
      </div>

      {/* 7 Live KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
        {statCards.map((card) => (
          <div key={card.label} className="volex-panel rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
              <span>{card.label}</span>
              {card.icon}
            </div>
            <div className={`font-mono-nums text-xl font-extrabold truncate ${card.tone}`}>
              {card.value}
            </div>
            <div className="text-[11px] text-slate-500 truncate">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Revenue Chart + Pending Payment Approvals */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-7 volex-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                <TrendingUp className="w-4 h-4" aria-hidden="true" />
                <span>7-Day Revenue Analytics</span>
              </div>
              <h2 className="font-display text-lg font-bold text-white">
                Approved &amp; Delivered Store Revenue
              </h2>
            </div>
            <span className="font-mono-nums text-xs font-bold text-emerald-300 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              Total: {formatInrPrice(kpis.totalRevenueInr)}
            </span>
          </div>

          {/* Responsive Bar Visualization */}
          <div className="pt-2">
            <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-44 px-2 pb-2 border-b border-white/10">
              {revenueSeries.map((day) => {
                const heightPct =
                  day.revenueInr > 0
                    ? Math.max(12, Math.round((day.revenueInr / maxDayRevenue) * 100))
                    : 4;
                return (
                  <div
                    key={day.dateKey}
                    className="h-full flex flex-col items-center justify-end gap-1.5 group"
                    title={`${day.label}: ${formatInrPrice(day.revenueInr)} (${day.orderCount} orders)`}
                  >
                    <span className="text-[10px] font-mono-nums text-slate-300 opacity-80 group-hover:opacity-100 truncate max-w-full">
                      {day.revenueInr > 0 ? `₹${day.revenueInr}` : '₹0'}
                    </span>
                    <div className="w-full max-w-[38px] flex-1 flex items-end">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          day.revenueInr > 0
                            ? 'bg-gradient-to-t from-violet-700 via-purple-500 to-fuchsia-400 shadow-[0_0_16px_rgba(168,85,247,0.45)]'
                            : 'bg-white/10'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-7 gap-2 sm:gap-3 pt-2 text-center">
              {revenueSeries.map((day) => (
                <div key={day.dateKey} className="text-[10px] font-mono-nums text-slate-400">
                  {day.label}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pending Payment Approvals */}
        <section className="xl:col-span-5 volex-panel rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-white">
              Pending Payment Approvals
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('orders')}
              className="text-xs font-semibold text-violet-300 hover:text-white inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Review Queue</span>
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="p-6 rounded-xl bg-[#070918] border border-white/10 text-center space-y-1">
              <p className="text-xs font-semibold text-emerald-300">All caught up!</p>
              <p className="text-[11px] text-slate-400">
                No pending or under-review payment screenshots right now.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingApprovals.map((o) => (
                <div
                  key={o.id}
                  className="p-3 rounded-xl bg-[#070918] border border-amber-400/25 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">{o.productName}</div>
                    <div className="text-slate-400 truncate">
                      IGN: <span className="text-cyan-300">{o.minecraftUsername}</span> ·{' '}
                      {o.paymentMethodName}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono-nums font-bold text-amber-300">
                      {formatInrPrice(o.amountInr)}
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigateTab('orders')}
                      className="text-[11px] font-semibold text-violet-300 hover:text-white underline cursor-pointer"
                    >
                      Inspect Proof
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recent Orders + Recent Registrations + Open Tickets Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="volex-panel rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-white">Recent Orders</h2>
            <button
              type="button"
              onClick={() => onNavigateTab('orders')}
              className="text-xs font-semibold text-violet-300 hover:text-white cursor-pointer"
            >
              View all ({orders.length}) →
            </button>
          </div>
          {orders.slice(0, 5).length === 0 ? (
            <p className="text-xs text-slate-400">No orders submitted yet.</p>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 5).map((o) => (
                <div
                  key={o.id}
                  className="p-3 rounded-xl bg-[#070918] border border-white/10 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">{o.productName}</div>
                    <div className="text-slate-400 truncate">
                      IGN: <span className="text-cyan-300">{o.minecraftUsername}</span> ·{' '}
                      {o.customerEmail || o.paymentMethodName}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono-nums font-bold text-amber-300">
                      {formatInrPrice(o.amountInr)}
                    </div>
                    <div className="text-[11px] text-violet-300">{o.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="volex-panel rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-cyan-300" aria-hidden="true" />
              <h2 className="font-display text-base font-bold text-white">
                Recent Registrations
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('users')}
              className="text-xs font-semibold text-violet-300 hover:text-white cursor-pointer"
            >
              Manage users ({allUsers.length}) →
            </button>
          </div>

          {recentRegistrations.length === 0 ? (
            <div className="p-5 rounded-xl bg-[#070918] border border-white/10 text-xs text-slate-400 flex items-center justify-between">
              <span>No player registrations recorded yet.</span>
              <span className="text-violet-300">
                Open Tickets: {supportTickets.filter((t) => t.status === 'Open').length}
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {recentRegistrations.map((u) => (
                <div
                  key={u.uid}
                  className="p-3 rounded-xl bg-[#070918] border border-white/10 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">{u.displayName}</div>
                    <div className="text-slate-400 truncate">{u.email}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono-nums text-cyan-300">
                      {u.minecraftUsername || 'IGN Unlinked'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {parseTimestampToIsoDate(u.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-violet-300" aria-hidden="true" />
              Open Support Tickets: {supportTickets.filter((t) => t.status === 'Open').length}
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('tickets')}
              className="text-violet-300 hover:text-white font-semibold cursor-pointer"
            >
              View Tickets →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
