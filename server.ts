import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ADMIN_SESSION_COOKIE_NAME,
  createAdminAuthManager,
  type SafeAdminUser,
} from './server/adminAuth.ts';
import {
  applyDeliveryAcknowledgement,
  claimQueuedDeliveries,
  createSecretsManager,
  enqueueDeliveriesForOrder,
  maskSecret,
} from './server/deliveryEngine.ts';
import { createStoreStatePersistence } from './server/storeState.ts';
import { DEFAULT_PRODUCTS, DEFAULT_RUNTIME_SETTINGS } from './src/data/seedData.ts';
import type {
  AnnouncementItem,
  CouponItem,
  OrderItem,
  ProductItem,
  RefundRequestItem,
  ServerEventItem,
  StoreRuntimeSettings,
} from './src/types/store.ts';
import { validateAndApplyCoupon, validateMinecraftUsername } from './src/utils/storeLogic.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

interface ServerStatusPayload {
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

const statusCache = new Map<string, { expiresAt: number; payload: ServerStatusPayload }>();
const CACHE_TTL_MS = 30_000;

// Simple sliding-window IP rate limiter for plugin & player endpoints
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(bucketKey: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const entry = rateBuckets.get(bucketKey);
  if (!entry || entry.resetAt <= now) {
    rateBuckets.set(bucketKey, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= maxPerMinute) return false;
  entry.count += 1;
  return true;
}

function sanitizeServerAddress(raw: unknown): string {
  if (typeof raw !== 'string') return 'play.volex.indevs.in';
  const trimmed = raw.trim().slice(0, 100);
  if (!/^[a-zA-Z0-9.\-:]+$/.test(trimmed)) {
    return 'play.volex.indevs.in';
  }
  return trimmed;
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 4500): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'VOLEXMC-Store-Status/1.0',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function queryMinecraftServer(ip: string): Promise<ServerStatusPayload> {
  const cached = statusCache.get(ip);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const startedAt = Date.now();
  const checkedAt = new Date().toISOString();

  const primary = await fetchJsonWithTimeout(`https://api.mcsrvstat.us/3/${encodeURIComponent(ip)}`);
  if (primary && typeof primary.online === 'boolean') {
    const playersObj = (primary.players as Record<string, unknown> | undefined) || {};
    const motdObj = (primary.motd as Record<string, unknown> | undefined) || {};
    const motdClean = Array.isArray(motdObj.clean) ? String(motdObj.clean.join(' ')).trim() : '';
    const payload: ServerStatusPayload = {
      ip,
      online: Boolean(primary.online),
      players: {
        online: typeof playersObj.online === 'number' ? playersObj.online : 0,
        max: typeof playersObj.max === 'number' ? playersObj.max : 0,
      },
      version: typeof primary.version === 'string' && primary.version ? primary.version : '1.21.6',
      motd: motdClean || 'VOLEXMC Network',
      latencyMs: Date.now() - startedAt,
      checkedAt,
      source: 'mcsrvstat',
    };
    statusCache.set(ip, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
    return payload;
  }

  const fallback = await fetchJsonWithTimeout(`https://api.mcstatus.io/v2/status/java/${encodeURIComponent(ip)}`);
  if (fallback && typeof fallback.online === 'boolean') {
    const playersObj = (fallback.players as Record<string, unknown> | undefined) || {};
    const versionObj = (fallback.version as Record<string, unknown> | undefined) || {};
    const motdObj = (fallback.motd as Record<string, unknown> | undefined) || {};
    const payload: ServerStatusPayload = {
      ip,
      online: Boolean(fallback.online),
      players: {
        online: typeof playersObj.online === 'number' ? playersObj.online : 0,
        max: typeof playersObj.max === 'number' ? playersObj.max : 0,
      },
      version: typeof versionObj.name_clean === 'string' && versionObj.name_clean ? versionObj.name_clean : '1.21.6',
      motd: typeof motdObj.clean === 'string' ? motdObj.clean.trim() : 'VOLEXMC Network',
      latencyMs: Date.now() - startedAt,
      checkedAt,
      source: 'mcstatus',
    };
    statusCache.set(ip, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
    return payload;
  }

  const unreachablePayload: ServerStatusPayload = {
    ip,
    online: false,
    players: { online: 0, max: 0 },
    version: '1.21.6',
    motd: 'Unable to reach status gateway',
    latencyMs: Date.now() - startedAt,
    checkedAt,
    source: 'unreachable',
  };
  statusCache.set(ip, { expiresAt: Date.now() + 10_000, payload: unreachablePayload });
  return unreachablePayload;
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const eqIndex = part.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = part.slice(0, eqIndex).trim();
    const val = part.slice(eqIndex + 1).trim();
    if (key) {
      try {
        result[key] = decodeURIComponent(val);
      } catch {
        result[key] = val;
      }
    }
  }
  return result;
}

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function isHttpsRequest(req: express.Request): boolean {
  const proto = req.headers['x-forwarded-proto'];
  if (typeof proto === 'string' && proto.split(',')[0].trim() === 'https') {
    return true;
  }
  return Boolean(req.secure || req.protocol === 'https');
}

function setAdminSessionCookie(
  req: express.Request,
  res: express.Response,
  token: string,
  maxAgeSeconds: number
) {
  const https = isHttpsRequest(req);
  const parts = [
    `${ADMIN_SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${maxAgeSeconds}`,
    https ? 'SameSite=None' : 'SameSite=Lax',
  ];
  if (https) {
    parts.push('Secure');
    parts.push('Partitioned');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearAdminSessionCookie(req: express.Request, res: express.Response) {
  const https = isHttpsRequest(req);
  const parts = [
    `${ADMIN_SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Max-Age=0',
    https ? 'SameSite=None' : 'SameSite=Lax',
  ];
  if (https) {
    parts.push('Secure');
    parts.push('Partitioned');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

function extractBearerToken(req: express.Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    return token || undefined;
  }
  return undefined;
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '4mb' }));

  const dataDirOverride = process.env.VOLEX_DATA_DIR || undefined;
  const adminAuth = createAdminAuthManager(
    dataDirOverride ? { dataDir: dataDirOverride } : undefined
  );
  const storePersistence = createStoreStatePersistence(dataDirOverride);
  const secretsManager = createSecretsManager(dataDirOverride);
  adminAuth.bootstrapInitialAdminIfEmpty();
  secretsManager.readSecrets();

  const resolveAdminFromRequest = (req: express.Request): SafeAdminUser | null => {
    const cookies = parseCookies(req.headers.cookie);
    const cookieAdmin = adminAuth.verifySessionToken(cookies[ADMIN_SESSION_COOKIE_NAME]);
    if (cookieAdmin) return cookieAdmin;
    const bearerToken = extractBearerToken(req);
    return adminAuth.verifySessionToken(bearerToken);
  };

  const requireAdminAuth: express.RequestHandler = (req, res, next) => {
    const admin = resolveAdminFromRequest(req);
    if (!admin) {
      res.status(401).json({ error: 'Administrator authentication required.' });
      return;
    }
    (req as express.Request & { adminUser?: SafeAdminUser }).adminUser = admin;
    next();
  };

  const requirePluginAuth: express.RequestHandler = (req, res, next) => {
    if (!checkRateLimit(`plugin:${getClientIp(req)}`, 120)) {
      res.status(429).json({ error: 'Plugin polling rate limit exceeded.' });
      return;
    }
    const headerKey =
      (req.headers['x-volex-plugin-key'] as string | undefined) || extractBearerToken(req);
    if (!secretsManager.verifyPluginKey(headerKey)) {
      res.status(401).json({ error: 'Invalid Minecraft plugin API key.' });
      return;
    }
    next();
  };

  const buildIntegrationStatus = () => {
    const state = storePersistence.readState();
    const secrets = secretsManager.readSecrets();
    const hb = state.pluginHeartbeat || {
      lastHeartbeatAt: null,
      pluginVersion: null,
      tps: null,
      onlinePlayersReported: null,
    };
    const isConnected =
      Boolean(hb.lastHeartbeatAt) &&
      Date.now() - new Date(hb.lastHeartbeatAt!).getTime() < 5 * 60_000;

    return {
      pluginConnected: isConnected,
      lastHeartbeatAt: hb.lastHeartbeatAt,
      pluginVersion: hb.pluginVersion,
      tps: hb.tps,
      onlinePlayersReported: hb.onlinePlayersReported,
      maskedPluginKey: maskSecret(secrets.pluginApiKey, 6),
      rconConfigured: Boolean(secrets.rconHost && secrets.rconPassword),
      rconHostMasked: secrets.rconHost ? maskSecret(secrets.rconHost, 4) : 'Not configured',
      rconPort: secrets.rconPort,
    };
  };

  const catalogProducts = (): ProductItem[] => {
    const state = storePersistence.readState();
    return Array.isArray(state.products) && state.products.length > 0
      ? (state.products as unknown as ProductItem[])
      : DEFAULT_PRODUCTS;
  };

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'volexmc-store' });
  });

  app.get('/api/server-status', async (req, res) => {
    const ip = sanitizeServerAddress(req.query.ip);
    const status = await queryMinecraftServer(ip);
    const state = storePersistence.readState();
    const settings = state.storeSettings || DEFAULT_RUNTIME_SETTINGS;
    res.json({
      ...status,
      maintenanceMode: Boolean(settings.maintenanceMode),
      maintenanceMessage: settings.maintenanceMessage,
    });
  });

  app.get('/api/store/public', (_req, res) => {
    res.json(storePersistence.getPublicPayload());
  });

  app.get('/api/recent-purchases', (_req, res) => {
    res.json({ items: storePersistence.getRecentPublicPurchases(10) });
  });

  app.post('/api/coupons/validate', (req, res) => {
    const body = (req.body || {}) as { code?: string; subtotalInr?: number };
    const state = storePersistence.readState();
    const result = validateAndApplyCoupon({
      code: String(body.code || ''),
      coupons: state.coupons || [],
      subtotalInr: Number(body.subtotalInr || 0),
    });
    if (!result.valid) {
      res.status(400).json({ valid: false, error: result.error });
      return;
    }
    res.json({
      valid: true,
      code: result.coupon!.code,
      description: result.coupon!.description,
      discountInr: result.discountInr,
      finalTotalInr: result.finalTotalInr,
    });
  });

  // Privacy-safe player lookup endpoint (never exposes emails, payment proofs, or secrets)
  app.get('/api/player-lookup', (req, res) => {
    const ignRaw = String(req.query.ign || '');
    const check = validateMinecraftUsername(ignRaw);
    if (!check.valid) {
      res.status(400).json({ error: check.error || 'Invalid Minecraft username.' });
      return;
    }
    const state = storePersistence.readState();
    const ignLower = check.cleaned.toLowerCase();
    const matchingOrders = (state.orders as unknown as OrderItem[]).filter(
      (o) =>
        (o.minecraftUsername || '').toLowerCase() === ignLower &&
        (o.status === 'Approved' || o.status === 'Delivered') &&
        o.refundStatus !== 'Approved'
    );
    const synced = state.playerStats?.[ignLower];

    let inferredRank = 'Explorer';
    for (const o of matchingOrders) {
      const name = (o.productName || '').toUpperCase();
      if (name.includes('MVP')) {
        inferredRank = 'MVP';
        break;
      }
      if (name.includes('VIP') || name.includes('BUNDLE')) {
        inferredRank = 'VIP';
      }
    }

    res.json({
      minecraftUsername: check.cleaned,
      currentRank: synced?.currentRank || inferredRank,
      playtimeHours: synced?.playtimeHours ?? 0,
      questsCompleted: synced?.questsCompleted ?? 0,
      realmBalance: synced?.realmBalance ?? 0,
      online: Boolean(synced?.online),
      lastSeenAt: synced?.lastSeenAt || null,
      verifiedPurchasesCount: matchingOrders.length,
      source: synced ? 'plugin' : 'derived',
    });
  });

  // Player-synced state (notifications, wishlist, order delivery/refund sync, stats)
  app.get('/api/player/state', (req, res) => {
    const uid = String(req.query.uid || '').trim();
    const ign = String(req.query.ign || '').trim();
    if (!uid) {
      res.status(400).json({ error: 'Player uid required.' });
      return;
    }
    const state = storePersistence.readState();
    const notifications = (state.notifications || [])
      .filter((n) => n.userId === uid || n.userId === '*')
      .slice(0, 40);
    const wishlistIds = state.wishlists?.[uid] || [];
    const userOrders = (state.orders as unknown as OrderItem[]).filter(
      (o) => o.userId === uid
    );
    const deliveryByOrder: Record<string, string> = {};
    for (const job of state.deliveryJobs || []) {
      const existing = deliveryByOrder[job.orderId];
      if (!existing || job.status === 'Failed' || job.status === 'Queued') {
        deliveryByOrder[job.orderId] = job.status;
      }
    }
    const refundRequests = (state.refundRequests || []).filter((r) => r.userId === uid);
    const playerStats = ign ? state.playerStats?.[ign.toLowerCase()] || null : null;

    res.json({
      notifications,
      wishlistIds,
      orderSync: userOrders.map((o) => ({
        id: o.id,
        status: o.status,
        refundStatus: o.refundStatus || 'None',
        deliveryStatus: deliveryByOrder[o.id] || o.deliveryStatus,
        adminNotes: o.adminNotes,
      })),
      refundRequests,
      playerStats,
    });
  });

  app.post('/api/player/wishlist', (req, res) => {
    const body = (req.body || {}) as { uid?: string; productId?: string };
    const uid = String(body.uid || '').trim();
    const productId = String(body.productId || '').trim();
    if (!uid || !productId) {
      res.status(400).json({ error: 'uid and productId required.' });
      return;
    }
    const state = storePersistence.readState();
    const wishlists = { ...(state.wishlists || {}) };
    const current = new Set(wishlists[uid] || []);
    let added = false;
    if (current.has(productId)) {
      current.delete(productId);
    } else {
      current.add(productId);
      added = true;
    }
    wishlists[uid] = Array.from(current);
    storePersistence.writeState({ ...state, wishlists });
    res.json({ ok: true, added, wishlistIds: wishlists[uid] });
  });

  app.post('/api/player/notifications/read', (req, res) => {
    const body = (req.body || {}) as { uid?: string; notificationId?: string };
    const uid = String(body.uid || '').trim();
    if (!uid) {
      res.status(400).json({ error: 'uid required.' });
      return;
    }
    const state = storePersistence.readState();
    const next = (state.notifications || []).map((n) => {
      if (n.userId !== uid) return n;
      if (!body.notificationId || n.id === body.notificationId) {
        return { ...n, read: true };
      }
      return n;
    });
    storePersistence.writeState({ ...state, notifications: next });
    res.json({ ok: true });
  });

  app.post('/api/player/refund-request', (req, res) => {
    const body = (req.body || {}) as {
      orderId?: string;
      userId?: string;
      reason?: string;
    };
    const orderId = String(body.orderId || '').trim();
    const userId = String(body.userId || '').trim();
    const reason = String(body.reason || '').trim().slice(0, 600);
    if (!orderId || !userId || reason.length < 8) {
      res.status(400).json({ error: 'Provide a valid orderId, userId, and detailed refund reason (8+ chars).' });
      return;
    }
    const state = storePersistence.readState();
    const orderIdx = state.orders.findIndex((o) => String(o.id || '') === orderId);
    if (orderIdx === -1) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    const order = state.orders[orderIdx] as unknown as OrderItem;
    if (order.userId !== userId) {
      res.status(403).json({ error: 'You may only request refunds for your own orders.' });
      return;
    }
    if (order.refundStatus === 'Requested' || order.refundStatus === 'Approved') {
      res.status(400).json({ error: 'A refund request already exists for this order.' });
      return;
    }
    const now = new Date().toISOString();
    const refundItem: RefundRequestItem = {
      id: `ref_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      orderId,
      userId,
      minecraftUsername: order.minecraftUsername,
      amountInr: order.amountInr,
      reason,
      status: 'Requested',
      createdAt: now,
      updatedAt: now,
    };
    state.orders[orderIdx] = {
      ...state.orders[orderIdx],
      refundStatus: 'Requested',
      refundReason: reason,
      updatedAt: now,
    };
    state.refundRequests = [refundItem, ...(state.refundRequests || [])];
    storePersistence.writeState(state);
    storePersistence.pushNotification({
      userId,
      title: 'Refund Request Received',
      message: `Your refund request for order ${orderId} (${order.productName}) is under review by billing staff.`,
      category: 'payment',
      linkUrl: '/account',
    });
    res.json({ ok: true, refund: refundItem });
  });

  app.post('/api/orders/sync', (req, res) => {
    const order = req.body as Record<string, unknown> | undefined;
    if (!order || typeof order.id !== 'string' || typeof order.minecraftUsername !== 'string') {
      res.status(400).json({ error: 'Invalid order payload.' });
      return;
    }

    const state = storePersistence.readState();
    const subtotalInr = Number(order.subtotalInr || order.amountInr || 0);
    let finalAmountInr = Number(order.amountInr || subtotalInr || 0);
    let appliedCouponCode: string | undefined;
    let verifiedDiscountInr = 0;

    if (typeof order.couponCode === 'string' && order.couponCode.trim()) {
      const couponCheck = validateAndApplyCoupon({
        code: order.couponCode,
        coupons: state.coupons || [],
        subtotalInr,
      });
      if (couponCheck.valid && couponCheck.coupon) {
        appliedCouponCode = couponCheck.coupon.code;
        verifiedDiscountInr = couponCheck.discountInr;
        finalAmountInr = couponCheck.finalTotalInr;
        state.coupons = (state.coupons || []).map((c) =>
          c.id === couponCheck.coupon!.id ? { ...c, usedCount: c.usedCount + 1 } : c
        );
      }
    }

    const cleanOrder: Record<string, unknown> = {
      ...order,
      subtotalInr,
      amountInr: finalAmountInr,
      ...(appliedCouponCode ? { couponCode: appliedCouponCode } : {}),
      ...(verifiedDiscountInr > 0 ? { discountInr: verifiedDiscountInr } : {}),
      status: 'Pending',
      refundStatus: 'None',
      createdAt: order.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (verifiedDiscountInr > 0) {
      storePersistence.writeState(state);
    }
    storePersistence.upsertCollectionItem('orders', cleanOrder, 'id');

    if (typeof cleanOrder.userId === 'string' && cleanOrder.userId) {
      storePersistence.pushNotification({
        userId: cleanOrder.userId,
        title: 'Order Submitted for Proof Review',
        message: `Order ${cleanOrder.id} (${String(cleanOrder.productName || 'Bundle')}) is Pending manual staff verification.`,
        category: 'purchase',
        linkUrl: '/account',
      });
    }

    res.json({ ok: true, id: cleanOrder.id, amountInr: finalAmountInr });
  });

  app.post('/api/users/sync', (req, res) => {
    const profile = req.body as Record<string, unknown> | undefined;
    if (!profile || typeof profile.uid !== 'string' || typeof profile.email !== 'string') {
      res.status(400).json({ error: 'Invalid user profile payload.' });
      return;
    }
    const state = storePersistence.readState();
    const existing = state.users.find((u) => String(u.uid || '') === profile.uid);
    storePersistence.upsertCollectionItem(
      'users',
      {
        uid: profile.uid,
        email: profile.email,
        displayName: String(profile.displayName || 'VOLEXMC Player'),
        minecraftUsername: profile.minecraftUsername ? String(profile.minecraftUsername) : undefined,
        photoURL: profile.photoURL ? String(profile.photoURL) : undefined,
        role: existing?.role === 'admin' ? 'admin' : 'user',
        status: existing?.status === 'Suspended' ? 'Suspended' : 'Active',
        createdAt: existing?.createdAt || profile.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      'uid'
    );
    res.json({ ok: true });
  });

  app.post('/api/tickets/sync', (req, res) => {
    const ticket = req.body as Record<string, unknown> | undefined;
    if (!ticket || typeof ticket.id !== 'string' || typeof ticket.subject !== 'string') {
      res.status(400).json({ error: 'Invalid ticket payload.' });
      return;
    }
    storePersistence.upsertCollectionItem(
      'supportTickets',
      {
        ...ticket,
        status: 'Open',
        createdAt: ticket.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      'id'
    );
    res.json({ ok: true });
  });

  // PaperMC 1.21.6 Companion Plugin API (/api/plugin/*)
  app.post('/api/plugin/heartbeat', requirePluginAuth, (req, res) => {
    const body = (req.body || {}) as {
      pluginVersion?: string;
      tps?: number;
      onlinePlayers?: number;
      players?: Array<{
        username: string;
        rank?: string;
        playtimeHours?: number;
        kills?: number;
        questsCompleted?: number;
        balance?: number;
      }>;
    };

    const state = storePersistence.readState();
    const now = new Date().toISOString();
    const nextStats = { ...(state.playerStats || {}) };
    if (Array.isArray(body.players)) {
      for (const p of body.players.slice(0, 200)) {
        const check = validateMinecraftUsername(String(p.username || ''));
        if (!check.valid) continue;
        nextStats[check.cleaned.toLowerCase()] = {
          minecraftUsername: check.cleaned,
          currentRank: String(p.rank || 'Explorer').slice(0, 32),
          playtimeHours: Number.isFinite(p.playtimeHours) ? Math.max(0, Number(p.playtimeHours)) : 0,
          kills: Number.isFinite(p.kills) ? Math.max(0, Number(p.kills)) : 0,
          questsCompleted: Number.isFinite(p.questsCompleted)
            ? Math.max(0, Number(p.questsCompleted))
            : 0,
          realmBalance: Number.isFinite(p.balance) ? Math.max(0, Number(p.balance)) : 0,
          online: true,
          lastSeenAt: now,
          source: 'plugin',
        };
      }
    }

    storePersistence.writeState({
      ...state,
      playerStats: nextStats,
      pluginHeartbeat: {
        lastHeartbeatAt: now,
        pluginVersion: String(body.pluginVersion || '1.0.0').slice(0, 32),
        tps: typeof body.tps === 'number' ? Math.round(body.tps * 100) / 100 : 20,
        onlinePlayersReported: typeof body.onlinePlayers === 'number' ? body.onlinePlayers : 0,
      },
    });
    res.json({ ok: true, serverTime: now });
  });

  app.get('/api/plugin/poll-deliveries', requirePluginAuth, (req, res) => {
    const limit = Math.max(1, Math.min(20, Number(req.query.limit || 10)));
    const state = storePersistence.readState();
    const { claimed, jobs } = claimQueuedDeliveries(state.deliveryJobs || [], limit);
    if (claimed.length > 0) {
      storePersistence.writeState({ ...state, deliveryJobs: jobs });
    }
    res.json({
      deliveries: claimed.map((j) => ({
        jobId: j.id,
        orderId: j.orderId,
        minecraftUsername: j.minecraftUsername,
        productName: j.productName,
        commands: j.commands,
      })),
    });
  });

  app.post('/api/plugin/ack-delivery', requirePluginAuth, (req, res) => {
    const body = (req.body || {}) as {
      jobId?: string;
      success?: boolean;
      message?: string;
    };
    if (!body.jobId) {
      res.status(400).json({ error: 'jobId is required.' });
      return;
    }
    const state = storePersistence.readState();
    const ack = applyDeliveryAcknowledgement({
      jobs: state.deliveryJobs || [],
      logs: state.deliveryLogs || [],
      jobId: String(body.jobId),
      success: Boolean(body.success),
      channel: 'plugin',
      message: body.message ? String(body.message).slice(0, 240) : undefined,
    });
    if (!ack.updatedJob) {
      res.status(404).json({ error: 'Delivery job not found.' });
      return;
    }

    let nextOrders = [...state.orders];
    let targetUserId = '';
    if (ack.orderFullyDelivered) {
      nextOrders = nextOrders.map((o) => {
        if (String(o.id || '') !== ack.updatedJob!.orderId) return o;
        targetUserId = String(o.userId || '');
        return {
          ...o,
          status: 'Delivered',
          deliveryStatus: 'Delivered',
          updatedAt: new Date().toISOString(),
        };
      });
    }

    storePersistence.writeState({
      ...state,
      orders: nextOrders,
      deliveryJobs: ack.jobs,
      deliveryLogs: ack.logs,
    });

    if (ack.orderFullyDelivered && targetUserId) {
      storePersistence.pushNotification({
        userId: targetUserId,
        title: 'In-Game Delivery Complete!',
        message: `${ack.updatedJob.productName} has been delivered to ${ack.updatedJob.minecraftUsername} on play.volex.indevs.in.`,
        category: 'delivery',
        linkUrl: '/account',
      });
    }

    res.json({
      ok: true,
      job: ack.updatedJob,
      orderFullyDelivered: ack.orderFullyDelivered,
    });
  });

  // Admin Auth Endpoints
  app.get('/api/admin/auth/status', (req, res) => {
    const configured = adminAuth.hasConfiguredAdmin();
    const admin = resolveAdminFromRequest(req);
    res.json({
      configured,
      setupRequired: !configured,
      authenticated: Boolean(admin),
      admin,
    });
  });

  app.post('/api/admin/auth/login', async (req, res) => {
    const body = (req.body || {}) as {
      identifier?: string;
      email?: string;
      password?: string;
      rememberMe?: boolean;
    };
    const identifier = String(body.identifier ?? body.email ?? '');
    const password = String(body.password ?? '');
    const rememberMe = Boolean(body.rememberMe);
    const clientKey = getClientIp(req);

    const result = await adminAuth.authenticate({
      identifier,
      password,
      rememberMe,
      clientKey,
    });

    if (!result.ok) {
      if (result.retryAfterSeconds) {
        res.setHeader('Retry-After', String(result.retryAfterSeconds));
      }
      res.status(result.status).json({
        error: result.error,
        setupRequired: Boolean(result.setupRequired),
        retryAfterSeconds: result.retryAfterSeconds,
      });
      return;
    }

    storePersistence.appendActivityLog({
      actorEmail: result.admin.email,
      action: 'ADMIN_LOGIN',
      target: 'Admin Session',
      details: `Signed in from ${clientKey}`,
    });

    setAdminSessionCookie(req, res, result.token, result.maxAgeSeconds);
    res.json({
      authenticated: true,
      admin: result.admin,
      sessionToken: result.token,
    });
  });

  app.post('/api/admin/auth/logout', (req, res) => {
    const admin = resolveAdminFromRequest(req);
    if (admin) {
      adminAuth.revokeAdminSession(admin.id);
      storePersistence.appendActivityLog({
        actorEmail: admin.email,
        action: 'ADMIN_LOGOUT',
        target: 'Admin Session',
        details: 'Administrator signed out',
      });
    }
    clearAdminSessionCookie(req, res);
    res.json({ authenticated: false });
  });

  app.post('/api/admin/auth/change-password', requireAdminAuth, async (req, res) => {
    const admin = (req as express.Request & { adminUser: SafeAdminUser }).adminUser;
    const body = (req.body || {}) as { currentPassword?: string; newPassword?: string };
    const result = await adminAuth.changePassword({
      adminId: admin.id,
      currentPassword: String(body.currentPassword || ''),
      newPassword: String(body.newPassword || ''),
    });

    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    storePersistence.appendActivityLog({
      actorEmail: admin.email,
      action: 'PASSWORD_ROTATED',
      target: 'Admin Security',
      details: 'Administrator password updated and session cookie rotated',
    });

    setAdminSessionCookie(req, res, result.token, result.maxAgeSeconds);
    res.json({ ok: true, admin: result.admin, sessionToken: result.token });
  });

  const actorOf = (req: express.Request) =>
    (req as express.Request & { adminUser?: SafeAdminUser }).adminUser?.email || 'admin';

  // Protected Admin Management API (/api/admin/*)
  app.get('/api/admin/overview', requireAdminAuth, (_req, res) => {
    const state = storePersistence.readState();
    res.json({
      orders: state.orders,
      users: state.users,
      supportTickets: state.supportTickets,
      activityLogs: state.activityLogs || [],
      websitePublished: state.websitePublished || null,
      websiteDraft: state.websiteDraft || state.websitePublished || null,
      websiteVersions: state.websiteVersions || [],
      coupons: state.coupons || [],
      deliveryJobs: state.deliveryJobs || [],
      deliveryLogs: state.deliveryLogs || [],
      refundRequests: state.refundRequests || [],
      announcements: state.announcements || [],
      serverEvents: state.serverEvents || [],
      storeSettings: state.storeSettings || DEFAULT_RUNTIME_SETTINGS,
      integrationStatus: buildIntegrationStatus(),
      publicStore: storePersistence.getPublicPayload(),
    });
  });

  app.get('/api/admin/activity-logs', requireAdminAuth, (_req, res) => {
    const state = storePersistence.readState();
    res.json({ logs: state.activityLogs || [] });
  });

  // Website Editor Draft / Publish / Discard / Versions
  app.get('/api/admin/website', requireAdminAuth, (_req, res) => {
    const state = storePersistence.readState();
    res.json({
      published: state.websitePublished || null,
      draft: state.websiteDraft || state.websitePublished || null,
      versions: state.websiteVersions || [],
    });
  });

  app.put('/api/admin/website/draft', requireAdminAuth, (req, res) => {
    const draftPayload = (req.body || {}) as Record<string, unknown>;
    const updated = storePersistence.saveWebsiteDraft(draftPayload);
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'WEBSITE_DRAFT_SAVED',
      target: 'Website Editor',
      details: 'Saved Website Editor draft without publishing live',
    });
    res.json({
      ok: true,
      draft: updated.websiteDraft,
      published: updated.websitePublished || null,
      versions: updated.websiteVersions || [],
    });
  });

  app.post('/api/admin/website/publish', requireAdminAuth, (req, res) => {
    const body = req.body as Record<string, unknown> | undefined;
    const override = body && Object.keys(body).length > 0 ? body : undefined;
    const updated = storePersistence.publishWebsiteDraft(override, actorOf(req));
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'WEBSITE_PUBLISHED',
      target: 'Website Editor',
      details: 'Published Website Editor configuration to live public store',
    });
    res.json({
      ok: true,
      published: updated.websitePublished,
      draft: updated.websiteDraft,
      siteConfig: updated.siteConfig,
      versions: updated.websiteVersions || [],
    });
  });

  app.post('/api/admin/website/versions/:id/restore', requireAdminAuth, (req, res) => {
    const updated = storePersistence.restoreWebsiteVersion(req.params.id);
    if (!updated) {
      res.status(404).json({ error: 'Version snapshot not found.' });
      return;
    }
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'WEBSITE_VERSION_RESTORED',
      target: req.params.id,
      details: `Loaded historical snapshot ${req.params.id} into Website Editor draft`,
    });
    res.json({
      ok: true,
      draft: updated.websiteDraft,
      versions: updated.websiteVersions || [],
    });
  });

  app.post('/api/admin/website/discard', requireAdminAuth, (req, res) => {
    const updated = storePersistence.discardWebsiteDraft();
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'WEBSITE_DRAFT_DISCARDED',
      target: 'Website Editor',
      details: 'Reverted unpublished draft changes back to live configuration',
    });
    res.json({
      ok: true,
      draft: updated.websiteDraft || null,
      published: updated.websitePublished || null,
    });
  });

  app.put('/api/admin/products/:id', requireAdminAuth, (req, res) => {
    const item: Record<string, unknown> = {
      ...(req.body as Record<string, unknown>),
      id: req.params.id,
    };
    storePersistence.upsertCollectionItem('products', item, 'id');
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'PRODUCT_SAVED',
      target: String(item.name || req.params.id),
      details: `Saved product (${req.params.id})`,
    });
    res.json({ ok: true, item });
  });

  app.delete('/api/admin/products/:id', requireAdminAuth, (req, res) => {
    storePersistence.deleteCollectionItem('products', req.params.id);
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'PRODUCT_DELETED',
      target: req.params.id,
      details: `Deleted product ${req.params.id}`,
    });
    res.json({ ok: true });
  });

  app.put('/api/admin/categories/:id', requireAdminAuth, (req, res) => {
    const item: Record<string, unknown> = {
      ...(req.body as Record<string, unknown>),
      id: req.params.id,
    };
    storePersistence.upsertCollectionItem('categories', item, 'id');
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'CATEGORY_SAVED',
      target: String(item.name || req.params.id),
      details: `Saved category (${req.params.id})`,
    });
    res.json({ ok: true, item });
  });

  app.delete('/api/admin/categories/:id', requireAdminAuth, (req, res) => {
    storePersistence.deleteCollectionItem('categories', req.params.id);
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'CATEGORY_DELETED',
      target: req.params.id,
      details: `Deleted category ${req.params.id}`,
    });
    res.json({ ok: true });
  });

  // Coupons CRUD
  app.put('/api/admin/coupons/:id', requireAdminAuth, (req, res) => {
    const body = req.body as Partial<CouponItem>;
    const code = String(body.code || req.params.id).trim().toUpperCase();
    const coupon: CouponItem = {
      id: req.params.id,
      code,
      description: String(body.description || `${code} discount`),
      discountType: body.discountType === 'fixed' ? 'fixed' : 'percent',
      discountValue: Math.max(1, Number(body.discountValue || 10)),
      minOrderInr: Math.max(0, Number(body.minOrderInr || 0)),
      ...(body.maxDiscountInr ? { maxDiscountInr: Math.max(1, Number(body.maxDiscountInr)) } : {}),
      maxUses: Math.max(0, Number(body.maxUses || 100)),
      usedCount: Math.max(0, Number(body.usedCount || 0)),
      ...(body.expiresAt ? { expiresAt: String(body.expiresAt) } : {}),
      active: body.active !== false,
      updatedAt: new Date().toISOString(),
    };
    const state = storePersistence.readState();
    const list = [...(state.coupons || [])];
    const idx = list.findIndex((c) => c.id === coupon.id);
    if (idx >= 0) list[idx] = coupon;
    else list.unshift(coupon);
    storePersistence.writeState({ ...state, coupons: list });
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'COUPON_SAVED',
      target: coupon.code,
      details: `Saved promo code ${coupon.code} (${coupon.discountValue}${coupon.discountType === 'percent' ? '%' : ' INR'})`,
    });
    res.json({ ok: true, coupon, coupons: list });
  });

  app.delete('/api/admin/coupons/:id', requireAdminAuth, (req, res) => {
    const state = storePersistence.readState();
    const next = (state.coupons || []).filter((c) => c.id !== req.params.id);
    storePersistence.writeState({ ...state, coupons: next });
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'COUPON_DELETED',
      target: req.params.id,
      details: `Deleted promo code ${req.params.id}`,
    });
    res.json({ ok: true, coupons: next });
  });

  // Announcements & Server Events CRUD
  app.put('/api/admin/announcements/:id', requireAdminAuth, (req, res) => {
    const body = req.body as Partial<AnnouncementItem>;
    const now = new Date().toISOString();
    const state = storePersistence.readState();
    const list = [...(state.announcements || [])];
    const existing = list.find((a) => a.id === req.params.id);
    const item: AnnouncementItem = {
      id: req.params.id,
      title: String(body.title || 'Announcement'),
      tag: (body.tag as AnnouncementItem['tag']) || 'Update',
      summary: String(body.summary || ''),
      content: String(body.content || ''),
      ...(body.imageUrl ? { imageUrl: String(body.imageUrl) } : {}),
      pinned: Boolean(body.pinned),
      published: body.published !== false,
      createdAt: existing?.createdAt || body.createdAt || now,
      updatedAt: now,
    };
    const idx = list.findIndex((a) => a.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.unshift(item);
    storePersistence.writeState({ ...state, announcements: list });
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'ANNOUNCEMENT_SAVED',
      target: item.title,
      details: `Saved announcement (${item.tag})`,
    });
    res.json({ ok: true, item, announcements: list });
  });

  app.delete('/api/admin/announcements/:id', requireAdminAuth, (req, res) => {
    const state = storePersistence.readState();
    const next = (state.announcements || []).filter((a) => a.id !== req.params.id);
    storePersistence.writeState({ ...state, announcements: next });
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'ANNOUNCEMENT_DELETED',
      target: req.params.id,
      details: `Removed announcement ${req.params.id}`,
    });
    res.json({ ok: true, announcements: next });
  });

  app.put('/api/admin/events/:id', requireAdminAuth, (req, res) => {
    const body = req.body as Partial<ServerEventItem>;
    const state = storePersistence.readState();
    const list = [...(state.serverEvents || [])];
    const item: ServerEventItem = {
      id: req.params.id,
      title: String(body.title || 'Server Event'),
      category: (body.category as ServerEventItem['category']) || 'Tournament',
      startsAt: String(body.startsAt || new Date().toISOString()),
      ...(body.endsAt ? { endsAt: String(body.endsAt) } : {}),
      rewardSummary: String(body.rewardSummary || ''),
      description: String(body.description || ''),
      ...(body.bannerUrl ? { bannerUrl: String(body.bannerUrl) } : {}),
      active: body.active !== false,
    };
    const idx = list.findIndex((e) => e.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.unshift(item);
    storePersistence.writeState({ ...state, serverEvents: list });
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'EVENT_SAVED',
      target: item.title,
      details: `Saved server event (${item.category})`,
    });
    res.json({ ok: true, item, serverEvents: list });
  });

  app.delete('/api/admin/events/:id', requireAdminAuth, (req, res) => {
    const state = storePersistence.readState();
    const next = (state.serverEvents || []).filter((e) => e.id !== req.params.id);
    storePersistence.writeState({ ...state, serverEvents: next });
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'EVENT_DELETED',
      target: req.params.id,
      details: `Removed event ${req.params.id}`,
    });
    res.json({ ok: true, serverEvents: next });
  });

  app.put('/api/admin/payment-methods/:id', requireAdminAuth, (req, res) => {
    const item: Record<string, unknown> = {
      ...(req.body as Record<string, unknown>),
      id: req.params.id,
    };
    storePersistence.upsertCollectionItem('paymentMethods', item, 'id');
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'PAYMENT_METHOD_UPDATED',
      target: String(item.name || req.params.id),
      details: `Updated gateway (${Boolean(item.enabled) ? 'enabled' : 'disabled'})`,
    });
    res.json({ ok: true, item });
  });

  app.put('/api/admin/site-config', requireAdminAuth, (req, res) => {
    const state = storePersistence.readState();
    state.siteConfig = { ...(req.body as Record<string, unknown>), updatedAt: new Date().toISOString() };
    storePersistence.writeState(state);
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'SERVER_SETTINGS_SAVED',
      target: 'Server Settings',
      details: `Updated server IP ${String(state.siteConfig.serverIp || '')}`,
    });
    res.json({ ok: true, siteConfig: state.siteConfig });
  });

  app.put('/api/admin/store-settings', requireAdminAuth, (req, res) => {
    const body = req.body as Partial<StoreRuntimeSettings>;
    const state = storePersistence.readState();
    const current = state.storeSettings || DEFAULT_RUNTIME_SETTINGS;
    const next: StoreRuntimeSettings = {
      nprPerInrRate:
        typeof body.nprPerInrRate === 'number' && body.nprPerInrRate > 0.1
          ? Math.round(body.nprPerInrRate * 100) / 100
          : current.nprPerInrRate,
      maintenanceMode:
        body.maintenanceMode !== undefined ? Boolean(body.maintenanceMode) : current.maintenanceMode,
      maintenanceMessage:
        body.maintenanceMessage !== undefined
          ? String(body.maintenanceMessage).slice(0, 400)
          : current.maintenanceMessage,
      communityGoalLabel:
        body.communityGoalLabel !== undefined
          ? String(body.communityGoalLabel).slice(0, 120)
          : current.communityGoalLabel,
      communityGoalPercent:
        typeof body.communityGoalPercent === 'number'
          ? Math.max(0, Math.min(100, Math.round(body.communityGoalPercent)))
          : current.communityGoalPercent,
      autoQueueOnApprove:
        body.autoQueueOnApprove !== undefined
          ? Boolean(body.autoQueueOnApprove)
          : current.autoQueueOnApprove,
    };
    storePersistence.writeState({ ...state, storeSettings: next });
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'STORE_SETTINGS_UPDATED',
      target: 'Runtime Settings',
      details: `NPR Rate: ${next.nprPerInrRate}, Maintenance: ${next.maintenanceMode ? 'ON' : 'OFF'}`,
    });
    res.json({ ok: true, storeSettings: next });
  });

  app.patch('/api/admin/orders/:id', requireAdminAuth, (req, res) => {
    const body = (req.body || {}) as { status?: string; adminNotes?: string };
    const state = storePersistence.readState();
    const idx = state.orders.findIndex((o) => String(o.id || '') === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    const prevOrder = state.orders[idx] as unknown as OrderItem;
    const nextStatus = body.status || prevOrder.status;
    const updatedOrder: Record<string, unknown> = {
      ...state.orders[idx],
      ...(body.status ? { status: body.status } : {}),
      ...(body.adminNotes !== undefined ? { adminNotes: body.adminNotes } : {}),
      updatedAt: new Date().toISOString(),
    };

    let nextJobs = state.deliveryJobs || [];
    let nextLogs = state.deliveryLogs || [];
    let queuedCount = 0;

    if (
      nextStatus === 'Approved' &&
      (state.storeSettings?.autoQueueOnApprove ?? true)
    ) {
      const queued = enqueueDeliveriesForOrder({
        order: updatedOrder as unknown as OrderItem,
        products: catalogProducts(),
        existingJobs: nextJobs,
        existingLogs: nextLogs,
      });
      nextJobs = queued.jobs;
      nextLogs = queued.logs;
      queuedCount = queued.createdCount;
      if (queuedCount > 0) {
        updatedOrder.deliveryStatus = 'Queued';
      }
    }

    state.orders[idx] = updatedOrder;
    state.deliveryJobs = nextJobs;
    state.deliveryLogs = nextLogs;
    storePersistence.writeState(state);

    if (prevOrder.userId && body.status && body.status !== prevOrder.status) {
      storePersistence.pushNotification({
        userId: prevOrder.userId,
        title: `Order ${body.status}`,
        message: `Order ${prevOrder.id} (${prevOrder.productName}) is now ${body.status}.${queuedCount > 0 ? ' In-game delivery queued.' : ''}`,
        category: body.status === 'Delivered' ? 'delivery' : 'payment',
        linkUrl: '/account',
      });
    }

    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'ORDER_STATUS_UPDATED',
      target: req.params.id,
      details: `Marked order ${req.params.id} as ${nextStatus}${queuedCount > 0 ? ` & queued ${queuedCount} delivery job(s)` : ''}`,
    });
    res.json({
      ok: true,
      order: updatedOrder,
      deliveryJobs: nextJobs,
      deliveryLogs: nextLogs,
    });
  });

  // Delivery Queue Admin Actions
  app.post('/api/admin/orders/:id/enqueue-delivery', requireAdminAuth, (req, res) => {
    const state = storePersistence.readState();
    const order = state.orders.find((o) => String(o.id || '') === req.params.id) as unknown as
      | OrderItem
      | undefined;
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    const enqueued = enqueueDeliveriesForOrder({
      order,
      products: catalogProducts(),
      existingJobs: state.deliveryJobs || [],
      existingLogs: state.deliveryLogs || [],
    });
    storePersistence.writeState({
      ...state,
      deliveryJobs: enqueued.jobs,
      deliveryLogs: enqueued.logs,
    });
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'DELIVERY_QUEUED',
      target: order.id,
      details: `Queued ${enqueued.createdCount} delivery job(s) for ${order.minecraftUsername}`,
    });
    res.json({
      ok: true,
      createdCount: enqueued.createdCount,
      deliveryJobs: enqueued.jobs,
      deliveryLogs: enqueued.logs,
    });
  });

  app.post('/api/admin/deliveries/:jobId/mark-delivered', requireAdminAuth, (req, res) => {
    const state = storePersistence.readState();
    const ack = applyDeliveryAcknowledgement({
      jobs: state.deliveryJobs || [],
      logs: state.deliveryLogs || [],
      jobId: req.params.jobId,
      success: true,
      channel: 'manual',
      message: `Manually confirmed delivered by ${actorOf(req)}`,
    });
    if (!ack.updatedJob) {
      res.status(404).json({ error: 'Delivery job not found.' });
      return;
    }

    let nextOrders = [...state.orders];
    let targetUid = '';
    if (ack.orderFullyDelivered) {
      nextOrders = nextOrders.map((o) => {
        if (String(o.id || '') !== ack.updatedJob!.orderId) return o;
        targetUid = String(o.userId || '');
        return {
          ...o,
          status: 'Delivered',
          deliveryStatus: 'Delivered',
          updatedAt: new Date().toISOString(),
        };
      });
    }

    storePersistence.writeState({
      ...state,
      orders: nextOrders,
      deliveryJobs: ack.jobs,
      deliveryLogs: ack.logs,
    });

    if (ack.orderFullyDelivered && targetUid) {
      storePersistence.pushNotification({
        userId: targetUid,
        title: 'Items Delivered In-Game',
        message: `${ack.updatedJob.productName} has been fulfilled for ${ack.updatedJob.minecraftUsername}.`,
        category: 'delivery',
        linkUrl: '/account',
      });
    }

    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'DELIVERY_MANUAL_COMPLETE',
      target: ack.updatedJob.orderId,
      details: `Manually marked ${ack.updatedJob.productName} delivered to ${ack.updatedJob.minecraftUsername}`,
    });

    res.json({
      ok: true,
      deliveryJobs: ack.jobs,
      deliveryLogs: ack.logs,
      orders: nextOrders,
    });
  });

  app.post('/api/admin/deliveries/:jobId/retry', requireAdminAuth, (req, res) => {
    const state = storePersistence.readState();
    const jobs = [...(state.deliveryJobs || [])];
    const idx = jobs.findIndex((j) => j.id === req.params.jobId);
    if (idx === -1) {
      res.status(404).json({ error: 'Delivery job not found.' });
      return;
    }
    const now = new Date().toISOString();
    jobs[idx] = {
      ...jobs[idx],
      status: 'Queued',
      attempts: 0,
      lastError: undefined,
      updatedAt: now,
    };
    const logs = [
      {
        id: `dlog_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        jobId: jobs[idx].id,
        orderId: jobs[idx].orderId,
        minecraftUsername: jobs[idx].minecraftUsername,
        productName: jobs[idx].productName,
        commands: jobs[idx].commands,
        outcome: 'queued' as const,
        channel: 'manual' as const,
        message: `Re-queued for plugin delivery by ${actorOf(req)}`,
        createdAt: now,
      },
      ...(state.deliveryLogs || []),
    ].slice(0, 500);
    storePersistence.writeState({ ...state, deliveryJobs: jobs, deliveryLogs: logs });
    res.json({ ok: true, deliveryJobs: jobs, deliveryLogs: logs });
  });

  // Refund Requests Approval / Rejection
  app.patch('/api/admin/refunds/:id', requireAdminAuth, (req, res) => {
    const body = (req.body || {}) as { decision?: 'Approved' | 'Rejected'; adminNote?: string };
    if (body.decision !== 'Approved' && body.decision !== 'Rejected') {
      res.status(400).json({ error: 'decision must be Approved or Rejected.' });
      return;
    }
    const state = storePersistence.readState();
    const list = [...(state.refundRequests || [])];
    const rIdx = list.findIndex((r) => r.id === req.params.id);
    if (rIdx === -1) {
      res.status(404).json({ error: 'Refund request not found.' });
      return;
    }
    const now = new Date().toISOString();
    const updatedRefund: RefundRequestItem = {
      ...list[rIdx],
      status: body.decision,
      adminNote: body.adminNote ? String(body.adminNote).slice(0, 300) : undefined,
      updatedAt: now,
    };
    list[rIdx] = updatedRefund;

    const nextOrders = state.orders.map((o) =>
      String(o.id || '') === updatedRefund.orderId
        ? {
            ...o,
            refundStatus: body.decision,
            ...(body.decision === 'Approved' ? { status: 'Rejected' } : {}),
            updatedAt: now,
          }
        : o
    );

    storePersistence.writeState({
      ...state,
      refundRequests: list,
      orders: nextOrders,
    });

    storePersistence.pushNotification({
      userId: updatedRefund.userId,
      title: `Refund ${body.decision}`,
      message: `Your refund request for order ${updatedRefund.orderId} was ${body.decision.toLowerCase()}.${updatedRefund.adminNote ? ` Note: ${updatedRefund.adminNote}` : ''}`,
      category: 'payment',
      linkUrl: '/account',
    });

    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: `REFUND_${body.decision.toUpperCase()}`,
      target: updatedRefund.orderId,
      details: `${body.decision} refund for ${updatedRefund.minecraftUsername} (₹${updatedRefund.amountInr} INR)`,
    });

    res.json({
      ok: true,
      refundRequests: list,
      orders: nextOrders,
    });
  });

  // Server Integration & Secrets Management
  app.get('/api/admin/integration', requireAdminAuth, (_req, res) => {
    res.json(buildIntegrationStatus());
  });

  app.post('/api/admin/integration/rotate-key', requireAdminAuth, (req, res) => {
    const rotated = secretsManager.rotatePluginKey();
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'PLUGIN_KEY_ROTATED',
      target: 'Paper 1.21.6 Bridge',
      details: 'Generated fresh X-Volex-Plugin-Key for Minecraft companion plugin',
    });
    res.json({
      ok: true,
      newPlaintextKey: rotated.newPlaintextKey,
      integrationStatus: buildIntegrationStatus(),
    });
  });

  app.put('/api/admin/integration/rcon', requireAdminAuth, (req, res) => {
    const body = (req.body || {}) as { host?: string; port?: number; password?: string };
    secretsManager.updateRconConfig(body);
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'RCON_SETTINGS_UPDATED',
      target: 'Server Bridge',
      details: 'Updated RCON endpoint configuration',
    });
    res.json({ ok: true, integrationStatus: buildIntegrationStatus() });
  });

  // Database Backup & Restore
  app.get('/api/admin/backup', requireAdminAuth, (req, res) => {
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'BACKUP_EXPORTED',
      target: 'Store Database',
      details: 'Exported full JSON snapshot of store state',
    });
    res.json(storePersistence.exportBackupPayload());
  });

  app.post('/api/admin/backup/restore', requireAdminAuth, (req, res) => {
    try {
      storePersistence.importBackupPayload(req.body);
      storePersistence.appendActivityLog({
        actorEmail: actorOf(req),
        action: 'BACKUP_RESTORED',
        target: 'Store Database',
        details: 'Restored store state from uploaded JSON backup',
      });
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Invalid backup payload.',
      });
    }
  });

  app.patch('/api/admin/users/:uid/status', requireAdminAuth, (req, res) => {
    const body = (req.body || {}) as { status?: 'Active' | 'Suspended' };
    if (body.status !== 'Active' && body.status !== 'Suspended') {
      res.status(400).json({ error: 'Status must be Active or Suspended.' });
      return;
    }
    const state = storePersistence.readState();
    const idx = state.users.findIndex((u) => String(u.uid || '') === req.params.uid);
    if (idx === -1) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    state.users[idx] = {
      ...state.users[idx],
      status: body.status,
      updatedAt: new Date().toISOString(),
    };
    storePersistence.writeState(state);
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'USER_STATUS_CHANGED',
      target: String(state.users[idx].email || req.params.uid),
      details: `Set player account status to ${body.status}`,
    });
    res.json({ ok: true, user: state.users[idx] });
  });

  app.put('/api/admin/staff/:id', requireAdminAuth, (req, res) => {
    const item: Record<string, unknown> = {
      ...(req.body as Record<string, unknown>),
      id: req.params.id,
    };
    storePersistence.upsertCollectionItem('staff', item, 'id');
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'STAFF_SAVED',
      target: String(item.name || req.params.id),
      details: `Saved staff profile (${String(item.role || '')})`,
    });
    res.json({ ok: true, item });
  });

  app.delete('/api/admin/staff/:id', requireAdminAuth, (req, res) => {
    storePersistence.deleteCollectionItem('staff', req.params.id);
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'STAFF_DELETED',
      target: req.params.id,
      details: `Removed staff profile ${req.params.id}`,
    });
    res.json({ ok: true });
  });

  app.put('/api/admin/wiki/:id', requireAdminAuth, (req, res) => {
    const item: Record<string, unknown> = {
      ...(req.body as Record<string, unknown>),
      id: req.params.id,
    };
    storePersistence.upsertCollectionItem('wikiArticles', item, 'id');
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'WIKI_SAVED',
      target: String(item.title || req.params.id),
      details: `Saved wiki guide (${req.params.id})`,
    });
    res.json({ ok: true, item });
  });

  app.delete('/api/admin/wiki/:id', requireAdminAuth, (req, res) => {
    storePersistence.deleteCollectionItem('wikiArticles', req.params.id);
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'WIKI_DELETED',
      target: req.params.id,
      details: `Deleted wiki guide ${req.params.id}`,
    });
    res.json({ ok: true });
  });

  app.put('/api/admin/rules/:id', requireAdminAuth, (req, res) => {
    const item: Record<string, unknown> = {
      ...(req.body as Record<string, unknown>),
      id: req.params.id,
    };
    storePersistence.upsertCollectionItem('rules', item, 'id');
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'RULE_SAVED',
      target: String(item.title || req.params.id),
      details: `Saved server rule (${req.params.id})`,
    });
    res.json({ ok: true, item });
  });

  app.delete('/api/admin/rules/:id', requireAdminAuth, (req, res) => {
    storePersistence.deleteCollectionItem('rules', req.params.id);
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'RULE_DELETED',
      target: req.params.id,
      details: `Deleted server rule ${req.params.id}`,
    });
    res.json({ ok: true });
  });

  app.patch('/api/admin/tickets/:id', requireAdminAuth, (req, res) => {
    const body = (req.body || {}) as { status?: string; adminReply?: string };
    const state = storePersistence.readState();
    const idx = state.supportTickets.findIndex((t) => String(t.id || '') === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Ticket not found.' });
      return;
    }
    const existing = state.supportTickets[idx];
    state.supportTickets[idx] = {
      ...existing,
      ...(body.status ? { status: body.status } : {}),
      ...(body.adminReply !== undefined ? { adminReply: body.adminReply } : {}),
      updatedAt: new Date().toISOString(),
    };
    storePersistence.writeState(state);

    if (typeof existing.userId === 'string' && existing.userId) {
      storePersistence.pushNotification({
        userId: existing.userId,
        title: `Support Ticket Updated`,
        message: `Ticket "${String(existing.subject || existing.id)}" is now ${body.status || existing.status}.`,
        category: 'support',
        linkUrl: '/support',
      });
    }

    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'TICKET_UPDATED',
      target: req.params.id,
      details: `Updated ticket ${req.params.id} to ${body.status || state.supportTickets[idx].status}`,
    });
    res.json({ ok: true, ticket: state.supportTickets[idx] });
  });

  app.post('/api/admin/seed-defaults', requireAdminAuth, (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const state = storePersistence.readState();
    storePersistence.writeState({
      ...state,
      siteConfig: (body.siteConfig as Record<string, unknown>) || state.siteConfig,
      categories: Array.isArray(body.categories) ? body.categories : state.categories,
      products: Array.isArray(body.products) ? body.products : state.products,
      paymentMethods: Array.isArray(body.paymentMethods) ? body.paymentMethods : state.paymentMethods,
      staff: Array.isArray(body.staff) ? body.staff : state.staff,
      wikiArticles: Array.isArray(body.wikiArticles) ? body.wikiArticles : state.wikiArticles,
      rules: Array.isArray(body.rules) ? body.rules : state.rules,
    });
    storePersistence.appendActivityLog({
      actorEmail: actorOf(req),
      action: 'DEFAULTS_SYNCED',
      target: 'Catalog & Content',
      details: 'Synchronized default VOLEXMC store catalog and rules',
    });
    res.json({ ok: true });
  });

  if (!IS_PROD) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VOLEXMC server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start VOLEXMC server:', err);
  process.exit(1);
});
