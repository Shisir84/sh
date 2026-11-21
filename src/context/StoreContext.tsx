import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import type {
  AdminActivityLog,
  AdminAuthStatus,
  AdminSessionUser,
  AnnouncementItem,
  CartItem,
  CategoryItem,
  CouponItem,
  CurrencyCode,
  DeliveryAttemptLog,
  DeliveryQueueJob,
  MinecraftServerStatus,
  OrderItem,
  OrderStatus,
  PaymentMethodItem,
  PlayerNotificationItem,
  PlayerServerStats,
  ProductItem,
  RecentPurchasePublicItem,
  RefundRequestItem,
  ServerEventItem,
  ServerIntegrationStatus,
  ServerRuleItem,
  SiteConfig,
  StaffMemberItem,
  StoreRuntimeSettings,
  SupportTicketItem,
  TicketCategory,
  TicketStatus,
  UserProfile,
  WebsiteEditorConfig,
  WebsiteVersionSnapshot,
  WikiArticleItem,
} from '../types/store';
import {
  DEFAULT_ANNOUNCEMENTS,
  DEFAULT_CATEGORIES,
  DEFAULT_COUPONS,
  DEFAULT_EVENTS,
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_PRODUCTS,
  DEFAULT_RULES,
  DEFAULT_RUNTIME_SETTINGS,
  DEFAULT_SITE_CONFIG,
  DEFAULT_STAFF,
  DEFAULT_WEBSITE_CONFIG,
  DEFAULT_WIKI_ARTICLES,
} from '../data/seedData';
import {
  addToCart,
  calculateCartSummary,
  createCartOrderPayload,
  createInitialOrderPayload,
  formatCurrencyPrice,
  isAuthorizedAdminEmail,
  removeFromCart,
  sanitizeSlugId,
  sanitizeWebsiteConfig,
  updateCartQuantity,
} from '../utils/storeLogic';

const CART_STORAGE_KEY = 'volexmc_cart_v1';
const CURRENCY_STORAGE_KEY = 'volexmc_currency_v1';
const WISHLIST_STORAGE_KEY = 'volexmc_wishlist_v1';
const ADMIN_TOKEN_STORAGE_KEY = 'volexmc_admin_session_token_v1';

function readStoredAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return (
      window.sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ||
      window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)
    );
  } catch {
    return null;
  }
}

function writeStoredAdminToken(token: string | undefined, rememberMe: boolean): void {
  if (typeof window === 'undefined' || !token) return;
  try {
    window.sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
    if (rememberMe) {
      window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage quota errors
  }
}

function clearStoredAdminToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

function loadInitialCurrency(): CurrencyCode {
  if (typeof window === 'undefined') return 'INR';
  try {
    const val = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    return val === 'NPR' ? 'NPR' : 'INR';
  } catch {
    return 'INR';
  }
}

function loadInitialWishlist(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

interface StoreContextValue {
  authReady: boolean;
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateMinecraftUsername: (username: string) => Promise<void>;

  // Server-side Admin Session Auth (/admin/login -> /admin)
  adminAuthChecked: boolean;
  adminAuthStatus: AdminAuthStatus | null;
  serverAdmin: AdminSessionUser | null;
  refreshAdminAuth: () => Promise<AdminAuthStatus | null>;
  loginAdmin: (params: {
    identifier: string;
    password: string;
    rememberMe?: boolean;
  }) => Promise<{ ok: boolean; error?: string; setupRequired?: boolean }>;
  logoutAdmin: () => Promise<void>;
  changeAdminPassword: (params: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<{ ok: boolean; error?: string }>;

  siteConfig: SiteConfig;
  publishedWebsite: WebsiteEditorConfig;
  websiteDraft: WebsiteEditorConfig;
  websiteVersions: WebsiteVersionSnapshot[];
  activityLogs: AdminActivityLog[];
  categories: CategoryItem[];
  products: ProductItem[];
  paymentMethods: PaymentMethodItem[];
  staff: StaffMemberItem[];
  wikiArticles: WikiArticleItem[];
  rules: ServerRuleItem[];
  orders: OrderItem[];
  allUsers: UserProfile[];
  supportTickets: SupportTicketItem[];

  // Currency & Runtime Network Data
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  nprPerInrRate: number;
  formatPrice: (amountInr: number) => string;
  storeSettings: StoreRuntimeSettings;
  announcements: AnnouncementItem[];
  serverEvents: ServerEventItem[];
  recentPurchases: RecentPurchasePublicItem[];

  // Player Features: Wishlist, Compare, Notifications, Stats, Refunds
  wishlistIds: string[];
  toggleWishlist: (productId: string) => Promise<void>;
  compareIds: string[];
  toggleCompareProduct: (productId: string) => void;
  clearCompare: () => void;
  notifications: PlayerNotificationItem[];
  unreadNotificationCount: number;
  markNotificationRead: (notificationId?: string) => Promise<void>;
  playerServerStats: PlayerServerStats | null;
  submitRefundRequest: (orderId: string, reason: string) => Promise<void>;

  // Coupons
  appliedCoupon: { code: string; discountInr: number; description?: string } | null;
  validateCouponCode: (
    code: string,
    subtotalInr: number
  ) => Promise<{ valid: boolean; error?: string; discountInr: number }>;
  clearAppliedCoupon: () => void;

  // Admin Operations Extensions
  coupons: CouponItem[];
  deliveryJobs: DeliveryQueueJob[];
  deliveryLogs: DeliveryAttemptLog[];
  refundRequests: RefundRequestItem[];
  integrationStatus: ServerIntegrationStatus | null;

  serverStatus: MinecraftServerStatus | null;
  statusLoading: boolean;
  refreshServerStatus: () => Promise<void>;

  // Product Detail & Cart
  detailProduct: ProductItem | null;
  openProductDetail: (product: ProductItem) => void;
  closeProductDetail: () => void;

  cartItems: CartItem[];
  cartCount: number;
  cartTotalInr: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addProductToCart: (product: ProductItem, quantity?: number) => void;
  updateCartQty: (productId: string, quantity: number) => void;
  removeCartProduct: (productId: string) => void;
  clearCart: () => void;

  // Checkout Modal
  selectedProduct: ProductItem | null;
  checkoutItems: CartItem[];
  isCartCheckout: boolean;
  openCheckout: (product: ProductItem) => void;
  openCartCheckout: () => void;
  closeCheckout: () => void;

  submitOrder: (params: {
    minecraftUsername: string;
    product: ProductItem;
    paymentMethod: PaymentMethodItem;
    paymentProofUrl: string;
    transactionRef?: string;
    couponCode?: string;
    discountInr?: number;
  }) => Promise<OrderItem>;

  submitCartOrder: (params: {
    minecraftUsername: string;
    items: CartItem[];
    paymentMethod: PaymentMethodItem;
    paymentProofUrl: string;
    transactionRef?: string;
    couponCode?: string;
    discountInr?: number;
  }) => Promise<OrderItem>;

  submitSupportTicket: (params: {
    minecraftUsername: string;
    subject: string;
    category: TicketCategory;
    message: string;
  }) => Promise<SupportTicketItem>;

  // Admin actions
  seedDatabaseDefaults: () => Promise<void>;
  saveProduct: (product: ProductItem) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  saveCategory: (category: CategoryItem) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  savePaymentMethod: (method: PaymentMethodItem) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus, adminNotes?: string) => Promise<void>;
  updateUserAccountStatus: (uid: string, status: 'Active' | 'Suspended') => Promise<void>;
  saveSiteConfig: (config: SiteConfig) => Promise<void>;
  saveWebsiteDraft: (draft: WebsiteEditorConfig) => Promise<WebsiteEditorConfig>;
  publishWebsiteDraft: (draft?: WebsiteEditorConfig) => Promise<WebsiteEditorConfig>;
  discardWebsiteDraft: () => Promise<WebsiteEditorConfig>;
  restoreWebsiteVersion: (versionId: string) => Promise<WebsiteEditorConfig | null>;
  refreshActivityLogs: () => Promise<void>;
  saveStaffMember: (member: StaffMemberItem) => Promise<void>;
  deleteStaffMember: (staffId: string) => Promise<void>;
  saveWikiArticle: (article: WikiArticleItem) => Promise<void>;
  deleteWikiArticle: (articleId: string) => Promise<void>;
  saveRule: (rule: ServerRuleItem) => Promise<void>;
  deleteRule: (ruleId: string) => Promise<void>;
  updateSupportTicket: (ticketId: string, status: TicketStatus, adminReply?: string) => Promise<void>;

  saveCoupon: (coupon: CouponItem) => Promise<void>;
  deleteCoupon: (couponId: string) => Promise<void>;
  enqueueOrderDelivery: (orderId: string) => Promise<number>;
  markDeliveryJobDelivered: (jobId: string) => Promise<void>;
  retryDeliveryJob: (jobId: string) => Promise<void>;
  decideRefundRequest: (
    refundId: string,
    decision: 'Approved' | 'Rejected',
    adminNote?: string
  ) => Promise<void>;
  saveAnnouncement: (item: AnnouncementItem) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  saveServerEvent: (item: ServerEventItem) => Promise<void>;
  deleteServerEvent: (id: string) => Promise<void>;
  saveStoreSettings: (settings: StoreRuntimeSettings) => Promise<void>;
  rotatePluginKey: () => Promise<string>;
  saveRconConfig: (params: { host?: string; port?: number; password?: string }) => Promise<void>;
  exportDatabaseBackup: () => Promise<Record<string, unknown>>;
  restoreDatabaseBackup: (payload: unknown) => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function loadInitialCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed)
      ? parsed.filter((x) => x && x.product && typeof x.quantity === 'number')
      : [];
  } catch {
    return [];
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [hasAdminDoc, setHasAdminDoc] = useState(false);

  const [adminAuthChecked, setAdminAuthChecked] = useState(false);
  const [adminAuthStatus, setAdminAuthStatus] = useState<AdminAuthStatus | null>(null);

  const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [publishedWebsite, setPublishedWebsite] = useState<WebsiteEditorConfig>(DEFAULT_WEBSITE_CONFIG);
  const [websiteDraft, setWebsiteDraft] = useState<WebsiteEditorConfig>(DEFAULT_WEBSITE_CONFIG);
  const [websiteVersions, setWebsiteVersions] = useState<WebsiteVersionSnapshot[]>([]);
  const [activityLogs, setActivityLogs] = useState<AdminActivityLog[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>(DEFAULT_CATEGORIES);
  const [products, setProducts] = useState<ProductItem[]>(DEFAULT_PRODUCTS);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>(DEFAULT_PAYMENT_METHODS);
  const [staff, setStaff] = useState<StaffMemberItem[]>(DEFAULT_STAFF);
  const [wikiArticles, setWikiArticles] = useState<WikiArticleItem[]>(DEFAULT_WIKI_ARTICLES);
  const [rules, setRules] = useState<ServerRuleItem[]>(DEFAULT_RULES);

  const [currency, setCurrencyState] = useState<CurrencyCode>(loadInitialCurrency);
  const [storeSettings, setStoreSettings] = useState<StoreRuntimeSettings>(DEFAULT_RUNTIME_SETTINGS);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(DEFAULT_ANNOUNCEMENTS);
  const [serverEvents, setServerEvents] = useState<ServerEventItem[]>(DEFAULT_EVENTS);
  const [recentPurchases, setRecentPurchases] = useState<RecentPurchasePublicItem[]>([]);

  const [coupons, setCoupons] = useState<CouponItem[]>(DEFAULT_COUPONS);
  const [deliveryJobs, setDeliveryJobs] = useState<DeliveryQueueJob[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryAttemptLog[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequestItem[]>([]);
  const [integrationStatus, setIntegrationStatus] = useState<ServerIntegrationStatus | null>(null);

  const [wishlistIds, setWishlistIds] = useState<string[]>(loadInitialWishlist);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<PlayerNotificationItem[]>([]);
  const [playerServerStats, setPlayerServerStats] = useState<PlayerServerStats | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountInr: number;
    description?: string;
  } | null>(null);

  const [firestoreOrders, setFirestoreOrders] = useState<OrderItem[]>([]);
  const [serverOrders, setServerOrders] = useState<OrderItem[]>([]);
  const [orderSyncOverrides, setOrderSyncOverrides] = useState<
    Record<string, { status?: OrderStatus; refundStatus?: OrderItem['refundStatus']; deliveryStatus?: OrderItem['deliveryStatus']; adminNotes?: string }>
  >({});
  const [firestoreUsers, setFirestoreUsers] = useState<UserProfile[]>([]);
  const [serverUsers, setServerUsers] = useState<UserProfile[]>([]);
  const [firestoreTickets, setFirestoreTickets] = useState<SupportTicketItem[]>([]);
  const [serverTickets, setServerTickets] = useState<SupportTicketItem[]>([]);

  const [serverStatus, setServerStatus] = useState<MinecraftServerStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const [detailProduct, setDetailProduct] = useState<ProductItem | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>(loadInitialCart);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);
  const [isCartCheckout, setIsCartCheckout] = useState(false);

  const serverAdmin = adminAuthStatus?.authenticated ? adminAuthStatus.admin : null;
  const hasFirebaseAdmin = useMemo(() => {
    if (!user) return false;
    return hasAdminDoc || isAuthorizedAdminEmail(user.email, user.emailVerified);
  }, [user, hasAdminDoc]);

  const isAdmin = Boolean(serverAdmin || hasFirebaseAdmin);

  const setCurrency = useCallback((next: CurrencyCode) => {
    setCurrencyState(next);
    try {
      window.localStorage.setItem(CURRENCY_STORAGE_KEY, next);
    } catch {
      // ignore storage error
    }
  }, []);

  const nprPerInrRate = storeSettings.nprPerInrRate || 1.6;
  const formatPrice = useCallback(
    (amountInr: number) => formatCurrencyPrice(amountInr, currency, nprPerInrRate),
    [currency, nprPerInrRate]
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // ignore storage quota errors
    }
  }, [cartItems]);

  useEffect(() => {
    try {
      window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistIds));
    } catch {
      // ignore storage quota errors
    }
  }, [wishlistIds]);

  const cartSummary = useMemo(() => calculateCartSummary(cartItems), [cartItems]);

  const adminFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(init.headers);
      const token = readStoredAdminToken();
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      const res = await fetch(input, {
        ...init,
        headers,
        credentials: 'include',
      });
      if (res.status === 401) {
        clearStoredAdminToken();
        setAdminAuthStatus((prev) =>
          prev
            ? { ...prev, authenticated: false, admin: null }
            : { configured: true, setupRequired: false, authenticated: false, admin: null }
        );
      }
      return res;
    },
    []
  );

  const refreshAdminAuth = useCallback(async (): Promise<AdminAuthStatus | null> => {
    try {
      const res = await adminFetch('/api/admin/auth/status');
      if (!res.ok) return null;
      const data = (await res.json()) as AdminAuthStatus;
      if (!data.authenticated) {
        clearStoredAdminToken();
      }
      setAdminAuthStatus(data);
      return data;
    } catch {
      return null;
    } finally {
      setAdminAuthChecked(true);
    }
  }, [adminFetch]);

  const hydratePublicOverrides = useCallback(async () => {
    try {
      const res = await fetch('/api/store/public');
      if (!res.ok) return;
      const data = (await res.json()) as {
        siteConfig?: SiteConfig | null;
        websitePublished?: Partial<WebsiteEditorConfig> | null;
        categories?: CategoryItem[] | null;
        products?: ProductItem[] | null;
        paymentMethods?: PaymentMethodItem[] | null;
        staff?: StaffMemberItem[] | null;
        wikiArticles?: WikiArticleItem[] | null;
        rules?: ServerRuleItem[] | null;
        announcements?: AnnouncementItem[] | null;
        serverEvents?: ServerEventItem[] | null;
        storeSettings?: StoreRuntimeSettings | null;
        recentPurchases?: RecentPurchasePublicItem[] | null;
      };
      if (data.siteConfig) setSiteConfig({ ...DEFAULT_SITE_CONFIG, ...data.siteConfig });
      if (data.websitePublished) {
        setPublishedWebsite(sanitizeWebsiteConfig(data.websitePublished));
      } else if (data.siteConfig) {
        setPublishedWebsite((prev) =>
          sanitizeWebsiteConfig({
            ...prev,
            heroEyebrow: data.siteConfig?.heroEyebrow ?? prev.heroEyebrow,
            heroTitle: data.siteConfig?.heroTitle ?? prev.heroTitle,
            heroSubtitle: data.siteConfig?.heroSubtitle ?? prev.heroSubtitle,
            heroDescription: data.siteConfig?.heroDescription ?? prev.heroDescription,
            heroCtaText: data.siteConfig?.heroCtaText ?? prev.heroCtaText,
            heroImageUrl: data.siteConfig?.heroImageUrl ?? prev.heroImageUrl,
            announcementBanner: data.siteConfig?.announcementBanner ?? prev.announcementBanner,
            announcementEnabled:
              data.siteConfig?.announcementEnabled ?? prev.announcementEnabled,
          })
        );
      }
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        setCategories([...data.categories].sort((a, b) => a.sortOrder - b.sortOrder));
      }
      if (Array.isArray(data.products) && data.products.length > 0) {
        setProducts([...data.products].sort((a, b) => a.featuredOrder - b.featuredOrder));
      }
      if (Array.isArray(data.paymentMethods) && data.paymentMethods.length > 0) {
        setPaymentMethods([...data.paymentMethods].sort((a, b) => a.sortOrder - b.sortOrder));
      }
      if (Array.isArray(data.staff) && data.staff.length > 0) {
        setStaff([...data.staff].sort((a, b) => a.sortOrder - b.sortOrder));
      }
      if (Array.isArray(data.wikiArticles) && data.wikiArticles.length > 0) {
        setWikiArticles([...data.wikiArticles].sort((a, b) => a.sortOrder - b.sortOrder));
      }
      if (Array.isArray(data.rules) && data.rules.length > 0) {
        setRules([...data.rules].sort((a, b) => a.sortOrder - b.sortOrder));
      }
      if (Array.isArray(data.announcements)) {
        setAnnouncements(data.announcements);
      }
      if (Array.isArray(data.serverEvents)) {
        setServerEvents(data.serverEvents);
      }
      if (data.storeSettings) {
        setStoreSettings({ ...DEFAULT_RUNTIME_SETTINGS, ...data.storeSettings });
      }
      if (Array.isArray(data.recentPurchases)) {
        setRecentPurchases(data.recentPurchases);
      }
    } catch {
      // keep existing state
    }
  }, []);

  const hydratePlayerState = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setPlayerServerStats(null);
      setOrderSyncOverrides({});
      return;
    }
    try {
      const ign = userProfile?.minecraftUsername || '';
      const res = await fetch(
        `/api/player/state?uid=${encodeURIComponent(user.uid)}&ign=${encodeURIComponent(ign)}`
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications?: PlayerNotificationItem[];
        wishlistIds?: string[];
        orderSync?: Array<{
          id: string;
          status?: OrderStatus;
          refundStatus?: OrderItem['refundStatus'];
          deliveryStatus?: OrderItem['deliveryStatus'];
          adminNotes?: string;
        }>;
        playerStats?: PlayerServerStats | null;
      };
      if (Array.isArray(data.notifications)) setNotifications(data.notifications);
      if (Array.isArray(data.wishlistIds) && data.wishlistIds.length > 0) {
        setWishlistIds(data.wishlistIds);
      }
      if (Array.isArray(data.orderSync)) {
        const nextMap: Record<string, { status?: OrderStatus; refundStatus?: OrderItem['refundStatus']; deliveryStatus?: OrderItem['deliveryStatus']; adminNotes?: string }> = {};
        for (const item of data.orderSync) {
          nextMap[item.id] = item;
        }
        setOrderSyncOverrides(nextMap);
      }
      if (data.playerStats !== undefined) setPlayerServerStats(data.playerStats);
    } catch {
      // ignore network errors
    }
  }, [user, userProfile?.minecraftUsername]);

  const hydrateServerAdminOverview = useCallback(async () => {
    if (!serverAdmin) {
      setServerOrders([]);
      setServerUsers([]);
      setServerTickets([]);
      setActivityLogs([]);
      setDeliveryJobs([]);
      setDeliveryLogs([]);
      setRefundRequests([]);
      setWebsiteVersions([]);
      setIntegrationStatus(null);
      return;
    }
    try {
      const res = await adminFetch('/api/admin/overview');
      if (!res.ok) return;
      const data = (await res.json()) as {
        orders?: OrderItem[];
        users?: UserProfile[];
        supportTickets?: SupportTicketItem[];
        activityLogs?: AdminActivityLog[];
        websitePublished?: Partial<WebsiteEditorConfig> | null;
        websiteDraft?: Partial<WebsiteEditorConfig> | null;
        websiteVersions?: WebsiteVersionSnapshot[];
        coupons?: CouponItem[];
        deliveryJobs?: DeliveryQueueJob[];
        deliveryLogs?: DeliveryAttemptLog[];
        refundRequests?: RefundRequestItem[];
        announcements?: AnnouncementItem[];
        serverEvents?: ServerEventItem[];
        storeSettings?: StoreRuntimeSettings;
        integrationStatus?: ServerIntegrationStatus;
      };
      if (Array.isArray(data.orders)) setServerOrders(data.orders);
      if (Array.isArray(data.users)) setServerUsers(data.users);
      if (Array.isArray(data.supportTickets)) setServerTickets(data.supportTickets);
      if (Array.isArray(data.activityLogs)) setActivityLogs(data.activityLogs);
      if (Array.isArray(data.websiteVersions)) setWebsiteVersions(data.websiteVersions);
      if (Array.isArray(data.coupons)) setCoupons(data.coupons);
      if (Array.isArray(data.deliveryJobs)) setDeliveryJobs(data.deliveryJobs);
      if (Array.isArray(data.deliveryLogs)) setDeliveryLogs(data.deliveryLogs);
      if (Array.isArray(data.refundRequests)) setRefundRequests(data.refundRequests);
      if (Array.isArray(data.announcements)) setAnnouncements(data.announcements);
      if (Array.isArray(data.serverEvents)) setServerEvents(data.serverEvents);
      if (data.storeSettings) setStoreSettings(data.storeSettings);
      if (data.integrationStatus) setIntegrationStatus(data.integrationStatus);
      if (data.websitePublished) {
        setPublishedWebsite(sanitizeWebsiteConfig(data.websitePublished));
      }
      if (data.websiteDraft) {
        setWebsiteDraft(sanitizeWebsiteConfig(data.websiteDraft));
      } else if (data.websitePublished) {
        setWebsiteDraft(sanitizeWebsiteConfig(data.websitePublished));
      }
    } catch {
      // ignore network error
    }
  }, [serverAdmin, adminFetch]);

  const refreshActivityLogs = useCallback(async () => {
    if (!serverAdmin) return;
    try {
      const res = await adminFetch('/api/admin/activity-logs');
      if (!res.ok) return;
      const data = (await res.json()) as { logs?: AdminActivityLog[] };
      if (Array.isArray(data.logs)) setActivityLogs(data.logs);
    } catch {
      // ignore
    }
  }, [serverAdmin, adminFetch]);

  useEffect(() => {
    void refreshAdminAuth();
    void hydratePublicOverrides();
  }, [refreshAdminAuth, hydratePublicOverrides]);

  useEffect(() => {
    void hydrateServerAdminOverview();
  }, [hydrateServerAdminOverview]);

  useEffect(() => {
    void hydratePlayerState();
  }, [hydratePlayerState]);

  // Auth state & user profile sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setUserProfile(null);
        setHasAdminDoc(false);
        setAuthReady(true);
        return;
      }

      try {
        const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
        setHasAdminDoc(adminSnap.exists());
      } catch {
        setHasAdminDoc(false);
      }

      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists() && firebaseUser.emailVerified) {
          const initialProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'VOLEXMC Player',
            photoURL: firebaseUser.photoURL || '',
            role: 'user',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(userRef, initialProfile);
          const localProfile: UserProfile = {
            ...initialProfile,
            status: 'Active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setUserProfile(localProfile);
          void fetch('/api/users/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(localProfile),
          });
        } else if (userSnap.exists()) {
          const loaded = userSnap.data() as UserProfile;
          setUserProfile(loaded);
          void fetch('/api/users/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loaded),
          });
        }
      } catch (err) {
        console.warn('Profile sync warning:', err);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // Public collections real-time listeners
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(
        doc(db, 'siteConfig', 'main'),
        (snap) => {
          if (snap.exists()) {
            setSiteConfig({ ...DEFAULT_SITE_CONFIG, ...(snap.data() as SiteConfig) });
            void hydratePublicOverrides();
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, 'siteConfig/main')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'categories'),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => d.data() as CategoryItem);
            list.sort((a, b) => a.sortOrder - b.sortOrder);
            setCategories(list);
          }
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'categories')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'products'),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => d.data() as ProductItem);
            list.sort((a, b) => a.featuredOrder - b.featuredOrder);
            setProducts(list);
          }
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'products')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'paymentMethods'),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => d.data() as PaymentMethodItem);
            list.sort((a, b) => a.sortOrder - b.sortOrder);
            setPaymentMethods(list);
          }
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'paymentMethods')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'staff'),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => d.data() as StaffMemberItem);
            list.sort((a, b) => a.sortOrder - b.sortOrder);
            setStaff(list);
          }
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'staff')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'wikiArticles'),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => d.data() as WikiArticleItem);
            list.sort((a, b) => a.sortOrder - b.sortOrder);
            setWikiArticles(list);
          }
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'wikiArticles')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'rules'),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => d.data() as ServerRuleItem);
            list.sort((a, b) => a.sortOrder - b.sortOrder);
            setRules(list);
          }
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'rules')
      )
    );

    return () => unsubs.forEach((fn) => fn());
  }, [hydratePublicOverrides]);

  // Authenticated private listeners
  useEffect(() => {
    if (!authReady || !user) {
      setFirestoreOrders([]);
      setFirestoreTickets([]);
      setFirestoreUsers([]);
      return;
    }

    const unsubs: Array<() => void> = [];

    const ordersQuery = hasFirebaseAdmin
      ? collection(db, 'orders')
      : query(collection(db, 'orders'), where('userId', '==', user.uid));

    unsubs.push(
      onSnapshot(
        ordersQuery,
        (snap) => {
          const list = snap.docs.map((d) => d.data() as OrderItem);
          list.sort((a, b) => {
            const ta = (a.createdAt as { seconds?: number } | undefined)?.seconds || 0;
            const tb = (b.createdAt as { seconds?: number } | undefined)?.seconds || 0;
            return tb - ta;
          });
          setFirestoreOrders(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
      )
    );

    const ticketsQuery = hasFirebaseAdmin
      ? collection(db, 'supportTickets')
      : query(collection(db, 'supportTickets'), where('userId', '==', user.uid));

    unsubs.push(
      onSnapshot(
        ticketsQuery,
        (snap) => {
          const list = snap.docs.map((d) => d.data() as SupportTicketItem);
          list.sort((a, b) => {
            const ta = (a.createdAt as { seconds?: number } | undefined)?.seconds || 0;
            const tb = (b.createdAt as { seconds?: number } | undefined)?.seconds || 0;
            return tb - ta;
          });
          setFirestoreTickets(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'supportTickets')
      )
    );

    if (hasFirebaseAdmin) {
      unsubs.push(
        onSnapshot(
          collection(db, 'users'),
          (snap) => {
            setFirestoreUsers(snap.docs.map((d) => d.data() as UserProfile));
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'users')
        )
      );
    }

    return () => unsubs.forEach((fn) => fn());
  }, [authReady, user, hasFirebaseAdmin]);

  // Merge Firestore + Server + Player Sync records cleanly
  const orders = useMemo(() => {
    const map = new Map<string, OrderItem>();
    for (const o of firestoreOrders) map.set(o.id, o);
    for (const o of serverOrders) {
      const existing = map.get(o.id);
      map.set(o.id, existing ? { ...existing, ...o } : o);
    }
    return Array.from(map.values()).map((o) => {
      const sync = orderSyncOverrides[o.id];
      return sync ? { ...o, ...sync } : o;
    });
  }, [firestoreOrders, serverOrders, orderSyncOverrides]);

  const allUsers = useMemo(() => {
    const map = new Map<string, UserProfile>();
    for (const u of firestoreUsers) map.set(u.uid, u);
    for (const u of serverUsers) {
      const existing = map.get(u.uid);
      map.set(u.uid, existing ? { ...existing, ...u } : u);
    }
    return Array.from(map.values());
  }, [firestoreUsers, serverUsers]);

  const supportTickets = useMemo(() => {
    const map = new Map<string, SupportTicketItem>();
    for (const t of firestoreTickets) map.set(t.id, t);
    for (const t of serverTickets) {
      const existing = map.get(t.id);
      map.set(t.id, existing ? { ...existing, ...t } : t);
    }
    return Array.from(map.values());
  }, [firestoreTickets, serverTickets]);

  const refreshServerStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/server-status?ip=${encodeURIComponent(siteConfig.serverIp)}`);
      if (res.ok) {
        const data = (await res.json()) as MinecraftServerStatus;
        setServerStatus(data);
      }
    } catch {
      // keep previous
    } finally {
      setStatusLoading(false);
    }
  }, [siteConfig.serverIp]);

  useEffect(() => {
    void refreshServerStatus();
    const interval = setInterval(() => {
      void refreshServerStatus();
    }, 45_000);
    return () => clearInterval(interval);
  }, [refreshServerStatus]);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const loginAdmin = useCallback(
    async (params: {
      identifier: string;
      password: string;
      rememberMe?: boolean;
    }): Promise<{ ok: boolean; error?: string; setupRequired?: boolean }> => {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      });
      const data = (await res.json()) as {
        authenticated?: boolean;
        admin?: AdminSessionUser;
        sessionToken?: string;
        error?: string;
        setupRequired?: boolean;
      };
      if (!res.ok || !data.authenticated) {
        clearStoredAdminToken();
        return {
          ok: false,
          error: data.error || 'Admin login failed.',
          setupRequired: data.setupRequired,
        };
      }
      writeStoredAdminToken(data.sessionToken, Boolean(params.rememberMe));
      const status = await refreshAdminAuth();
      if (!status?.authenticated) {
        clearStoredAdminToken();
        return {
          ok: false,
          error: 'Administrator session could not be established. Please try again.',
        };
      }
      return { ok: true };
    },
    [refreshAdminAuth]
  );

  const logoutAdmin = useCallback(async () => {
    try {
      await adminFetch('/api/admin/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    clearStoredAdminToken();
    setServerOrders([]);
    setServerUsers([]);
    setServerTickets([]);
    setActivityLogs([]);
    await refreshAdminAuth();
  }, [adminFetch, refreshAdminAuth]);

  const changeAdminPassword = useCallback(
    async (params: {
      currentPassword: string;
      newPassword: string;
    }): Promise<{ ok: boolean; error?: string }> => {
      const res = await adminFetch('/api/admin/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        sessionToken?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        return { ok: false, error: data.error || 'Failed to update password.' };
      }
      if (data.sessionToken) {
        const hadPersistent =
          typeof window !== 'undefined' &&
          Boolean(window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY));
        writeStoredAdminToken(data.sessionToken, hadPersistent);
      }
      await refreshAdminAuth();
      return { ok: true };
    },
    [adminFetch, refreshAdminAuth]
  );

  const updateMinecraftUsername = useCallback(
    async (username: string) => {
      if (!user) throw new Error('Sign in required.');
      const trimmed = username.trim();
      const userRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(userRef, {
          minecraftUsername: trimmed,
          updatedAt: serverTimestamp(),
        });
        setUserProfile((prev) => (prev ? { ...prev, minecraftUsername: trimmed } : prev));
        void fetch('/api/users/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            minecraftUsername: trimmed,
          }),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    },
    [user]
  );

  // Player Wishlist, Compare, Notifications, Refunds & Coupons
  const toggleWishlist = useCallback(
    async (productId: string) => {
      setWishlistIds((prev) =>
        prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
      );
      if (user) {
        try {
          const res = await fetch('/api/player/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: user.uid, productId }),
          });
          if (res.ok) {
            const data = (await res.json()) as { wishlistIds?: string[] };
            if (Array.isArray(data.wishlistIds)) setWishlistIds(data.wishlistIds);
          }
        } catch {
          // keep optimistic local state
        }
      }
    },
    [user]
  );

  const toggleCompareProduct = useCallback((productId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(productId)) return prev.filter((id) => id !== productId);
      if (prev.length >= 3) return [...prev.slice(1), productId];
      return [...prev, productId];
    });
  }, []);

  const clearCompare = useCallback(() => setCompareIds([]), []);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markNotificationRead = useCallback(
    async (notificationId?: string) => {
      setNotifications((prev) =>
        prev.map((n) => (!notificationId || n.id === notificationId ? { ...n, read: true } : n))
      );
      if (!user) return;
      try {
        await fetch('/api/player/notifications/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid, notificationId }),
        });
      } catch {
        // ignore
      }
    },
    [user]
  );

  const submitRefundRequest = useCallback(
    async (orderId: string, reason: string) => {
      if (!user) throw new Error('Sign in required to request a refund.');
      const res = await fetch('/api/player/refund-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, userId: user.uid, reason }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Could not submit refund request.');
      }
      await hydratePlayerState();
    },
    [user, hydratePlayerState]
  );

  const validateCouponCode = useCallback(
    async (code: string, subtotalInr: number) => {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotalInr }),
      });
      const data = (await res.json()) as {
        valid: boolean;
        code?: string;
        description?: string;
        discountInr?: number;
        error?: string;
      };
      if (!res.ok || !data.valid || !data.code) {
        return {
          valid: false,
          discountInr: 0,
          error: data.error || 'Invalid coupon code.',
        };
      }
      setAppliedCoupon({
        code: data.code,
        discountInr: data.discountInr || 0,
        description: data.description,
      });
      return { valid: true, discountInr: data.discountInr || 0 };
    },
    []
  );

  const clearAppliedCoupon = useCallback(() => setAppliedCoupon(null), []);

  // Detail & Cart Controls
  const openProductDetail = useCallback((product: ProductItem) => {
    setDetailProduct(product);
  }, []);

  const closeProductDetail = useCallback(() => {
    setDetailProduct(null);
  }, []);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const addProductToCart = useCallback((product: ProductItem, quantity = 1) => {
    setCartItems((prev) => addToCart(prev, product, quantity));
  }, []);

  const updateCartQty = useCallback((productId: string, quantity: number) => {
    setCartItems((prev) => updateCartQuantity(prev, productId, quantity));
  }, []);

  const removeCartProduct = useCallback((productId: string) => {
    setCartItems((prev) => removeFromCart(prev, productId));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setAppliedCoupon(null);
  }, []);

  const openCheckout = useCallback((product: ProductItem) => {
    setIsCartCheckout(false);
    setSelectedProduct(product);
    setCheckoutItems([{ product, quantity: 1 }]);
  }, []);

  const openCartCheckout = useCallback(() => {
    if (cartItems.length === 0) return;
    setIsCartOpen(false);
    setIsCartCheckout(true);
    setSelectedProduct(cartItems[0].product);
    setCheckoutItems(cartItems);
  }, [cartItems]);

  const closeCheckout = useCallback(() => {
    setSelectedProduct(null);
    setCheckoutItems([]);
    setIsCartCheckout(false);
  }, []);

  const submitCartOrder = useCallback(
    async (params: {
      minecraftUsername: string;
      items: CartItem[];
      paymentMethod: PaymentMethodItem;
      paymentProofUrl: string;
      transactionRef?: string;
      couponCode?: string;
      discountInr?: number;
    }): Promise<OrderItem> => {
      if (!user) {
        throw new Error('Please sign in with Google before submitting your order.');
      }
      const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const payload = createCartOrderPayload({
        id: orderId,
        userId: user.uid,
        customerEmail: user.email || undefined,
        minecraftUsername: params.minecraftUsername,
        items: params.items,
        paymentMethod: params.paymentMethod,
        paymentProofUrl: params.paymentProofUrl,
        transactionRef: params.transactionRef,
        couponCode: params.couponCode,
        discountInr: params.discountInr,
        currencyDisplayed: currency,
      });
      // Strip fields not declared in firestore.rules hasOnly
      const {
        items: _items,
        customerEmail: _email,
        subtotalInr: _sub,
        couponCode: _cc,
        discountInr: _disc,
        currencyDisplayed: _cur,
        ...firestoreBase
      } = payload;
      const firestoreDoc = {
        ...firestoreBase,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      try {
        await setDoc(doc(db, 'orders', orderId), firestoreDoc);
        const created: OrderItem = {
          ...payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        void fetch('/api/orders/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(created),
        }).then(() => void hydratePlayerState());
        if (isCartCheckout) {
          setCartItems([]);
          setAppliedCoupon(null);
        }
        return created;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}`);
      }
    },
    [user, isCartCheckout, currency, hydratePlayerState]
  );

  const submitOrder = useCallback(
    async (params: {
      minecraftUsername: string;
      product: ProductItem;
      paymentMethod: PaymentMethodItem;
      paymentProofUrl: string;
      transactionRef?: string;
      couponCode?: string;
      discountInr?: number;
    }): Promise<OrderItem> => {
      if (!user) {
        throw new Error('Please sign in with Google before submitting your order.');
      }
      const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const payload = createInitialOrderPayload({
        id: orderId,
        userId: user.uid,
        customerEmail: user.email || undefined,
        minecraftUsername: params.minecraftUsername,
        product: params.product,
        paymentMethod: params.paymentMethod,
        paymentProofUrl: params.paymentProofUrl,
        transactionRef: params.transactionRef,
        couponCode: params.couponCode,
        discountInr: params.discountInr,
        currencyDisplayed: currency,
      });
      const {
        items: _items,
        customerEmail: _email,
        subtotalInr: _sub,
        couponCode: _cc,
        discountInr: _disc,
        currencyDisplayed: _cur,
        ...firestoreBase
      } = payload;
      const firestoreDoc = {
        ...firestoreBase,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      try {
        await setDoc(doc(db, 'orders', orderId), firestoreDoc);
        const created: OrderItem = {
          ...payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        void fetch('/api/orders/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(created),
        }).then(() => void hydratePlayerState());
        setAppliedCoupon(null);
        return created;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}`);
      }
    },
    [user, currency, hydratePlayerState]
  );

  const submitSupportTicket = useCallback(
    async (params: {
      minecraftUsername: string;
      subject: string;
      category: TicketCategory;
      message: string;
    }): Promise<SupportTicketItem> => {
      if (!user) {
        throw new Error('Please sign in with Google to submit a support ticket.');
      }
      const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const payload = {
        id: ticketId,
        userId: user.uid,
        minecraftUsername: params.minecraftUsername.trim(),
        subject: params.subject.trim(),
        category: params.category,
        message: params.message.trim(),
        status: 'Open' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      try {
        await setDoc(doc(db, 'supportTickets', ticketId), payload);
        const created: SupportTicketItem = {
          ...payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        void fetch('/api/tickets/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(created),
        });
        return created;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `supportTickets/${ticketId}`);
      }
    },
    [user]
  );

  // Admin Operations
  const seedDatabaseDefaults = useCallback(async () => {
    if (!isAdmin) throw new Error('Admin access required.');

    if (serverAdmin) {
      const res = await adminFetch('/api/admin/seed-defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteConfig: DEFAULT_SITE_CONFIG,
          categories: DEFAULT_CATEGORIES,
          products: DEFAULT_PRODUCTS,
          paymentMethods: DEFAULT_PAYMENT_METHODS,
          staff: DEFAULT_STAFF,
          wikiArticles: DEFAULT_WIKI_ARTICLES,
          rules: DEFAULT_RULES,
        }),
      });
      if (!res.ok) throw new Error('Failed to sync defaults on server.');
      await hydratePublicOverrides();
    }

    if (hasFirebaseAdmin) {
      const batch = writeBatch(db);
      batch.set(doc(db, 'siteConfig', 'main'), {
        ...DEFAULT_SITE_CONFIG,
        updatedAt: serverTimestamp(),
      });
      for (const c of DEFAULT_CATEGORIES) batch.set(doc(db, 'categories', c.id), c);
      for (const p of DEFAULT_PRODUCTS) {
        const {
          badge: _badge,
          stock: _stock,
          limitedOfferEndsAt: _lim,
          popular: _pop,
          compareSpecs: _specs,
          deliveryCommands: _cmds,
          tags: _tags,
          ...firestoreProduct
        } = p;
        batch.set(doc(db, 'products', p.id), { ...firestoreProduct, updatedAt: serverTimestamp() });
      }
      for (const pm of DEFAULT_PAYMENT_METHODS) {
        batch.set(doc(db, 'paymentMethods', pm.id), { ...pm, updatedAt: serverTimestamp() });
      }
      for (const s of DEFAULT_STAFF) {
        const { photoUrl: _photo, ...firestoreStaff } = s;
        batch.set(doc(db, 'staff', s.id), firestoreStaff);
      }
      for (const w of DEFAULT_WIKI_ARTICLES) {
        batch.set(doc(db, 'wikiArticles', w.id), { ...w, updatedAt: serverTimestamp() });
      }
      for (const r of DEFAULT_RULES) batch.set(doc(db, 'rules', r.id), r);
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'batch-seed');
      }
    }
  }, [isAdmin, serverAdmin, hasFirebaseAdmin, adminFetch, hydratePublicOverrides]);

  const saveProduct = useCallback(
    async (product: ProductItem) => {
      const id = product.id || sanitizeSlugId(product.name) || `prod_${Date.now()}`;
      const clean: ProductItem = {
        id,
        name: product.name.trim(),
        category: product.category.trim(),
        description: product.description.trim(),
        perks: (product.perks || []).map((p) => p.trim()).filter(Boolean).slice(0, 12),
        priceInr: Number(product.priceInr),
        imageUrl: product.imageUrl.trim(),
        accentColor: product.accentColor,
        badge: product.badge || '',
        featured: Boolean(product.featured),
        featuredOrder: Number(product.featuredOrder) || 1,
        active: Boolean(product.active),
        ...(product.stock !== undefined ? { stock: product.stock } : {}),
        ...(product.limitedOfferEndsAt ? { limitedOfferEndsAt: product.limitedOfferEndsAt } : {}),
        ...(product.popular !== undefined ? { popular: Boolean(product.popular) } : {}),
        ...(product.deliveryCommands && product.deliveryCommands.length > 0
          ? { deliveryCommands: product.deliveryCommands.map((c) => c.trim()).filter(Boolean) }
          : {}),
        ...(product.compareSpecs ? { compareSpecs: product.compareSpecs } : {}),
        ...(product.tags ? { tags: product.tags } : {}),
      };

      setProducts((prev) => {
        const exists = prev.some((p) => p.id === id);
        const next = exists ? prev.map((p) => (p.id === id ? clean : p)) : [...prev, clean];
        return next.sort((a, b) => a.featuredOrder - b.featuredOrder);
      });

      if (serverAdmin) {
        const res = await adminFetch(`/api/admin/products/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clean),
        });
        if (!res.ok) throw new Error('Failed to save product.');
        void refreshActivityLogs();
      }
      if (hasFirebaseAdmin) {
        try {
          const {
            badge: _badge,
            stock: _stock,
            limitedOfferEndsAt: _lim,
            popular: _pop,
            compareSpecs: _specs,
            deliveryCommands: _cmds,
            tags: _tags,
            ...firestoreProduct
          } = clean;
          await setDoc(doc(db, 'products', id), { ...firestoreProduct, updatedAt: serverTimestamp() });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `products/${id}`);
        }
      }
    },
    [serverAdmin, hasFirebaseAdmin, adminFetch, refreshActivityLogs]
  );

  const deleteProduct = useCallback(
    async (productId: string) => {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      if (serverAdmin) {
        const res = await adminFetch(`/api/admin/products/${encodeURIComponent(productId)}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete product.');
        void refreshActivityLogs();
      }
      if (hasFirebaseAdmin) {
        try {
          await deleteDoc(doc(db, 'products', productId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
        }
      }
    },
    [serverAdmin, hasFirebaseAdmin, adminFetch, refreshActivityLogs]
  );

  const saveCategory = useCallback(
    async (category: CategoryItem) => {
      const slug = category.slug || sanitizeSlugId(category.name) || `cat-${Date.now()}`;
      const id = category.id || slug;
      const clean: CategoryItem = {
        id,
        name: category.name.trim(),
        slug,
        icon: category.icon || 'star',
        sortOrder: Number(category.sortOrder) || 1,
        active: Boolean(category.active),
      };
      setCategories((prev) => {
        const exists = prev.some((c) => c.id === id);
        const next = exists ? prev.map((c) => (c.id === id ? clean : c)) : [...prev, clean];
        return next.sort((a, b) => a.sortOrder - b.sortOrder);
      });
      if (serverAdmin) {
        const res = await adminFetch(`/api/admin/categories/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clean),
        });
        if (!res.ok) throw new Error('Failed to save category.');
        void refreshActivityLogs();
      }
      if (hasFirebaseAdmin) {
        try {
          await setDoc(doc(db, 'categories', id), clean);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `categories/${id}`);
        }
      }
    },
    [serverAdmin, hasFirebaseAdmin, adminFetch, refreshActivityLogs]
  );

  const deleteCategory = useCallback(
    async (categoryId: string) => {
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      if (serverAdmin) {
        const res = await adminFetch(`/api/admin/categories/${encodeURIComponent(categoryId)}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete category.');
        void refreshActivityLogs();
      }
      if (hasFirebaseAdmin) {
        try {
          await deleteDoc(doc(db, 'categories', categoryId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `categories/${categoryId}`);
        }
      }
    },
    [serverAdmin, hasFirebaseAdmin, adminFetch, refreshActivityLogs]
  );

  const savePaymentMethod = useCallback(
    async (method: PaymentMethodItem) => {
      const id = method.id || sanitizeSlugId(method.name) || `pay_${Date.now()}`;
      const clean: PaymentMethodItem = {
        id,
        name: method.name.trim(),
        type: method.type,
        enabled: Boolean(method.enabled),
        instructions: method.instructions.trim(),
        ...(method.qrImageUrl ? { qrImageUrl: method.qrImageUrl } : {}),
        ...(method.accountLabel ? { accountLabel: method.accountLabel.trim() } : {}),
        ...(method.accountValue ? { accountValue: method.accountValue.trim() } : {}),
        sortOrder: Number(method.sortOrder) || 1,
      };
      setPaymentMethods((prev) =>
        prev.map((m) => (m.id === id ? clean : m)).sort((a, b) => a.sortOrder - b.sortOrder)
      );
      if (serverAdmin) {
        const res = await adminFetch(`/api/admin/payment-methods/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clean),
        });
        if (!res.ok) throw new Error('Failed to update payment method.');
        void refreshActivityLogs();
      }
      if (hasFirebaseAdmin) {
        try {
          await setDoc(doc(db, 'paymentMethods', id), {
            ...clean,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `paymentMethods/${id}`);
        }
      }
    },
    [serverAdmin, hasFirebaseAdmin, adminFetch, refreshActivityLogs]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus, adminNotes?: string) => {
      setServerOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status, ...(adminNotes !== undefined ? { adminNotes: adminNotes.trim() } : {}) }
            : o
        )
      );
      if (serverAdmin) {
        const res = await adminFetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, adminNotes }),
        });
        if (!res.ok) throw new Error('Failed to update order status.');
        const data = (await res.json()) as {
          deliveryJobs?: DeliveryQueueJob[];
          deliveryLogs?: DeliveryAttemptLog[];
        };
        if (Array.isArray(data.deliveryJobs)) setDeliveryJobs(data.deliveryJobs);
        if (Array.isArray(data.deliveryLogs)) setDeliveryLogs(data.deliveryLogs);
        void refreshActivityLogs();
      }
      if (hasFirebaseAdmin) {
        try {
          await updateDoc(doc(db, 'orders', orderId), {
            status,
            ...(adminNotes !== undefined ? { adminNotes: adminNotes.trim() } : {}),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
        }
      }
    },
    [serverAdmin, hasFirebaseAdmin, adminFetch, refreshActivityLogs]
  );

  const updateUserAccountStatus = useCallback(
    async (uid: string, status: 'Active' | 'Suspended') => {
      setServerUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, status } : u)));
      if (serverAdmin) {
        const res = await adminFetch(`/api/admin/users/${encodeURIComponent(uid)}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error('Failed to update user status.');
        void refreshActivityLogs();
      }
    },
    [serverAdmin, adminFetch, refreshActivityLogs]
  );

  const saveSiteConfig = useCallback(
    async (config: SiteConfig) => {
      setSiteConfig(config);
      if (serverAdmin) {
        const res = await adminFetch('/api/admin/site-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        });
        if (!res.ok) throw new Error('Failed to save server configuration.');
        void refreshActivityLogs();
      }
      if (hasFirebaseAdmin) {
        try {
          await setDoc(doc(db, 'siteConfig', 'main'), {
            serverIp: config.serverIp,
            minecraftVersion: config.minecraftVersion,
            discordUrl: config.discordUrl,
            heroEyebrow: config.heroEyebrow,
            heroTitle: config.heroTitle,
            heroSubtitle: config.heroSubtitle,
            heroDescription: config.heroDescription,
            heroCtaText: config.heroCtaText,
            heroImageUrl: config.heroImageUrl,
            announcementBanner: config.announcementBanner || '',
            announcementEnabled: Boolean(config.announcementEnabled),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'siteConfig/main');
        }
      }
    },
    [serverAdmin, hasFirebaseAdmin, adminFetch, refreshActivityLogs]
  );

  const saveWebsiteDraft = useCallback(
    async (draft: WebsiteEditorConfig): Promise<WebsiteEditorConfig> => {
      const clean = sanitizeWebsiteConfig(draft);
      setWebsiteDraft(clean);
      if (serverAdmin) {
        const res = await adminFetch('/api/admin/website/draft', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clean),
        });
        if (!res.ok) throw new Error('Failed to save website draft.');
        void refreshActivityLogs();
      }
      return clean;
    },
    [serverAdmin, adminFetch, refreshActivityLogs]
  );

  const publishWebsiteDraft = useCallback(
    async (draft?: WebsiteEditorConfig): Promise<WebsiteEditorConfig> => {
      const clean = sanitizeWebsiteConfig(draft || websiteDraft);
      setPublishedWebsite(clean);
      setWebsiteDraft(clean);
      setSiteConfig((prev) => ({
        ...prev,
        heroEyebrow: clean.heroEyebrow,
        heroTitle: clean.heroTitle,
        heroSubtitle: clean.heroSubtitle,
        heroDescription: clean.heroDescription,
        heroCtaText: clean.heroCtaText,
        heroImageUrl: clean.heroImageUrl,
        announcementBanner: clean.announcementBanner,
        announcementEnabled: clean.announcementEnabled,
      }));
      if (serverAdmin) {
        const res = await adminFetch('/api/admin/website/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clean),
        });
        if (!res.ok) throw new Error('Failed to publish website changes.');
        const data = (await res.json()) as { versions?: WebsiteVersionSnapshot[] };
        if (Array.isArray(data.versions)) setWebsiteVersions(data.versions);
        void refreshActivityLogs();
      }
      if (hasFirebaseAdmin) {
        try {
          await setDoc(doc(db, 'siteConfig', 'main'), {
            serverIp: siteConfig.serverIp,
            minecraftVersion: siteConfig.minecraftVersion,
            discordUrl: siteConfig.discordUrl,
            heroEyebrow: clean.heroEyebrow,
            heroTitle: clean.heroTitle,
            heroSubtitle: clean.heroSubtitle,
            heroDescription: clean.heroDescription,
            heroCtaText: clean.heroCtaText,
            heroImageUrl: clean.heroImageUrl,
            announcementBanner: clean.announcementBanner || '',
            announcementEnabled: Boolean(clean.announcementEnabled),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'siteConfig/main');
        }
      }
      return clean;
    },
    [websiteDraft, serverAdmin, hasFirebaseAdmin, siteConfig, adminFetch, refreshActivityLogs]
  );

  const discardWebsiteDraft = useCallback(async (): Promise<WebsiteEditorConfig> => {
    const reverted = sanitizeWebsiteConfig(publishedWebsite);
    setWebsiteDraft(reverted);
    if (serverAdmin) {
      const res = await adminFetch('/api/admin/website/discard', { method: 'POST' });
      if (res.ok) {
        const data = (await res.json()) as { draft?: Partial<WebsiteEditorConfig> | null };
        if (data.draft) {
          const synced = sanitizeWebsiteConfig(data.draft);
          setWebsiteDraft(synced);
          void refreshActivityLogs();
          return synced;
        }
      }
      void refreshActivityLogs();
    }
    return reverted;
  }, [publishedWebsite, serverAdmin, adminFetch, refreshActivityLogs]);

  const restoreWebsiteVersion = useCallback(
    async (versionId: string): Promise<WebsiteEditorConfig | null> => {
      if (!serverAdmin) return null;
      const res = await adminFetch(
        `/api/admin/website/versions/${encodeURIComponent(versionId)}/restore`,
        { method: 'POST' }
      );
      if (!res.ok) throw new Error('Failed to restore website version.');
      const data = (await res.json()) as { draft?: Partial<WebsiteEditorConfig> | null };
      if (data.draft) {
        const restored = sanitizeWebsiteConfig(data.draft);
        setWebsiteDraft(restored);
        void refreshActivityLogs();
        return restored;
      }
      return null;
    },
    [serverAdmin, adminFetch, refreshActivityLogs]
  );

  const saveStaffMember = useCallback(
    async (member: StaffMemberItem) => {
      const id = member.id || `staff_${Date.now()}`;
      const clean = { ...member, id };
      setStaff((prev) => {
        const exists = prev.some((s) => s.id === id);
        return exists ? prev.map((s) => (s.id === id ? clean : s)) : [...prev, clean];
      });
      if (serverAdmin) {
        const res = await adminFetch(`/api/admin/staff/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clean),
        });
        if (!res.ok) throw new Error('Failed to save staff member.');
        void refreshActivityLogs();
      }
      if (hasFirebaseAdmin) {
        try {
          const { photoUrl: _photo, ...firestoreStaff } = clean;
          await setDoc(doc(db, 'staff', id), firestoreStaff);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `staff/${id}`);
        }
      }
    },
    [serverAdmin, hasFirebaseAdmin, adminFetch, refreshActivityLogs]
  );

  const deleteStaffMember = useCallback(
    async (staffId: string) => {
      setStaff((prev) => prev.filter((s) => s.id !== staffId));
      if (serverAdmin) {
        const res = await adminFetch(`/api/admin/staff/${encodeURIComponent(staffId)}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete staff member.');
        void refreshActivityLogs();
      }
      if (hasFirebaseAdmin) {
        try {
          await deleteDoc(doc(db, 'staff', staffId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `staff/${staffId}`);
        }
      }
    },
    [serverAdmin, hasFirebaseAdmin, adminFetch, refreshActivityLogs]
  );

  const saveWikiArticle = useCallback(
    async (article: WikiArticleItem) => {
      const id = article.id || `wiki_${Date.now()}`;
      const clean = { ...article, id };
      setWikiArticles((prev) => {
        const exists = prev.some((w) => w.id === id);
        return exists ? prev.map((w) => (w.id === id ? clean : w)) : [...prev, clean];
      });
      if (serverAdmin) {
        const res = await adminFetch(`/api/admin/wiki/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clean),
        });
        if (!res.ok) throw new Error('Failed to save wiki article.');
        void refreshActivityLogs();
      }
      if (hasFirebaseAdmin) {
        try {
          await setDoc(doc(db, 'wikiArticles', id), {
            ...clean,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `wikiArticles/${id}`);
        }
      }
    },
    [serverAdmin, hasFirebaseAdmin, adminFetch, refreshActivityLogs]
  );

  const deleteWikiArticle = useCallback(
    async (articleId: string) => {
      setWikiArticles((prev) => prev.filter((w) => w.id !== articleId));
      if (serverAdmin) {
        const res = await adminFetch(`/api/admin/wiki/${encodeURIComponent(articleId)}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete wiki article.');
        void refreshActivityLogs();
      }
      if (hasFirebaseAdmin) {
        try {
          await deleteDoc(doc(db, 'wikiArticles', articleId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `wikiArticles/${articleId}`);
        }
      }
    },
    [serverAdmin, hasFirebaseAdmin, adminFetch, refreshActivityLogs]
  );

  const saveRule = useCallback(
    async (rule: ServerRuleItem) => {
      const id = rule.id || `rule_${Date.now()}`;
      const clean = { ...rule, id };
      setRules((prev) => {
        const exists = prev.some((r) => r.id === id);
        return exists ? prev.map((r) => (r.id === id ? clean : r)) : [...prev, clean];
      });
      if (serverAdmin) {
        const res = await adminFetch(`/api/admin/rules/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clean),
        });
        if (!res.ok) throw new Error('Failed to save server rule.');
        void refreshActivityLogs();
      }
      if (hasFirebaseAdmin) {
        try {
          await setDoc(doc(db, 'rules', id), clean);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `rules/${id}`);
        }
      }
    },
    [serverAdmin, hasFirebaseAdmin, adminFetch, refreshActivityLogs]
  );

  const deleteRule = useCallback(
    async (ruleId: string) => {
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      if (serverAdmin) {
        const res = await adminFetch(`/api/admin/rules/${encodeURIComponent(ruleId)}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete server rule.');
        void refreshActivityLogs();
      }
      if (hasFirebaseAdmin) {
        try {
          await deleteDoc(doc(db, 'rules', ruleId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `rules/${ruleId}`);
        }
      }
    },
    [serverAdmin, hasFirebaseAdmin, adminFetch, refreshActivityLogs]
  );

  const updateSupportTicket = useCallback(
    async (ticketId: string, status: TicketStatus, adminReply?: string) => {
      setServerTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? { ...t, status, ...(adminReply !== undefined ? { adminReply: adminReply.trim() } : {}) }
            : t
        )
      );
      if (serverAdmin) {
        const res = await adminFetch(`/api/admin/tickets/${encodeURIComponent(ticketId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, adminReply }),
        });
        if (!res.ok) throw new Error('Failed to update support ticket.');
        void refreshActivityLogs();
      }
      if (hasFirebaseAdmin) {
        try {
          await updateDoc(doc(db, 'supportTickets', ticketId), {
            status,
            ...(adminReply !== undefined ? { adminReply: adminReply.trim() } : {}),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `supportTickets/${ticketId}`);
        }
      }
    },
    [serverAdmin, hasFirebaseAdmin, adminFetch, refreshActivityLogs]
  );

  // New Admin Actions: Coupons, Delivery Queue, Refunds, Announcements, Events, Settings, Integration & Backup
  const saveCoupon = useCallback(
    async (coupon: CouponItem) => {
      const id = coupon.id || `cpn_${sanitizeSlugId(coupon.code) || Date.now()}`;
      const res = await adminFetch(`/api/admin/coupons/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...coupon, id }),
      });
      if (!res.ok) throw new Error('Failed to save promo code.');
      const data = (await res.json()) as { coupons?: CouponItem[] };
      if (Array.isArray(data.coupons)) setCoupons(data.coupons);
      void refreshActivityLogs();
    },
    [adminFetch, refreshActivityLogs]
  );

  const deleteCoupon = useCallback(
    async (couponId: string) => {
      const res = await adminFetch(`/api/admin/coupons/${encodeURIComponent(couponId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete promo code.');
      const data = (await res.json()) as { coupons?: CouponItem[] };
      if (Array.isArray(data.coupons)) setCoupons(data.coupons);
      void refreshActivityLogs();
    },
    [adminFetch, refreshActivityLogs]
  );

  const enqueueOrderDelivery = useCallback(
    async (orderId: string): Promise<number> => {
      const res = await adminFetch(`/api/admin/orders/${encodeURIComponent(orderId)}/enqueue-delivery`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to enqueue in-game delivery.');
      const data = (await res.json()) as {
        createdCount?: number;
        deliveryJobs?: DeliveryQueueJob[];
        deliveryLogs?: DeliveryAttemptLog[];
      };
      if (Array.isArray(data.deliveryJobs)) setDeliveryJobs(data.deliveryJobs);
      if (Array.isArray(data.deliveryLogs)) setDeliveryLogs(data.deliveryLogs);
      void refreshActivityLogs();
      return data.createdCount || 0;
    },
    [adminFetch, refreshActivityLogs]
  );

  const markDeliveryJobDelivered = useCallback(
    async (jobId: string) => {
      const res = await adminFetch(`/api/admin/deliveries/${encodeURIComponent(jobId)}/mark-delivered`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to confirm manual delivery.');
      const data = (await res.json()) as {
        deliveryJobs?: DeliveryQueueJob[];
        deliveryLogs?: DeliveryAttemptLog[];
        orders?: OrderItem[];
      };
      if (Array.isArray(data.deliveryJobs)) setDeliveryJobs(data.deliveryJobs);
      if (Array.isArray(data.deliveryLogs)) setDeliveryLogs(data.deliveryLogs);
      if (Array.isArray(data.orders)) setServerOrders(data.orders);
      void refreshActivityLogs();
    },
    [adminFetch, refreshActivityLogs]
  );

  const retryDeliveryJob = useCallback(
    async (jobId: string) => {
      const res = await adminFetch(`/api/admin/deliveries/${encodeURIComponent(jobId)}/retry`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to retry delivery job.');
      const data = (await res.json()) as {
        deliveryJobs?: DeliveryQueueJob[];
        deliveryLogs?: DeliveryAttemptLog[];
      };
      if (Array.isArray(data.deliveryJobs)) setDeliveryJobs(data.deliveryJobs);
      if (Array.isArray(data.deliveryLogs)) setDeliveryLogs(data.deliveryLogs);
    },
    [adminFetch]
  );

  const decideRefundRequest = useCallback(
    async (refundId: string, decision: 'Approved' | 'Rejected', adminNote?: string) => {
      const res = await adminFetch(`/api/admin/refunds/${encodeURIComponent(refundId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, adminNote }),
      });
      if (!res.ok) throw new Error('Failed to process refund decision.');
      const data = (await res.json()) as {
        refundRequests?: RefundRequestItem[];
        orders?: OrderItem[];
      };
      if (Array.isArray(data.refundRequests)) setRefundRequests(data.refundRequests);
      if (Array.isArray(data.orders)) setServerOrders(data.orders);
      void refreshActivityLogs();
    },
    [adminFetch, refreshActivityLogs]
  );

  const saveAnnouncement = useCallback(
    async (item: AnnouncementItem) => {
      const id = item.id || `ann_${Date.now()}`;
      const res = await adminFetch(`/api/admin/announcements/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, id }),
      });
      if (!res.ok) throw new Error('Failed to save announcement.');
      const data = (await res.json()) as { announcements?: AnnouncementItem[] };
      if (Array.isArray(data.announcements)) setAnnouncements(data.announcements);
      void refreshActivityLogs();
    },
    [adminFetch, refreshActivityLogs]
  );

  const deleteAnnouncement = useCallback(
    async (id: string) => {
      const res = await adminFetch(`/api/admin/announcements/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete announcement.');
      const data = (await res.json()) as { announcements?: AnnouncementItem[] };
      if (Array.isArray(data.announcements)) setAnnouncements(data.announcements);
      void refreshActivityLogs();
    },
    [adminFetch, refreshActivityLogs]
  );

  const saveServerEvent = useCallback(
    async (item: ServerEventItem) => {
      const id = item.id || `evt_${Date.now()}`;
      const res = await adminFetch(`/api/admin/events/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, id }),
      });
      if (!res.ok) throw new Error('Failed to save server event.');
      const data = (await res.json()) as { serverEvents?: ServerEventItem[] };
      if (Array.isArray(data.serverEvents)) setServerEvents(data.serverEvents);
      void refreshActivityLogs();
    },
    [adminFetch, refreshActivityLogs]
  );

  const deleteServerEvent = useCallback(
    async (id: string) => {
      const res = await adminFetch(`/api/admin/events/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete server event.');
      const data = (await res.json()) as { serverEvents?: ServerEventItem[] };
      if (Array.isArray(data.serverEvents)) setServerEvents(data.serverEvents);
      void refreshActivityLogs();
    },
    [adminFetch, refreshActivityLogs]
  );

  const saveStoreSettings = useCallback(
    async (settings: StoreRuntimeSettings) => {
      const res = await adminFetch('/api/admin/store-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Failed to save store runtime settings.');
      const data = (await res.json()) as { storeSettings?: StoreRuntimeSettings };
      if (data.storeSettings) setStoreSettings(data.storeSettings);
      void refreshActivityLogs();
      void refreshServerStatus();
    },
    [adminFetch, refreshActivityLogs, refreshServerStatus]
  );

  const rotatePluginKey = useCallback(async (): Promise<string> => {
    const res = await adminFetch('/api/admin/integration/rotate-key', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to generate new plugin API key.');
    const data = (await res.json()) as {
      newPlaintextKey: string;
      integrationStatus?: ServerIntegrationStatus;
    };
    if (data.integrationStatus) setIntegrationStatus(data.integrationStatus);
    void refreshActivityLogs();
    return data.newPlaintextKey;
  }, [adminFetch, refreshActivityLogs]);

  const saveRconConfig = useCallback(
    async (params: { host?: string; port?: number; password?: string }) => {
      const res = await adminFetch('/api/admin/integration/rcon', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error('Failed to save RCON endpoint.');
      const data = (await res.json()) as { integrationStatus?: ServerIntegrationStatus };
      if (data.integrationStatus) setIntegrationStatus(data.integrationStatus);
      void refreshActivityLogs();
    },
    [adminFetch, refreshActivityLogs]
  );

  const exportDatabaseBackup = useCallback(async (): Promise<Record<string, unknown>> => {
    const res = await adminFetch('/api/admin/backup');
    if (!res.ok) throw new Error('Failed to export database backup.');
    return (await res.json()) as Record<string, unknown>;
  }, [adminFetch]);

  const restoreDatabaseBackup = useCallback(
    async (payload: unknown) => {
      const res = await adminFetch('/api/admin/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error || 'Backup restore failed.');
      }
      await hydratePublicOverrides();
      await hydrateServerAdminOverview();
    },
    [adminFetch, hydratePublicOverrides, hydrateServerAdminOverview]
  );

  const value: StoreContextValue = {
    authReady,
    user,
    userProfile,
    isAdmin,
    signInWithGoogle,
    logout,
    updateMinecraftUsername,
    adminAuthChecked,
    adminAuthStatus,
    serverAdmin,
    refreshAdminAuth,
    loginAdmin,
    logoutAdmin,
    changeAdminPassword,
    siteConfig,
    publishedWebsite,
    websiteDraft,
    websiteVersions,
    activityLogs,
    categories,
    products,
    paymentMethods,
    staff,
    wikiArticles,
    rules,
    orders,
    allUsers,
    supportTickets,
    currency,
    setCurrency,
    nprPerInrRate,
    formatPrice,
    storeSettings,
    announcements,
    serverEvents,
    recentPurchases,
    wishlistIds,
    toggleWishlist,
    compareIds,
    toggleCompareProduct,
    clearCompare,
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    playerServerStats,
    submitRefundRequest,
    appliedCoupon,
    validateCouponCode,
    clearAppliedCoupon,
    coupons,
    deliveryJobs,
    deliveryLogs,
    refundRequests,
    integrationStatus,
    serverStatus,
    statusLoading,
    refreshServerStatus,
    detailProduct,
    openProductDetail,
    closeProductDetail,
    cartItems,
    cartCount: cartSummary.itemCount,
    cartTotalInr: cartSummary.totalInr,
    isCartOpen,
    openCart,
    closeCart,
    addProductToCart,
    updateCartQty,
    removeCartProduct,
    clearCart,
    selectedProduct,
    checkoutItems,
    isCartCheckout,
    openCheckout,
    openCartCheckout,
    closeCheckout,
    submitOrder,
    submitCartOrder,
    submitSupportTicket,
    seedDatabaseDefaults,
    saveProduct,
    deleteProduct,
    saveCategory,
    deleteCategory,
    savePaymentMethod,
    updateOrderStatus,
    updateUserAccountStatus,
    saveSiteConfig,
    saveWebsiteDraft,
    publishWebsiteDraft,
    discardWebsiteDraft,
    restoreWebsiteVersion,
    refreshActivityLogs,
    saveStaffMember,
    deleteStaffMember,
    saveWikiArticle,
    deleteWikiArticle,
    saveRule,
    deleteRule,
    updateSupportTicket,
    saveCoupon,
    deleteCoupon,
    enqueueOrderDelivery,
    markDeliveryJobDelivered,
    retryDeliveryJob,
    decideRefundRequest,
    saveAnnouncement,
    deleteAnnouncement,
    saveServerEvent,
    deleteServerEvent,
    saveStoreSettings,
    rotatePluginKey,
    saveRconConfig,
    exportDatabaseBackup,
    restoreDatabaseBackup,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return ctx;
}
