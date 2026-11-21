import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Check, Copy, Sparkles } from 'lucide-react';
import type { MinecraftServerStatus, SiteConfig, WebsiteEditorConfig } from '../types/store';

export function AnimatedHero({
  siteConfig,
  websiteConfig,
  serverStatus,
}: {
  siteConfig: SiteConfig;
  websiteConfig?: WebsiteEditorConfig;
  serverStatus: MinecraftServerStatus | null;
}) {
  const [copied, setCopied] = useState(false);

  const heroEyebrow = websiteConfig?.heroEyebrow ?? siteConfig.heroEyebrow;
  const heroTitle = websiteConfig?.heroTitle ?? siteConfig.heroTitle;
  const heroSubtitle = websiteConfig?.heroSubtitle ?? siteConfig.heroSubtitle;
  const heroDescription = websiteConfig?.heroDescription ?? siteConfig.heroDescription;
  const heroCtaText = websiteConfig?.heroCtaText ?? siteConfig.heroCtaText;
  const heroCtaUrl = websiteConfig?.heroCtaUrl || '#featured-store';
  const heroBg =
    websiteConfig?.heroImageUrl ||
    websiteConfig?.backgrounds?.heroBgUrl ||
    siteConfig.heroImageUrl;
  const heroCharacterUrl = websiteConfig?.heroCharacterUrl || '';
  const animationsEnabled = websiteConfig?.theme?.animationsEnabled !== false;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(siteConfig.serverIp);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <section
      aria-label="VOLEXMC Hero Banner"
      className="relative rounded-2xl overflow-hidden border border-violet-500/40 shadow-[0_24px_64px_-16px_rgba(124,58,237,0.55)] min-h-[340px] sm:min-h-[385px] flex items-center"
    >
      {/* Fantasy Castle & Sky Islands Backdrop */}
      <img
        src={heroBg}
        alt="VOLEXMC Fantasy Minecraft Castle, Sky Islands, Portal, and Dragon"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-center scale-[1.03]"
      />

      {/* Atmospheric Dark-Purple Scrim */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-[#050512]/95 via-[#09081d]/78 to-[#130a2c]/35"
        aria-hidden="true"
      />

      {/* Slowly Moving Background Clouds */}
      {animationsEnabled && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="cloud-drift-slow absolute -top-10 -left-16 w-[420px] h-[160px] rounded-full bg-violet-600/20 blur-3xl" />
          <div
            className="cloud-drift-slow absolute bottom-0 right-10 w-[380px] h-[150px] rounded-full bg-fuchsia-700/18 blur-3xl"
            style={{ animationDelay: '-9s' }}
          />
        </div>
      )}

      {/* Magical Rotating Purple Portal Aura on Right */}
      <div
        className="hidden sm:flex items-center justify-center absolute right-8 md:right-14 top-1/2 -translate-y-1/2 w-52 h-52 pointer-events-none"
        aria-hidden="true"
      >
        <div
          className={`absolute inset-0 rounded-full bg-violet-600/20 blur-2xl ${
            animationsEnabled ? 'animate-pulse' : ''
          }`}
        />
        <div
          className={`${
            animationsEnabled ? 'portal-spin' : ''
          } w-44 h-44 rounded-full border-2 border-dashed border-violet-400/50 shadow-[0_0_45px_rgba(168,85,247,0.45)] flex items-center justify-center`}
        >
          <div className="w-32 h-32 rounded-full border border-fuchsia-300/45 bg-gradient-to-br from-violet-600/20 to-cyan-400/10" />
        </div>
      </div>

      {/* Optional Custom Hero Character Artwork */}
      {heroCharacterUrl && (
        <div className="hidden sm:block absolute right-6 md:right-10 bottom-0 h-[86%] max-w-[230px] pointer-events-none z-10">
          <img
            src={heroCharacterUrl}
            alt="VOLEXMC Royal Character"
            referrerPolicy="no-referrer"
            className="h-full w-auto object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.8)]"
          />
        </div>
      )}

      {/* Animated Soaring Fantasy Dragon Silhouette */}
      {animationsEnabled && (
        <div
          className="dragon-soar hidden sm:block absolute top-3 left-0 w-24 h-14 pointer-events-none opacity-80"
          aria-hidden="true"
        >
          <svg viewBox="0 0 140 80" fill="none" className="w-full h-full drop-shadow-[0_0_16px_rgba(192,132,252,0.75)]">
            <path
              d="M18 44 C36 22, 56 12, 72 26 C88 10, 108 18, 126 36 C108 38, 94 42, 84 48 C96 58, 98 68, 86 72 C76 62, 66 56, 56 58 C46 66, 36 68, 28 60 C34 52, 28 46, 18 44 Z"
              fill="url(#dragonGrad)"
            />
            <defs>
              <linearGradient id="dragonGrad" x1="18" y1="12" x2="126" y2="72" gradientUnits="userSpaceOnUse">
                <stop stopColor="#e879f9" stopOpacity="0.9" />
                <stop offset="0.55" stopColor="#8b5cf6" stopOpacity="0.85" />
                <stop offset="1" stopColor="#22d3ee" stopOpacity="0.7" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}

      {/* Floating Magical Crystals & Arcane Particles */}
      {animationsEnabled && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div
            className="crystal-levitate hidden md:block absolute top-10 right-16 w-4 h-7 bg-gradient-to-b from-fuchsia-300 to-violet-600 rotate-12 opacity-75 shadow-[0_0_18px_rgba(192,132,252,0.85)]"
            style={{ clipPath: 'polygon(50% 0%, 100% 35%, 50% 100%, 0% 35%)' }}
          />
          <div
            className="crystal-levitate hidden md:block absolute bottom-12 right-44 w-3.5 h-6 bg-gradient-to-b from-cyan-300 to-violet-600 -rotate-12 opacity-70 shadow-[0_0_16px_rgba(34,211,238,0.8)]"
            style={{ clipPath: 'polygon(50% 0%, 100% 35%, 50% 100%, 0% 35%)', animationDelay: '1.8s' }}
          />

          <span className="particle-float absolute top-14 left-1/3 w-1.5 h-1.5 rounded-full bg-violet-300/90 shadow-[0_0_10px_#c084fc]" />
          <span
            className="particle-float absolute bottom-14 left-1/2 w-2 h-2 rounded-full bg-amber-300/85 shadow-[0_0_10px_#fcd34d]"
            style={{ animationDelay: '1.4s' }}
          />
          <span
            className="particle-float absolute top-24 right-1/3 w-1.5 h-1.5 rounded-full bg-cyan-300/85 shadow-[0_0_10px_#67e8f9]"
            style={{ animationDelay: '2.7s' }}
          />
          <span
            className="particle-float absolute bottom-20 left-1/4 w-1.5 h-1.5 rounded-full bg-fuchsia-400/80 shadow-[0_0_10px_#e879f9]"
            style={{ animationDelay: '3.6s' }}
          />
        </div>
      )}

      {/* Hero Typography & Actions */}
      <div className="relative z-10 p-6 sm:p-10 max-w-2xl space-y-3.5">
        <motion.div
          initial={animationsEnabled ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-violet-950/75 border border-violet-400/40 text-[11px] font-bold tracking-[0.22em] text-violet-200"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
          <span>{heroEyebrow}</span>
        </motion.div>

        <motion.h1
          initial={animationsEnabled ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.08 }}
          className={`font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-white ${
            animationsEnabled ? 'text-aura-pulse' : ''
          }`}
        >
          {heroTitle}
        </motion.h1>

        <motion.p
          initial={animationsEnabled ? { opacity: 0, y: 14 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.16 }}
          className="font-display text-sm sm:text-base font-bold tracking-wider text-amber-300"
        >
          {heroSubtitle}
        </motion.p>

        <motion.p
          initial={animationsEnabled ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.22 }}
          className="text-sm sm:text-base text-slate-200 max-w-md leading-relaxed"
        >
          {heroDescription}
        </motion.p>

        <motion.div
          initial={animationsEnabled ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.28 }}
          className="pt-2 flex flex-wrap items-center gap-3"
        >
          <a
            href={heroCtaUrl}
            className="volex-glow-btn inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wider text-white"
          >
            <span>{heroCtaText}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </a>

          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-3 rounded-xl bg-[#0b0d22]/85 hover:bg-[#141738] border border-violet-400/35 text-xs font-semibold text-slate-200 inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <span className="font-mono-nums text-cyan-300">{siteConfig.serverIp}</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-violet-300" aria-hidden="true" />
            )}
          </button>

          {serverStatus && (
            <span className="text-xs font-mono-nums text-slate-300 bg-[#080a1c]/80 border border-white/10 px-3 py-2 rounded-xl">
              {serverStatus.online
                ? `${serverStatus.players.online} Players Online`
                : `Java ${siteConfig.minecraftVersion}`}
            </span>
          )}
        </motion.div>
      </div>
    </section>
  );
}

