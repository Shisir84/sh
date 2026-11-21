import React, { useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Eye,
  Plus,
  Save,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../ToastProvider';
import type { OrderItem, PaymentMethodItem, PaymentType } from '../../types/store';
import { compressImageToDataUrl } from '../../utils/imageHelpers';
import { formatInrPrice, parseTimestampToIsoDate, sanitizeSlugId } from '../../utils/storeLogic';

export function AdminPaymentsTab({
  mode,
  onStatus,
}: {
  mode: 'submissions' | 'settings';
  onStatus: (msg: string) => void;
}) {
  const { orders, paymentMethods, savePaymentMethod, updateOrderStatus } = useStore();
  const { showToast } = useToast();

  const [proofModalOrder, setProofModalOrder] = useState<OrderItem | null>(null);
  const [gatewayFilter, setGatewayFilter] = useState<string>('all');

  // Local editable drafts for gateway cards
  const [drafts, setDrafts] = useState<Record<string, PaymentMethodItem>>({});
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<PaymentType>('qr');
  const [newAccount, setNewAccount] = useState('');
  const [newInstructions, setNewInstructions] = useState('');

  const getDraft = (method: PaymentMethodItem) => drafts[method.id] || method;
  const setMethodDraft = (id: string, next: PaymentMethodItem) =>
    setDrafts((prev) => ({ ...prev, [id]: next }));

  const handleQrUpload = async (
    method: PaymentMethodItem,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, 640, 280_000);
      const updated = { ...getDraft(method), qrImageUrl: dataUrl };
      setMethodDraft(method.id, updated);
      await savePaymentMethod(updated);
      onStatus(`Updated QR image for ${method.name}.`);
      showToast({ tone: 'success', title: `${method.name} QR updated` });
    } catch (err) {
      onStatus(err instanceof Error ? err.message : 'QR upload failed.');
    }
  };

  const handleSaveGateway = async (method: PaymentMethodItem) => {
    const draft = getDraft(method);
    await savePaymentMethod(draft);
    onStatus(`Saved ${draft.name} payment gateway settings.`);
    showToast({ tone: 'success', title: `${draft.name} settings saved` });
  };

  const handleCreateGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const id = sanitizeSlugId(newName) || `pay_${Date.now()}`;
    const created: PaymentMethodItem = {
      id,
      name: newName.trim(),
      type: newType,
      enabled: true,
      accountLabel: newType === 'qr' ? 'Merchant / UPI ID' : 'Account / Gateway Info',
      accountValue: newAccount.trim(),
      instructions:
        newInstructions.trim() || `Complete payment via ${newName.trim()} and upload screenshot.`,
      sortOrder: paymentMethods.length + 1,
    };
    await savePaymentMethod(created);
    setNewName('');
    setNewAccount('');
    setNewInstructions('');
    onStatus(`Added payment gateway "${created.name}".`);
    showToast({ tone: 'success', title: `Added ${created.name}` });
  };

  if (mode === 'submissions') {
    const filtered =
      gatewayFilter === 'all'
        ? orders
        : orders.filter(
            (o) =>
              o.paymentMethodId.toLowerCase() === gatewayFilter.toLowerCase() ||
              o.paymentMethodName.toLowerCase() === gatewayFilter.toLowerCase()
          );

    const pendingCount = orders.filter(
      (o) => o.status === 'Pending' || o.status === 'Under Review'
    ).length;
    const verifiedVolume = orders
      .filter((o) => o.status === 'Approved' || o.status === 'Delivered')
      .reduce((sum, o) => sum + (Number.isFinite(o.amountInr) ? o.amountInr : 0), 0);

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="volex-panel rounded-2xl p-4 space-y-1">
            <div className="text-xs text-slate-400">Verified Payment Volume</div>
            <div className="font-mono-nums text-2xl font-extrabold text-emerald-300">
              {formatInrPrice(verifiedVolume)}
            </div>
          </div>
          <div className="volex-panel rounded-2xl p-4 space-y-1">
            <div className="text-xs text-slate-400">Pending Payment Approvals</div>
            <div className="font-mono-nums text-2xl font-extrabold text-amber-300">
              {pendingCount}
            </div>
          </div>
          <div className="volex-panel rounded-2xl p-4 space-y-1">
            <div className="text-xs text-slate-400">Active Gateways</div>
            <div className="font-mono-nums text-2xl font-extrabold text-violet-300">
              {paymentMethods.filter((m) => m.enabled).length} / {paymentMethods.length}
            </div>
          </div>
        </div>

        <section className="volex-panel rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Payment Proof Submissions
              </h2>
              <p className="text-xs text-slate-400">
                Verify player receipts, inspect screenshots, and approve or reject payments.
              </p>
            </div>
            <select
              value={gatewayFilter}
              onChange={(e) => setGatewayFilter(e.target.value)}
              aria-label="Filter payments by gateway"
              className="px-3 py-2 rounded-xl bg-[#070918] border border-white/15 text-xs text-white"
            >
              <option value="all">All Payment Methods</option>
              {paymentMethods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">No payment submissions match this filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 pr-3">Order &amp; Date</th>
                    <th className="py-2.5 pr-3">Player</th>
                    <th className="py-2.5 pr-3">Gateway &amp; Ref</th>
                    <th className="py-2.5 pr-3">Amount</th>
                    <th className="py-2.5 pr-3">Proof</th>
                    <th className="py-2.5 pr-3">Status</th>
                    <th className="py-2.5 text-right">Verify</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((order) => (
                    <tr key={order.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 pr-3">
                        <div className="font-mono-nums text-white font-semibold">{order.id}</div>
                        <div className="text-[11px] text-slate-400">
                          {order.createdAt
                            ? parseTimestampToIsoDate(order.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'Recent'}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="font-semibold text-cyan-300">
                          {order.minecraftUsername}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {order.customerEmail || order.userId}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="text-white font-medium">{order.paymentMethodName}</div>
                        <div className="text-[11px] text-slate-400 font-mono-nums">
                          {order.transactionRef || 'No Ref'}
                        </div>
                      </td>
                      <td className="py-3 pr-3 font-mono-nums font-bold text-amber-300">
                        {formatInrPrice(order.amountInr)}
                      </td>
                      <td className="py-3 pr-3">
                        {order.paymentProofUrl ? (
                          <button
                            type="button"
                            onClick={() => setProofModalOrder(order)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/35 border border-violet-500/40 text-violet-200 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                        ) : (
                          <span className="text-slate-500">None</span>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/15 font-semibold text-slate-200">
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              void updateOrderStatus(order.id, 'Approved', 'Payment verified').then(
                                () => {
                                  onStatus(`Approved payment for ${order.id}.`);
                                  showToast({ tone: 'success', title: 'Payment approved' });
                                }
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-200 font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void updateOrderStatus(
                                order.id,
                                'Rejected',
                                'Payment verification failed'
                              ).then(() => {
                                onStatus(`Rejected payment for ${order.id}.`);
                                showToast({ tone: 'info', title: 'Payment rejected' });
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-200 font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {proofModalOrder && (
          <div
            className="fixed inset-0 z-[85] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setProofModalOrder(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="volex-panel rounded-2xl max-w-xl w-full p-5 space-y-4 relative"
            >
              <button
                type="button"
                onClick={() => setProofModalOrder(null)}
                aria-label="Close proof modal"
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  Receipt Proof · {proofModalOrder.minecraftUsername}
                </h3>
                <p className="text-xs text-slate-400">
                  {proofModalOrder.paymentMethodName} · {formatInrPrice(proofModalOrder.amountInr)}
                </p>
              </div>
              <div className="rounded-xl bg-black/50 border border-white/10 p-2 max-h-[65vh] overflow-auto flex justify-center">
                <img
                  src={proofModalOrder.paymentProofUrl}
                  alt="Payment proof"
                  className="max-w-full rounded-lg object-contain"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // PAYMENT SETTINGS MODE
  return (
    <div className="space-y-6">
      <section className="volex-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-violet-400" />
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              Payment Gateway Settings &amp; QR Codes
            </h2>
            <p className="text-xs text-slate-400">
              Configure eSewa, Khalti, UPI, PayPal, Visa, Mastercard QR codes, merchant IDs, and checkout instructions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paymentMethods.map((method) => {
            const draft = getDraft(method);
            return (
              <div
                key={method.id}
                className="p-4 rounded-xl bg-[#070918] border border-white/10 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-display text-base font-bold text-white">
                      {draft.name}
                    </div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider">
                      {draft.type} · Sort #{draft.sortOrder}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.enabled}
                      onChange={(e) => {
                        const updated = { ...draft, enabled: e.target.checked };
                        setMethodDraft(method.id, updated);
                        void savePaymentMethod(updated).then(() =>
                          onStatus(`${draft.name} ${e.target.checked ? 'enabled' : 'disabled'}.`)
                        );
                      }}
                    />
                    <span>Enabled</span>
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  {draft.qrImageUrl && (
                    <img
                      src={draft.qrImageUrl}
                      alt={`${draft.name} QR`}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-lg bg-white p-1 object-contain shrink-0"
                    />
                  )}
                  <label className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-slate-200 inline-flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload QR Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => void handleQrUpload(method, e)}
                      className="sr-only"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={draft.accountLabel || ''}
                    placeholder="Account Label (e.g. UPI ID)"
                    onChange={(e) =>
                      setMethodDraft(method.id, { ...draft, accountLabel: e.target.value })
                    }
                    className="px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={draft.accountValue || ''}
                    placeholder="Merchant ID / UPI / Email"
                    onChange={(e) =>
                      setMethodDraft(method.id, { ...draft, accountValue: e.target.value })
                    }
                    className="px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                  />
                </div>

                <textarea
                  rows={2}
                  value={draft.instructions}
                  onChange={(e) =>
                    setMethodDraft(method.id, { ...draft, instructions: e.target.value })
                  }
                  placeholder="Checkout instructions..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                />

                <button
                  type="button"
                  onClick={() => void handleSaveGateway(method)}
                  className="volex-glow-btn px-3.5 py-1.5 rounded-lg text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save {draft.name}</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Add New Gateway */}
      <section className="volex-panel rounded-2xl p-5 space-y-3">
        <h3 className="font-display text-base font-bold text-white">Add Payment Gateway</h3>
        <form onSubmit={handleCreateGateway} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            required
            placeholder="Gateway Name (e.g. Stripe)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as PaymentType)}
            className="px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white"
          >
            <option value="qr">QR Payment</option>
            <option value="gateway">Online Gateway</option>
            <option value="manual">Manual Transfer</option>
          </select>
          <input
            type="text"
            placeholder="Merchant ID / Account"
            value={newAccount}
            onChange={(e) => setNewAccount(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white"
          />
          <button
            type="submit"
            className="volex-glow-btn px-4 py-2 rounded-xl text-xs font-bold text-white inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Gateway</span>
          </button>
          <input
            type="text"
            placeholder="Checkout instructions..."
            value={newInstructions}
            onChange={(e) => setNewInstructions(e.target.value)}
            className="sm:col-span-4 px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white"
          />
        </form>
      </section>
    </div>
  );
}
