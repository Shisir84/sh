import React from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { StoreProvider, useStore } from './context/StoreContext';
import { ToastProvider } from './components/ToastProvider';
import { LoadingScreen } from './components/LoadingScreen';
import { CustomCursor } from './components/CustomCursor';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { ProductDetailModal } from './components/ProductDetailModal';
import { PurchaseModal } from './components/PurchaseModal';
import { HomePage } from './pages/HomePage';
import { StorePage } from './pages/StorePage';
import { WikiPage } from './pages/WikiPage';
import { StaffPage } from './pages/StaffPage';
import { RulesPage } from './pages/RulesPage';
import { SupportPage } from './pages/SupportPage';
import { AuthPage } from './pages/AuthPages';
import { DashboardPage, OrderHistoryPage } from './pages/AccountPages';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboard } from './pages/AdminDashboard';

function AnimatedRouteShell() {
  const location = useLocation();

  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="flex-1"
    >
      <Routes location={location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/store" element={<StorePage />} />
        <Route path="/wiki" element={<WikiPage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/orders" element={<OrderHistoryPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </motion.div>
  );
}

function ThemedAppShell() {
  const { publishedWebsite } = useStore();
  const location = useLocation();
  const isAdminPanelRoute = location.pathname.startsWith('/admin') && location.pathname !== '/admin/login';

  const theme = publishedWebsite.theme;
  const themeStyle = isAdminPanelRoute
    ? undefined
    : ({
        '--volex-bg': theme.backgroundColor,
        '--volex-primary': theme.primaryColor,
        '--volex-secondary': theme.secondaryColor,
        '--volex-btn': theme.buttonColor,
        '--volex-border': theme.borderColor,
        '--volex-glow': String((theme.glowIntensity ?? 75) / 100),
        '--font-display': `'${theme.displayFont}', system-ui, sans-serif`,
        '--font-body': `'${theme.bodyFont}', system-ui, sans-serif`,
        backgroundColor: theme.backgroundColor,
      } as React.CSSProperties);

  const storeBg = !isAdminPanelRoute ? publishedWebsite.backgrounds?.storeBgUrl : '';

  return (
    <div
      style={themeStyle}
      className={`min-h-screen flex flex-col bg-[#060714] text-slate-100 relative ${
        !isAdminPanelRoute && !theme.animationsEnabled ? 'volex-no-animations' : ''
      }`}
    >
      {storeBg ? (
        <div
          className="fixed inset-0 pointer-events-none opacity-15 bg-cover bg-center"
          style={{ backgroundImage: `url(${storeBg})` }}
          aria-hidden="true"
        />
      ) : null}
      {/* Subtle ambient royal-violet atmosphere */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: isAdminPanelRoute
            ? 'radial-gradient(ellipse at top, rgba(124,58,237,0.14), transparent 55%)'
            : `radial-gradient(ellipse at top, color-mix(in srgb, ${theme.primaryColor} 18%, transparent), transparent 55%)`,
        }}
        aria-hidden="true"
      />
      <div className="relative z-10 flex-1 flex flex-col">
        {!isAdminPanelRoute && <Navbar />}
        <AnimatedRouteShell />
        {!isAdminPanelRoute && <Footer />}
      </div>
      <CartDrawer />
      <ProductDetailModal />
      <PurchaseModal />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <ToastProvider>
          <BrowserRouter>
            <LoadingScreen />
            <CustomCursor />
            <ThemedAppShell />
          </BrowserRouter>
        </ToastProvider>
      </StoreProvider>
    </ErrorBoundary>
  );
}

