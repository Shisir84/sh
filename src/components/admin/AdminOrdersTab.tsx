import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CheckCircle2,
  Eye,
  PackageCheck,
  Search,
  ShoppingCart,
  X,
  XCircle,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../ToastProvider';
import type { OrderItem, OrderStatus } from '../../types/store';
import { formatInrPrice, parseTimestampToIsoDate } from '../../utils/storeLogic';

const STATUS_BADGE: Record<OrderStatus, string> = {
  Pending: 'bg-amber-500/15 text-amber-300 border-amber-400/40',
  'Under Review': 'bg-cyan-500/15 text-cyan-300 border-cyan-400/40',
  Approved: 'bg-violet-500/20 text-violet-200 border-violet-400/45',
  Delivered: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40',
  Rejected: 'bg-rose-500/15 text-rose-300 border-rose-400/40',
};

export function AdminOrdersTab({
  onStatus,
}: {
  onStatus: (msg: string) => void;
}) {
  const { orders, allUsers, updateOrderStatus } = useStore();
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<'All' | OrderStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const userEmailMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of allUsers) {
      map.set(u.uid, u.email);
    }
    return map;
  }, [allUsers]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'All' && o.status !== statusFilter) return false;
      if (q) {
        const email = o.customerEmail || userEmailMap.get(o.userId) || '';
        const hay = `${o.id} ${o.minecraftUsername} ${o.productName} ${email} ${o.paymentMethodName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, searchQuery, userEmailMap]);

  const handleStatusChange = async (order: OrderItem, nextStatus: OrderStatus) => {
    const note = noteDrafts[order.id] ?? order.adminNotes ?? '';
    await updateOrderStatus(order.id, nextStatus, note);
    if (selectedOrder && selectedOrder.id === order.id) {
      setSelectedOrder({ ...selectedOrder, status: nextStatus, adminNotes: note });
    }
    onStatus(`Order ${order.id} marked ${nextStatus}.`);
    showToast({
      tone: nextStatus === 'Rejected' ? 'info' : 'success',
      title: `Order marked ${nextStatus}`,
      description: `${order.productName} · ${order.minecraftUsername}`,
    });
  };

  return (
    <div className="space-y-5">
      <section className="volex-panel rounded-2xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-violet-300">
              <ShoppingCart className="w-4 h-4" aria-hidden="true" />
              <span>Manual Verification Queue</span>
            </div>
            <h2 className="font-display text-lg font-bold text-white">
              Orders &amp; Payment Proof Review ({filteredOrders.length})
            </h2>
          </div>

          <div className="relative w-full lg:w-72">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Order ID, IGN, email..."
              aria-label="Search orders"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#070918] border border-violet-500/30 text-xs text-white"
            />
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
          {(['All', 'Pending', 'Under Review', 'Approved', 'Delivered', 'Rejected'] as const).map(
            (st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  statusFilter === st
                    ? 'volex-glow-btn text-white'
                    : 'bg-[#070918] border border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                {st}
              </button>
            )
          )}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#070918] border border-white/10 text-center text-sm text-slate-400">
            No orders match your current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3 pr-3">Order &amp; Date</th>
                  <th className="py-3 pr-3">Customer / IGN</th>
                  <th className="py-3 pr-3">Product</th>
                  <th className="py-3 pr-3">Amount</th>
                  <th className="py-3 pr-3">Method &amp; Proof</th>
                  <th className="py-3 pr-3">Status</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredOrders.map((order) => {
                  const email = order.customerEmail || userEmailMap.get(order.userId) || 'N/A';
                  const dt = parseTimestampToIsoDate(order.createdAt);
                  return (
                    <tr key={order.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 pr-3 align-top">
                        <div className="font-mono-nums text-white font-semibold">{order.id}</div>
                        <div className="text-[11px] text-slate-400">
                          {dt.toLocaleDateString()} {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <div className="font-mono-nums font-bold text-cyan-300">
                          {order.minecraftUsername}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                          {email}
                        </div>
                      </td>
                      <td className="py-3 pr-3 align-top font-semibold text-white">
                        {order.productName}
                      </td>
                      <td className="py-3 pr-3 align-top font-mono-nums font-bold text-amber-300 whitespace-nowrap">
                        {formatInrPrice(order.amountInr)}
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <div className="flex items-center gap-2">
                          {order.paymentProofUrl && (
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              className="shrink-0 rounded-md overflow-hidden border border-violet-500/40 hover:border-violet-300 cursor-pointer"
                              aria-label={`Inspect proof for ${order.id}`}
                            >
                              <img
                                src={order.paymentProofUrl}
                                alt={`Proof ${order.id}`}
                                referrerPolicy="no-referrer"
                                className="w-12 h-9 object-cover"
                              />
                            </button>
                          )}
                          <div>
                            <div className="text-slate-200">{order.paymentMethodName}</div>
                            {order.transactionRef && (
                              <div className="text-[10px] font-mono-nums text-slate-400">
                                Ref: {order.transactionRef}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                            STATUS_BADGE[order.status]
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 align-top text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="px-2 py-1 rounded bg-white/5 hover:bg-white/15 text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" aria-hidden="true" />
                            <span>Details</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleStatusChange(order, 'Approved')}
                            className="px-2 py-1 rounded bg-violet-600/25 hover:bg-violet-600/45 text-violet-100 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleStatusChange(order, 'Delivered')}
                            className="px-2 py-1 rounded bg-emerald-600/25 hover:bg-emerald-600/45 text-emerald-200 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <PackageCheck className="w-3 h-3" aria-hidden="true" />
                            <span>Deliver</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleStatusChange(order, 'Rejected')}
                            className="px-2 py-1 rounded bg-rose-600/20 hover:bg-rose-600/35 text-rose-200 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3 h-3" aria-hidden="true" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Order Details & Payment Proof Zoom Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[85] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-detail-modal-title"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="volex-panel rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 relative"
            >
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close order details modal"
                className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1 pr-10">
                <div className="font-mono-nums text-xs text-violet-300">{selectedOrder.id}</div>
                <h3 id="order-detail-modal-title" className="font-display text-xl font-bold text-white">
                  {selectedOrder.productName}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#070918] border border-white/10 rounded-xl p-4">
                <div>
                  <span className="text-slate-400 block">Minecraft IGN</span>
                  <span className="font-mono-nums font-bold text-cyan-300">
                    {selectedOrder.minecraftUsername}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Customer Email</span>
                  <span className="text-white">
                    {selectedOrder.customerEmail ||
                      userEmailMap.get(selectedOrder.userId) ||
                      'Not provided'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Amount</span>
                  <span className="font-mono-nums font-bold text-amber-300">
                    {formatInrPrice(selectedOrder.amountInr)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Payment Method</span>
                  <span className="text-white">
                    {selectedOrder.paymentMethodName}
                    {selectedOrder.transactionRef ? ` · Ref: ${selectedOrder.transactionRef}` : ''}
                  </span>
                </div>
              </div>

              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="rounded-xl bg-[#070918] border border-white/10 p-3 space-y-1.5 text-xs">
                  <div className="font-semibold text-slate-300">Line Items</div>
                  {selectedOrder.items.map((li) => (
                    <div key={li.productId} className="flex justify-between text-slate-200">
                      <span>
                        {li.productName} × {li.quantity}
                      </span>
                      <span className="font-mono-nums text-amber-300">
                        {formatInrPrice(li.priceInr * li.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {selectedOrder.paymentProofUrl && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-300">
                    Uploaded Payment Proof Screenshot
                  </div>
                  <div className="rounded-xl overflow-hidden border border-violet-500/35 bg-black/50">
                    <img
                      src={selectedOrder.paymentProofUrl}
                      alt={`Payment proof for ${selectedOrder.id}`}
                      referrerPolicy="no-referrer"
                      className="w-full max-h-80 object-contain"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Staff Verification Note
                </label>
                <input
                  type="text"
                  placeholder="Optional note visible in order history..."
                  value={noteDrafts[selectedOrder.id] ?? selectedOrder.adminNotes ?? ''}
                  onChange={(e) =>
                    setNoteDrafts({ ...noteDrafts, [selectedOrder.id]: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#070918] border border-white/15 text-xs text-white"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                {(
                  ['Under Review', 'Approved', 'Delivered', 'Rejected'] as OrderStatus[]
                ).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => void handleStatusChange(selectedOrder, st)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                      selectedOrder.status === st
                        ? 'volex-glow-btn text-white'
                        : 'bg-white/5 hover:bg-white/15 text-slate-200'
                    }`}
                  >
                    Mark {st}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
