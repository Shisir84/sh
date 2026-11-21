import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  ChevronDown,
  Crown,
  ExternalLink,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  ShoppingCart,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { WebsiteEditorConfig } from '../types/store';

export function Navbar({
  websiteOverride,
}: {
  websiteOverride?: WebsiteEditorConfig;
} = {}) {
  const {
    user,
    userProfile,
    isAdmin,
    logout,
    siteConfig,
    publishedWebsite,
    serverStatus,
    statusLoading,
    cartCount,
    openCart,
    currency,
    setCurrency,
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    storeSettings,
  } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `relative whitespace-nowrap shrink-0 px-1.5 lg:px-2.5 py-1.5 text-xs lg:text-sm font-medium transition-colors rounded-lg ${
      isActive
        ? 'text-white'
        : 'text-slate-300 hover:text-white hover:bg-white/5'
    }`;

  const playerCountLabel =
    statusLoading && !serverStatus
      ? 'Checking...'
      : serverStatus?.online
        ? `${serverStatus.players.online}/${serverStatus.players.max} On`
        : 'Offline';

  const website = websiteOverride || publishedWebsite;

  const enabledNavLinks = [...website.navLinks]
    .filter((item) => item.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const announcementText =
    website.announcementEnabled && website.announcementBanner
      ? website.announcementBanner
      : siteConfig.announcementEnabled && siteConfig.announcementBanner
        ? siteConfig.announcementBanner
        : '';

  return (
    <header className="sticky top-0 z-40 border-b border-violet-500/25 bg-[#070817]/90 backdrop-blur-xl">
      {storeSettings.maintenanceMode && (
        <div className="bg-amber-500/20 border-b border-amber-400/40 px-4 py-1.5 text-center text-xs font-semibold text-amber-200 flex items-center justify-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" aria-hidden="true" />
          <span>{storeSettings.maintenanceMessage}</span>
        </div>
      )}

      {announcementText && !storeSettings.maintenanceMode && (
        <div className="bg-gradient-to-r from-violet-950/90 via-purple-900/80 to-indigo-950/90 border-b border-violet-500/30 px-4 py-1.5 text-center text-xs font-medium text-violet-100">
          {announcementText}
        </div>
      )}

      <div className="max-w-[1440px] mx-auto px-2.5 sm:px-3 lg:px-6 h-16 flex items-center justify-between gap-1.5 lg:gap-3">
        {/* Left: Brand Logo + Name + Subtitle */}
        <Link
          to="/"
          className="flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 shrink-0 min-w-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 border border-violet-400/50 flex items-center justify-center shadow-[0_0_22px_rgba(147,51,234,0.5)] group-hover:scale-105 transition-transform shrink-0 overflow-hidden">
            {website.brandLogoUrl ? (
              <img
                src={website.brandLogoUrl}
                alt={website.brandName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <Crown className="w-4 h-4 lg:w-5 lg:h-5 text-amber-300" aria-hidden="true" />
            )}
          </div>
          <div className="leading-tight min-w-0">
            <div className="font-display text-sm sm:text-base lg:text-lg font-extrabold tracking-wider text-white whitespace-nowrap">
              {website.brandName || 'VOLEXMC'}
            </div>
            <div className="block md:hidden xl:block text-[8px] sm:text-[9px] lg:text-[10px] font-semibold tracking-[0.06em] sm:tracking-[0.12em] lg:tracking-[0.16em] text-violet-300/90 whitespace-nowrap">
              {website.brandSubtitle || 'PLAY • SURVIVE • EXPLORE'}
            </div>
          </div>
        </Link>

        {/* Center: Primary Navigation */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-0.5 lg:gap-1.5"
        >
          {enabledNavLinks.map((item) => {
            const href =
              item.label.toLowerCase() === 'discord' && siteConfig.discordUrl
                ? siteConfig.discordUrl
                : item.url;

            if (item.external || /^https?:\/\//i.test(href)) {
              return (
                <a
                  key={item.id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-nowrap shrink-0 px-1.5 lg:px-2.5 py-1.5 text-xs lg:text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg inline-flex items-center gap-1 transition-colors"
                >
                  <span>{item.label}</span>
                  <ExternalLink className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-violet-400" aria-hidden="true" />
                </a>
              );
            }

            return (
              <NavLink
                key={item.id}
                to={href}
                end={href === '/'}
                className={navLinkClass}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="volex-nav-pill"
                        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                        className="absolute inset-0 rounded-lg bg-violet-600/25 border border-violet-500/45 -z-10"
                      />
                    )}
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Right: Currency + Status + Notifications + Cart + Profile + ADMIN */}
        <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 shrink-0">
          {/* Currency Switcher */}
          <div
            className="hidden sm:inline-flex items-center rounded-lg bg-[#0e122b] border border-violet-500/25 p-0.5 shrink-0"
            role="group"
            aria-label="Currency selector"
          >
            <button
              type="button"
              onClick={() => setCurrency('INR')}
              className={`px-1.5 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                currency === 'INR'
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              INR
            </button>
            <button
              type="button"
              onClick={() => setCurrency('NPR')}
              className={`px-1.5 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                currency === 'NPR'
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              NPR
            </button>
          </div>

          <div
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0e122b] border border-violet-500/25 text-[11px] font-medium text-slate-200 whitespace-nowrap"
            title={`Server Status (${siteConfig.serverIp})`}
          >
            <Users className="w-3.5 h-3.5 text-violet-400 shrink-0" aria-hidden="true" />
            <span className="font-mono-nums">{playerCountLabel}</span>
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              aria-label={`Notifications (${unreadNotificationCount} unread)`}
              className="relative p-1.5 sm:p-2 rounded-xl bg-[#0e122b] hover:bg-violet-600/25 border border-violet-500/30 text-slate-200 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <Bell className="w-4 h-4 text-violet-300" aria-hidden="true" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold flex items-center justify-center font-mono-nums">
                  {unreadNotificationCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl volex-panel p-3 shadow-2xl z-50 space-y-2"
                >
                  <div className="flex items-center justify-between border-b border-violet-500/20 pb-2">
                    <span className="font-display text-xs font-bold text-white uppercase tracking-wider">
                      Realm Notifications
                    </span>
                    {unreadNotificationCount > 0 && (
                      <button
                        type="button"
                        onClick={() => void markNotificationRead()}
                        className="text-[11px] text-violet-300 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      {user
                        ? 'No new notifications yet.'
                        : 'Sign in to receive order & delivery alerts.'}
                    </p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-1.5">
                      {notifications.slice(0, 6).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            void markNotificationRead(n.id);
                            setNotifOpen(false);
                            if (n.linkUrl) navigate(n.linkUrl);
                          }}
                          className={`w-full text-left p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                            n.read
                              ? 'bg-[#070918]/70 border-white/5 text-slate-300'
                              : 'bg-violet-600/15 border-violet-400/40 text-white'
                          }`}
                        >
                          <div className="font-semibold flex items-center justify-between gap-2">
                            <span className="truncate">{n.title}</span>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
                          </div>
                          <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">{n.message}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  <Link
                    to="/announcements"
                    onClick={() => setNotifOpen(false)}
                    className="block text-center text-[11px] font-semibold text-violet-300 hover:text-white pt-1 border-t border-white/10"
                  >
                    View Server Announcements & Events →
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={openCart}
            aria-label={`Open shopping cart (${cartCount} items)`}
            className="relative p-1.5 sm:p-2 rounded-xl bg-[#0e122b] hover:bg-violet-600/25 border border-violet-500/30 text-slate-200 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <ShoppingCart className="w-4 h-4 text-violet-300" aria-hidden="true" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 text-[10px] font-extrabold text-white flex items-center justify-center shadow-[0_0_12px_rgba(217,70,239,0.7)] font-mono-nums">
                {cartCount}
              </span>
            )}
          </button>

          {!user ? (
            <Link
              to="/login"
              className="volex-glow-btn px-2.5 sm:px-3.5 py-1.5 lg:py-2 rounded-lg text-[11px] sm:text-xs lg:text-sm font-semibold text-white whitespace-nowrap shrink-0"
            >
              Login
            </Link>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                aria-expanded={profileOpen}
                aria-label="Open user profile menu"
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-[#111533] border border-violet-500/35 hover:border-violet-400 transition-colors cursor-pointer"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Player'}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg object-cover border border-violet-400/40"
                  />
                ) : (
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-violet-700 flex items-center justify-center">
                    <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" aria-hidden="true" />
                  </div>
                )}
                <span className="hidden xl:inline text-xs font-semibold text-white max-w-[90px] truncate">
                  {userProfile?.minecraftUsername || user.displayName || 'Account'}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                    profileOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 rounded-xl volex-panel p-2 shadow-2xl z-50"
                  >
                    <div className="px-3 py-2 border-b border-violet-500/20 mb-1">
                      <p className="text-xs font-semibold text-white truncate">
                        {user.displayName}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {user.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/dashboard');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-violet-600/20 rounded-lg cursor-pointer"
                    >
                      <LayoutDashboard className="w-4 h-4 text-violet-400" aria-hidden="true" />
                      <span>Player Dashboard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/orders');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-violet-600/20 rounded-lg cursor-pointer"
                    >
                      <History className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                      <span>Order History</span>
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          navigate('/admin');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/15 rounded-lg cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-amber-400" aria-hidden="true" />
                        <span>Admin Dashboard</span>
                      </button>
                    )}
                    <div className="my-1 border-t border-violet-500/20" />
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        void logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/15 rounded-lg cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                      <span>Sign Out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Extreme Right: Neon Purple Glassmorphism ADMIN Button */}
          <Link
            to="/admin/login"
            aria-label="Open VOLEXMC Admin Login"
            className="group inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 lg:py-2 rounded-lg bg-[#0d0a24]/85 backdrop-blur-md border border-purple-400/70 hover:border-fuchsia-400 text-[10px] sm:text-xs font-display font-bold tracking-wider uppercase text-violet-100 hover:text-white shadow-[0_0_16px_rgba(147,51,234,0.45),inset_0_1px_0_rgba(255,255,255,0.14)] hover:bg-violet-600/25 hover:shadow-[0_0_26px_rgba(168,85,247,0.78)] hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap shrink-0"
          >
            <ShieldCheck
              className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-violet-300 group-hover:text-amber-300 transition-colors shrink-0"
              aria-hidden="true"
            />
            <span>ADMIN</span>
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="md:hidden p-1.5 sm:p-2 rounded-lg bg-[#10142c] border border-violet-500/30 text-slate-200 hover:text-white cursor-pointer shrink-0"
          >
            {mobileOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden border-t border-violet-500/20 bg-[#080a1c]"
          >
            <div className="px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#0f132e] border border-violet-500/20 text-xs text-slate-200 mb-2">
                <span>Currency & Players</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrency(currency === 'INR' ? 'NPR' : 'INR')}
                    className="px-2 py-0.5 rounded bg-violet-600/40 border border-violet-400/50 text-[10px] font-bold text-white cursor-pointer"
                  >
                    {currency}
                  </button>
                  <span className="font-mono-nums text-violet-300">{playerCountLabel}</span>
                </div>
              </div>
              {[
                { to: '/', label: 'Home' },
                { to: '/store', label: 'Store' },
                { to: '/announcements', label: 'News & Events' },
                { to: '/wiki', label: 'Wiki' },
                { to: '/staff', label: 'Staff' },
                { to: '/rules', label: 'Rules' },
                { to: '/support', label: 'Support' },
                ...(user
                  ? [
                      { to: '/dashboard', label: 'Player Dashboard' },
                      { to: '/orders', label: 'Order History' },
                    ]
                  : [
                      { to: '/login', label: 'Login' },
                      { to: '/register', label: 'Register' },
                    ]),
                { to: '/admin/login', label: isAdmin ? 'Admin Console' : 'Admin Login' },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-violet-600/20 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
              <a
                href={siteConfig.discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-violet-300 hover:bg-violet-600/20"
              >
                <span>Discord Community</span>
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
