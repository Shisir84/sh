import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Layers,
  Layout,
  Monitor,
  Navigation,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Send,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  Upload,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../ToastProvider';
import { THEME_PRESETS } from '../../data/seedData';
import type {
  BackgroundAsset,
  NavLinkItem,
  PageSectionItem,
  ThemeConfig,
  ThemePresetId,
  WebsiteEditorConfig,
} from '../../types/store';
import { compressImageToDataUrl } from '../../utils/imageHelpers';
import {
  applyThemePreset,
  moveArrayItem,
  reorderSectionsList,
  sanitizeSlugId,
} from '../../utils/storeLogic';
import { Navbar } from '../Navbar';
import { HomePage } from '../../pages/HomePage';
import { Footer } from '../Footer';

type EditorSubTab = 'homepage' | 'navigation' | 'theme' | 'backgrounds' | 'sections';
type PreviewViewport = 'desktop' | 'tablet' | 'mobile';

export function WebsiteEditorTab({
  onStatus,
}: {
  onStatus: (msg: string) => void;
}) {
  const {
    publishedWebsite,
    websiteDraft,
    saveWebsiteDraft,
    publishWebsiteDraft,
    discardWebsiteDraft,
  } = useStore();
  const { showToast } = useToast();

  const [localDraft, setLocalDraft] = useState<WebsiteEditorConfig>(websiteDraft);
  const [subTab, setSubTab] = useState<EditorSubTab>('homepage');
  const [viewport, setViewport] = useState<PreviewViewport>('desktop');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Navigation add form
  const [newNavLabel, setNewNavLabel] = useState('');
  const [newNavUrl, setNewNavUrl] = useState('');
  const [newNavExternal, setNewNavExternal] = useState(false);

  // Backgrounds gallery add form
  const [newBgLabel, setNewBgLabel] = useState('');
  const [newBgUrl, setNewBgUrl] = useState('');

  // Sections drag/edit state
  const [dragSectionId, setDragSectionId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionSubtitle, setNewSectionSubtitle] = useState('');
  const [newSectionBody, setNewSectionBody] = useState('');
  const [newSectionCta, setNewSectionCta] = useState('Explore Store');
  const [newSectionUrl, setNewSectionUrl] = useState('/store');

  useEffect(() => {
    setLocalDraft(websiteDraft);
  }, [websiteDraft]);

  const hasSavedDraftDiff = useMemo(
    () => JSON.stringify(localDraft) !== JSON.stringify(publishedWebsite),
    [localDraft, publishedWebsite]
  );

  const hasUnsavedEdits = useMemo(
    () => JSON.stringify(localDraft) !== JSON.stringify(websiteDraft),
    [localDraft, websiteDraft]
  );

  const handleUploadImageForField = async (
    field: 'brandLogoUrl' | 'heroImageUrl' | 'heroCharacterUrl',
    e: React.ChangeEvent<HTMLInputElement>,
    maxDim = 1280
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, maxDim, 320_000);
      setLocalDraft((prev) => ({ ...prev, [field]: dataUrl }));
      onStatus('Image loaded into editor draft. Click Save Changes or Publish Changes.');
    } catch (err) {
      showToast({
        tone: 'error',
        title: 'Image upload failed',
        description: err instanceof Error ? err.message : 'Unable to process image.',
      });
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const saved = await saveWebsiteDraft(localDraft);
      setLocalDraft(saved);
      onStatus('Website draft saved. Public storefront remains unchanged until you Publish Changes.');
      showToast({
        tone: 'success',
        title: 'Draft saved',
        description: 'Changes are stored in draft mode and not yet live.',
      });
    } catch (err) {
      showToast({
        tone: 'error',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unable to save draft.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const published = await publishWebsiteDraft(localDraft);
      setLocalDraft(published);
      onStatus('Website changes published live to the public VOLEXMC storefront!');
      showToast({
        tone: 'success',
        title: 'Changes published live!',
        description: 'Your public storefront now reflects these customizations.',
      });
    } catch (err) {
      showToast({
        tone: 'error',
        title: 'Publish failed',
        description: err instanceof Error ? err.message : 'Unable to publish website.',
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleDiscard = async () => {
    const reverted = await discardWebsiteDraft();
    setLocalDraft(reverted);
    onStatus('Draft discarded and reverted to currently published website.');
    showToast({ tone: 'info', title: 'Draft discarded' });
  };

  // Navigation Handlers
  const sortedNavLinks = useMemo(
    () => [...localDraft.navLinks].sort((a, b) => a.sortOrder - b.sortOrder),
    [localDraft.navLinks]
  );

  const updateNavList = (next: NavLinkItem[]) => {
    setLocalDraft((prev) => ({
      ...prev,
      navLinks: next.map((item, idx) => ({ ...item, sortOrder: idx + 1 })),
    }));
  };

  const handleAddNavLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNavLabel.trim() || !newNavUrl.trim()) return;
    const nextItem: NavLinkItem = {
      id: `nav-${sanitizeSlugId(newNavLabel) || Date.now()}`,
      label: newNavLabel.trim(),
      url: newNavUrl.trim(),
      external: newNavExternal || /^https?:\/\//i.test(newNavUrl.trim()),
      enabled: true,
      sortOrder: sortedNavLinks.length + 1,
    };
    updateNavList([...sortedNavLinks, nextItem]);
    setNewNavLabel('');
    setNewNavUrl('');
    setNewNavExternal(false);
  };

  // Theme Handlers
  const updateThemeField = <K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) => {
    setLocalDraft((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        preset: key === 'preset' ? (value as ThemePresetId) : 'custom',
        [key]: value,
      },
    }));
  };

  // Backgrounds Handlers
  const handleUploadGalleryBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, 1440, 340_000);
      const asset: BackgroundAsset = {
        id: `bg_${Date.now()}`,
        label: newBgLabel.trim() || file.name.replace(/\.[^/.]+$/, ''),
        url: dataUrl,
        createdAt: new Date().toISOString(),
      };
      setLocalDraft((prev) => ({
        ...prev,
        backgrounds: {
          ...prev.backgrounds,
          gallery: [asset, ...(prev.backgrounds.gallery || [])],
        },
      }));
      setNewBgLabel('');
      onStatus('Background image added to gallery.');
    } catch (err) {
      showToast({
        tone: 'error',
        title: 'Background upload failed',
        description: err instanceof Error ? err.message : 'Unable to upload background.',
      });
    }
  };

  const handleAddGalleryUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBgUrl.trim()) return;
    const asset: BackgroundAsset = {
      id: `bg_${Date.now()}`,
      label: newBgLabel.trim() || 'Custom Backdrop',
      url: newBgUrl.trim(),
      createdAt: new Date().toISOString(),
    };
    setLocalDraft((prev) => ({
      ...prev,
      backgrounds: {
        ...prev.backgrounds,
        gallery: [asset, ...(prev.backgrounds.gallery || [])],
      },
    }));
    setNewBgLabel('');
    setNewBgUrl('');
  };

  // Sections Handlers
  const sortedSections = useMemo(
    () => [...localDraft.sections].sort((a, b) => a.order - b.order),
    [localDraft.sections]
  );

  const handleDropSection = (targetId: string) => {
    if (!dragSectionId || dragSectionId === targetId) return;
    const fromIdx = sortedSections.findIndex((s) => s.id === dragSectionId);
    const toIdx = sortedSections.findIndex((s) => s.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    setLocalDraft((prev) => ({
      ...prev,
      sections: reorderSectionsList(sortedSections, fromIdx, toIdx),
    }));
    setDragSectionId(null);
  };

  const handleAddCustomSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;
    const created: PageSectionItem = {
      id: `sec-custom-${Date.now()}`,
      type: 'custom-banner',
      title: newSectionTitle.trim(),
      subtitle: newSectionSubtitle.trim() || 'LIMITED REALM EVENT',
      body: newSectionBody.trim() || 'Discover seasonal rewards and exclusive server perks.',
      ctaText: newSectionCta.trim(),
      ctaUrl: newSectionUrl.trim() || '/store',
      visible: true,
      order: sortedSections.length + 1,
    };
    setLocalDraft((prev) => ({
      ...prev,
      sections: [...sortedSections, created],
    }));
    setNewSectionTitle('');
    setNewSectionSubtitle('');
    setNewSectionBody('');
  };

  const previewThemeStyle = {
    '--volex-bg': localDraft.theme.backgroundColor,
    '--volex-primary': localDraft.theme.primaryColor,
    '--volex-secondary': localDraft.theme.secondaryColor,
    '--volex-btn': localDraft.theme.buttonColor,
    '--volex-border': localDraft.theme.borderColor,
    '--volex-glow': String((localDraft.theme.glowIntensity ?? 75) / 100),
    '--font-display': `'${localDraft.theme.displayFont}', system-ui, sans-serif`,
    '--font-body': `'${localDraft.theme.bodyFont}', system-ui, sans-serif`,
    backgroundColor: localDraft.theme.backgroundColor,
  } as React.CSSProperties;

  const viewportWidthClass =
    viewport === 'mobile'
      ? 'max-w-[390px]'
      : viewport === 'tablet'
        ? 'max-w-[768px]'
        : 'w-full';

  return (
    <div className="space-y-4">
      {/* Top Draft & Publish Bar */}
      <div className="volex-panel rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-300" />
            <h2 className="font-display text-lg font-extrabold text-white">
              Visual Website Editor
            </h2>
            {hasSavedDraftDiff || hasUnsavedEdits ? (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/45 text-[10px] font-bold text-amber-200 uppercase tracking-wider">
                Unpublished Draft
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/40 text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                Live &amp; Synced
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Save Changes stores a private draft; Publish Changes pushes updates to the public storefront.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleDiscard()}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Discard Changes</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSaveDraft()}
            className="px-4 py-2 rounded-xl bg-violet-600/25 hover:bg-violet-600/40 border border-violet-400/50 text-xs font-bold text-violet-100 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving Draft...' : 'Save Changes'}</span>
          </button>

          <button
            type="button"
            disabled={publishing}
            onClick={() => void handlePublish()}
            className="volex-glow-btn px-4 py-2 rounded-xl text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{publishing ? 'Publishing...' : 'Publish Changes'}</span>
          </button>
        </div>
      </div>

      {/* Split-Screen Editor Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT PANE: Controls */}
        <div className="xl:col-span-5 volex-panel rounded-2xl p-4 space-y-4">
          {/* Sub-navigation */}
          <div className="flex flex-wrap gap-1.5 pb-3 border-b border-white/10">
            {(
              [
                { id: 'homepage', label: 'Homepage', icon: <Layout className="w-3.5 h-3.5" /> },
                { id: 'navigation', label: 'Navigation', icon: <Navigation className="w-3.5 h-3.5" /> },
                { id: 'theme', label: 'Theme', icon: <Palette className="w-3.5 h-3.5" /> },
                { id: 'backgrounds', label: 'Backgrounds', icon: <ImageIcon className="w-3.5 h-3.5" /> },
                { id: 'sections', label: 'Sections', icon: <Layers className="w-3.5 h-3.5" /> },
              ] as Array<{ id: EditorSubTab; label: string; icon: React.ReactNode }>
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  subTab === t.id
                    ? 'bg-violet-600 text-white shadow-[0_0_14px_rgba(139,92,246,0.5)]'
                    : 'bg-[#070918] text-slate-300 hover:text-white border border-white/10'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* 1. HOMEPAGE EDITOR */}
          {subTab === 'homepage' && (
            <div className="space-y-3.5 max-h-[680px] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ed-brand-name" className="block text-[11px] text-slate-300 mb-1">
                    Brand Name
                  </label>
                  <input
                    id="ed-brand-name"
                    type="text"
                    value={localDraft.brandName}
                    onChange={(e) => setLocalDraft({ ...localDraft, brandName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label htmlFor="ed-brand-sub" className="block text-[11px] text-slate-300 mb-1">
                    Brand Subtitle
                  </label>
                  <input
                    id="ed-brand-sub"
                    type="text"
                    value={localDraft.brandSubtitle}
                    onChange={(e) =>
                      setLocalDraft({ ...localDraft, brandSubtitle: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ed-hero-eyebrow" className="block text-[11px] text-slate-300 mb-1">
                    Hero Eyebrow
                  </label>
                  <input
                    id="ed-hero-eyebrow"
                    type="text"
                    value={localDraft.heroEyebrow}
                    onChange={(e) => setLocalDraft({ ...localDraft, heroEyebrow: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label htmlFor="ed-hero-title" className="block text-[11px] text-slate-300 mb-1">
                    Hero Title
                  </label>
                  <input
                    id="ed-hero-title"
                    type="text"
                    value={localDraft.heroTitle}
                    onChange={(e) => setLocalDraft({ ...localDraft, heroTitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ed-hero-subtitle" className="block text-[11px] text-slate-300 mb-1">
                  Hero Subtitle
                </label>
                <input
                  id="ed-hero-subtitle"
                  type="text"
                  value={localDraft.heroSubtitle}
                  onChange={(e) => setLocalDraft({ ...localDraft, heroSubtitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white"
                />
              </div>

              <div>
                <label htmlFor="ed-hero-desc" className="block text-[11px] text-slate-300 mb-1">
                  Hero Description
                </label>
                <textarea
                  id="ed-hero-desc"
                  rows={2}
                  value={localDraft.heroDescription}
                  onChange={(e) =>
                    setLocalDraft({ ...localDraft, heroDescription: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ed-cta-text" className="block text-[11px] text-slate-300 mb-1">
                    Main Button Text
                  </label>
                  <input
                    id="ed-cta-text"
                    type="text"
                    value={localDraft.heroCtaText}
                    onChange={(e) => setLocalDraft({ ...localDraft, heroCtaText: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label htmlFor="ed-cta-url" className="block text-[11px] text-slate-300 mb-1">
                    Main Button URL
                  </label>
                  <input
                    id="ed-cta-url"
                    type="text"
                    value={localDraft.heroCtaUrl}
                    onChange={(e) => setLocalDraft({ ...localDraft, heroCtaUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ed-featured-heading" className="block text-[11px] text-slate-300 mb-1">
                  Featured Section Heading
                </label>
                <input
                  id="ed-featured-heading"
                  type="text"
                  value={localDraft.featuredSectionHeading}
                  onChange={(e) =>
                    setLocalDraft({ ...localDraft, featuredSectionHeading: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white"
                />
              </div>

              {/* Media Upload Controls */}
              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <div className="text-[11px] font-bold uppercase tracking-wider text-violet-300">
                  Logo, Hero Castle &amp; Character Artwork
                </div>

                {/* Brand Logo */}
                <div className="p-2.5 rounded-xl bg-[#070918] border border-white/10 flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-lg bg-violet-950/60 border border-white/15 flex items-center justify-center overflow-hidden shrink-0">
                    {localDraft.brandLogoUrl ? (
                      <img
                        src={localDraft.brandLogoUrl}
                        alt="Logo preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400">Crown</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={localDraft.brandLogoUrl}
                    onChange={(e) => setLocalDraft({ ...localDraft, brandLogoUrl: e.target.value })}
                    placeholder="Custom logo URL (blank = Crown)"
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-[#0d1128] border border-white/10 text-[11px] text-white"
                  />
                  <label className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-slate-200 cursor-pointer shrink-0 inline-flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    <span>Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => void handleUploadImageForField('brandLogoUrl', e, 360)}
                      className="sr-only"
                    />
                  </label>
                </div>

                {/* Hero Artwork */}
                <div className="p-2.5 rounded-xl bg-[#070918] border border-white/10 flex items-center gap-2.5">
                  <img
                    src={localDraft.heroImageUrl}
                    alt="Hero artwork"
                    className="w-12 h-10 rounded-lg object-cover border border-white/15 shrink-0"
                  />
                  <input
                    type="text"
                    value={localDraft.heroImageUrl}
                    onChange={(e) => setLocalDraft({ ...localDraft, heroImageUrl: e.target.value })}
                    placeholder="Castle / hero backdrop URL"
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-[#0d1128] border border-white/10 text-[11px] text-white"
                  />
                  <label className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-slate-200 cursor-pointer shrink-0 inline-flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    <span>Hero</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => void handleUploadImageForField('heroImageUrl', e, 1440)}
                      className="sr-only"
                    />
                  </label>
                </div>

                {/* Hero Character */}
                <div className="p-2.5 rounded-xl bg-[#070918] border border-white/10 flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-lg bg-violet-950/60 border border-white/15 flex items-center justify-center overflow-hidden shrink-0">
                    {localDraft.heroCharacterUrl ? (
                      <img
                        src={localDraft.heroCharacterUrl}
                        alt="Character overlay"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400">None</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={localDraft.heroCharacterUrl}
                    onChange={(e) =>
                      setLocalDraft({ ...localDraft, heroCharacterUrl: e.target.value })
                    }
                    placeholder="Optional character overlay URL"
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-[#0d1128] border border-white/10 text-[11px] text-white"
                  />
                  <label className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-slate-200 cursor-pointer shrink-0 inline-flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    <span>Art</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => void handleUploadImageForField('heroCharacterUrl', e, 720)}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              {/* Banners */}
              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localDraft.promoBannerEnabled}
                    onChange={(e) =>
                      setLocalDraft({ ...localDraft, promoBannerEnabled: e.target.checked })
                    }
                  />
                  <span>Show Homepage Promotional Banner</span>
                </label>
                <input
                  type="text"
                  value={localDraft.promoBannerText}
                  onChange={(e) =>
                    setLocalDraft({ ...localDraft, promoBannerText: e.target.value })
                  }
                  placeholder="Promotional deal text..."
                  className="w-full px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white"
                />

                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={localDraft.announcementEnabled}
                    onChange={(e) =>
                      setLocalDraft({ ...localDraft, announcementEnabled: e.target.checked })
                    }
                  />
                  <span>Show Top Announcement Ticker</span>
                </label>
                <input
                  type="text"
                  value={localDraft.announcementBanner}
                  onChange={(e) =>
                    setLocalDraft({ ...localDraft, announcementBanner: e.target.value })
                  }
                  placeholder="Top navbar announcement..."
                  className="w-full px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white"
                />
              </div>
            </div>
          )}

          {/* 2. NAVIGATION EDITOR */}
          {subTab === 'navigation' && (
            <div className="space-y-4">
              <div className="space-y-2">
                {sortedNavLinks.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-[#070918] border border-white/10 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        aria-label={`Enable ${item.label}`}
                        onChange={(e) => {
                          const next = sortedNavLinks.map((n) =>
                            n.id === item.id ? { ...n, enabled: e.target.checked } : n
                          );
                          updateNavList(next);
                        }}
                      />
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => {
                          const next = sortedNavLinks.map((n) =>
                            n.id === item.id ? { ...n, label: e.target.value } : n
                          );
                          updateNavList(next);
                        }}
                        className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-[#0d1128] border border-white/10 text-xs text-white font-semibold"
                      />
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => updateNavList(moveArrayItem(sortedNavLinks, idx, idx - 1))}
                        aria-label={`Move ${item.label} up`}
                        className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === sortedNavLinks.length - 1}
                        onClick={() => updateNavList(moveArrayItem(sortedNavLinks, idx, idx + 1))}
                        aria-label={`Move ${item.label} down`}
                        className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateNavList(sortedNavLinks.filter((n) => n.id !== item.id))
                        }
                        aria-label={`Remove ${item.label}`}
                        className="p-1.5 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                      <input
                        type="text"
                        value={item.url}
                        onChange={(e) => {
                          const next = sortedNavLinks.map((n) =>
                            n.id === item.id ? { ...n, url: e.target.value } : n
                          );
                          updateNavList(next);
                        }}
                        className="flex-1 min-w-0 px-2.5 py-1 rounded-lg bg-[#0d1128] border border-white/10 text-[11px] text-slate-200 font-mono-nums"
                      />
                      <label className="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={item.external}
                          onChange={(e) => {
                            const next = sortedNavLinks.map((n) =>
                              n.id === item.id ? { ...n, external: e.target.checked } : n
                            );
                            updateNavList(next);
                          }}
                        />
                        <span>External</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <form
                onSubmit={handleAddNavLink}
                className="p-3 rounded-xl bg-[#070918] border border-violet-500/30 space-y-2.5"
              >
                <div className="text-xs font-bold text-white">Add Navigation Link</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Label (e.g. Vote)"
                    value={newNavLabel}
                    onChange={(e) => setNewNavLabel(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                  />
                  <input
                    type="text"
                    required
                    placeholder="URL (e.g. /rules or https://...)"
                    value={newNavUrl}
                    onChange={(e) => setNewNavUrl(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newNavExternal}
                      onChange={(e) => setNewNavExternal(e.target.checked)}
                    />
                    <span>Open in new tab</span>
                  </label>
                  <button
                    type="submit"
                    className="volex-glow-btn px-3.5 py-1.5 rounded-lg text-xs font-bold text-white inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Link</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 3. THEME CUSTOMIZATION */}
          {subTab === 'theme' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-200">Preset Themes</div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    Object.keys(THEME_PRESETS) as Array<Exclude<ThemePresetId, 'custom'>>
                  ).map((presetKey) => {
                    const preset = THEME_PRESETS[presetKey];
                    const active = localDraft.theme.preset === presetKey;
                    return (
                      <button
                        key={presetKey}
                        type="button"
                        onClick={() =>
                          setLocalDraft((prev) => ({
                            ...prev,
                            theme: applyThemePreset(presetKey),
                          }))
                        }
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-violet-600/20 border-violet-400 shadow-[0_0_16px_rgba(139,92,246,0.35)]'
                            : 'bg-[#070918] border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white">{preset.label}</span>
                          <div className="flex items-center gap-1">
                            <span
                              className="w-3 h-3 rounded-full border border-white/30"
                              style={{ backgroundColor: preset.theme.primaryColor }}
                            />
                            <span
                              className="w-3 h-3 rounded-full border border-white/30"
                              style={{ backgroundColor: preset.theme.secondaryColor }}
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                          {preset.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-white/10">
                {(
                  [
                    { key: 'primaryColor', label: 'Primary Color' },
                    { key: 'secondaryColor', label: 'Secondary Color' },
                    { key: 'backgroundColor', label: 'Background' },
                    { key: 'buttonColor', label: 'Buttons' },
                    { key: 'borderColor', label: 'Borders' },
                  ] as const
                ).map(({ key, label }) => (
                  <label
                    key={key}
                    className="p-2 rounded-xl bg-[#070918] border border-white/10 flex items-center justify-between gap-2 text-[11px] text-slate-200 cursor-pointer"
                  >
                    <span>{label}</span>
                    <input
                      type="color"
                      value={localDraft.theme[key]}
                      onChange={(e) => updateThemeField(key, e.target.value)}
                      className="w-7 h-7 rounded bg-transparent border-0 cursor-pointer"
                    />
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">Display Font</label>
                  <select
                    value={localDraft.theme.displayFont}
                    onChange={(e) =>
                      updateThemeField(
                        'displayFont',
                        e.target.value as ThemeConfig['displayFont']
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white"
                  >
                    <option value="Outfit">Outfit</option>
                    <option value="Cinzel">Cinzel (Fantasy Serif)</option>
                    <option value="Orbitron">Orbitron (Sci-Fi)</option>
                    <option value="Space Grotesk">Space Grotesk</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">Body Font</label>
                  <select
                    value={localDraft.theme.bodyFont}
                    onChange={(e) =>
                      updateThemeField('bodyFont', e.target.value as ThemeConfig['bodyFont'])
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#070918] border border-white/15 text-xs text-white"
                  >
                    <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                    <option value="Inter">Inter</option>
                    <option value="DM Sans">DM Sans</option>
                    <option value="Space Grotesk">Space Grotesk</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Glow Intensity</span>
                  <span className="font-mono-nums text-violet-300 font-bold">
                    {localDraft.theme.glowIntensity}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={localDraft.theme.glowIntensity}
                  onChange={(e) => updateThemeField('glowIntensity', Number(e.target.value))}
                  className="w-full accent-violet-500 cursor-pointer"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localDraft.theme.animationsEnabled}
                  onChange={(e) => updateThemeField('animationsEnabled', e.target.checked)}
                />
                <span>Enable Storefront Animations &amp; Particles</span>
              </label>
            </div>
          )}

          {/* 4. BACKGROUND MANAGER */}
          {subTab === 'backgrounds' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-200">Active Slot Assignments</div>
                {(
                  [
                    { key: 'heroBgUrl', label: 'Hero Background' },
                    { key: 'storeBgUrl', label: 'Store Backdrop Overlay' },
                    { key: 'footerBgUrl', label: 'Footer Background' },
                  ] as const
                ).map(({ key, label }) => {
                  const val = localDraft.backgrounds[key];
                  return (
                    <div
                      key={key}
                      className="p-2.5 rounded-xl bg-[#070918] border border-white/10 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-white">{label}</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {val ? val : 'Default obsidian theme'}
                        </div>
                      </div>
                      {val && (
                        <button
                          type="button"
                          onClick={() =>
                            setLocalDraft((prev) => ({
                              ...prev,
                              backgrounds: { ...prev.backgrounds, [key]: '' },
                            }))
                          }
                          className="px-2 py-1 rounded bg-white/5 hover:bg-white/15 text-[11px] text-slate-300 cursor-pointer shrink-0"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-3 rounded-xl bg-[#070918] border border-violet-500/30 space-y-2.5">
                <div className="text-xs font-bold text-white">Add Background to Gallery</div>
                <input
                  type="text"
                  placeholder="Background label (e.g. Nether Citadel)"
                  value={newBgLabel}
                  onChange={(e) => setNewBgLabel(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                />
                <div className="flex flex-wrap gap-2">
                  <label className="px-3 py-1.5 rounded-lg bg-violet-600/25 hover:bg-violet-600/40 border border-violet-400/40 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => void handleUploadGalleryBg(e)}
                      className="sr-only"
                    />
                  </label>
                  <form onSubmit={handleAddGalleryUrl} className="flex-1 flex gap-1.5 min-w-[180px]">
                    <input
                      type="text"
                      placeholder="Or paste image URL..."
                      value={newBgUrl}
                      onChange={(e) => setNewBgUrl(e.target.value)}
                      className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer"
                    >
                      Add
                    </button>
                  </form>
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {(localDraft.backgrounds.gallery || []).map((asset) => (
                  <div
                    key={asset.id}
                    className="p-2.5 rounded-xl bg-[#070918] border border-white/10 flex items-center gap-3"
                  >
                    <img
                      src={asset.url}
                      alt={asset.label}
                      referrerPolicy="no-referrer"
                      className="w-14 h-10 rounded-lg object-cover border border-white/15 shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-xs font-bold text-white truncate">{asset.label}</div>
                      <div className="flex flex-wrap gap-1">
                        {(
                          [
                            { key: 'heroBgUrl', label: 'Hero' },
                            { key: 'storeBgUrl', label: 'Store' },
                            { key: 'footerBgUrl', label: 'Footer' },
                          ] as const
                        ).map((slot) => {
                          const assigned = localDraft.backgrounds[slot.key] === asset.url;
                          return (
                            <button
                              key={slot.key}
                              type="button"
                              onClick={() =>
                                setLocalDraft((prev) => ({
                                  ...prev,
                                  ...(slot.key === 'heroBgUrl' ? { heroImageUrl: asset.url } : {}),
                                  backgrounds: { ...prev.backgrounds, [slot.key]: asset.url },
                                }))
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer inline-flex items-center gap-1 ${
                                assigned
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-white/5 hover:bg-white/15 text-slate-300'
                              }`}
                            >
                              {assigned && <Check className="w-2.5 h-2.5" />}
                              <span>{slot.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setLocalDraft((prev) => ({
                          ...prev,
                          backgrounds: {
                            ...prev.backgrounds,
                            gallery: prev.backgrounds.gallery.filter((g) => g.id !== asset.id),
                          },
                        }))
                      }
                      aria-label={`Delete background ${asset.label}`}
                      className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. SECTION BUILDER (Drag-and-drop + Edit + Show/Hide + Add Custom) */}
          {subTab === 'sections' && (
            <div className="space-y-4">
              <div className="text-[11px] text-slate-400">
                Drag rows to reorder sections, toggle visibility, or add custom homepage banners.
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {sortedSections.map((sec, idx) => {
                  const isEditingThis = editingSectionId === sec.id;
                  const isCustom = sec.type === 'custom-banner' || sec.type === 'community';

                  return (
                    <div
                      key={sec.id}
                      draggable
                      onDragStart={() => setDragSectionId(sec.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDropSection(sec.id)}
                      className={`p-3 rounded-xl bg-[#070918] border transition-colors ${
                        dragSectionId === sec.id
                          ? 'border-violet-400 bg-violet-950/30'
                          : 'border-white/10'
                      } space-y-2`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <GripVertical className="w-4 h-4 text-slate-500 cursor-grab shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              {sec.title}
                            </div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                              {sec.type}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() =>
                              setLocalDraft((prev) => ({
                                ...prev,
                                sections: reorderSectionsList(sortedSections, idx, idx - 1),
                              }))
                            }
                            aria-label={`Move ${sec.title} up`}
                            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === sortedSections.length - 1}
                            onClick={() =>
                              setLocalDraft((prev) => ({
                                ...prev,
                                sections: reorderSectionsList(sortedSections, idx, idx + 1),
                              }))
                            }
                            aria-label={`Move ${sec.title} down`}
                            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setLocalDraft((prev) => ({
                                ...prev,
                                sections: prev.sections.map((s) =>
                                  s.id === sec.id ? { ...s, visible: !s.visible } : s
                                ),
                              }))
                            }
                            aria-label={sec.visible ? `Hide ${sec.title}` : `Show ${sec.title}`}
                            className={`p-1.5 rounded cursor-pointer ${
                              sec.visible
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-white/5 text-slate-400'
                            }`}
                          >
                            {sec.visible ? (
                              <Eye className="w-3.5 h-3.5" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setEditingSectionId(isEditingThis ? null : sec.id)
                            }
                            className="px-2 py-1 rounded bg-white/5 hover:bg-white/15 text-[11px] text-slate-200 cursor-pointer"
                          >
                            {isEditingThis ? 'Done' : 'Edit'}
                          </button>
                          {isCustom && (
                            <button
                              type="button"
                              onClick={() =>
                                setLocalDraft((prev) => ({
                                  ...prev,
                                  sections: prev.sections.filter((s) => s.id !== sec.id),
                                }))
                              }
                              aria-label={`Delete ${sec.title}`}
                              className="p-1.5 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditingThis && (
                        <div className="pt-2 border-t border-white/10 space-y-2">
                          <input
                            type="text"
                            value={sec.title}
                            onChange={(e) =>
                              setLocalDraft((prev) => ({
                                ...prev,
                                sections: prev.sections.map((s) =>
                                  s.id === sec.id ? { ...s, title: e.target.value } : s
                                ),
                              }))
                            }
                            placeholder="Section Title"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                          />
                          <input
                            type="text"
                            value={sec.subtitle}
                            onChange={(e) =>
                              setLocalDraft((prev) => ({
                                ...prev,
                                sections: prev.sections.map((s) =>
                                  s.id === sec.id ? { ...s, subtitle: e.target.value } : s
                                ),
                              }))
                            }
                            placeholder="Subtitle"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                          />
                          <textarea
                            rows={2}
                            value={sec.body}
                            onChange={(e) =>
                              setLocalDraft((prev) => ({
                                ...prev,
                                sections: prev.sections.map((s) =>
                                  s.id === sec.id ? { ...s, body: e.target.value } : s
                                ),
                              }))
                            }
                            placeholder="Section description..."
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={sec.ctaText || ''}
                              onChange={(e) =>
                                setLocalDraft((prev) => ({
                                  ...prev,
                                  sections: prev.sections.map((s) =>
                                    s.id === sec.id ? { ...s, ctaText: e.target.value } : s
                                  ),
                                }))
                              }
                              placeholder="CTA Text"
                              className="px-2.5 py-1.5 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                            />
                            <input
                              type="text"
                              value={sec.ctaUrl || ''}
                              onChange={(e) =>
                                setLocalDraft((prev) => ({
                                  ...prev,
                                  sections: prev.sections.map((s) =>
                                    s.id === sec.id ? { ...s, ctaUrl: e.target.value } : s
                                  ),
                                }))
                              }
                              placeholder="CTA URL"
                              className="px-2.5 py-1.5 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <form
                onSubmit={handleAddCustomSection}
                className="p-3 rounded-xl bg-[#070918] border border-violet-500/30 space-y-2.5"
              >
                <div className="text-xs font-bold text-white">Add Custom Section</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Section Title"
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Eyebrow Subtitle"
                    value={newSectionSubtitle}
                    onChange={(e) => setNewSectionSubtitle(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                  />
                </div>
                <textarea
                  rows={2}
                  placeholder="Banner body text..."
                  value={newSectionBody}
                  onChange={(e) => setNewSectionBody(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="CTA Label"
                    value={newSectionCta}
                    onChange={(e) => setNewSectionCta(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="CTA URL"
                    value={newSectionUrl}
                    onChange={(e) => setNewSectionUrl(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="volex-glow-btn px-3.5 py-1.5 rounded-lg text-xs font-bold text-white inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Custom Section</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* RIGHT PANE: Live Interactive Preview */}
        <div className="xl:col-span-7 volex-panel rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-display text-sm font-bold text-white">
                Live Storefront Preview
              </span>
            </div>

            <div className="flex items-center gap-1 bg-[#070918] p-1 rounded-xl border border-white/10">
              {(
                [
                  { id: 'desktop', label: 'Desktop', icon: <Monitor className="w-3.5 h-3.5" /> },
                  { id: 'tablet', label: 'Tablet', icon: <Tablet className="w-3.5 h-3.5" /> },
                  { id: 'mobile', label: 'Mobile', icon: <Smartphone className="w-3.5 h-3.5" /> },
                ] as const
              ).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setViewport(v.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                    viewport === v.id
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {v.icon}
                  <span>{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#03040b] rounded-xl border border-white/10 p-2 sm:p-3 overflow-x-auto">
            <div
              style={{
                ...previewThemeStyle,
                zoom: viewport === 'desktop' ? 0.56 : viewport === 'tablet' ? 0.78 : 1,
              }}
              onClickCapture={(e) => {
                // Keep admin inside the editor if they click navigation links inside preview
                const anchor = (e.target as HTMLElement).closest('a');
                if (anchor) {
                  e.preventDefault();
                }
              }}
              className={`mx-auto transition-all duration-300 rounded-xl overflow-hidden border border-violet-500/30 shadow-2xl max-h-[1180px] overflow-y-auto relative ${
                viewport === 'desktop' ? 'w-[1220px]' : viewportWidthClass
              } ${!localDraft.theme.animationsEnabled ? 'volex-no-animations' : ''}`}
            >
              {localDraft.backgrounds.storeBgUrl && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-15 bg-cover bg-center"
                  style={{ backgroundImage: `url(${localDraft.backgrounds.storeBgUrl})` }}
                  aria-hidden="true"
                />
              )}
              <div className="relative z-10">
                <Navbar websiteOverride={localDraft} />
                <HomePage websiteOverride={localDraft} previewViewport={viewport} />
                <Footer websiteOverride={localDraft} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
