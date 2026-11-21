import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { useStore } from '../context/StoreContext';

import type { WebsiteEditorConfig } from '../types/store';

export function Footer({
  websiteOverride,
}: {
  websiteOverride?: WebsiteEditorConfig;
} = {}) {
  const { siteConfig, publishedWebsite, isAdmin } = useStore();
  const website = websiteOverride || publishedWebsite;
  const footerBg = website.backgrounds?.footerBgUrl;

  return (
    <footer
      className="border-t border-violet-500/20 bg-[#050611] mt-14 relative overflow-hidden"
      style={
        footerBg
          ? {
              backgroundImage: `linear-gradient(to bottom, rgba(5,6,17,0.88), rgba(5,6,17,0.96)), url(${footerBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-10 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 border border-violet-400/50 flex items-center justify-center overflow-hidden">
                {website.brandLogoUrl ? (
                  <img
                    src={website.brandLogoUrl}
                    alt={website.brandName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Crown className="w-4 h-4 text-amber-300" aria-hidden="true" />
                )}
              </div>
              <span className="font-display text-base font-bold tracking-wider text-white">
                {website.brandName || 'VOLEXMC'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Premium Minecraft MMORPG & Survival Store for {siteConfig.serverIp} (Minecraft {siteConfig.minecraftVersion}).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <div className="font-semibold text-white">Explore</div>
              <div className="flex flex-col gap-1.5 text-slate-400">
                <Link to="/" className="hover:text-violet-300 transition-colors">Home</Link>
                <Link to="/store" className="hover:text-violet-300 transition-colors">Store Catalog</Link>
                <Link to="/wiki" className="hover:text-violet-300 transition-colors">Server Wiki</Link>
                <Link to="/staff" className="hover:text-violet-300 transition-colors">Staff Team</Link>
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-white">Player Account</div>
              <div className="flex flex-col gap-1.5 text-slate-400">
                <Link to="/rules" className="hover:text-violet-300 transition-colors">Server Rules</Link>
                <Link to="/support" className="hover:text-violet-300 transition-colors">Support Center</Link>
                <Link to="/orders" className="hover:text-violet-300 transition-colors">Order History</Link>
                <Link
                  to={isAdmin ? '/admin' : '/admin/login'}
                  className="text-amber-300/90 hover:text-amber-200 transition-colors"
                >
                  {isAdmin ? 'Admin Console' : 'Admin Portal'}
                </Link>
              </div>
            </div>
          </div>

          <div className="md:text-right space-y-2 text-xs text-slate-400">
            <p className="text-slate-300 font-medium">
              VOLEXMC Network © {new Date().getFullYear()}
            </p>
            <p>
              Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
