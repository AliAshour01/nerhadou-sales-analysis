import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { materializeSources } from '../scripts/source-baseline.mjs';
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'nerhadou-baseline-'));
  const dir = join(root, 'deployment', 'source-baseline'); mkdirSync(dir, { recursive: true });
  const manifest = { format: 'nerhadou-source-baseline-v1', files: {} };
  for (const name of ['seed.json', 'data.json']) {
    const bytes = Buffer.from(JSON.stringify({ fixture: name, units: null, adjustment: -3, explicitZero: 0 }));
    writeFileSync(join(dir, name + '.gz'), gzipSync(bytes));
    manifest.files[name] = { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  }
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest));
  return { root, dir };
}
test('clean checkout restores exact JSON bytes and repeats without replacing files', () => {
  const { root } = fixture();
  try {
    assert.deepEqual(materializeSources(root), { restored: 2, verified: 2 });
    const before = readFileSync(join(root, 'private', 'seed.json'));
    assert.deepEqual(materializeSources(root), { restored: 0, verified: 2 });
    assert.deepEqual(readFileSync(join(root, 'private', 'seed.json')), before);
    assert.deepEqual(JSON.parse(before).units, null); assert.equal(JSON.parse(before).adjustment, -3);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('a changed existing source aborts without overwriting it', () => {
  const { root } = fixture();
  try {
    mkdirSync(join(root, 'private')); const filename = join(root, 'private', 'seed.json');
    writeFileSync(filename, '{"changed":true}'); assert.throws(() => materializeSources(root), /mismatch/);
    assert.equal(readFileSync(filename, 'utf8'), '{"changed":true}');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('corrupt or mismatched build inputs produce no partially restored private sources', () => {
  const { root, dir } = fixture();
  try {
    writeFileSync(join(dir, 'data.json.gz'), gzipSync(Buffer.from('{"tampered":true}')));
    assert.throws(() => materializeSources(root), /mismatch/);
    assert.equal(existsSync(join(root, 'private', 'seed.json')), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
