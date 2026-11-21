export type OrderStatus =
  | 'Pending'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Delivered';

export type RefundStatus = 'None' | 'Requested' | 'Approved' | 'Rejected';

export type CurrencyCode = 'INR' | 'NPR';

export type AccentColor = 'gold' | 'cyan' | 'purple' | 'pink';

export type ProductBadge = 'Popular' | 'Limited' | 'Best Value' | '';

export type PaymentType = 'qr' | 'gateway' | 'manual';

export type RuleSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type TicketCategory =
  | 'Purchase Issue'
  | 'Account & Rank'
  | 'Bug Report'
  | 'Player Report'
  | 'Other';

export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export type DeliveryJobStatus = 'Queued' | 'Processing' | 'Delivered' | 'Failed';

export type NotificationCategory =
  | 'purchase'
  | 'payment'
  | 'delivery'
  | 'announcement'
  | 'support'
  | 'offer';

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  icon: string;
  sortOrder: number;
  active: boolean;
}

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  description: string;
  perks?: string[];
  priceInr: number;
  imageUrl: string;
  accentColor: AccentColor;
  badge?: ProductBadge;
  featured: boolean;
  featuredOrder: number;
  active: boolean;
  stock?: number | null;
  limitedOfferEndsAt?: string;
  popular?: boolean;
  compareSpecs?: Record<string, string>;
  deliveryCommands?: string[];
  tags?: string[];
  updatedAt?: unknown;
}

export interface CartItem {
  product: ProductItem;
  quantity: number;
}

export interface PaymentMethodItem {
  id: string;
  name: string;
  type: PaymentType;
  enabled: boolean;
  instructions: string;
  qrImageUrl?: string;
  accountLabel?: string;
  accountValue?: string;
  sortOrder: number;
  updatedAt?: unknown;
}

export interface OrderLineItem {
  productId: string;
  productName: string;
  quantity: number;
  priceInr: number;
}

export interface OrderItem {
  id: string;
  userId: string;
  customerEmail?: string;
  minecraftUsername: string;
  productId: string;
  productName: string;
  productImage?: string;
  items?: OrderLineItem[];
  amountInr: number;
  subtotalInr?: number;
  couponCode?: string;
  discountInr?: number;
  currencyDisplayed?: CurrencyCode;
  paymentMethodId: string;
  paymentMethodName: string;
  paymentProofUrl: string;
  transactionRef?: string;
  status: OrderStatus;
  refundStatus?: RefundStatus;
  refundReason?: string;
  deliveryStatus?: DeliveryJobStatus;
  adminNotes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CouponItem {
  id: string;
  code: string;
  description: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderInr: number;
  maxDiscountInr?: number;
  maxUses: number;
  usedCount: number;
  expiresAt?: string;
  active: boolean;
  updatedAt?: string;
}

export interface DeliveryQueueJob {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  minecraftUsername: string;
  quantity: number;
  commands: string[];
  status: DeliveryJobStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
  deliveredBy?: 'plugin' | 'manual' | 'rcon';
}

export interface DeliveryAttemptLog {
  id: string;
  jobId: string;
  orderId: string;
  minecraftUsername: string;
  productName: string;
  commands: string[];
  outcome: 'success' | 'failed' | 'queued';
  channel: 'plugin' | 'manual' | 'rcon';
  message: string;
  createdAt: string;
}

export interface RefundRequestItem {
  id: string;
  orderId: string;
  userId: string;
  minecraftUsername: string;
  amountInr: number;
  reason: string;
  status: 'Requested' | 'Approved' | 'Rejected';
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  tag: 'Update' | 'Maintenance' | 'Promotion' | 'Community';
  summary: string;
  content: string;
  imageUrl?: string;
  pinned: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServerEventItem {
  id: string;
  title: string;
  category: 'Tournament' | 'Boss Raid' | 'Double XP' | 'Seasonal';
  startsAt: string;
  endsAt?: string;
  rewardSummary: string;
  description: string;
  bannerUrl?: string;
  active: boolean;
}

export interface PlayerNotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  read: boolean;
  linkUrl?: string;
  createdAt: string;
}

export interface PlayerServerStats {
  minecraftUsername: string;
  currentRank: string;
  playtimeHours: number;
  kills: number;
  questsCompleted: number;
  realmBalance: number;
  online: boolean;
  lastSeenAt: string;
  source: 'plugin' | 'derived';
}

export interface RecentPurchasePublicItem {
  id: string;
  maskedPlayer: string;
  productName: string;
  productImage?: string;
  amountInr: number;
  createdAt: string;
}

export interface StoreRuntimeSettings {
  nprPerInrRate: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  communityGoalLabel: string;
  communityGoalPercent: number;
  autoQueueOnApprove: boolean;
}

export interface ServerIntegrationStatus {
  pluginConnected: boolean;
  lastHeartbeatAt: string | null;
  pluginVersion: string | null;
  tps: number | null;
  onlinePlayersReported: number | null;
  maskedPluginKey: string;
  rconConfigured: boolean;
  rconHostMasked: string;
  rconPort: number | null;
}

export interface WebsiteVersionSnapshot {
  id: string;
  label: string;
  createdBy: string;
  createdAt: string;
  config: WebsiteEditorConfig;
}

export interface SiteConfig {
  serverIp: string;
  minecraftVersion: string;
  discordUrl: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  heroCtaText: string;
  heroImageUrl: string;
  announcementBanner?: string;
  announcementEnabled: boolean;
  updatedAt?: unknown;
}

export type ThemePresetId =
  | 'purple-neon'
  | 'dark-fantasy'
  | 'royal-gold'
  | 'cyber-blue'
  | 'custom';

export interface NavLinkItem {
  id: string;
  label: string;
  url: string;
  external: boolean;
  enabled: boolean;
  sortOrder: number;
}

export interface ThemeConfig {
  preset: ThemePresetId;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  buttonColor: string;
  borderColor: string;
  displayFont: 'Outfit' | 'Cinzel' | 'Orbitron' | 'Space Grotesk';
  bodyFont: 'Plus Jakarta Sans' | 'Inter' | 'DM Sans' | 'Space Grotesk';
  glowIntensity: number; // 0 - 100
  animationsEnabled: boolean;
}

export interface BackgroundAsset {
  id: string;
  label: string;
  url: string;
  createdAt?: string;
}

export interface BackgroundConfig {
  heroBgUrl: string;
  storeBgUrl: string;
  footerBgUrl: string;
  gallery: BackgroundAsset[];
}

export type PageSectionType =
  | 'hero'
  | 'featured-products'
  | 'guarantees'
  | 'announcements'
  | 'events'
  | 'recent-purchases'
  | 'custom-banner'
  | 'community';

export interface PageSectionItem {
  id: string;
  type: PageSectionType;
  title: string;
  subtitle: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  backgroundUrl?: string;
  visible: boolean;
  order: number;
}

export interface WebsiteEditorConfig {
  brandName: string;
  brandSubtitle: string;
  brandLogoUrl: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  heroCtaText: string;
  heroCtaUrl: string;
  heroImageUrl: string;
  heroCharacterUrl: string;
  featuredSectionHeading: string;
  promoBannerText: string;
  promoBannerEnabled: boolean;
  announcementBanner: string;
  announcementEnabled: boolean;
  navLinks: NavLinkItem[];
  theme: ThemeConfig;
  backgrounds: BackgroundConfig;
  sections: PageSectionItem[];
  updatedAt?: string;
}

export interface AdminActivityLog {
  id: string;
  actorEmail: string;
  action: string;
  target: string;
  details: string;
  createdAt: string;
}

export interface StaffMemberItem {
  id: string;
  name: string;
  role: string;
  rankColor: 'purple' | 'gold' | 'cyan' | 'pink';
  minecraftUsername: string;
  bio: string;
  photoUrl?: string;
  sortOrder: number;
  active: boolean;
}

export interface WikiArticleItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  sortOrder: number;
  published: boolean;
  updatedAt?: unknown;
}

export interface ServerRuleItem {
  id: string;
  title: string;
  category: string;
  description: string;
  punishment: string;
  severity: RuleSeverity;
  sortOrder: number;
}

export interface SupportTicketItem {
  id: string;
  userId: string;
  minecraftUsername: string;
  subject: string;
  category: TicketCategory;
  message: string;
  status: TicketStatus;
  adminReply?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  minecraftUsername?: string;
  photoURL?: string;
  role: 'user' | 'admin';
  status?: 'Active' | 'Suspended';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AdminSessionUser {
  id: string;
  email: string;
  username: string;
  role: 'admin';
  mustChangePassword: boolean;
}

export interface AdminAuthStatus {
  configured: boolean;
  setupRequired: boolean;
  authenticated: boolean;
  admin: AdminSessionUser | null;
}

export interface AdminOverviewKpis {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenueInr: number;
}

export interface RevenueDayPoint {
  dateKey: string;
  label: string;
  revenueInr: number;
  orderCount: number;
}

export interface MinecraftServerStatus {
  ip: string;
  online: boolean;
  players: {
    online: number;
    max: number;
  };
  version: string;
  motd: string;
  latencyMs: number;
  checkedAt: string;
  source: 'mcsrvstat' | 'mcstatus' | 'unreachable';
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
}
