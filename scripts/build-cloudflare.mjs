import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { deploymentConfig } from './cloudflare-config.mjs';
import { materializeSources } from './source-baseline.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
// This ignored file is optional; CI uses an explicit build variable instead.
if (!process.env.NERHADOU_DEPLOYMENT_CONFIG && existsSync('deployment/runtime.json')) {
  process.env.NERHADOU_DEPLOYMENT_CONFIG = readFileSync('deployment/runtime.json', 'utf8');
}
if (!process.env.NERHADOU_DEPLOYMENT_CONFIG) {
  process.env.NERHADOU_DEPLOYMENT_CONFIG = readFileSync('deployment/worker.production.json', 'utf8');
}
deploymentConfig(process.env.NERHADOU_DEPLOYMENT_CONFIG);
materializeSources(root);
for (const file of ['private/seed.json', 'private/data.json']) {
  if (!existsSync(file)) throw Error(`${file} is missing. Supply the protected original build input; do not generate substitute sales.`);
  JSON.parse(readFileSync(file, 'utf8'));
}
const env = { ...process.env, NERHADOU_STANDALONE_BUILD: '1' };
const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
for (const args of [
  ['--test', 'tests/cloudflare-config.mjs', 'tests/source-baseline.mjs'],
  ['tests/management.mjs'],
  [vite, 'build'],
  ['scripts/release-gate.mjs'],
  ['tests/security/worker.mjs'],
]) {
  const result = spawnSync(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('Standalone build and private-artifact checks passed. No deployment or database changes were performed.');
