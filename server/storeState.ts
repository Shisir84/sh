import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AnnouncementItem,
  CouponItem,
  DeliveryAttemptLog,
  DeliveryQueueJob,
  OrderItem,
  PlayerNotificationItem,
  PlayerServerStats,
  RecentPurchasePublicItem,
  RefundRequestItem,
  ServerEventItem,
  StoreRuntimeSettings,
  WebsiteEditorConfig,
  WebsiteVersionSnapshot,
} from '../src/types/store.ts';
import {
  DEFAULT_ANNOUNCEMENTS,
  DEFAULT_COUPONS,
  DEFAULT_EVENTS,
  DEFAULT_RUNTIME_SETTINGS,
} from '../src/data/seedData.ts';
import { maskPlayerName, parseTimestampToIsoDate } from '../src/utils/storeLogic.ts';

export interface ActivityLogEntry {
  id: string;
  actorEmail: string;
  action: string;
  target: string;
  details: string;
  createdAt: string;
}

export interface PluginHeartbeatMeta {
  lastHeartbeatAt: string | null;
  pluginVersion: string | null;
  tps: number | null;
  onlinePlayersReported: number | null;
}

export interface PersistedStoreState {
  siteConfig?: Record<string, unknown>;
  websitePublished?: Record<string, unknown>;
  websiteDraft?: Record<string, unknown>;
  websiteVersions?: WebsiteVersionSnapshot[];
  categories?: Array<Record<string, unknown>>;
  products?: Array<Record<string, unknown>>;
  paymentMethods?: Array<Record<string, unknown>>;
  staff?: Array<Record<string, unknown>>;
  wikiArticles?: Array<Record<string, unknown>>;
  rules?: Array<Record<string, unknown>>;
  coupons?: CouponItem[];
  announcements?: AnnouncementItem[];
  serverEvents?: ServerEventItem[];
  storeSettings?: StoreRuntimeSettings;
  deliveryJobs?: DeliveryQueueJob[];
  deliveryLogs?: DeliveryAttemptLog[];
  refundRequests?: RefundRequestItem[];
  notifications?: PlayerNotificationItem[];
  wishlists?: Record<string, string[]>;
  playerStats?: Record<string, PlayerServerStats>;
  pluginHeartbeat?: PluginHeartbeatMeta;
  orders: Array<Record<string, unknown>>;
  users: Array<Record<string, unknown>>;
  supportTickets: Array<Record<string, unknown>>;
  activityLogs: ActivityLogEntry[];
  updatedAt: string;
}

const DEFAULT_STATE: PersistedStoreState = {
  orders: [],
  users: [],
  supportTickets: [],
  activityLogs: [],
  websiteVersions: [],
  coupons: DEFAULT_COUPONS,
  announcements: DEFAULT_ANNOUNCEMENTS,
  serverEvents: DEFAULT_EVENTS,
  storeSettings: DEFAULT_RUNTIME_SETTINGS,
  deliveryJobs: [],
  deliveryLogs: [],
  refundRequests: [],
  notifications: [],
  wishlists: {},
  playerStats: {},
  pluginHeartbeat: {
    lastHeartbeatAt: null,
    pluginVersion: null,
    tps: null,
    onlinePlayersReported: null,
  },
  updatedAt: new Date().toISOString(),
};

export function createStoreStatePersistence(dataDir?: string) {
  const resolvedDir = dataDir || path.resolve(process.cwd(), '.data');
  const filePath = path.join(resolvedDir, 'store-state.json');

  function ensureDir() {
    if (!fs.existsSync(resolvedDir)) {
      fs.mkdirSync(resolvedDir, { recursive: true });
    }
  }

  function readState(): PersistedStoreState {
    ensureDir();
    if (!fs.existsSync(filePath)) {
      return {
        ...DEFAULT_STATE,
        orders: [],
        users: [],
        supportTickets: [],
        activityLogs: [],
        websiteVersions: [],
        coupons: [...DEFAULT_COUPONS],
        announcements: [...DEFAULT_ANNOUNCEMENTS],
        serverEvents: [...DEFAULT_EVENTS],
        storeSettings: { ...DEFAULT_RUNTIME_SETTINGS },
        deliveryJobs: [],
        deliveryLogs: [],
        refundRequests: [],
        notifications: [],
        wishlists: {},
        playerStats: {},
      };
    }
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<PersistedStoreState>;
      return {
        ...DEFAULT_STATE,
        ...parsed,
        orders: Array.isArray(parsed.orders) ? parsed.orders : [],
        users: Array.isArray(parsed.users) ? parsed.users : [],
        supportTickets: Array.isArray(parsed.supportTickets) ? parsed.supportTickets : [],
        activityLogs: Array.isArray(parsed.activityLogs) ? parsed.activityLogs : [],
        websiteVersions: Array.isArray(parsed.websiteVersions) ? parsed.websiteVersions : [],
        coupons: Array.isArray(parsed.coupons) ? parsed.coupons : [...DEFAULT_COUPONS],
        announcements: Array.isArray(parsed.announcements)
          ? parsed.announcements
          : [...DEFAULT_ANNOUNCEMENTS],
        serverEvents: Array.isArray(parsed.serverEvents)
          ? parsed.serverEvents
          : [...DEFAULT_EVENTS],
        storeSettings: {
          ...DEFAULT_RUNTIME_SETTINGS,
          ...(parsed.storeSettings || {}),
        },
        deliveryJobs: Array.isArray(parsed.deliveryJobs) ? parsed.deliveryJobs : [],
        deliveryLogs: Array.isArray(parsed.deliveryLogs) ? parsed.deliveryLogs : [],
        refundRequests: Array.isArray(parsed.refundRequests) ? parsed.refundRequests : [],
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        wishlists: parsed.wishlists && typeof parsed.wishlists === 'object' ? parsed.wishlists : {},
        playerStats:
          parsed.playerStats && typeof parsed.playerStats === 'object' ? parsed.playerStats : {},
        pluginHeartbeat: {
          ...DEFAULT_STATE.pluginHeartbeat!,
          ...(parsed.pluginHeartbeat || {}),
        },
      };
    } catch {
      return {
        ...DEFAULT_STATE,
        orders: [],
        users: [],
        supportTickets: [],
        activityLogs: [],
      };
    }
  }

  function writeState(next: PersistedStoreState): PersistedStoreState {
    ensureDir();
    const payload: PersistedStoreState = {
      ...next,
      updatedAt: new Date().toISOString(),
    };
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2));
    fs.renameSync(tmp, filePath);
    return payload;
  }

  function appendActivityLog(entry: Omit<ActivityLogEntry, 'id' | 'createdAt'>): ActivityLogEntry {
    const state = readState();
    const logItem: ActivityLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      actorEmail: entry.actorEmail || 'admin',
      action: entry.action,
      target: entry.target,
      details: entry.details,
      createdAt: new Date().toISOString(),
    };
    state.activityLogs = [logItem, ...(state.activityLogs || [])].slice(0, 250);
    writeState(state);
    return logItem;
  }

  function pushNotification(entry: Omit<PlayerNotificationItem, 'id' | 'read' | 'createdAt'>) {
    const state = readState();
    const item: PlayerNotificationItem = {
      ...entry,
      id: `notif_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    state.notifications = [item, ...(state.notifications || [])].slice(0, 400);
    writeState(state);
    return item;
  }

  function saveWebsiteDraft(draft: Record<string, unknown>): PersistedStoreState {
    const state = readState();
    state.websiteDraft = {
      ...draft,
      updatedAt: new Date().toISOString(),
    };
    return writeState(state);
  }

  function publishWebsiteDraft(
    overrideDraft?: Record<string, unknown>,
    actorEmail = 'admin'
  ): PersistedStoreState {
    const state = readState();
    const source = overrideDraft || state.websiteDraft || state.websitePublished;
    if (!source) return state;

    // Save snapshot of previous live version before overwriting
    if (state.websitePublished) {
      const snapshot: WebsiteVersionSnapshot = {
        id: `ver_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        label: `Published Snapshot (${new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })})`,
        createdBy: actorEmail,
        createdAt: new Date().toISOString(),
        config: state.websitePublished as unknown as WebsiteEditorConfig,
      };
      state.websiteVersions = [snapshot, ...(state.websiteVersions || [])].slice(0, 15);
    }

    const publishedPayload: Record<string, unknown> = {
      ...source,
      updatedAt: new Date().toISOString(),
    };

    state.websitePublished = publishedPayload;
    state.websiteDraft = { ...publishedPayload };
    state.siteConfig = {
      ...(state.siteConfig || {}),
      ...(typeof source.heroEyebrow === 'string' ? { heroEyebrow: source.heroEyebrow } : {}),
      ...(typeof source.heroTitle === 'string' ? { heroTitle: source.heroTitle } : {}),
      ...(typeof source.heroSubtitle === 'string' ? { heroSubtitle: source.heroSubtitle } : {}),
      ...(typeof source.heroDescription === 'string' ? { heroDescription: source.heroDescription } : {}),
      ...(typeof source.heroCtaText === 'string' ? { heroCtaText: source.heroCtaText } : {}),
      ...(typeof source.heroImageUrl === 'string' ? { heroImageUrl: source.heroImageUrl } : {}),
      ...(typeof source.announcementBanner === 'string'
        ? { announcementBanner: source.announcementBanner }
        : {}),
      ...(typeof source.announcementEnabled === 'boolean'
        ? { announcementEnabled: source.announcementEnabled }
        : {}),
      updatedAt: new Date().toISOString(),
    };

    return writeState(state);
  }

  function restoreWebsiteVersion(versionId: string): PersistedStoreState | null {
    const state = readState();
    const match = (state.websiteVersions || []).find((v) => v.id === versionId);
    if (!match) return null;
    state.websiteDraft = {
      ...(match.config as unknown as Record<string, unknown>),
      updatedAt: new Date().toISOString(),
    };
    return writeState(state);
  }

  function discardWebsiteDraft(): PersistedStoreState {
    const state = readState();
    if (state.websitePublished) {
      state.websiteDraft = { ...state.websitePublished };
    } else {
      delete state.websiteDraft;
    }
    return writeState(state);
  }

  function upsertCollectionItem(
    key:
      | 'categories'
      | 'products'
      | 'paymentMethods'
      | 'staff'
      | 'wikiArticles'
      | 'rules'
      | 'orders'
      | 'users'
      | 'supportTickets',
    item: Record<string, unknown>,
    idField: 'id' | 'uid' = 'id'
  ): PersistedStoreState {
    const state = readState();
    const list = Array.isArray(state[key]) ? [...(state[key] as Array<Record<string, unknown>>)] : [];
    const targetId = String(item[idField] || '');
    if (!targetId) return state;
    const idx = list.findIndex((x) => String(x[idField] || '') === targetId);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...item };
    } else {
      list.unshift(item);
    }
    state[key] = list;
    return writeState(state);
  }

  function deleteCollectionItem(
    key: 'categories' | 'products' | 'paymentMethods' | 'staff' | 'wikiArticles' | 'rules',
    id: string
  ): PersistedStoreState {
    const state = readState();
    const list = Array.isArray(state[key]) ? (state[key] as Array<Record<string, unknown>>) : [];
    state[key] = list.filter((x) => String(x.id || '') !== id);
    return writeState(state);
  }

  function getRecentPublicPurchases(limit = 8): RecentPurchasePublicItem[] {
    const state = readState();
    return (state.orders as unknown as OrderItem[])
      .filter((o) => (o.status === 'Approved' || o.status === 'Delivered') && o.refundStatus !== 'Approved')
      .sort(
        (a, b) =>
          parseTimestampToIsoDate(b.createdAt).getTime() -
          parseTimestampToIsoDate(a.createdAt).getTime()
      )
      .slice(0, limit)
      .map((o) => ({
        id: o.id,
        maskedPlayer: maskPlayerName(o.minecraftUsername || 'Player'),
        productName: o.productName,
        productImage: o.productImage,
        amountInr: o.amountInr,
        createdAt: parseTimestampToIsoDate(o.createdAt).toISOString(),
      }));
  }

  function getPublicPayload() {
    const state = readState();
    return {
      siteConfig: state.siteConfig || null,
      websitePublished: state.websitePublished || null,
      categories: state.categories || null,
      products: state.products || null,
      paymentMethods: state.paymentMethods || null,
      staff: state.staff || null,
      wikiArticles: state.wikiArticles || null,
      rules: state.rules || null,
      announcements: (state.announcements || DEFAULT_ANNOUNCEMENTS).filter((a) => a.published),
      serverEvents: (state.serverEvents || DEFAULT_EVENTS).filter((e) => e.active),
      storeSettings: state.storeSettings || DEFAULT_RUNTIME_SETTINGS,
      recentPurchases: getRecentPublicPurchases(8),
      updatedAt: state.updatedAt,
    };
  }

  function exportBackupPayload() {
    const state = readState();
    return {
      format: 'volexmc-backup-v1',
      exportedAt: new Date().toISOString(),
      data: state,
    };
  }

  function importBackupPayload(raw: unknown): PersistedStoreState {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid backup payload.');
    }
    const candidate =
      'format' in raw && 'data' in raw ? (raw as { data: Partial<PersistedStoreState> }).data : (raw as Partial<PersistedStoreState>);
    if (!candidate || typeof candidate !== 'object' || !Array.isArray(candidate.orders)) {
      throw new Error('Backup file is missing required store structure.');
    }
    const current = readState();
    const merged: PersistedStoreState = {
      ...current,
      ...candidate,
      orders: Array.isArray(candidate.orders) ? candidate.orders : current.orders,
      users: Array.isArray(candidate.users) ? candidate.users : current.users,
      supportTickets: Array.isArray(candidate.supportTickets)
        ? candidate.supportTickets
        : current.supportTickets,
      activityLogs: Array.isArray(candidate.activityLogs)
        ? candidate.activityLogs
        : current.activityLogs,
      updatedAt: new Date().toISOString(),
    };
    return writeState(merged);
  }

  return {
    readState,
    writeState,
    appendActivityLog,
    pushNotification,
    saveWebsiteDraft,
    publishWebsiteDraft,
    restoreWebsiteVersion,
    discardWebsiteDraft,
    upsertCollectionItem,
    deleteCollectionItem,
    getRecentPublicPurchases,
    getPublicPayload,
    exportBackupPayload,
    importBackupPayload,
  };
}
