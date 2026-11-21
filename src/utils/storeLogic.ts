import type {
  AdminOverviewKpis,
  CartItem,
  CouponItem,
  CurrencyCode,
  OrderItem,
  OrderLineItem,
  OrderStatus,
  PageSectionItem,
  PaymentMethodItem,
  ProductItem,
  RevenueDayPoint,
  ThemeConfig,
  ThemePresetId,
  UserProfile,
  WebsiteEditorConfig,
} from '../types/store';
import { DEFAULT_WEBSITE_CONFIG, THEME_PRESETS } from '../data/seedData';

export const BOOTSTRAP_ADMIN_EMAIL = 'shisirtharu16@gmail.com';
export const DEFAULT_NPR_PER_INR = 1.6;

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  Pending: ['Under Review', 'Approved', 'Rejected'],
  'Under Review': ['Approved', 'Rejected'],
  Approved: ['Delivered', 'Rejected'],
  Rejected: ['Under Review'],
  Delivered: [],
};

export function validateMinecraftUsername(username: string): {
  valid: boolean;
  cleaned: string;
  error?: string;
} {
  const cleaned = username.trim();
  if (cleaned.length < 3 || cleaned.length > 16) {
    return {
      valid: false,
      cleaned,
      error: 'Minecraft username must be between 3 and 16 characters.',
    };
  }
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(cleaned)) {
    return {
      valid: false,
      cleaned,
      error: 'Username may only contain letters, numbers, and underscores.',
    };
  }
  return { valid: true, cleaned };
}

export function formatInrPrice(amount: number): string {
  const safe = Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : 0;
  return `₹${safe.toLocaleString('en-IN')} INR`;
}

export function convertInrAmount(
  amountInr: number,
  currency: CurrencyCode = 'INR',
  nprPerInrRate = DEFAULT_NPR_PER_INR
): number {
  const base = Number.isFinite(amountInr) && amountInr >= 0 ? amountInr : 0;
  if (currency === 'NPR') {
    const rate = Number.isFinite(nprPerInrRate) && nprPerInrRate > 0 ? nprPerInrRate : DEFAULT_NPR_PER_INR;
    return Math.round(base * rate);
  }
  return Math.round(base);
}

export function formatCurrencyPrice(
  amountInr: number,
  currency: CurrencyCode = 'INR',
  nprPerInrRate = DEFAULT_NPR_PER_INR
): string {
  const converted = convertInrAmount(amountInr, currency, nprPerInrRate);
  if (currency === 'NPR') {
    return `रू ${converted.toLocaleString('en-IN')} NPR`;
  }
  return `₹${converted.toLocaleString('en-IN')} INR`;
}

export function getEnabledPaymentMethods(
  methods: PaymentMethodItem[]
): PaymentMethodItem[] {
  return [...methods]
    .filter((m) => m.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export type StoreSortOption = 'featured' | 'price-asc' | 'price-desc' | 'popular';

export function filterStoreProducts(
  products: ProductItem[],
  options: {
    category?: string;
    search?: string;
    featuredOnly?: boolean;
    includeInactive?: boolean;
    minPriceInr?: number;
    maxPriceInr?: number;
    popularOnly?: boolean;
    limitedOnly?: boolean;
    inStockOnly?: boolean;
    sortBy?: StoreSortOption;
  } = {}
): ProductItem[] {
  const {
    category = 'all',
    search = '',
    featuredOnly = false,
    includeInactive = false,
    minPriceInr,
    maxPriceInr,
    popularOnly = false,
    limitedOnly = false,
    inStockOnly = false,
    sortBy = 'featured',
  } = options;

  const q = search.trim().toLowerCase();
  const catLower = category.trim().toLowerCase();

  return [...products]
    .filter((item) => {
      if (!includeInactive && !item.active) return false;
      if (featuredOnly && !item.featured) return false;
      if (catLower && catLower !== 'all' && item.category.toLowerCase() !== catLower) {
        return false;
      }
      if (typeof minPriceInr === 'number' && Number.isFinite(minPriceInr) && item.priceInr < minPriceInr) {
        return false;
      }
      if (typeof maxPriceInr === 'number' && Number.isFinite(maxPriceInr) && item.priceInr > maxPriceInr) {
        return false;
      }
      if (popularOnly && !item.popular && item.badge !== 'Popular' && !item.featured) {
        return false;
      }
      if (limitedOnly && item.badge !== 'Limited' && !item.limitedOfferEndsAt) {
        return false;
      }
      if (inStockOnly && typeof item.stock === 'number' && item.stock <= 0) {
        return false;
      }
      if (q) {
        const hay = `${item.name} ${item.description} ${item.category} ${(item.perks || []).join(' ')} ${(item.tags || []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') {
        return a.priceInr - b.priceInr;
      }
      if (sortBy === 'price-desc') {
        return b.priceInr - a.priceInr;
      }
      if (sortBy === 'popular') {
        const aScore = (a.popular ? 2 : 0) + (a.featured ? 1 : 0);
        const bScore = (b.popular ? 2 : 0) + (b.featured ? 1 : 0);
        if (aScore !== bScore) return bScore - aScore;
        return a.featuredOrder - b.featuredOrder;
      }
      if (featuredOnly) {
        return a.featuredOrder - b.featuredOrder;
      }
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.featuredOrder - b.featuredOrder;
    });
}

export function validateAndApplyCoupon(params: {
  code: string;
  coupons: CouponItem[];
  subtotalInr: number;
  now?: Date;
}): {
  valid: boolean;
  coupon?: CouponItem;
  discountInr: number;
  finalTotalInr: number;
  error?: string;
} {
  const cleanedCode = params.code.trim().toUpperCase();
  const safeSubtotal = Math.max(0, Math.round(params.subtotalInr));
  if (!cleanedCode) {
    return {
      valid: false,
      discountInr: 0,
      finalTotalInr: safeSubtotal,
      error: 'Enter a promo code.',
    };
  }
  const coupon = params.coupons.find((c) => c.code.trim().toUpperCase() === cleanedCode);
  if (!coupon || !coupon.active) {
    return {
      valid: false,
      discountInr: 0,
      finalTotalInr: safeSubtotal,
      error: 'Promo code is invalid or inactive.',
    };
  }
  const now = params.now || new Date();
  if (coupon.expiresAt) {
    const exp = new Date(coupon.expiresAt);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() < now.getTime()) {
      return {
        valid: false,
        discountInr: 0,
        finalTotalInr: safeSubtotal,
        error: 'This promo code has expired.',
      };
    }
  }
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
    return {
      valid: false,
      discountInr: 0,
      finalTotalInr: safeSubtotal,
      error: 'This promo code has reached its redemption limit.',
    };
  }
  if (safeSubtotal < coupon.minOrderInr) {
    return {
      valid: false,
      discountInr: 0,
      finalTotalInr: safeSubtotal,
      error: `Minimum order of ₹${coupon.minOrderInr} INR required for ${coupon.code}.`,
    };
  }

  let discountInr = 0;
  if (coupon.discountType === 'percent') {
    discountInr = Math.round((safeSubtotal * Math.max(0, Math.min(90, coupon.discountValue))) / 100);
    if (coupon.maxDiscountInr && coupon.maxDiscountInr > 0) {
      discountInr = Math.min(discountInr, Math.round(coupon.maxDiscountInr));
    }
  } else {
    discountInr = Math.round(Math.max(0, coupon.discountValue));
  }
  discountInr = Math.min(discountInr, Math.max(0, safeSubtotal - 1));
  const finalTotalInr = Math.max(1, safeSubtotal - discountInr);

  return {
    valid: true,
    coupon,
    discountInr,
    finalTotalInr,
  };
}

export function maskPlayerName(username: string): string {
  const cleaned = username.trim();
  if (!cleaned) return 'Player';
  if (cleaned.length <= 3) return `${cleaned[0]}**`;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 2)}***${cleaned.slice(-1)}`;
  return `${cleaned.slice(0, 3)}***${cleaned.slice(-2)}`;
}

export function buildDeliveryCommands(
  product: Pick<ProductItem, 'id' | 'name' | 'category' | 'deliveryCommands'>,
  minecraftUsername: string,
  quantity = 1
): string[] {
  const check = validateMinecraftUsername(minecraftUsername);
  if (!check.valid) {
    throw new Error(check.error || 'Invalid Minecraft username');
  }
  const safeQty = Math.max(1, Math.min(50, Math.round(quantity)));
  const templates =
    Array.isArray(product.deliveryCommands) && product.deliveryCommands.length > 0
      ? product.deliveryCommands
      : [`volex fulfill {player} ${sanitizeSlugId(product.id || product.name)} {qty}`];

  return templates
    .map((cmd) =>
      String(cmd || '')
        .trim()
        .replace(/\{player\}/gi, check.cleaned)
        .replace(/\{qty\}/gi, String(safeQty))
    )
    .filter(Boolean);
}

export interface InventoryItemGroup {
  group: 'Ranks' | 'Keys' | 'Crates' | 'Pets' | 'Cosmetics' | 'Items';
  items: Array<{
    productId: string;
    productName: string;
    productImage?: string;
    totalQuantity: number;
    lastOrderedAt: string;
    deliveryStatus: string;
  }>;
}

export function groupInventoryFromOrders(
  orders: OrderItem[],
  products: ProductItem[]
): InventoryItemGroup[] {
  const groupOrder: Array<InventoryItemGroup['group']> = [
    'Ranks',
    'Keys',
    'Crates',
    'Pets',
    'Cosmetics',
    'Items',
  ];
  const buckets = new Map<
    InventoryItemGroup['group'],
    Map<
      string,
      {
        productId: string;
        productName: string;
        productImage?: string;
        totalQuantity: number;
        lastOrderedAt: string;
        deliveryStatus: string;
      }
    >
  >();
  for (const g of groupOrder) {
    buckets.set(g, new Map());
  }

  const productById = new Map(products.map((p) => [p.id, p]));
  const eligible = orders.filter(
    (o) => (o.status === 'Approved' || o.status === 'Delivered') && o.refundStatus !== 'Approved'
  );

  for (const order of eligible) {
    const lines: OrderLineItem[] =
      Array.isArray(order.items) && order.items.length > 0
        ? order.items
        : [
            {
              productId: order.productId,
              productName: order.productName,
              quantity: 1,
              priceInr: order.amountInr,
            },
          ];
    const dt = parseTimestampToIsoDate(order.createdAt).toISOString();

    for (const line of lines) {
      const prod = productById.get(line.productId);
      const cat = (prod?.category || '').toLowerCase();
      let group: InventoryItemGroup['group'] = 'Items';
      if (cat.includes('rank')) group = 'Ranks';
      else if (cat.includes('key')) group = 'Keys';
      else if (cat.includes('crate')) group = 'Crates';
      else if (cat.includes('pet')) group = 'Pets';
      else if (cat.includes('cosmetic')) group = 'Cosmetics';

      const map = buckets.get(group)!;
      const prev = map.get(line.productId);
      const deliveryStatus = order.status === 'Delivered' ? 'Delivered' : order.deliveryStatus || 'Approved';
      if (prev) {
        prev.totalQuantity += Math.max(1, line.quantity);
        if (dt > prev.lastOrderedAt) {
          prev.lastOrderedAt = dt;
          prev.deliveryStatus = deliveryStatus;
        }
      } else {
        map.set(line.productId, {
          productId: line.productId,
          productName: prod?.name || line.productName,
          productImage: prod?.imageUrl || order.productImage,
          totalQuantity: Math.max(1, line.quantity),
          lastOrderedAt: dt,
          deliveryStatus,
        });
      }
    }
  }

  return groupOrder
    .map((group) => ({
      group,
      items: Array.from(buckets.get(group)!.values()),
    }))
    .filter((entry) => entry.items.length > 0);
}

export function buildOrderReceiptText(
  order: OrderItem,
  currency: CurrencyCode = 'INR',
  nprRate = DEFAULT_NPR_PER_INR
): string {
  const dt = parseTimestampToIsoDate(order.createdAt).toLocaleString();
  const lines =
    Array.isArray(order.items) && order.items.length > 0
      ? order.items.map(
          (i) => `- ${i.productName} x${i.quantity}: ${formatCurrencyPrice(i.priceInr * i.quantity, currency, nprRate)}`
        )
      : [`- ${order.productName}: ${formatCurrencyPrice(order.amountInr, currency, nprRate)}`];

  return [
    '========================================',
    '          VOLEXMC STORE RECEIPT         ',
    '         play.volex.indevs.in           ',
    '========================================',
    `Order ID:      ${order.id}`,
    `Date:          ${dt}`,
    `Minecraft IGN: ${order.minecraftUsername}`,
    `Status:        ${order.status}`,
    `Method:        ${order.paymentMethodName}`,
    order.transactionRef ? `Transaction:   ${order.transactionRef}` : '',
    '----------------------------------------',
    'Items:',
    ...lines,
    '----------------------------------------',
    order.couponCode
      ? `Promo Code:    ${order.couponCode} (-${formatCurrencyPrice(order.discountInr || 0, currency, nprRate)})`
      : '',
    `Total Paid:    ${formatCurrencyPrice(order.amountInr, currency, nprRate)} (Base ₹${order.amountInr} INR)`,
    '========================================',
  ]
    .filter(Boolean)
    .join('\n');
}

export function addToCart(
  cart: CartItem[],
  product: ProductItem,
  quantity = 1
): CartItem[] {
  const safeQty = Math.max(1, Math.min(20, Math.round(quantity)));
  const existingIndex = cart.findIndex((item) => item.product.id === product.id);
  if (existingIndex === -1) {
    return [...cart, { product, quantity: safeQty }];
  }
  return cart.map((item, idx) =>
    idx === existingIndex
      ? { ...item, quantity: Math.min(20, item.quantity + safeQty) }
      : item
  );
}

export function updateCartQuantity(
  cart: CartItem[],
  productId: string,
  quantity: number
): CartItem[] {
  const safeQty = Math.round(quantity);
  if (safeQty <= 0) {
    return cart.filter((item) => item.product.id !== productId);
  }
  const clamped = Math.min(20, safeQty);
  return cart.map((item) =>
    item.product.id === productId ? { ...item, quantity: clamped } : item
  );
}

export function removeFromCart(cart: CartItem[], productId: string): CartItem[] {
  return cart.filter((item) => item.product.id !== productId);
}

export function calculateCartSummary(cart: CartItem[]): {
  itemCount: number;
  totalInr: number;
} {
  let itemCount = 0;
  let totalInr = 0;
  for (const item of cart) {
    const qty = Math.max(0, Math.round(item.quantity));
    const price = Number.isFinite(item.product.priceInr)
      ? Math.max(0, Math.round(item.product.priceInr))
      : 0;
    itemCount += qty;
    totalInr += qty * price;
  }
  return { itemCount, totalInr };
}

export function canTransitionOrderStatus(
  fromStatus: OrderStatus,
  toStatus: OrderStatus
): boolean {
  if (fromStatus === toStatus) return false;
  return ORDER_STATUS_TRANSITIONS[fromStatus].includes(toStatus);
}

export function createInitialOrderPayload(params: {
  id: string;
  userId: string;
  customerEmail?: string;
  minecraftUsername: string;
  product: ProductItem;
  paymentMethod: PaymentMethodItem;
  paymentProofUrl: string;
  transactionRef?: string;
  couponCode?: string;
  discountInr?: number;
  currencyDisplayed?: CurrencyCode;
}) {
  return createCartOrderPayload({
    id: params.id,
    userId: params.userId,
    customerEmail: params.customerEmail,
    minecraftUsername: params.minecraftUsername,
    items: [{ product: params.product, quantity: 1 }],
    paymentMethod: params.paymentMethod,
    paymentProofUrl: params.paymentProofUrl,
    transactionRef: params.transactionRef,
    couponCode: params.couponCode,
    discountInr: params.discountInr,
    currencyDisplayed: params.currencyDisplayed,
  });
}

export function createCartOrderPayload(params: {
  id: string;
  userId: string;
  customerEmail?: string;
  minecraftUsername: string;
  items: CartItem[];
  paymentMethod: PaymentMethodItem;
  paymentProofUrl: string;
  transactionRef?: string;
  couponCode?: string;
  discountInr?: number;
  currencyDisplayed?: CurrencyCode;
}): {
  id: string;
  userId: string;
  customerEmail?: string;
  minecraftUsername: string;
  productId: string;
  productName: string;
  productImage: string;
  items: OrderLineItem[];
  amountInr: number;
  subtotalInr: number;
  couponCode?: string;
  discountInr?: number;
  currencyDisplayed?: CurrencyCode;
  paymentMethodId: string;
  paymentMethodName: string;
  paymentProofUrl: string;
  transactionRef?: string;
  status: 'Pending';
} {
  const mcCheck = validateMinecraftUsername(params.minecraftUsername);
  if (!mcCheck.valid) {
    throw new Error(mcCheck.error || 'Invalid Minecraft username');
  }
  if (!params.items || params.items.length === 0) {
    throw new Error('At least one product is required to submit an order.');
  }
  if (!params.paymentMethod.enabled) {
    throw new Error('Selected payment method is currently unavailable.');
  }
  if (!params.paymentProofUrl || params.paymentProofUrl.trim().length === 0) {
    throw new Error('Payment proof screenshot is required.');
  }

  const lineItems: OrderLineItem[] = params.items.map((item) => ({
    productId: item.product.id,
    productName: item.product.name,
    quantity: Math.max(1, Math.round(item.quantity)),
    priceInr: item.product.priceInr,
  }));
  const summary = calculateCartSummary(params.items);
  const safeDiscount =
    typeof params.discountInr === 'number' && Number.isFinite(params.discountInr) && params.discountInr > 0
      ? Math.min(Math.round(params.discountInr), Math.max(0, summary.totalInr - 1))
      : 0;
  const finalTotalInr = Math.max(1, summary.totalInr - safeDiscount);
  const first = params.items[0].product;
  const label =
    lineItems.length === 1 && lineItems[0].quantity === 1
      ? first.name
      : lineItems.length === 1
        ? `${first.name} x${lineItems[0].quantity}`
        : `${first.name} + ${lineItems.length - 1} more (${summary.itemCount} items)`;

  return {
    id: params.id,
    userId: params.userId,
    ...(params.customerEmail?.trim() ? { customerEmail: params.customerEmail.trim() } : {}),
    minecraftUsername: mcCheck.cleaned,
    productId: first.id,
    productName: label,
    productImage: first.imageUrl,
    items: lineItems,
    subtotalInr: summary.totalInr,
    amountInr: finalTotalInr,
    ...(params.couponCode?.trim() ? { couponCode: params.couponCode.trim().toUpperCase() } : {}),
    ...(safeDiscount > 0 ? { discountInr: safeDiscount } : {}),
    ...(params.currencyDisplayed ? { currencyDisplayed: params.currencyDisplayed } : {}),
    paymentMethodId: params.paymentMethod.id,
    paymentMethodName: params.paymentMethod.name,
    paymentProofUrl: params.paymentProofUrl,
    ...(params.transactionRef?.trim()
      ? { transactionRef: params.transactionRef.trim().slice(0, 100) }
      : {}),
    status: 'Pending',
  };
}

export function computeAdminOverviewKpis(params: {
  users: UserProfile[];
  products: ProductItem[];
  orders: OrderItem[];
}): AdminOverviewKpis {
  const pendingOrders = params.orders.filter(
    (o) => o.status === 'Pending' || o.status === 'Under Review'
  ).length;
  const completedOrders = params.orders.filter(
    (o) => o.status === 'Approved' || o.status === 'Delivered'
  ).length;
  const totalRevenueInr = params.orders
    .filter((o) => o.status === 'Approved' || o.status === 'Delivered')
    .reduce((sum, o) => sum + (Number.isFinite(o.amountInr) ? o.amountInr : 0), 0);

  return {
    totalUsers: params.users.length,
    totalProducts: params.products.filter((p) => p.active).length,
    totalOrders: params.orders.length,
    pendingOrders,
    completedOrders,
    totalRevenueInr,
  };
}

export function parseTimestampToIsoDate(raw: unknown, fallbackNow = new Date()): Date {
  if (!raw) return fallbackNow;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? fallbackNow : raw;
  if (typeof raw === 'string' || typeof raw === 'number') {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? fallbackNow : parsed;
  }
  if (typeof raw === 'object' && raw !== null && 'seconds' in raw) {
    const sec = Number((raw as { seconds?: number }).seconds);
    if (Number.isFinite(sec) && sec > 0) {
      return new Date(sec * 1000);
    }
  }
  return fallbackNow;
}

export function computeDailyRevenueSeries(
  orders: OrderItem[],
  days = 7,
  anchorDate = new Date()
): RevenueDayPoint[] {
  const safeDays = Math.max(1, Math.min(30, Math.round(days)));
  const buckets = new Map<string, RevenueDayPoint>();

  for (let i = safeDays - 1; i >= 0; i -= 1) {
    const d = new Date(anchorDate);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    buckets.set(key, { dateKey: key, label, revenueInr: 0, orderCount: 0 });
  }

  for (const order of orders) {
    if (order.status !== 'Approved' && order.status !== 'Delivered') continue;
    const dt = parseTimestampToIsoDate(order.createdAt, anchorDate);
    const key = dt.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.revenueInr += Number.isFinite(order.amountInr) ? Math.max(0, order.amountInr) : 0;
      bucket.orderCount += 1;
    }
  }

  return Array.from(buckets.values());
}

export function applyThemePreset(presetId: Exclude<ThemePresetId, 'custom'>): ThemeConfig {
  const preset = THEME_PRESETS[presetId] || THEME_PRESETS['purple-neon'];
  return { ...preset.theme };
}

export function moveArrayItem<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= list.length ||
    toIndex >= list.length ||
    fromIndex === toIndex
  ) {
    return [...list];
  }
  const copy = [...list];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
}

export function reorderSectionsList(
  sections: PageSectionItem[],
  fromIndex: number,
  toIndex: number
): PageSectionItem[] {
  return moveArrayItem(sections, fromIndex, toIndex).map((sec, idx) => ({
    ...sec,
    order: idx + 1,
  }));
}

export function filterAdminUsers(users: UserProfile[], searchQuery: string): UserProfile[] {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return users;
  return users.filter((u) => {
    const hay = `${u.displayName} ${u.email} ${u.minecraftUsername || ''} ${u.status || 'Active'}`.toLowerCase();
    return hay.includes(q);
  });
}

export function sanitizeWebsiteConfig(
  raw: Partial<WebsiteEditorConfig> | null | undefined
): WebsiteEditorConfig {
  if (!raw) {
    return {
      ...DEFAULT_WEBSITE_CONFIG,
      navLinks: DEFAULT_WEBSITE_CONFIG.navLinks.map((n) => ({ ...n })),
      theme: { ...DEFAULT_WEBSITE_CONFIG.theme },
      backgrounds: {
        ...DEFAULT_WEBSITE_CONFIG.backgrounds,
        gallery: DEFAULT_WEBSITE_CONFIG.backgrounds.gallery.map((g) => ({ ...g })),
      },
      sections: DEFAULT_WEBSITE_CONFIG.sections.map((s) => ({ ...s })),
    };
  }

  return {
    ...DEFAULT_WEBSITE_CONFIG,
    ...raw,
    navLinks:
      Array.isArray(raw.navLinks) && raw.navLinks.length > 0
        ? raw.navLinks.map((n, i) => ({
            id: n.id || `nav-${i + 1}`,
            label: String(n.label || 'Link').slice(0, 32),
            url: String(n.url || '/'),
            external: Boolean(n.external),
            enabled: n.enabled !== false,
            sortOrder: Number.isFinite(n.sortOrder) ? n.sortOrder : i + 1,
          }))
        : DEFAULT_WEBSITE_CONFIG.navLinks.map((n) => ({ ...n })),
    theme: {
      ...DEFAULT_WEBSITE_CONFIG.theme,
      ...(raw.theme || {}),
      glowIntensity:
        typeof raw.theme?.glowIntensity === 'number'
          ? Math.max(0, Math.min(100, Math.round(raw.theme.glowIntensity)))
          : DEFAULT_WEBSITE_CONFIG.theme.glowIntensity,
      animationsEnabled:
        raw.theme?.animationsEnabled !== undefined
          ? Boolean(raw.theme.animationsEnabled)
          : DEFAULT_WEBSITE_CONFIG.theme.animationsEnabled,
    },
    backgrounds: {
      ...DEFAULT_WEBSITE_CONFIG.backgrounds,
      ...(raw.backgrounds || {}),
      gallery: Array.isArray(raw.backgrounds?.gallery)
        ? raw.backgrounds.gallery
        : DEFAULT_WEBSITE_CONFIG.backgrounds.gallery.map((g) => ({ ...g })),
    },
    sections:
      Array.isArray(raw.sections) && raw.sections.length > 0
        ? raw.sections.map((s, idx) => ({
            ...s,
            order: idx + 1,
          }))
        : DEFAULT_WEBSITE_CONFIG.sections.map((s) => ({ ...s })),
  };
}

export function sanitizeSlugId(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function isAuthorizedAdminEmail(
  email?: string | null,
  emailVerified?: boolean | null
): boolean {
  if (!email || !emailVerified) return false;
  return email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
}
