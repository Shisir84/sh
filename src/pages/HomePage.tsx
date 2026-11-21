import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Check,
  Copy,
  CreditCard,
  Headphones,
  LifeBuoy,
  Lock,
  Megaphone,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Tag,
  Zap,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { AnimatedHero } from '../components/AnimatedHero';
import { CategoryIcon } from '../components/CategoryIcon';
import { ProductCard } from '../components/ProductCard';
import { DISCORD_GIFT_URL } from '../data/seedData';
import type { PageSectionItem, WebsiteEditorConfig } from '../types/store';
import {
  filterStoreProducts,
  getEnabledPaymentMethods,
} from '../utils/storeLogic';

export function HomePage({
  websiteOverride,
  previewViewport,
}: {
  websiteOverride?: WebsiteEditorConfig;
  previewViewport?: 'desktop' | 'tablet' | 'mobile';
} = {}) {
  const {
    siteConfig,
    publishedWebsite,
    categories,
    products,
    paymentMethods,
    serverStatus,
    statusLoading,
    refreshServerStatus,
    openCheckout,
  } = useStore();

  const website = websiteOverride || publishedWebsite;
  const [activeCategory, setActiveCategory] = useState<string>('featured');
  const [copiedIp, setCopiedIp] = useState(false);

  const activeCategories = useMemo(
    () => categories.filter((c) => c.active).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const displayedProducts = useMemo(() => {
    if (activeCategory === 'featured') {
      return filterStoreProducts(products, { featuredOnly: true }).slice(0, 4);
    }
    return filterStoreProducts(products, { category: activeCategory });
  }, [products, activeCategory]);

  const enabledMethods = useMemo(
    () => getEnabledPaymentMethods(paymentMethods),
    [paymentMethods]
  );

  const orderedSections = useMemo(
    () =>
      [...website.sections]
        .filter((s) => s.visible)
        .sort((a, b) => a.order - b.order),
    [website.sections]
  );

  const heroSectionVisible = orderedSections.some((s) => s.type === 'hero');
  const featuredSection = orderedSections.find((s) => s.type === 'featured-products');
  const guaranteesSection = orderedSections.find((s) => s.type === 'guarantees');
  const extraSections = orderedSections.filter(
    (s) => s.type === 'custom-banner' || s.type === 'community'
  );

  const handleCopyIp = async () => {
    try {
      await navigator.clipboard.writeText(siteConfig.serverIp);
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 1800);
    } catch {
      // ignore clipboard restrictions
    }
  };

  const renderExtraSection = (sec: PageSectionItem) => (
    <section
      key={sec.id}
      aria-label={sec.title}
      className="volex-panel rounded-2xl p-6 sm:p-8 relative overflow-hidden"
      style={
        sec.backgroundUrl
          ? {
              backgroundImage: `linear-gradient(90deg, rgba(6,7,20,0.92), rgba(14,10,36,0.8)), url(${sec.backgroundUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          {sec.subtitle && (
            <div className="text-xs font-bold uppercase tracking-wider text-violet-300">
              {sec.subtitle}
            </div>
          )}
          <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white">
            {sec.title}
          </h2>
          {sec.body && <p className="text-sm text-slate-200 leading-relaxed">{sec.body}</p>}
        </div>
        {sec.ctaText && (
          <a
            href={sec.ctaUrl || '/store'}
            className="volex-glow-btn px-5 py-2.5 rounded-xl text-xs font-bold text-white inline-flex items-center gap-1.5 shrink-0 self-start md:self-auto"
          >
            <span>{sec.ctaText}</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        )}
      </div>
    </section>
  );

  const renderGuarantees = () => (
    <section
      key="guarantees"
      aria-label="Store Guarantees and Support"
      className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch"
    >
      <div className="lg:col-span-9 volex-panel rounded-2xl p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/35 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-violet-300" aria-hidden="true" />
          </div>
          <div>
            <div className="font-display text-sm font-bold text-white">Instant Delivery</div>
            <div className="text-xs text-slate-400">Fast realm fulfillment</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/35 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-cyan-300" aria-hidden="true" />
          </div>
          <div>
            <div className="font-display text-sm font-bold text-white">100% Secure</div>
            <div className="text-xs text-slate-400">Verified proof checks</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-400/35 flex items-center justify-center shrink-0">
            <Headphones className="w-5 h-5 text-pink-300" aria-hidden="true" />
          </div>
          <div>
            <div className="font-display text-sm font-bold text-white">24/7 Support</div>
            <div className="text-xs text-slate-400">Dedicated staff team</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/35 flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5 text-amber-300" aria-hidden="true" />
          </div>
          <div>
            <div className="font-display text-sm font-bold text-white">Best Prices</div>
            <div className="text-xs text-slate-400">Transparent INR rates</div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 volex-panel rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 border-violet-500/40">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-violet-600/25 border border-violet-400/50 flex items-center justify-center shrink-0">
            <LifeBuoy className="w-5 h-5 text-violet-200" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="font-display text-sm font-bold text-white">Need Help?</div>
            <div className="text-xs text-slate-300 truncate">Questions or payment issues</div>
          </div>
        </div>
        <Link
          to="/support"
          className="volex-glow-btn px-4 py-2 rounded-xl text-xs font-bold text-white whitespace-nowrap shrink-0"
        >
          Support
        </Link>
      </div>
    </section>
  );

  const guaranteesBeforeStore =
    guaranteesSection &&
    orderedSections.findIndex((s) => s.id === guaranteesSection.id) <
      orderedSections.findIndex((s) => s.type === 'hero' || s.type === 'featured-products');

  return (
    <main className="max-w-[1440px] mx-auto px-4 lg:px-8 pt-6 pb-10 space-y-8">
      {/* Optional Promotional Banner */}
      {website.promoBannerEnabled && website.promoBannerText && (
        <div className="volex-panel rounded-2xl px-5 py-3.5 border-amber-400/40 bg-gradient-to-r from-violet-950/80 via-fuchsia-950/60 to-amber-950/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-amber-200">
            <Megaphone className="w-4 h-4 text-amber-300 shrink-0" aria-hidden="true" />
            <span>{website.promoBannerText}</span>
          </div>
          <Link
            to="/store"
            className="text-xs font-bold text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg"
          >
            Browse Deals →
          </Link>
        </div>
      )}

      {guaranteesBeforeStore && renderGuarantees()}

      {/* 3-Column Store Layout */}
      <div
        className={`flex flex-col ${
          previewViewport && previewViewport !== 'desktop' ? '' : 'lg:flex-row'
        } gap-6 items-start`}
      >
        {/* LEFT SIDEBAR: Categories + Discord Promo */}
        <motion.aside
          initial={website.theme.animationsEnabled ? { opacity: 0, x: -12 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          className={`order-2 ${
            previewViewport && previewViewport !== 'desktop'
              ? 'w-full'
              : 'lg:order-1 w-full lg:w-[245px]'
          } shrink-0 space-y-5`}
        >
          {/* Categories Panel */}
          <section
            aria-label="Store Categories"
            className="volex-panel rounded-2xl p-3.5 space-y-2"
          >
            <div className="flex items-center justify-between px-2 pb-1.5 border-b border-violet-500/20">
              <h2 className="font-display text-xs font-bold tracking-wider uppercase text-violet-200">
                Categories
              </h2>
              {activeCategory !== 'featured' && (
                <button
                  type="button"
                  onClick={() => setActiveCategory('featured')}
                  className="text-[11px] font-medium text-violet-300 hover:text-white cursor-pointer"
                >
                  Featured
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 gap-1.5">
              {activeCategories.map((cat) => {
                const isSelected =
                  activeCategory.toLowerCase() === cat.name.toLowerCase();
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setActiveCategory(isSelected ? 'featured' : cat.name)
                    }
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-violet-600/85 to-purple-700/85 text-white border border-violet-400/60 shadow-[0_0_20px_rgba(139,92,246,0.45)]'
                        : 'bg-[#090c1e]/70 text-slate-300 border border-transparent hover:border-violet-500/35 hover:bg-violet-600/15 hover:text-white hover:translate-x-0.5'
                    }`}
                  >
                    <CategoryIcon
                      icon={cat.icon}
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? 'text-amber-300' : 'text-violet-400'
                      }`}
                    />
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Discord Promotional Card */}
          <section
            aria-label="Join Discord"
            className="volex-panel rounded-2xl p-4 text-center relative overflow-hidden"
          >
            <div
              className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-violet-600/20 blur-2xl pointer-events-none"
              aria-hidden="true"
            />
            <div className="w-24 h-24 mx-auto mb-3 rounded-2xl overflow-hidden border border-violet-500/35 bg-[#080a1a] shadow-[0_0_25px_rgba(139,92,246,0.25)]">
              <img
                src={DISCORD_GIFT_URL}
                alt="VOLEXMC Discord Mystery Gift"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="font-display text-base font-extrabold tracking-wide text-white">
              JOIN OUR DISCORD!
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Get latest updates, events and more!
            </p>
            <a
              href={siteConfig.discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="volex-glow-btn mt-4 w-full py-2.5 px-4 rounded-xl text-xs font-bold tracking-wider text-white inline-flex items-center justify-center gap-1.5"
            >
              <span>JOIN NOW</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </section>
        </motion.aside>

        {/* CENTER COLUMN: Animated Hero + Featured Products Grid */}
        <div
          className={`order-1 ${
            previewViewport && previewViewport !== 'desktop' ? '' : 'lg:order-2'
          } flex-1 min-w-0 space-y-6 w-full`}
        >
          {heroSectionVisible && (
            <AnimatedHero
              siteConfig={siteConfig}
              websiteConfig={website}
              serverStatus={serverStatus}
            />
          )}

          {/* Product Store Section */}
          {featuredSection && (
            <section id="featured-store" aria-label="Featured Store Products" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-violet-400" aria-hidden="true" />
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                    {activeCategory === 'featured'
                      ? website.featuredSectionHeading || featuredSection.title || 'Featured Store'
                      : `${activeCategory} Catalog`}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {activeCategory !== 'featured' && (
                    <button
                      type="button"
                      onClick={() => setActiveCategory('featured')}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 cursor-pointer"
                    >
                      Show Featured
                    </button>
                  )}
                  <Link
                    to="/store"
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600/20 hover:bg-violet-600/35 text-violet-200 border border-violet-500/40 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <span>{featuredSection.ctaText || 'View All'}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {displayedProducts.length === 0 ? (
                <div className="volex-panel rounded-2xl p-8 text-center space-y-3">
                  <p className="text-sm text-slate-300">
                    No products found in {activeCategory}.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveCategory('featured')}
                    className="volex-glow-btn px-4 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer"
                  >
                    Return to Featured
                  </button>
                </div>
              ) : (
                <div
                  className={`grid grid-cols-1 ${
                    previewViewport === 'mobile'
                      ? ''
                      : previewViewport === 'tablet'
                        ? 'sm:grid-cols-2'
                        : 'sm:grid-cols-2 xl:grid-cols-4'
                  } gap-4`}
                >
                  {displayedProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onBuy={openCheckout}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* RIGHT SIDEBAR: Server Information + Payment Methods */}
        <aside
          className={`order-3 w-full ${
            previewViewport && previewViewport !== 'desktop' ? '' : 'lg:w-[265px]'
          } shrink-0 space-y-5`}
        >
          {/* Server Information Panel */}
          <section
            aria-label="Server Information"
            className="volex-panel rounded-2xl p-4 space-y-3.5"
          >
            <div className="flex items-center justify-between pb-2 border-b border-violet-500/20">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-violet-400" aria-hidden="true" />
                <h2 className="font-display text-xs font-bold tracking-wider uppercase text-violet-200">
                  Server Information
                </h2>
              </div>
              <button
                type="button"
                onClick={() => void refreshServerStatus()}
                aria-label="Refresh server status"
                className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${statusLoading ? 'animate-spin text-violet-400' : ''}`}
                />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#070918] border border-white/10">
                <span className="text-slate-400">Online Players</span>
                <span
                  className={`font-mono-nums font-bold ${
                    serverStatus?.online ? 'text-emerald-300' : 'text-slate-300'
                  }`}
                >
                  {statusLoading && !serverStatus
                    ? 'Checking...'
                    : serverStatus?.online
                      ? `${serverStatus.players.online} / ${serverStatus.players.max}`
                      : '0 / 0 (Offline)'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#070918] border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Server IP</span>
                  <button
                    type="button"
                    onClick={handleCopyIp}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-300 hover:text-white cursor-pointer"
                  >
                    {copiedIp ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-300">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy IP</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono-nums text-xs font-semibold text-cyan-300 truncate">
                  {siteConfig.serverIp}
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#070918] border border-white/10">
                <span className="text-slate-400">Minecraft Version</span>
                <span className="font-mono-nums font-semibold text-white">
                  {serverStatus?.version || siteConfig.minecraftVersion}
                </span>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                <span className="font-semibold">Secure &amp; Trusted Store</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/staff"
                  className="text-center py-2 rounded-xl bg-white/5 hover:bg-violet-600/20 border border-white/10 text-slate-200 font-medium transition-colors"
                >
                  Staff Team
                </Link>
                <Link
                  to="/rules"
                  className="text-center py-2 rounded-xl bg-white/5 hover:bg-violet-600/20 border border-white/10 text-slate-200 font-medium transition-colors"
                >
                  Server Rules
                </Link>
              </div>
            </div>
          </section>

          {/* Payment Methods Panel */}
          <section
            aria-label="Supported Payment Methods"
            className="volex-panel rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-violet-500/20">
              <CreditCard className="w-4 h-4 text-violet-400" aria-hidden="true" />
              <h2 className="font-display text-xs font-bold tracking-wider uppercase text-violet-200">
                Payment Methods
              </h2>
            </div>

            {enabledMethods.length === 0 ? (
              <p className="text-xs text-slate-400">
                No payment gateways currently enabled.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {enabledMethods.map((method) => {
                  const badgeTone: Record<string, string> = {
                    esewa: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                    khalti: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
                    upi: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
                    paypal: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
                    visa: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
                    mastercard: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                  };
                  const tone =
                    badgeTone[method.id.toLowerCase()] ||
                    'bg-violet-500/20 text-violet-300 border-violet-500/40';
                  return (
                    <div
                      key={method.id}
                      className="px-2.5 py-2.5 rounded-xl bg-[#070918] border border-violet-500/25 flex items-center gap-2 text-xs font-bold text-slate-100"
                    >
                      <span
                        className={`w-6 h-6 rounded-lg border text-[11px] font-extrabold flex items-center justify-center shrink-0 ${tone}`}
                        aria-hidden="true"
                      >
                        {method.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="truncate">{method.name}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Only configured and verified payment options are displayed above.
            </p>
          </section>
        </aside>
      </div>

      {/* Custom / Community Sections added via Website Editor */}
      {extraSections.map((sec) => renderExtraSection(sec))}

      {/* BOTTOM FEATURE BAR + NEED HELP CARD */}
      {guaranteesSection && !guaranteesBeforeStore && renderGuarantees()}
    </main>
  );
}

