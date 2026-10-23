import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deploymentConfig } from '../scripts/cloudflare-config.mjs';
const valid = () => ({ name: 'sales', vars: { AUTH_MODE: 'standalone', AUTH_SETUP_VERIFIED: 'true', AUTH_OWNER_SETUP: 'false', APP_ORIGIN: 'https://sales.nerhadou.workers.dev' }, d1_databases: [{ binding: 'DB', database_id: '12345678-1234-4321-8123-123456789abc' }], durable_objects: { bindings: [{ name: 'AUTH_RATE_LIMITER', class_name: 'AuthRateLimiter' }] } });
test('preserves explicit identity and bindings, enforces Worker-first assets', () => {
  const input = valid(); input.assets = { run_worker_first: false }; input.compatibility_flags = ['nodejs_compat'];
  const result = deploymentConfig(JSON.stringify(input));
  assert.equal(result.name, input.name); assert.deepEqual(result.d1_databases, input.d1_databases);
  assert.equal(result.assets.run_worker_first, true); assert.equal(result.keep_vars, true);
  assert.deepEqual(result.compatibility_flags, ['nodejs_compat']);
});
test('missing or malformed deployment inputs fail closed', () => {
  for (const input of [undefined, '{', 'null', '[]', '{}']) assert.throws(() => deploymentConfig(input));
});
test('rejects platform mode, active owner setup and incomplete activation', () => {
  for (const [key, value] of [['AUTH_MODE', 'platform'], ['AUTH_OWNER_SETUP', 'true'], ['AUTH_SETUP_VERIFIED', 'false']]) {
    const input = valid(); input.vars[key] = value; assert.throws(() => deploymentConfig(JSON.stringify(input)));
  }
});
test('rejects unsafe origins, secrets and placeholder storage', () => {
  for (const origin of ['http://sales.nerhadou.workers.dev', 'https://sales.nerhadou.workers.dev/path', 'https://example.chatgpt.site']) { const input = valid(); input.vars.APP_ORIGIN = origin; assert.throws(() => deploymentConfig(JSON.stringify(input))); }
  const input = valid(); input.vars.SESSION_ENCRYPTION_KEY = 'do-not-store'; assert.throws(() => deploymentConfig(JSON.stringify(input)));
  const missing = valid(); missing.d1_databases = []; assert.throws(() => deploymentConfig(JSON.stringify(missing)));
  const placeholder = valid(); placeholder.d1_databases[0].database_id = '00000000-0000-4000-8000-000000000000'; assert.throws(() => deploymentConfig(JSON.stringify(placeholder)));
});
test('requires rate limiting and rejects platform services', () => {
  const input = valid(); delete input.durable_objects; assert.throws(() => deploymentConfig(JSON.stringify(input)));
  const platform = valid(); platform.services = [{ binding: 'CONNECTORS', service: 'platform' }]; assert.throws(() => deploymentConfig(JSON.stringify(platform)));
});
