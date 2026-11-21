import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStoreStatePersistence } from './storeState';

function withTempDir(fn: (dir: string) => void) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'volex-store-state-'));
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('saveWebsiteDraft keeps draft isolated from public payload until publishWebsiteDraft', () => {
  withTempDir((dir) => {
    const store = createStoreStatePersistence(dir);

    // 1. Save draft — public payload must NOT expose websiteDraft or update websitePublished
    store.saveWebsiteDraft({
      heroTitle: 'DRAFT KINGDOM',
      heroSubtitle: 'UNPUBLISHED PREVIEW',
    });

    const publicBeforePublish = store.getPublicPayload();
    assert.equal(publicBeforePublish.websitePublished, null);
    assert.equal('websiteDraft' in publicBeforePublish, false);

    // 2. Publish — now public payload exposes websitePublished AND syncs siteConfig heroTitle
    store.publishWebsiteDraft();
    const publicAfterPublish = store.getPublicPayload();
    assert.equal(
      (publicAfterPublish.websitePublished as Record<string, unknown>)?.heroTitle,
      'DRAFT KINGDOM'
    );
    assert.equal(
      (publicAfterPublish.siteConfig as Record<string, unknown>)?.heroTitle,
      'DRAFT KINGDOM'
    );

    // 3. Edit draft again, then discard — draft must revert to published heroTitle
    store.saveWebsiteDraft({ heroTitle: 'TEMPORARY EXPERIMENT' });
    assert.equal(
      (store.readState().websiteDraft as Record<string, unknown>)?.heroTitle,
      'TEMPORARY EXPERIMENT'
    );

    store.discardWebsiteDraft();
    assert.equal(
      (store.readState().websiteDraft as Record<string, unknown>)?.heroTitle,
      'DRAFT KINGDOM'
    );
  });
});

test('appendActivityLog persists newest entries first and caps at 250 logs', () => {
  withTempDir((dir) => {
    const store = createStoreStatePersistence(dir);
    for (let i = 1; i <= 255; i += 1) {
      store.appendActivityLog({
        actorEmail: 'admin@volexmc.gg',
        action: 'TEST_ACTION',
        target: `item-${i}`,
        details: `Action ${i}`,
      });
    }
    const logs = store.readState().activityLogs;
    assert.equal(logs.length, 250);
    assert.equal(logs[0].target, 'item-255');
    assert.equal(logs[logs.length - 1].target, 'item-6');
  });
});
