import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  applyDeliveryAcknowledgement,
  claimQueuedDeliveries,
  createSecretsManager,
  enqueueDeliveriesForOrder,
  maskSecret,
  verifyTimingSafeKey,
} from './deliveryEngine.ts';
import { DEFAULT_PRODUCTS } from '../src/data/seedData.ts';
import type { OrderItem } from '../src/types/store.ts';

describe('deliveryEngine', () => {
  const sampleOrder: OrderItem = {
    id: 'ORD-DELIVERY-1',
    userId: 'user-1',
    minecraftUsername: 'Shisir',
    productId: 'obsidian-starter-bundle',
    productName: 'CITADEL ROYAL BUNDLE',
    items: [
      {
        productId: 'obsidian-starter-bundle',
        productName: 'CITADEL ROYAL BUNDLE',
        quantity: 1,
        priceInr: 849,
      },
      {
        productId: 'enchanted-key-pack',
        productName: 'ENCHANTED KEY x5',
        quantity: 2,
        priceInr: 149,
      },
    ],
    amountInr: 1147,
    paymentMethodId: 'esewa',
    paymentMethodName: 'eSewa',
    paymentProofUrl: 'data:image/png;base64,A',
    status: 'Approved',
  };

  it('enqueues idempotently without duplicating existing order line items', () => {
    const first = enqueueDeliveriesForOrder({
      order: sampleOrder,
      products: DEFAULT_PRODUCTS,
      existingJobs: [],
      existingLogs: [],
      now: '2026-11-20T12:00:00.000Z',
    });

    assert.equal(first.createdCount, 2);
    assert.equal(first.jobs.length, 2);
    assert.ok(first.jobs.some((j) => j.commands.includes('lp user Shisir parent set vip')));

    const second = enqueueDeliveriesForOrder({
      order: sampleOrder,
      products: DEFAULT_PRODUCTS,
      existingJobs: first.jobs,
      existingLogs: first.logs,
    });
    assert.equal(second.createdCount, 0);
    assert.equal(second.jobs.length, 2);
  });

  it('claims queued jobs, retries failed attempts until maxAttempts, and completes order when all items succeed', () => {
    const queued = enqueueDeliveriesForOrder({
      order: sampleOrder,
      products: DEFAULT_PRODUCTS,
      existingJobs: [],
      existingLogs: [],
    });

    const claimed = claimQueuedDeliveries(queued.jobs, 5);
    assert.equal(claimed.claimed.length, 2);
    assert.equal(claimed.claimed[0].status, 'Processing');
    assert.equal(claimed.claimed[0].attempts, 1);

    // Fail first job once -> returns to Queued for retry
    const failedOnce = applyDeliveryAcknowledgement({
      jobs: claimed.jobs,
      logs: queued.logs,
      jobId: claimed.claimed[0].id,
      success: false,
      message: 'Player offline',
    });
    assert.equal(failedOnce.updatedJob?.status, 'Queued');
    assert.equal(failedOnce.orderFullyDelivered, false);

    // Succeed both jobs
    const done1 = applyDeliveryAcknowledgement({
      jobs: failedOnce.jobs,
      logs: failedOnce.logs,
      jobId: claimed.claimed[0].id,
      success: true,
      channel: 'manual',
    });
    assert.equal(done1.orderFullyDelivered, false);

    const done2 = applyDeliveryAcknowledgement({
      jobs: done1.jobs,
      logs: done1.logs,
      jobId: claimed.claimed[1].id,
      success: true,
      channel: 'plugin',
    });
    assert.equal(done2.orderFullyDelivered, true);
  });

  it('manages masked plugin secrets and timing-safe key verification', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'volex-secrets-'));
    try {
      const mgr = createSecretsManager(tmpDir);
      const initial = mgr.readSecrets();
      assert.ok(initial.pluginApiKey.startsWith('vlx_live_'));
      assert.equal(mgr.verifyPluginKey(initial.pluginApiKey), true);
      assert.equal(mgr.verifyPluginKey('wrong_key'), false);
      assert.equal(verifyTimingSafeKey('abc', 'abcd'), false);

      const rotated = mgr.rotatePluginKey();
      assert.notEqual(rotated.newPlaintextKey, initial.pluginApiKey);
      assert.equal(mgr.verifyPluginKey(initial.pluginApiKey), false);
      assert.equal(mgr.verifyPluginKey(rotated.newPlaintextKey), true);
      assert.match(maskSecret(rotated.newPlaintextKey, 4), /••••••••/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
