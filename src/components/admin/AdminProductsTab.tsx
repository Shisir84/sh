import React, { useMemo, useState } from 'react';
import { Check, Eye, EyeOff, Pencil, Plus, Search, Star, Trash2, Upload } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ConfirmDialog } from '../ConfirmDialog';
import { CategoryIcon } from '../CategoryIcon';
import type { AccentColor, CategoryItem, ProductBadge, ProductItem } from '../../types/store';
import { compressImageToDataUrl } from '../../utils/imageHelpers';
import { formatInrPrice, sanitizeSlugId } from '../../utils/storeLogic';

export function AdminProductsTab({
  viewMode = 'all',
  onStatus,
}: {
  viewMode?: 'all' | 'products' | 'categories';
  onStatus: (msg: string) => void;
}) {
  const {
    products,
    categories,
    saveProduct,
    deleteProduct,
    saveCategory,
    deleteCategory,
  } = useStore();

  const [editing, setEditing] = useState<ProductItem | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productCatFilter, setProductCatFilter] = useState('all');

  const [editingCat, setEditingCat] = useState<CategoryItem | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('star');
  const [catSortOrder, setCatSortOrder] = useState(categories.length + 1);

  const [pendingDelete, setPendingDelete] = useState<
    | { type: 'product'; id: string; name: string }
    | { type: 'category'; id: string; name: string }
    | null
  >(null);

  const showCategories = viewMode === 'all' || viewMode === 'categories';
  const showProducts = viewMode === 'all' || viewMode === 'products';

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (productCatFilter !== 'all' && p.category.toLowerCase() !== productCatFilter.toLowerCase()) {
        return false;
      }
      if (q) {
        const hay = `${p.name} ${p.category} ${p.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [products, productSearch, productCatFilter]);

  const startNewProduct = () => {
    setEditing({
      id: '',
      name: '',
      category: categories[0]?.name || 'Ranks',
      description: '',
      perks: [],
      priceInr: 299,
      imageUrl: '/src/assets/images/product_vip_crown_1795188853794.jpg',
      accentColor: 'purple',
      badge: '',
      featured: false,
      featuredOrder: products.length + 1,
      active: true,
    });
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, 720, 280_000);
      setEditing({ ...editing, imageUrl: dataUrl });
      onStatus('Product image compressed and ready to save.');
    } catch (err) {
      onStatus(err instanceof Error ? err.message : 'Image upload failed.');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const id = editing.id || sanitizeSlugId(editing.name) || `prod_${Date.now()}`;
    await saveProduct({ ...editing, id });
    setEditing(null);
    onStatus(`Saved product "${editing.name}".`);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    const slug = sanitizeSlugId(catName);
    const cat: CategoryItem = {
      id: slug || `cat-${Date.now()}`,
      name: catName.trim(),
      slug: slug || `cat-${Date.now()}`,
      icon: catIcon,
      sortOrder: Number(catSortOrder) || categories.length + 1,
      active: true,
    };
    await saveCategory(cat);
    setCatName('');
    setCatSortOrder(categories.length + 2);
    onStatus(`Added category "${cat.name}".`);
  };

  const handleSaveEditedCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat || !editingCat.name.trim()) return;
    await saveCategory({
      ...editingCat,
      name: editingCat.name.trim(),
      slug: editingCat.slug || sanitizeSlugId(editingCat.name),
    });
    onStatus(`Updated category "${editingCat.name}".`);
    setEditingCat(null);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    if (pendingDelete.type === 'product') {
      await deleteProduct(pendingDelete.id);
      onStatus(`Deleted product ${pendingDelete.name}`);
    } else {
      await deleteCategory(pendingDelete.id);
      onStatus(`Deleted category ${pendingDelete.name}`);
    }
    setPendingDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Categories Management */}
      {showCategories && (
        <section className="volex-panel rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold text-white">Store Categories</h2>
              <p className="text-xs text-slate-400">
                Organize sidebar categories, icons, sort ordering, and visibility.
              </p>
            </div>
            <span className="text-xs text-violet-300 font-mono-nums">
              {categories.length} categories
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-3 rounded-xl bg-[#070918] border border-violet-500/25 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/35 flex items-center justify-center shrink-0">
                    <CategoryIcon icon={cat.icon} className="w-4 h-4 text-violet-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">{cat.name}</div>
                    <div className="text-[11px] text-slate-400">
                      Order #{cat.sortOrder} · {cat.active ? 'Active' : 'Hidden'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      void saveCategory({ ...cat, active: !cat.active }).then(() =>
                        onStatus(
                          `${cat.name} ${!cat.active ? 'enabled' : 'hidden'} on storefront.`
                        )
                      )
                    }
                    aria-label={cat.active ? `Hide ${cat.name}` : `Show ${cat.name}`}
                    className={`p-1.5 rounded-lg cursor-pointer ${
                      cat.active
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    {cat.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCat(cat)}
                    aria-label={`Edit category ${cat.name}`}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-violet-600/30 text-slate-200 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingDelete({ type: 'category', id: cat.id, name: cat.name })
                    }
                    aria-label={`Delete category ${cat.name}`}
                    className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {editingCat && (
            <form
              onSubmit={handleSaveEditedCategory}
              className="p-4 rounded-xl bg-[#070918] border border-violet-400/45 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
            >
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Edit Category Name</label>
                <input
                  type="text"
                  required
                  value={editingCat.name}
                  onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Icon</label>
                <select
                  value={editingCat.icon}
                  onChange={(e) => setEditingCat({ ...editingCat, icon: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                >
                  <option value="crown">Crown</option>
                  <option value="key">Key</option>
                  <option value="gift">Crate / Gift</option>
                  <option value="paw">Pet</option>
                  <option value="shirt">Cosmetic</option>
                  <option value="coins">Economy</option>
                  <option value="star">Star</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Sort Order</label>
                <input
                  type="number"
                  min={1}
                  value={editingCat.sortOrder}
                  onChange={(e) =>
                    setEditingCat({ ...editingCat, sortOrder: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="volex-glow-btn px-3.5 py-2 rounded-lg text-xs font-bold text-white inline-flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCat(null)}
                  className="px-3 py-2 rounded-lg bg-white/5 text-xs text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <form onSubmit={handleAddCategory} className="flex flex-wrap gap-2.5 items-end pt-2 border-t border-white/10">
            <div>
              <label htmlFor="new-cat-name" className="block text-[11px] text-slate-400 mb-1">
                New Category Name
              </label>
              <input
                id="new-cat-name"
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Bundles"
                className="px-3 py-2 rounded-xl bg-[#070918] border border-violet-500/30 text-xs text-white"
              />
            </div>
            <div>
              <label htmlFor="new-cat-icon" className="block text-[11px] text-slate-400 mb-1">
                Icon
              </label>
              <select
                id="new-cat-icon"
                value={catIcon}
                onChange={(e) => setCatIcon(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#070918] border border-violet-500/30 text-xs text-white"
              >
                <option value="crown">Crown</option>
                <option value="key">Key</option>
                <option value="gift">Crate / Gift</option>
                <option value="paw">Pet</option>
                <option value="shirt">Cosmetic</option>
                <option value="coins">Economy</option>
                <option value="star">Star</option>
              </select>
            </div>
            <div>
              <label htmlFor="new-cat-order" className="block text-[11px] text-slate-400 mb-1">
                Order
              </label>
              <input
                id="new-cat-order"
                type="number"
                min={1}
                value={catSortOrder}
                onChange={(e) => setCatSortOrder(Number(e.target.value))}
                className="w-20 px-3 py-2 rounded-xl bg-[#070918] border border-violet-500/30 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              className="volex-glow-btn px-4 py-2 rounded-xl text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          </form>
        </section>
      )}

      {/* Product Editor */}
      {showProducts && (
        <section className="volex-panel rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-white">Products Catalog</h2>
              <p className="text-xs text-slate-400">
                Manage pricing, perks, featured placement, badges, and product images.
              </p>
            </div>
            <button
              type="button"
              onClick={startNewProduct}
              className="volex-glow-btn px-4 py-2 rounded-xl text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products by name or perk..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#070918] border border-white/15 text-xs text-white"
              />
            </div>
            <select
              value={productCatFilter}
              onChange={(e) => setProductCatFilter(e.target.value)}
              aria-label="Filter products by category"
              className="px-3 py-2 rounded-xl bg-[#070918] border border-white/15 text-xs text-white"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {editing && (
            <form
              onSubmit={handleSaveProduct}
              className="p-4 rounded-xl bg-[#070918] border border-violet-500/40 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Category</label>
                  <select
                    value={editing.category}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Price (INR)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editing.priceInr}
                    onChange={(e) =>
                      setEditing({ ...editing, priceInr: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white font-mono-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Short Description</label>
                  <input
                    type="text"
                    required
                    value={editing.description}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Perks (comma-separated)</label>
                  <input
                    type="text"
                    value={(editing.perks || []).join(', ')}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        perks: e.target.value.split(',').map((s) => s.trim()),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Accent Color</label>
                  <select
                    value={editing.accentColor}
                    onChange={(e) =>
                      setEditing({ ...editing, accentColor: e.target.value as AccentColor })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                  >
                    <option value="gold">Gold</option>
                    <option value="cyan">Cyan</option>
                    <option value="purple">Purple</option>
                    <option value="pink">Pink</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Badge Label</label>
                  <select
                    value={editing.badge || ''}
                    onChange={(e) =>
                      setEditing({ ...editing, badge: e.target.value as ProductBadge })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                  >
                    <option value="">None</option>
                    <option value="Popular">Popular</option>
                    <option value="Limited">Limited</option>
                    <option value="Best Value">Best Value</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Sort Order</label>
                  <input
                    type="number"
                    min={1}
                    value={editing.featuredOrder}
                    onChange={(e) =>
                      setEditing({ ...editing, featuredOrder: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-200 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.featured}
                    onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                  />
                  <span>Featured</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-200 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.active}
                    onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                  />
                  <span>Available</span>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <img
                  src={editing.imageUrl}
                  alt="Preview"
                  className="w-16 h-12 rounded-lg object-cover border border-white/20"
                />
                <label className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-slate-200 inline-flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProductImageUpload}
                    className="sr-only"
                  />
                </label>
                <input
                  type="text"
                  value={editing.imageUrl}
                  onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })}
                  placeholder="Or paste image URL"
                  className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-[#0d1128] border border-white/15 text-xs text-white"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="volex-glow-btn px-4 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer"
                >
                  Save Product
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-xs text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                className="p-3.5 rounded-xl bg-[#070918] border border-white/10 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={prod.imageUrl}
                    alt={prod.name}
                    className="w-14 h-11 rounded-lg object-cover border border-white/15 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-display text-sm font-bold text-white truncate">
                        {prod.name}
                      </span>
                      {prod.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-violet-600/30 border border-violet-400/40 text-[10px] font-bold text-violet-200">
                          {prod.badge}
                        </span>
                      )}
                      {!prod.active && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-[10px] font-bold text-rose-300">
                          Hidden
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {prod.category} ·{' '}
                      <span className="font-mono-nums text-amber-300">
                        {formatInrPrice(prod.priceInr)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      void saveProduct({ ...prod, featured: !prod.featured }).then(() =>
                        onStatus(
                          `${prod.name} ${!prod.featured ? 'marked Featured' : 'removed from Featured'}.`
                        )
                      )
                    }
                    title={prod.featured ? 'Featured on Homepage' : 'Mark Featured'}
                    aria-label={`Toggle featured ${prod.name}`}
                    className={`p-2 rounded-lg cursor-pointer ${
                      prod.featured
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void saveProduct({ ...prod, active: !prod.active }).then(() =>
                        onStatus(`${prod.name} ${!prod.active ? 'enabled' : 'hidden'}.`)
                      )
                    }
                    title={prod.active ? 'Active in Store' : 'Hidden'}
                    aria-label={`Toggle active ${prod.name}`}
                    className={`p-2 rounded-lg cursor-pointer ${
                      prod.active
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    {prod.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(prod)}
                    aria-label={`Edit ${prod.name}`}
                    className="p-2 rounded-lg bg-white/5 hover:bg-violet-600/30 text-slate-200 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingDelete({ type: 'product', id: prod.id, name: prod.name })
                    }
                    aria-label={`Delete ${prod.name}`}
                    className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/25 text-rose-300 cursor-pointer"
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
        title={`Delete ${pendingDelete?.type === 'category' ? 'Category' : 'Product'}?`}
        message={`Are you sure you want to permanently remove "${pendingDelete?.name || ''}" from the VOLEXMC catalog?`}
        confirmLabel="Delete"
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
