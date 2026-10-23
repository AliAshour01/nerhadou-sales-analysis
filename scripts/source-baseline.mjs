import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

// Private repository build inputs, never browser assets. These files are
// immutable baseline records; live edits/overrides remain in the existing D1.
export function materializeSources(root) {
  const dir = join(root, 'deployment', 'source-baseline');
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  if (manifest.format !== 'nerhadou-source-baseline-v1') throw Error('Unsupported source baseline.');
  const pending = [];
  for (const name of ['seed.json', 'data.json']) {
    const expected = manifest.files?.[name];
    if (!expected || !/^[a-f0-9]{64}$/.test(expected.sha256)) throw Error('Invalid source hash: ' + name);
    const target = join(root, 'private', name);
    const bytes = existsSync(target) ? readFileSync(target) : gunzipSync(readFileSync(join(dir, name + '.gz')), { maxOutputLength: 16 * 1024 * 1024 });
    if (createHash('sha256').update(bytes).digest('hex') !== expected.sha256 || bytes.length !== expected.bytes) throw Error('Source mismatch: ' + name + '. Existing files will not be overwritten.');
    JSON.parse(bytes.toString('utf8'));
    if (!existsSync(target)) pending.push([target, bytes]);
  }
  mkdirSync(join(root, 'private'), { recursive: true });
  for (const [target, bytes] of pending) writeFileSync(target, bytes, { flag: 'wx', mode: 0o600 });
  return { restored: pending.length, verified: 2 };
}
