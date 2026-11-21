import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface AdminAccountRecord {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  role: 'admin';
  mustChangePassword: boolean;
  tokenVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface SafeAdminUser {
  id: string;
  email: string;
  username: string;
  role: 'admin';
  mustChangePassword: boolean;
}

export interface AdminSessionPayload {
  sub: string;
  email: string;
  username: string;
  role: 'admin';
  tokenVersion: number;
  iat: number;
  exp: number;
}

interface AdminStoreFile {
  admins: AdminAccountRecord[];
}

interface RateLimitEntry {
  failures: number;
  windowStart: number;
  blockedUntil: number;
}

export const ADMIN_SESSION_COOKIE_NAME = 'volex_admin_session';
const BCRYPT_ROUNDS = 12;
const SHORT_SESSION_MS = 12 * 60 * 60 * 1000;
const REMEMBER_SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

export function toSafeAdminUser(record: AdminAccountRecord): SafeAdminUser {
  return {
    id: record.id,
    email: record.email,
    username: record.username,
    role: record.role,
    mustChangePassword: record.mustChangePassword,
  };
}

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(normalized, 'base64').toString('utf8');
}

export function createAdminAuthManager(options?: {
  dataDir?: string;
  sessionSecret?: string;
  envEmail?: string;
  envPassword?: string;
  now?: () => number;
}) {
  const dataDir = options?.dataDir || path.resolve(process.cwd(), '.data');
  const adminFilePath = path.join(dataDir, 'admin-auth.json');
  const secretFilePath = path.join(dataDir, 'session-secret.key');
  const nowFn = options?.now || (() => Date.now());
  const rateLimits = new Map<string, RateLimitEntry>();

  function ensureDataDir(): void {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  function resolveSessionSecret(): string {
    const envSecret = (options?.sessionSecret ?? process.env.SESSION_SECRET ?? '').trim();
    if (envSecret.length >= 16) {
      return envSecret;
    }
    ensureDataDir();
    if (fs.existsSync(secretFilePath)) {
      const stored = fs.readFileSync(secretFilePath, 'utf8').trim();
      if (stored.length >= 32) return stored;
    }
    const generated = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(secretFilePath, generated, { mode: 0o600 });
    return generated;
  }

  function readStore(): AdminStoreFile {
    ensureDataDir();
    if (!fs.existsSync(adminFilePath)) {
      return { admins: [] };
    }
    try {
      const raw = fs.readFileSync(adminFilePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<AdminStoreFile>;
      return {
        admins: Array.isArray(parsed.admins) ? parsed.admins : [],
      };
    } catch {
      return { admins: [] };
    }
  }

  function writeStore(store: AdminStoreFile): void {
    ensureDataDir();
    const tmpPath = `${adminFilePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), { mode: 0o600 });
    fs.renameSync(tmpPath, adminFilePath);
  }

  function bootstrapInitialAdminIfEmpty(): {
    bootstrapped: boolean;
    hasAdmin: boolean;
  } {
    const store = readStore();
    const envEmail = (options?.envEmail ?? process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
    const envPassword = (options?.envPassword ?? process.env.ADMIN_PASSWORD ?? '').trim();

    if (store.admins.length > 0) {
      if (
        envEmail &&
        envPassword &&
        !store.admins.some((a) => a.email.toLowerCase() === envEmail)
      ) {
        const timestamp = new Date(nowFn()).toISOString();
        const passwordHash = bcrypt.hashSync(envPassword, BCRYPT_ROUNDS);
        const username = envEmail.includes('@') ? envEmail.split('@')[0] : envEmail;
        const record: AdminAccountRecord = {
          id: `adm_${crypto.randomBytes(6).toString('hex')}`,
          email: envEmail,
          username: username || 'admin',
          passwordHash,
          role: 'admin',
          mustChangePassword: true,
          tokenVersion: 1,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        writeStore({ admins: [...store.admins, record] });
        return { bootstrapped: true, hasAdmin: true };
      }
      return { bootstrapped: false, hasAdmin: true };
    }

    if (!envEmail || !envPassword) {
      return { bootstrapped: false, hasAdmin: false };
    }

    const timestamp = new Date(nowFn()).toISOString();
    const passwordHash = bcrypt.hashSync(envPassword, BCRYPT_ROUNDS);
    const username = envEmail.includes('@') ? envEmail.split('@')[0] : envEmail;

    const record: AdminAccountRecord = {
      id: `adm_${crypto.randomBytes(6).toString('hex')}`,
      email: envEmail,
      username: username || 'admin',
      passwordHash,
      role: 'admin',
      mustChangePassword: true,
      tokenVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    writeStore({ admins: [record] });
    return { bootstrapped: true, hasAdmin: true };
  }

  function hasConfiguredAdmin(): boolean {
    const res = bootstrapInitialAdminIfEmpty();
    return res.hasAdmin;
  }

  function checkRateLimit(clientKey: string): {
    allowed: boolean;
    retryAfterSeconds: number;
  } {
    const now = nowFn();
    const entry = rateLimits.get(clientKey);
    if (!entry) return { allowed: true, retryAfterSeconds: 0 };

    if (entry.blockedUntil > now) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.blockedUntil - now) / 1000)),
      };
    }

    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimits.delete(clientKey);
      return { allowed: true, retryAfterSeconds: 0 };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }

  function recordFailedAttempt(clientKey: string): void {
    const now = nowFn();
    const existing = rateLimits.get(clientKey);
    if (!existing || now - existing.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimits.set(clientKey, {
        failures: 1,
        windowStart: now,
        blockedUntil: 0,
      });
      return;
    }

    const nextFailures = existing.failures + 1;
    rateLimits.set(clientKey, {
      failures: nextFailures,
      windowStart: existing.windowStart,
      blockedUntil:
        nextFailures >= RATE_LIMIT_MAX_ATTEMPTS ? now + RATE_LIMIT_WINDOW_MS : 0,
    });
  }

  function clearRateLimit(clientKey: string): void {
    rateLimits.delete(clientKey);
  }

  function signSessionToken(record: AdminAccountRecord, rememberMe: boolean): {
    token: string;
    maxAgeSeconds: number;
  } {
    const now = nowFn();
    const ttlMs = rememberMe ? REMEMBER_SESSION_MS : SHORT_SESSION_MS;
    const payload: AdminSessionPayload = {
      sub: record.id,
      email: record.email,
      username: record.username,
      role: record.role,
      tokenVersion: record.tokenVersion,
      iat: now,
      exp: now + ttlMs,
    };

    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const secret = resolveSessionSecret();
    const signature = base64UrlEncode(
      crypto.createHmac('sha256', secret).update(encodedPayload).digest()
    );
    return {
      token: `${encodedPayload}.${signature}`,
      maxAgeSeconds: Math.floor(ttlMs / 1000),
    };
  }

  function verifySessionToken(token: string | undefined): SafeAdminUser | null {
    if (!token || !token.includes('.')) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encodedPayload, providedSig] = parts;
    if (!encodedPayload || !providedSig) return null;

    const secret = resolveSessionSecret();
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', secret).update(encodedPayload).digest()
    );

    const a = Buffer.from(providedSig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    try {
      const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AdminSessionPayload;
      if (payload.role !== 'admin' || typeof payload.exp !== 'number') {
        return null;
      }
      if (nowFn() >= payload.exp) {
        return null;
      }
      const store = readStore();
      const admin = store.admins.find((item) => item.id === payload.sub);
      if (!admin || admin.tokenVersion !== payload.tokenVersion) {
        return null;
      }
      return toSafeAdminUser(admin);
    } catch {
      return null;
    }
  }

  async function authenticate(params: {
    identifier: string;
    password: string;
    rememberMe?: boolean;
    clientKey: string;
  }): Promise<
    | { ok: true; admin: SafeAdminUser; token: string; maxAgeSeconds: number }
    | { ok: false; status: number; error: string; retryAfterSeconds?: number; setupRequired?: boolean }
  > {
    const hasAdmin = hasConfiguredAdmin();
    if (!hasAdmin) {
      return {
        ok: false,
        status: 503,
        setupRequired: true,
        error:
          'Admin credentials are not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in your environment before signing in.',
      };
    }

    const rate = checkRateLimit(params.clientKey);
    if (!rate.allowed) {
      return {
        ok: false,
        status: 429,
        retryAfterSeconds: rate.retryAfterSeconds,
        error: `Too many failed login attempts. Try again in ${rate.retryAfterSeconds}s.`,
      };
    }

    const idClean = params.identifier.trim().toLowerCase();
    const pwd = params.password;
    if (!idClean || !pwd) {
      return {
        ok: false,
        status: 400,
        error: 'Email or username and password are required.',
      };
    }

    const store = readStore();
    const matched = store.admins.find(
      (a) => a.email.toLowerCase() === idClean || a.username.toLowerCase() === idClean
    );

    const passwordValid = matched
      ? await bcrypt.compare(pwd, matched.passwordHash)
      : false;

    if (!matched || !passwordValid) {
      recordFailedAttempt(params.clientKey);
      return {
        ok: false,
        status: 401,
        error: 'Invalid administrator credentials.',
      };
    }

    clearRateLimit(params.clientKey);
    const { token, maxAgeSeconds } = signSessionToken(
      matched,
      Boolean(params.rememberMe)
    );
    return {
      ok: true,
      admin: toSafeAdminUser(matched),
      token,
      maxAgeSeconds,
    };
  }

  async function changePassword(params: {
    adminId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<
    | { ok: true; admin: SafeAdminUser; token: string; maxAgeSeconds: number }
    | { ok: false; status: number; error: string }
  > {
    const newPwd = params.newPassword.trim();
    if (newPwd.length < 8) {
      return {
        ok: false,
        status: 400,
        error: 'New password must be at least 8 characters long.',
      };
    }

    const store = readStore();
    const index = store.admins.findIndex((a) => a.id === params.adminId);
    if (index === -1) {
      return { ok: false, status: 404, error: 'Administrator account not found.' };
    }

    const target = store.admins[index];
    const matchesCurrent = await bcrypt.compare(
      params.currentPassword,
      target.passwordHash
    );
    if (!matchesCurrent) {
      return { ok: false, status: 401, error: 'Current password is incorrect.' };
    }

    if (params.currentPassword === newPwd) {
      return {
        ok: false,
        status: 400,
        error: 'New password must be different from your current password.',
      };
    }

    const updated: AdminAccountRecord = {
      ...target,
      passwordHash: await bcrypt.hash(newPwd, BCRYPT_ROUNDS),
      mustChangePassword: false,
      tokenVersion: target.tokenVersion + 1,
      updatedAt: new Date(nowFn()).toISOString(),
    };

    store.admins[index] = updated;
    writeStore(store);

    const { token, maxAgeSeconds } = signSessionToken(updated, true);
    return {
      ok: true,
      admin: toSafeAdminUser(updated),
      token,
      maxAgeSeconds,
    };
  }

  function revokeAdminSession(adminId: string): void {
    const store = readStore();
    const index = store.admins.findIndex((a) => a.id === adminId);
    if (index === -1) return;
    const target = store.admins[index];
    store.admins[index] = {
      ...target,
      tokenVersion: target.tokenVersion + 1,
      updatedAt: new Date(nowFn()).toISOString(),
    };
    writeStore(store);
  }

  return {
    hasConfiguredAdmin,
    bootstrapInitialAdminIfEmpty,
    authenticate,
    verifySessionToken,
    changePassword,
    revokeAdminSession,
    checkRateLimit,
  };
}
