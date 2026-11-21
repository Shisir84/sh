import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Eye,
  Search,
  User as UserIcon,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../ToastProvider';
import type { UserProfile } from '../../types/store';
import {
  filterAdminUsers,
  formatInrPrice,
  parseTimestampToIsoDate,
} from '../../utils/storeLogic';

export function AdminUsersTab({
  onStatus,
}: {
  onStatus: (msg: string) => void;
}) {
  const { allUsers, orders, updateUserAccountStatus } = useStore();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const filteredUsers = useMemo(
    () => filterAdminUsers(allUsers, searchQuery),
    [allUsers, searchQuery]
  );

  const userOrdersMap = useMemo(() => {
    const map = new Map<string, typeof orders>();
    for (const u of allUsers) {
      const matching = orders.filter(
        (o) =>
          o.userId === u.uid ||
          (u.minecraftUsername &&
            o.minecraftUsername.toLowerCase() === u.minecraftUsername.toLowerCase()) ||
          (o.customerEmail && o.customerEmail.toLowerCase() === u.email.toLowerCase())
      );
      map.set(u.uid, matching);
    }
    return map;
  }, [allUsers, orders]);

  const handleToggleSuspend = async (u: UserProfile) => {
    const isSuspended = (u.status || 'Active') === 'Suspended';
    const nextStatus = isSuspended ? 'Active' : 'Suspended';
    await updateUserAccountStatus(u.uid, nextStatus);
    if (selectedUser && selectedUser.uid === u.uid) {
      setSelectedUser({ ...selectedUser, status: nextStatus });
    }
    onStatus(`${u.displayName} marked ${nextStatus}.`);
    showToast({
      tone: isSuspended ? 'success' : 'info',
      title: `${u.displayName} marked ${nextStatus}`,
    });
  };

  return (
    <div className="space-y-5">
      <section className="volex-panel rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-300">
              <Users className="w-4 h-4" aria-hidden="true" />
              <span>Player Directory</span>
            </div>
            <h2 className="font-display text-lg font-bold text-white">
              Registered Users ({filteredUsers.length})
            </h2>
          </div>

          <div className="relative w-full md:w-72">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, email, IGN..."
              aria-label="Search registered users"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#070918] border border-violet-500/30 text-xs text-white"
            />
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#070918] border border-white/10 text-center text-sm text-slate-400">
            No registered player profiles match your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredUsers.map((u) => {
              const matchingOrders = userOrdersMap.get(u.uid) || [];
              const totalSpent = matchingOrders
                .filter((o) => o.status !== 'Rejected')
                .reduce((sum, o) => sum + (Number.isFinite(o.amountInr) ? o.amountInr : 0), 0);
              const accountStatus = u.status || 'Active';
              const isSuspended = accountStatus === 'Suspended';
              const regDate = parseTimestampToIsoDate(u.createdAt).toLocaleDateString();

              return (
                <div
                  key={u.uid}
                  className="p-4 rounded-xl bg-[#070918] border border-white/10 text-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {u.photoURL ? (
                          <img
                            src={u.photoURL}
                            alt={u.displayName}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-lg object-cover border border-violet-500/35 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-violet-700/40 border border-violet-500/35 flex items-center justify-center shrink-0">
                            <UserIcon className="w-4 h-4 text-violet-200" aria-hidden="true" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate">{u.displayName}</div>
                          <div className="text-[11px] text-slate-400 truncate">{u.email}</div>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          isSuspended
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {accountStatus}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>
                        IGN:{' '}
                        <span className="font-mono-nums text-cyan-300">
                          {u.minecraftUsername || 'Unlinked'}
                        </span>
                      </span>
                      <span>Joined: {regDate}</span>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-300 font-mono-nums">
                      <span>{matchingOrders.length} orders</span> ·{' '}
                      <span className="text-amber-300 font-bold">{formatInrPrice(totalSpent)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedUser(u)}
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Profile</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleSuspend(u)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                          isSuspended
                            ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/35'
                            : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/35'
                        }`}
                      >
                        {isSuspended ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Activate</span>
                          </>
                        ) : (
                          <>
                            <UserX className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Suspend</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* User Profile & Purchase History Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[85] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-profile-modal-title"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="volex-panel rounded-2xl max-w-xl w-full max-h-[88vh] overflow-y-auto p-5 sm:p-6 space-y-4 relative"
            >
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                aria-label="Close user profile modal"
                className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1 pr-10">
                <div className="text-xs font-semibold text-cyan-300">Player Profile</div>
                <h3 id="user-profile-modal-title" className="font-display text-xl font-bold text-white">
                  {selectedUser.displayName}
                </h3>
                <p className="text-xs text-slate-400">{selectedUser.email}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs bg-[#070918] border border-white/10 rounded-xl p-3.5">
                <div>
                  <span className="text-slate-400 block">Minecraft IGN</span>
                  <span className="font-mono-nums font-bold text-cyan-300">
                    {selectedUser.minecraftUsername || 'Unlinked'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Account Status</span>
                  <span className="font-bold text-white">{selectedUser.status || 'Active'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Registered</span>
                  <span className="font-mono-nums text-white">
                    {parseTimestampToIsoDate(selectedUser.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-200">Purchase History</div>
                {(userOrdersMap.get(selectedUser.uid) || []).length === 0 ? (
                  <p className="text-xs text-slate-400 p-4 rounded-xl bg-[#070918] border border-white/10">
                    No purchases recorded for this player yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {(userOrdersMap.get(selectedUser.uid) || []).map((ord) => (
                      <div
                        key={ord.id}
                        className="p-3 rounded-xl bg-[#070918] border border-white/10 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-white">{ord.productName}</div>
                          <div className="text-[11px] text-slate-400 font-mono-nums">
                            {ord.id} · {ord.paymentMethodName}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono-nums font-bold text-amber-300">
                            {formatInrPrice(ord.amountInr)}
                          </div>
                          <div className="text-[11px] text-violet-300">{ord.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => void handleToggleSuspend(selectedUser)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer"
                >
                  {(selectedUser.status || 'Active') === 'Suspended'
                    ? 'Activate Account'
                    : 'Suspend Account'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
