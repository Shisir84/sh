import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createAdminAuthManager } from './adminAuth.ts';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'volexmc-admin-test-'));
}

test('does not create insecure default admin when env vars are missing', async () => {
  const dir = makeTempDir();
  const manager = createAdminAuthManager({
    dataDir: dir,
    sessionSecret: 'test-session-secret-123456',
    envEmail: '',
    envPassword: '',
  });

  assert.equal(manager.hasConfiguredAdmin(), false);
  const res = await manager.authenticate({
    identifier: 'admin@volexmc.net',
    password: 'password123',
    clientKey: '127.0.0.1',
  });
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.status, 503);
    assert.equal(res.setupRequired, true);
  }
});

test('bootstraps initial admin from env with bcrypt hash and never stores plaintext', async () => {
  const dir = makeTempDir();
  const secretPwd = 'VolexSuperSecret!99';
  const manager = createAdminAuthManager({
    dataDir: dir,
    sessionSecret: 'test-session-secret-123456',
    envEmail: 'owner@volexmc.net',
    envPassword: secretPwd,
  });

  assert.equal(manager.hasConfiguredAdmin(), true);
  const rawFile = fs.readFileSync(path.join(dir, 'admin-auth.json'), 'utf8');
  assert.equal(rawFile.includes(secretPwd), false);
  assert.equal(rawFile.includes('$2'), true);

  const login = await manager.authenticate({
    identifier: 'owner@volexmc.net',
    password: secretPwd,
    rememberMe: true,
    clientKey: '10.0.0.1',
  });
  assert.equal(login.ok, true);
  if (login.ok) {
    assert.equal(login.admin.email, 'owner@volexmc.net');
    assert.equal(login.admin.mustChangePassword, true);
    assert.equal('passwordHash' in login.admin, false);

    const verified = manager.verifySessionToken(login.token);
    assert.ok(verified);
    assert.equal(verified.email, 'owner@volexmc.net');
  }
});

test('rate limits repeated failed login attempts per IP', async () => {
  const dir = makeTempDir();
  const manager = createAdminAuthManager({
    dataDir: dir,
    sessionSecret: 'test-session-secret-123456',
    envEmail: 'owner@volexmc.net',
    envPassword: 'ValidPassword#1',
  });

  for (let i = 0; i < 5; i += 1) {
    const attempt = await manager.authenticate({
      identifier: 'owner@volexmc.net',
      password: 'WrongPassword',
      clientKey: '192.168.1.42',
    });
    assert.equal(attempt.ok, false);
    if (!attempt.ok) assert.equal(attempt.status, 401);
  }

  const locked = await manager.authenticate({
    identifier: 'owner@volexmc.net',
    password: 'ValidPassword#1',
    clientKey: '192.168.1.42',
  });
  assert.equal(locked.ok, false);
  if (!locked.ok) {
    assert.equal(locked.status, 429);
    assert.ok((locked.retryAfterSeconds || 0) > 0);
  }
});

test('changePassword clears mustChangePassword and invalidates older tokens', async () => {
  const dir = makeTempDir();
  const manager = createAdminAuthManager({
    dataDir: dir,
    sessionSecret: 'test-session-secret-123456',
    envEmail: 'owner@volexmc.net',
    envPassword: 'InitialPassword#1',
  });

  const login = await manager.authenticate({
    identifier: 'owner@volexmc.net',
    password: 'InitialPassword#1',
    clientKey: '127.0.0.2',
  });
  assert.equal(login.ok, true);
  if (!login.ok) return;

  const oldToken = login.token;
  const changed = await manager.changePassword({
    adminId: login.admin.id,
    currentPassword: 'InitialPassword#1',
    newPassword: 'RotatedStrongPassword!22',
  });
  assert.equal(changed.ok, true);
  if (!changed.ok) return;

  assert.equal(changed.admin.mustChangePassword, false);
  assert.equal(manager.verifySessionToken(oldToken), null);
  assert.ok(manager.verifySessionToken(changed.token));
});

test('revokeAdminSession invalidates active tokens upon logout', async () => {
  const dir = makeTempDir();
  const manager = createAdminAuthManager({
    dataDir: dir,
    sessionSecret: 'test-session-secret-123456',
    envEmail: 'owner@volexmc.net',
    envPassword: 'ValidPassword#1',
  });

  const login = await manager.authenticate({
    identifier: 'owner@volexmc.net',
    password: 'ValidPassword#1',
    clientKey: '127.0.0.3',
  });
  assert.equal(login.ok, true);
  if (!login.ok) return;

  assert.ok(manager.verifySessionToken(login.token));
  manager.revokeAdminSession(login.admin.id);
  assert.equal(manager.verifySessionToken(login.token), null);
});

