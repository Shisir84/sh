import React, { useState } from 'react';
import { Check, Pencil, Plus, Shield, Trash2, Upload, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ConfirmDialog } from '../ConfirmDialog';
import type {
  RuleSeverity,
  ServerRuleItem,
  StaffMemberItem,
  WikiArticleItem,
} from '../../types/store';
import { compressImageToDataUrl } from '../../utils/imageHelpers';

export function AdminContentTab({
  viewMode = 'all',
  onStatus,
}: {
  viewMode?: 'all' | 'staff' | 'wiki' | 'rules';
  onStatus: (msg: string) => void;
}) {
  const {
    staff,
    wikiArticles,
    rules,
    saveStaffMember,
    deleteStaffMember,
    saveWikiArticle,
    deleteWikiArticle,
    saveRule,
    deleteRule,
  } = useStore();

  const emptyStaff = (): StaffMemberItem => ({
    id: '',
    name: '',
    role: 'Moderator',
    rankColor: 'purple',
    minecraftUsername: '',
    bio: '',
    photoUrl: '',
    sortOrder: staff.length + 1,
    active: true,
  });

  const emptyWiki = (): WikiArticleItem => ({
    id: '',
    title: '',
    category: 'Basics',
    summary: '',
    content: '',
    sortOrder: wikiArticles.length + 1,
    published: true,
  });

  const emptyRule = (): ServerRuleItem => ({
    id: '',
    title: '',
    category: 'Fair Play',
    description: '',
    punishment: '',
    severity: 'Medium',
    sortOrder: rules.length + 1,
  });

  const [staffForm, setStaffForm] = useState<StaffMemberItem>(emptyStaff);
  const [wikiForm, setWikiForm] = useState<WikiArticleItem>(emptyWiki);
  const [ruleForm, setRuleForm] = useState<ServerRuleItem>(emptyRule);

  const [pendingDelete, setPendingDelete] = useState<
    | { type: 'staff'; id: string; label: string }
    | { type: 'wiki'; id: string; label: string }
    | { type: 'rule'; id: string; label: string }
    | null
  >(null);

  const showStaff = viewMode === 'all' || viewMode === 'staff';
  const showWiki = viewMode === 'all' || viewMode === 'wiki';
  const showRules = viewMode === 'all' || viewMode === 'rules';

  const handleStaffPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, 480, 220_000);
      setStaffForm((prev) => ({ ...prev, photoUrl: dataUrl }));
      onStatus('Staff avatar image compressed and ready to save.');
    } catch (err) {
      onStatus(err instanceof Error ? err.message : 'Staff photo upload failed.');
    }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const isUpdate = Boolean(staffForm.id);
    await saveStaffMember({
      ...staffForm,
      id: staffForm.id || `staff_${Date.now()}`,
    });
    setStaffForm(emptyStaff());
    onStatus(isUpdate ? 'Staff member updated.' : 'Staff member added.');
  };

  const handleSaveWiki = async (e: React.FormEvent) => {
    e.preventDefault();
    const isUpdate = Boolean(wikiForm.id);
    await saveWikiArticle({
      ...wikiForm,
      id: wikiForm.id || `wiki_${Date.now()}`,
    });
    setWikiForm(emptyWiki());
    onStatus(isUpdate ? 'Wiki article updated.' : 'Wiki article published.');
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const isUpdate = Boolean(ruleForm.id);
    await saveRule({
      ...ruleForm,
      id: ruleForm.id || `rule_${Date.now()}`,
    });
    setRuleForm(emptyRule());
    onStatus(isUpdate ? 'Server rule updated.' : 'Server rule added.');
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    if (pendingDelete.type === 'staff') {
      await deleteStaffMember(pendingDelete.id);
      onStatus(`Removed staff member "${pendingDelete.label}".`);
    } else if (pendingDelete.type === 'wiki') {
      await deleteWikiArticle(pendingDelete.id);
      onStatus(`Deleted wiki "${pendingDelete.label}".`);
    } else {
      await deleteRule(pendingDelete.id);
      onStatus(`Deleted rule "${pendingDelete.label}".`);
    }
    setPendingDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Staff Manager */}
      {showStaff && (
        <section className="volex-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-white">Staff Management</h2>
              <p className="text-xs text-slate-400">
                Add, edit, upload avatars, or remove team members shown on /staff.
              </p>
            </div>
            {staffForm.id && (
              <button
                type="button"
                onClick={() => setStaffForm(emptyStaff())}
                className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-slate-300 inline-flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel Edit</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSaveStaff} className="p-4 rounded-xl bg-[#070918] border border-white/10 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                required
                placeholder="Name"
                value={staffForm.name}
                onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                className="px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
              />
              <input
                type="text"
                required
                placeholder="Role (e.g. Owner, Admin)"
                value={staffForm.role}
                onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                className="px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
              />
              <input
                type="text"
                required
                placeholder="Minecraft IGN"
                value={staffForm.minecraftUsername}
                onChange={(e) =>
                  setStaffForm({ ...staffForm, minecraftUsername: e.target.value })
                }
                className="px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
              />
              <select
                value={staffForm.rankColor}
                onChange={(e) =>
                  setStaffForm({
                    ...staffForm,
                    rankColor: e.target.value as StaffMemberItem['rankColor'],
                  })
                }
                className="px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
              >
                <option value="gold">Gold Rank</option>
                <option value="purple">Purple Rank</option>
                <option value="cyan">Cyan Rank</option>
                <option value="pink">Pink Rank</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <input
                type="text"
                required
                placeholder="Short Bio"
                value={staffForm.bio}
                onChange={(e) => setStaffForm({ ...staffForm, bio: e.target.value })}
                className="px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
              />
              <div className="flex items-center gap-2">
                {staffForm.photoUrl ? (
                  <img
                    src={staffForm.photoUrl}
                    alt="Staff preview"
                    className="w-9 h-9 rounded-lg object-cover border border-white/20 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-violet-600/20 border border-violet-500/35 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-violet-300" />
                  </div>
                )}
                <label className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-slate-200 inline-flex items-center gap-1.5 cursor-pointer shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleStaffPhotoUpload(e)}
                    className="sr-only"
                  />
                </label>
                <input
                  type="text"
                  placeholder="Or paste photo URL..."
                  value={staffForm.photoUrl || ''}
                  onChange={(e) => setStaffForm({ ...staffForm, photoUrl: e.target.value })}
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={staffForm.active}
                  onChange={(e) => setStaffForm({ ...staffForm, active: e.target.checked })}
                />
                <span>Active on Staff Directory</span>
              </label>
              <button
                type="submit"
                className="volex-glow-btn px-4 py-2 rounded-xl text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
              >
                {staffForm.id ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{staffForm.id ? 'Update Staff' : 'Add Staff'}</span>
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {staff.map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-xl bg-[#070918] border border-white/10 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {m.photoUrl ? (
                    <img
                      src={m.photoUrl}
                      alt={m.name}
                      className="w-10 h-10 rounded-lg object-cover border border-white/15 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-violet-600/20 border border-violet-500/35 flex items-center justify-center shrink-0">
                      <Shield className="w-4 h-4 text-violet-300" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">
                      {m.name} <span className="text-violet-300 font-medium">({m.role})</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      IGN: {m.minecraftUsername} {!m.active ? '· Hidden' : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setStaffForm(m)}
                    aria-label={`Edit staff ${m.name}`}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-violet-600/30 text-slate-200 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingDelete({ type: 'staff', id: m.id, label: m.name })
                    }
                    aria-label={`Delete staff ${m.name}`}
                    className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Wiki Articles Manager */}
      {showWiki && (
        <section className="volex-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-white">Wiki Management</h2>
              <p className="text-xs text-slate-400">
                Publish and edit server guides, rank commands, and gameplay tutorials.
              </p>
            </div>
            {wikiForm.id && (
              <button
                type="button"
                onClick={() => setWikiForm(emptyWiki())}
                className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-slate-300 inline-flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel Edit</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSaveWiki} className="p-4 rounded-xl bg-[#070918] border border-white/10 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Article Title"
                value={wikiForm.title}
                onChange={(e) => setWikiForm({ ...wikiForm, title: e.target.value })}
                className="px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
              />
              <input
                type="text"
                required
                placeholder="Category (e.g. Basics, Economy)"
                value={wikiForm.category}
                onChange={(e) => setWikiForm({ ...wikiForm, category: e.target.value })}
                className="px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
              />
            </div>
            <input
              type="text"
              required
              placeholder="One-line summary"
              value={wikiForm.summary}
              onChange={(e) => setWikiForm({ ...wikiForm, summary: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
            />
            <textarea
              rows={4}
              required
              placeholder="Full guide content..."
              value={wikiForm.content}
              onChange={(e) => setWikiForm({ ...wikiForm, content: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wikiForm.published}
                  onChange={(e) => setWikiForm({ ...wikiForm, published: e.target.checked })}
                />
                <span>Published on Wiki</span>
              </label>
              <button
                type="submit"
                className="volex-glow-btn px-4 py-2 rounded-xl text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
              >
                {wikiForm.id ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{wikiForm.id ? 'Update Wiki Article' : 'Publish Wiki Article'}</span>
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {wikiArticles.map((art) => (
              <div
                key={art.id}
                className="p-3 rounded-xl bg-[#070918] border border-white/10 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-bold text-white truncate">
                    {art.title}{' '}
                    <span className="text-slate-400 font-normal">· {art.category}</span>
                    {!art.published && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                        Draft
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{art.summary}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setWikiForm(art)}
                    aria-label={`Edit wiki ${art.title}`}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-violet-600/30 text-slate-200 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingDelete({ type: 'wiki', id: art.id, label: art.title })
                    }
                    aria-label={`Delete wiki ${art.title}`}
                    className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Rules Manager */}
      {showRules && (
        <section className="volex-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-white">Rules Management</h2>
              <p className="text-xs text-slate-400">
                Create, edit, or delete server rules and enforcement punishments.
              </p>
            </div>
            {ruleForm.id && (
              <button
                type="button"
                onClick={() => setRuleForm(emptyRule())}
                className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-slate-300 inline-flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel Edit</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSaveRule} className="p-4 rounded-xl bg-[#070918] border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              placeholder="Rule Title"
              value={ruleForm.title}
              onChange={(e) => setRuleForm({ ...ruleForm, title: e.target.value })}
              className="px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
            />
            <input
              type="text"
              required
              placeholder="Category (e.g. Fair Play, Chat)"
              value={ruleForm.category}
              onChange={(e) => setRuleForm({ ...ruleForm, category: e.target.value })}
              className="px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
            />
            <input
              type="text"
              required
              placeholder="Rule Description"
              value={ruleForm.description}
              onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
              className="sm:col-span-2 px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
            />
            <input
              type="text"
              required
              placeholder="Punishment (e.g. 7d Temp Ban)"
              value={ruleForm.punishment}
              onChange={(e) => setRuleForm({ ...ruleForm, punishment: e.target.value })}
              className="px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
            />
            <div className="flex gap-2">
              <select
                value={ruleForm.severity}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, severity: e.target.value as RuleSeverity })
                }
                className="flex-1 px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
              <button
                type="submit"
                className="volex-glow-btn px-4 py-2 rounded-xl text-xs font-semibold text-white inline-flex items-center gap-1 cursor-pointer"
              >
                {ruleForm.id ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{ruleForm.id ? 'Update Rule' : 'Add Rule'}</span>
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {rules.map((r) => (
              <div
                key={r.id}
                className="p-3 rounded-xl bg-[#070918] border border-white/10 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-bold text-white truncate">
                    {r.title} <span className="text-amber-300 font-medium">({r.severity})</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {r.category} · {r.punishment}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setRuleForm(r)}
                    aria-label={`Edit rule ${r.title}`}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-violet-600/30 text-slate-200 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingDelete({ type: 'rule', id: r.id, label: r.title })
                    }
                    aria-label={`Delete rule ${r.title}`}
                    className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Confirm Removal"
        message={`Are you sure you want to permanently remove "${pendingDelete?.label || ''}"?`}
        confirmLabel="Remove"
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
