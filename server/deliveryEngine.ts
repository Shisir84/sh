import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  DeliveryAttemptLog,
  DeliveryQueueJob,
  OrderItem,
  OrderLineItem,
  ProductItem,
} from '../src/types/store.ts';
import { buildDeliveryCommands } from '../src/utils/storeLogic.ts';

export interface ServerIntegrationSecrets {
  pluginApiKey: string;
  rconHost: string;
  rconPort: number;
  rconPassword: string;
  updatedAt: string;
}

export function maskSecret(value: string, visibleTail = 4): string {
  const clean = String(value || '').trim();
  if (!clean) return 'Not configured';
  if (clean.length <= visibleTail + 2) return '*'.repeat(clean.length);
  return `${clean.slice(0, 4)}••••••••${clean.slice(-visibleTail)}`;
}

export function verifyTimingSafeKey(provided: string | undefined, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided.trim(), 'utf8');
  const b = Buffer.from(expected.trim(), 'utf8');
  if (a.length !== b.length || a.length === 0) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createSecretsManager(dataDir?: string) {
  const resolvedDir = dataDir || path.resolve(process.cwd(), '.data');
  const secretsPath = path.join(resolvedDir, 'server-secrets.json');

  function ensureDir() {
    if (!fs.existsSync(resolvedDir)) {
      fs.mkdirSync(resolvedDir, { recursive: true });
    }
  }

  function readSecrets(): ServerIntegrationSecrets {
    ensureDir();
    if (!fs.existsSync(secretsPath)) {
      const envKey = (process.env.MINECRAFT_PLUGIN_API_KEY || '').trim();
      const generated: ServerIntegrationSecrets = {
        pluginApiKey: envKey || `vlx_live_${crypto.randomBytes(20).toString('hex')}`,
        rconHost: '',
        rconPort: 25575,
        rconPassword: '',
        updatedAt: new Date().toISOString(),
      };
      writeSecrets(generated);
      return generated;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(secretsPath, 'utf8')) as Partial<ServerIntegrationSecrets>;
      const envKey = (process.env.MINECRAFT_PLUGIN_API_KEY || '').trim();
      return {
        pluginApiKey: envKey || parsed.pluginApiKey || `vlx_live_${crypto.randomBytes(20).toString('hex')}`,
        rconHost: typeof parsed.rconHost === 'string' ? parsed.rconHost : '',
        rconPort: typeof parsed.rconPort === 'number' && parsed.rconPort > 0 ? parsed.rconPort : 25575,
        rconPassword: typeof parsed.rconPassword === 'string' ? parsed.rconPassword : '',
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      };
    } catch {
      const fallback: ServerIntegrationSecrets = {
        pluginApiKey: `vlx_live_${crypto.randomBytes(20).toString('hex')}`,
        rconHost: '',
        rconPort: 25575,
        rconPassword: '',
        updatedAt: new Date().toISOString(),
      };
      writeSecrets(fallback);
      return fallback;
    }
  }

  function writeSecrets(next: ServerIntegrationSecrets): ServerIntegrationSecrets {
    ensureDir();
    const payload: ServerIntegrationSecrets = {
      ...next,
      updatedAt: new Date().toISOString(),
    };
    const tmp = `${secretsPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, secretsPath);
    return payload;
  }

  function rotatePluginKey(): { maskedKey: string; newPlaintextKey: string } {
    const current = readSecrets();
    const newPlaintextKey = `vlx_live_${crypto.randomBytes(20).toString('hex')}`;
    writeSecrets({ ...current, pluginApiKey: newPlaintextKey });
    return {
      maskedKey: maskSecret(newPlaintextKey, 6),
      newPlaintextKey,
    };
  }

  function updateRconConfig(params: { host?: string; port?: number; password?: string }) {
    const current = readSecrets();
    const updated = writeSecrets({
      ...current,
      ...(params.host !== undefined ? { rconHost: params.host.trim().slice(0, 120) } : {}),
      ...(params.port !== undefined && Number.isFinite(params.port)
        ? { rconPort: Math.max(1, Math.min(65535, Math.round(params.port))) }
        : {}),
      ...(params.password !== undefined && params.password.trim().length > 0
        ? { rconPassword: params.password.trim() }
        : {}),
    });
    return {
      rconConfigured: Boolean(updated.rconHost && updated.rconPassword),
      rconHostMasked: updated.rconHost ? maskSecret(updated.rconHost, 4) : 'Not configured',
      rconPort: updated.rconPort,
    };
  }

  return {
    readSecrets,
    rotatePluginKey,
    updateRconConfig,
    verifyPluginKey: (provided: string | undefined) => verifyTimingSafeKey(provided, readSecrets().pluginApiKey),
  };
}

export function enqueueDeliveriesForOrder(params: {
  order: OrderItem;
  products: ProductItem[];
  existingJobs: DeliveryQueueJob[];
  existingLogs: DeliveryAttemptLog[];
  now?: string;
}): {
  jobs: DeliveryQueueJob[];
  logs: DeliveryAttemptLog[];
  createdCount: number;
} {
  const now = params.now || new Date().toISOString();
  const productById = new Map(params.products.map((p) => [p.id, p]));
  const lines: OrderLineItem[] =
    Array.isArray(params.order.items) && params.order.items.length > 0
      ? params.order.items
      : [
          {
            productId: params.order.productId,
            productName: params.order.productName,
            quantity: 1,
            priceInr: params.order.amountInr,
          },
        ];

  const nextJobs = [...params.existingJobs];
  const nextLogs = [...params.existingLogs];
  let createdCount = 0;

  for (const line of lines) {
    const duplicateExists = nextJobs.some(
      (j) => j.orderId === params.order.id && j.productId === line.productId
    );
    if (duplicateExists) continue;

    const prod = productById.get(line.productId);
    const commands = buildDeliveryCommands(
      prod || {
        id: line.productId,
        name: line.productName,
        category: 'Items',
        deliveryCommands: undefined,
      },
      params.order.minecraftUsername,
      line.quantity
    );

    const job: DeliveryQueueJob = {
      id: `dlv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      orderId: params.order.id,
      productId: line.productId,
      productName: line.productName,
      minecraftUsername: params.order.minecraftUsername,
      quantity: Math.max(1, Math.round(line.quantity)),
      commands,
      status: 'Queued',
      attempts: 0,
      maxAttempts: 5,
      createdAt: now,
      updatedAt: now,
    };

    const log: DeliveryAttemptLog = {
      id: `dlog_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      jobId: job.id,
      orderId: job.orderId,
      minecraftUsername: job.minecraftUsername,
      productName: job.productName,
      commands: job.commands,
      outcome: 'queued',
      channel: 'plugin',
      message: `Queued ${job.commands.length} delivery command(s) for ${job.minecraftUsername}`,
      createdAt: now,
    };

    nextJobs.unshift(job);
    nextLogs.unshift(log);
    createdCount += 1;
  }

  return {
    jobs: nextJobs.slice(0, 500),
    logs: nextLogs.slice(0, 500),
    createdCount,
  };
}

export function claimQueuedDeliveries(
  jobs: DeliveryQueueJob[],
  limit = 10,
  now = new Date().toISOString()
): {
  claimed: DeliveryQueueJob[];
  jobs: DeliveryQueueJob[];
} {
  const safeLimit = Math.max(1, Math.min(25, Math.round(limit)));
  const claimedIds = new Set<string>();
  const claimed: DeliveryQueueJob[] = [];

  for (const job of jobs) {
    if (claimed.length >= safeLimit) break;
    if (job.status === 'Queued') {
      claimedIds.add(job.id);
      claimed.push({
        ...job,
        status: 'Processing',
        attempts: job.attempts + 1,
        updatedAt: now,
      });
    }
  }

  const nextJobs = jobs.map((job) => {
    if (!claimedIds.has(job.id)) return job;
    return claimed.find((c) => c.id === job.id) || job;
  });

  return { claimed, jobs: nextJobs };
}

export function applyDeliveryAcknowledgement(params: {
  jobs: DeliveryQueueJob[];
  logs: DeliveryAttemptLog[];
  jobId: string;
  success: boolean;
  channel?: 'plugin' | 'manual' | 'rcon';
  message?: string;
  now?: string;
}): {
  updatedJob: DeliveryQueueJob | null;
  jobs: DeliveryQueueJob[];
  logs: DeliveryAttemptLog[];
  orderFullyDelivered: boolean;
} {
  const now = params.now || new Date().toISOString();
  const channel = params.channel || 'plugin';
  const idx = params.jobs.findIndex((j) => j.id === params.jobId);
  if (idx === -1) {
    return {
      updatedJob: null,
      jobs: params.jobs,
      logs: params.logs,
      orderFullyDelivered: false,
    };
  }

  const current = params.jobs[idx];
  if (current.status === 'Delivered') {
    return {
      updatedJob: current,
      jobs: params.jobs,
      logs: params.logs,
      orderFullyDelivered: params.jobs
        .filter((j) => j.orderId === current.orderId)
        .every((j) => j.status === 'Delivered'),
    };
  }

  let nextStatus: DeliveryQueueJob['status'];
  if (params.success) {
    nextStatus = 'Delivered';
  } else if (current.attempts < current.maxAttempts) {
    nextStatus = 'Queued';
  } else {
    nextStatus = 'Failed';
  }

  const updatedJob: DeliveryQueueJob = {
    ...current,
    status: nextStatus,
    updatedAt: now,
    ...(params.success
      ? { deliveredAt: now, deliveredBy: channel, lastError: undefined }
      : { lastError: params.message || 'Minecraft plugin failed to dispatch command.' }),
  };

  const nextJobs = [...params.jobs];
  nextJobs[idx] = updatedJob;

  const log: DeliveryAttemptLog = {
    id: `dlog_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    jobId: updatedJob.id,
    orderId: updatedJob.orderId,
    minecraftUsername: updatedJob.minecraftUsername,
    productName: updatedJob.productName,
    commands: updatedJob.commands,
    outcome: params.success ? 'success' : 'failed',
    channel,
    message:
      params.message ||
      (params.success
        ? `Delivered via ${channel} to ${updatedJob.minecraftUsername}`
        : `Delivery attempt #${updatedJob.attempts} failed`),
    createdAt: now,
  };

  const orderJobs = nextJobs.filter((j) => j.orderId === updatedJob.orderId);
  const orderFullyDelivered = orderJobs.length > 0 && orderJobs.every((j) => j.status === 'Delivered');

  return {
    updatedJob,
    jobs: nextJobs,
    logs: [log, ...params.logs].slice(0, 500),
    orderFullyDelivered,
  };
}
