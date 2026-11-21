import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Crown,
  Database,
  ExternalLink,
  FolderTree,
  LifeBuoy,
  Loader2,
  LogOut,
  Menu,
  Package,
  Palette,
  Scale,
  Server,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Sliders,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useToast } from '../components/ToastProvider';
import type { TicketStatus } from '../types/store';
import { AdminOverviewTab, type AdminSectionId } from '../components/admin/AdminOverviewTab';
import { WebsiteEditorTab } from '../components/admin/WebsiteEditorTab';
import { AdminProductsTab } from '../components/admin/AdminProductsTab';
import { AdminOrdersTab } from '../components/admin/AdminOrdersTab';
import { AdminPaymentsTab } from '../components/admin/AdminPaymentsTab';
import { AdminUsersTab } from '../components/admin/AdminUsersTab';
import { AdminContentTab } from '../components/admin/AdminContentTab';
import { AdminSecurityTab } from '../components/admin/AdminSecurityTab';

export function AdminDashboard() {
  const {
    authReady,
    adminAuthChecked,
    user,
    isAdmin,
    serverAdmin,
    logoutAdmin,
    logout,
    orders,
    supportTickets,
    allUsers,
    seedDatabaseDefaults,
    updateSupportTicket,
  } = useStore();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState<AdminSectionId>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [ticketFilter, setTicketFilter] = useState<'All' | TicketStatus>('All');

  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [activeSection]);

  if (!adminAuthChecked || !authReady) {
    return (
      <main className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="volex-panel rounded-2xl p-8 flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-violet-400" />
          <p className="text-sm text-slate-300">Verifying administrator session...</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    if (!user) {
      return <Navigate to="/admin/login" replace />;
    }

    return (
      <main className="min-h-[80vh] flex items-center justify-center px-4 py-14">
        <section
          role="alert"
          aria-labelledby="admin-access-denied-title"
          className="volex-panel max-w-md w-full rounded-2xl p-7 text-center space-y-5 border border-rose-500/40"
        >
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-400/45 flex items-center justify-center mx-auto shadow-[0_0_24px_rgba(244,63,94,0.28)]">
            <AlertTriangle className="w-7 h-7 text-rose-400" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <span className="inline-block px-2.5 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/35 text-[10px] font-bold tracking-widest uppercase text-rose-300">
              403 · Access Denied
            </span>
            <h1
              id="admin-access-denied-title"
              className="font-display text-2xl font-extrabold text-white"
            >
              Administrator Access Required
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your signed-in account (<strong className="text-white">{user.email}</strong>) has standard player permissions and cannot access the VOLEXMC Admin Panel.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <Link
              to="/"
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-slate-200 inline-flex items-center justify-center"
            >
              Return to Store
            </Link>
            <Link
              to="/admin/login"
              className="volex-glow-btn flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white inline-flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
              <span>Admin Login</span>
            </Link>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="text-xs font-medium text-rose-300 hover:text-rose-200 underline cursor-pointer"
          >
            Sign out of player account
          </button>
        </section>
      </main>
    );
  }

  const adminIdentity = serverAdmin?.email || user?.email || 'Administrator';
  const pendingOrdersCount = orders.filter(
    (o) => o.status === 'Pending' || o.status === 'Under Review'
  ).length;
  const openTicketsCount = supportTickets.filter(
    (t) => t.status === 'Open' || t.status === 'In Progress'
  ).length;

  const handleSeedDatabase = async () => {
    try {
      await seedDatabaseDefaults();
      const msg = 'Synced default catalog, payment methods, site config, staff, wiki, and rules.';
      setStatusMsg(msg);
      showToast({ tone: 'success', title: 'Store defaults synced', description: msg });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed.';
      setStatusMsg(msg);
      showToast({ tone: 'error', title: 'Sync failed', description: msg });
    }
  };

  const handleAdminLogout = async () => {
    await Promise.all([
      serverAdmin ? logoutAdmin() : Promise.resolve(),
      user ? logout() : Promise.resolve(),
    ]);
    showToast({ tone: 'info', title: 'Signed out of Admin Panel' });
    navigate('/admin/login', { replace: true });
  };

  // All 14 navigable sections + Logout (15 sidebar items total)
  const navItems: Array<{
    id: AdminSectionId;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4 shrink-0" /> },
    { id: 'website-editor', label: 'Website Editor', icon: <Palette className="w-4 h-4 shrink-0" /> },
    { id: 'products', label: 'Products', icon: <Package className="w-4 h-4 shrink-0" /> },
    { id: 'categories', label: 'Categories', icon: <FolderTree className="w-4 h-4 shrink-0" /> },
    {
      id: 'orders',
      label: 'Orders',
      icon: <ShoppingCart className="w-4 h-4 shrink-0" />,
      badge: pendingOrdersCount || undefined,
    },
    { id: 'payments', label: 'Payments', icon: <Wallet className="w-4 h-4 shrink-0" /> },
    {
      id: 'users',
      label: 'Users',
      icon: <Users className="w-4 h-4 shrink-0" />,
      badge: allUsers.length || undefined,
    },
    { id: 'staff', label: 'Staff Management', icon: <Shield className="w-4 h-4 shrink-0" /> },
    { id: 'wiki', label: 'Wiki Management', icon: <BookOpen className="w-4 h-4 shrink-0" /> },
    { id: 'rules', label: 'Rules Management', icon: <Scale className="w-4 h-4 shrink-0" /> },
    {
      id: 'tickets',
      label: 'Support Tickets',
      icon: <LifeBuoy className="w-4 h-4 shrink-0" />,
      badge: openTicketsCount || undefined,
    },
    { id: 'server-settings', label: 'Server Settings', icon: <Server className="w-4 h-4 shrink-0" /> },
    {
      id: 'payment-settings',
      label: 'Payment Settings',
      icon: <CreditCard className="w-4 h-4 shrink-0" />,
    },
    { id: 'admin-settings', label: 'Admin Settings', icon: <Sliders className="w-4 h-4 shrink-0" /> },
  ];

  const activeNavMeta = navItems.find((i) => i.id === activeSection) || navItems[0];

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-[#070817] border-r border-violet-500/25">
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-violet-500/20 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 border border-violet-400/50 flex items-center justify-center shadow-[0_0_18px_rgba(147,51,234,0.45)] shrink-0">
            <Crown className="w-4 h-4 text-amber-300" />
          </div>
          {(!sidebarCollapsed || isMobile) && (
            <div className="leading-tight min-w-0">
              <div className="font-display text-sm font-extrabold tracking-wider text-white truncate">
                VOLEXMC
              </div>
              <div className="text-[10px] font-semibold tracking-widest text-violet-300 uppercase">
                Admin Panel
              </div>
            </div>
          )}
        </div>

        {isMobile ? (
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(false)}
            aria-label="Close sidebar"
            className="p-1.5 rounded-lg bg-white/5 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Nav Links (14 sections) */}
      <nav aria-label="Admin Navigation" className="flex-1 overflow-y-auto p-2.5 space-y-1">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              title={sidebarCollapsed && !isMobile ? item.label : undefined}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'volex-glow-btn text-white'
                  : 'text-slate-300 hover:text-white hover:bg-violet-600/15 border border-transparent hover:border-violet-500/25'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={isActive ? 'text-amber-300' : 'text-violet-400'}>
                  {item.icon}
                </span>
                {(!sidebarCollapsed || isMobile) && (
                  <span className="truncate">{item.label}</span>
                )}
              </div>
              {(!sidebarCollapsed || isMobile) && item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono-nums font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-violet-500/20 text-violet-200 border border-violet-500/35'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 15th Sidebar Item: Logout */}
      <div className="p-2.5 border-t border-violet-500/20 shrink-0">
        <button
          type="button"
          onClick={() => void handleAdminLogout()}
          title={sidebarCollapsed && !isMobile ? 'Logout' : undefined}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-rose-500/12 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 cursor-pointer transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {(!sidebarCollapsed || isMobile) && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  const visibleTickets =
    ticketFilter === 'All'
      ? supportTickets
      : supportTickets.filter((t) => t.status === ticketFilter);

  return (
    <div className="min-h-screen flex bg-[#050612] text-slate-100">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 sticky top-0 h-screen transition-all duration-200 ${
          sidebarCollapsed ? 'w-[76px]' : 'w-[258px]'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Slide-Over Sidebar */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile admin navigation"
            className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm lg:hidden flex"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[270px] h-full"
            >
              {renderSidebarContent(true)}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Admin Header Bar */}
        <header className="sticky top-0 z-30 h-16 px-4 lg:px-7 border-b border-violet-500/25 bg-[#070817]/90 backdrop-blur-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open admin navigation"
              className="lg:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-slate-200 cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-base sm:text-lg font-extrabold text-white truncate">
                  {activeNavMeta.label}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-600/20 border border-violet-500/35 text-[10px] font-semibold text-violet-200">
                  <ShieldCheck className="w-3 h-3 text-amber-300" />
                  <span>{adminIdentity}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSeedDatabase}
              className="px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/35 border border-violet-400/45 text-xs font-semibold text-violet-100 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-violet-300" />
              <span className="hidden sm:inline">Sync Defaults</span>
            </button>

            <Link
              to="/"
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5"
            >
              <span>View Storefront</span>
              <ExternalLink className="w-3.5 h-3.5 text-violet-300" />
            </Link>
          </div>
        </header>

        {/* Workspace Canvas */}
        <main className="flex-1 p-4 lg:p-7 max-w-[1520px] w-full mx-auto space-y-5">
          {serverAdmin?.mustChangePassword && activeSection !== 'admin-settings' && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-amber-500/12 border border-amber-400/45 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-100"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
                <span>
                  Security reminder: You are signed in with initial bootstrap credentials. Rotate your password in Admin Settings.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('admin-settings')}
                className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-bold cursor-pointer self-start sm:self-auto"
              >
                Open Admin Settings
              </button>
            </div>
          )}

          {statusMsg && (
            <div
              role="status"
              className="p-3 rounded-xl bg-violet-600/20 border border-violet-400/45 text-xs font-medium text-violet-100 flex items-center justify-between"
            >
              <span>{statusMsg}</span>
              <button
                type="button"
                onClick={() => setStatusMsg('')}
                className="text-xs underline ml-4 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {activeSection === 'overview' && (
            <AdminOverviewTab onNavigateTab={(tab) => setActiveSection(tab)} />
          )}

          {activeSection === 'website-editor' && <WebsiteEditorTab onStatus={setStatusMsg} />}

          {activeSection === 'products' && (
            <AdminProductsTab viewMode="products" onStatus={setStatusMsg} />
          )}

          {activeSection === 'categories' && (
            <AdminProductsTab viewMode="categories" onStatus={setStatusMsg} />
          )}

          {activeSection === 'orders' && <AdminOrdersTab onStatus={setStatusMsg} />}

          {activeSection === 'payments' && (
            <AdminPaymentsTab mode="submissions" onStatus={setStatusMsg} />
          )}

          {activeSection === 'users' && <AdminUsersTab onStatus={setStatusMsg} />}

          {activeSection === 'staff' && (
            <AdminContentTab viewMode="staff" onStatus={setStatusMsg} />
          )}

          {activeSection === 'wiki' && (
            <AdminContentTab viewMode="wiki" onStatus={setStatusMsg} />
          )}

          {activeSection === 'rules' && (
            <AdminContentTab viewMode="rules" onStatus={setStatusMsg} />
          )}

          {activeSection === 'tickets' && (
            <section className="volex-panel rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-white">Support Tickets</h2>
                  <p className="text-xs text-slate-400">
                    Respond to player inquiries, rank issues, and payment disputes.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(['All', 'Open', 'In Progress', 'Resolved', 'Closed'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTicketFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                        ticketFilter === st
                          ? 'volex-glow-btn text-white'
                          : 'bg-[#070918] border border-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {visibleTickets.length === 0 ? (
                <p className="text-sm text-slate-400 py-4">No support tickets in this view.</p>
              ) : (
                <div className="space-y-3">
                  {visibleTickets.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl bg-[#070918] border border-white/10 space-y-2.5"
                    >
                      <div className="flex flex-wrap justify-between gap-2 text-xs">
                        <span className="font-bold text-white">
                          {t.subject} · <span className="text-cyan-300">{t.minecraftUsername}</span>{' '}
                          <span className="text-slate-400 font-normal">({t.category})</span>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-violet-500/20 border border-violet-400/35 text-violet-200 font-semibold">
                          {t.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{t.message}</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          placeholder="Staff reply..."
                          value={replyDrafts[t.id] ?? t.adminReply ?? ''}
                          onChange={(e) =>
                            setReplyDrafts({ ...replyDrafts, [t.id]: e.target.value })
                          }
                          className="flex-1 px-3 py-1.5 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                        />
                        <div className="flex gap-1.5">
                          {(['In Progress', 'Resolved', 'Closed'] as TicketStatus[]).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() =>
                                void updateSupportTicket(
                                  t.id,
                                  st,
                                  replyDrafts[t.id] ?? t.adminReply ?? ''
                                ).then(() => {
                                  setStatusMsg(`Ticket updated to ${st}.`);
                                  showToast({ tone: 'success', title: `Ticket marked ${st}` });
                                })
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-violet-600/30 text-[11px] font-semibold text-white cursor-pointer"
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeSection === 'server-settings' && (
            <AdminSecurityTab mode="server" onStatus={setStatusMsg} />
          )}

          {activeSection === 'payment-settings' && (
            <AdminPaymentsTab mode="settings" onStatus={setStatusMsg} />
          )}

          {activeSection === 'admin-settings' && (
            <AdminSecurityTab mode="admin" onStatus={setStatusMsg} />
          )}
        </main>
      </div>
    </div>
  );
}
