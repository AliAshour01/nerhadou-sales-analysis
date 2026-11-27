// V78 October-import fixes: imported spellings join their product, tender stays a separate product, "Pharma" is PHARMA,
// a missing line is filled from the product's single line in the same year, and new import series carry comparison_product.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { comparisonProduct, canonicalProductName, dashboardRecords } from '../public/compare-core.js';
import { effectiveRecords, previewImport } from '../public/data-core.js';

const imported = (product, extra = {}) => ({ product, channel: 'COMBINED / SOURCE', distributor: 'NOT PROVIDED', line: 'NOT PROVIDED', dataset: 'actual', year: 2026, month: 10, ...extra });

// Same product, different spelling (October 2026 import names).
for (const [name, key] of [
  ['Methyltechno', 'METHYLTECHNO'],
  ['MELACRYST 3 MG', 'MELACRYST 3MG'],
  ['MELACRYST 1.5 MG', 'MELACRYST 1.5MG'],
  ['MECLIZIGO 25 MG', 'MECLIZIGO 25MG'],
  ['Vita D3', 'VITA D3'],
  ['TeliTroph', 'TELITROPH'],
  ['NERHAFLUX 20MG', 'NERHAFLUKS 20MG'],
  ['NERHAFLUX 20MG-10 Film', 'NERHAFLUKS 20MG'],
  ['NERHAFLUX 40MG', 'NERHAFLUKS 40MG'],
  ['TADANERFI 5MG - 20 FILM', 'TADANERFI 5MG'],
  ['TADANERFI 5MG - 30 FILM', 'TADANERFI 5MG'],
  ['NOPYRETRON  125 MG 10  O. D.  FILM', 'NOPYRETRON 125MG'],
  ['Ferrotron Fort', 'FERROTRON FORT'],
]) assert.equal(comparisonProduct(imported(name)), key, name);

// Tender is never merged with the regular product.
for (const [name, key] of [
  ['Methyltechno - TENDER', 'METHYLTECHNO - TENDER'],
  ['MECLIZIGO 25 MG - Tender', 'MECLIZIGO 25MG - TENDER'],
  ['MELACRYST 3 MG - Tender', 'MELACRYST 3MG - TENDER'],
  ['TADANERFI 5MG - 30 FILM -Tender', 'TADANERFI 5MG - TENDER'],
  ['ONDALENZ 4MG - TENDER', 'ONDALENZ 4MG - TENDER'],
]) assert.equal(comparisonProduct(imported(name)), key, name);
assert.notEqual(comparisonProduct(imported('MECLIZIGO 25 MG')), comparisonProduct(imported('MECLIZIGO 25 MG - Tender')));
assert.equal(canonicalProductName('  calcitron '), 'CALCITRON');

const seed = JSON.parse(fs.readFileSync('private/seed.json', 'utf8'));
// Reviewed keys (records with comparison_product) are not re-spelled: 'NERHASILDA 25MG' stays as stored.
assert.equal(comparisonProduct({ product: 'NERHASILDA 25 MG 16 FILM', comparison_product: 'NERHASILDA 25MG', channel: 'PRIVATE' }), 'NERHASILDA 25MG');

// Dashboard records: one PHARMA, one unknown-line spelling, October line filled from the product's 2026 line.
const rows = [
  { dataset: 'actual', year: 2026, month: 8, product: 'CALCITRON', comparison_product: 'CALCITRON', distributor: 'PHARMA', line: 'Endocrinology line', units: 1 },
  { dataset: 'actual', year: 2026, month: 9, product: 'CALCITRON', comparison_product: 'CALCITRON', distributor: 'Pharma', line: 'Endocrinology line', units: 1 },
  imported('CALCITRON'),
  imported('CALCITRON - Tender'),
  { dataset: 'actual', year: 2026, month: 8, product: 'X 5MG', comparison_product: 'X 5MG', distributor: 'EGY', line: 'OTC Line', units: 1 },
  { dataset: 'actual', year: 2026, month: 8, product: 'X 5MG', comparison_product: 'X 5MG', distributor: 'EGY', line: 'Andrology line', units: 1 },
  imported('X 5MG'),
];
const out = dashboardRecords(rows);
assert.deepEqual([...new Set(out.map((r) => r.distributor))].sort(), ['EGY', 'NOT PROVIDED', 'PHARMA']);
assert.equal(out[2].line, 'Endocrinology line');
assert.equal(out[2].line_inferred, true);
assert.equal(out[3].line, 'Not provided', 'tender has its own line history; none here');
assert.equal(out[6].line, 'Not provided', 'two lines in the year: not guessed');
assert.equal(rows[2].line, 'NOT PROVIDED', 'input records are not changed');
assert.equal(dashboardRecords(rows), out, 'cached per records array');

// New import series carry their comparison product, tender kept separate.
const preview = previewImport('product,channel,distributor,line,year,month,units,value\nMethyltechno,COMBINED / SOURCE,NOT PROVIDED,NOT PROVIDED,2026,11,10,100\nMECLIZIGO 25 MG - Tender,COMBINED / SOURCE,NOT PROVIDED,NOT PROVIDED,2026,11,5,50', seed, {});
assert.deepEqual(preview.errors, []);
const keys = [...new Set(preview.changes.map((c) => c.record?.series_id?.startsWith('CUSTOM_IMPORT_') && c.record.comparison_product).filter(Boolean))];
assert.deepEqual(keys, ['METHYLTECHNO', 'MECLIZIGO 25MG - TENDER']);

// End to end on the baseline: no two products share a display spelling after an October-style import.
const overrides = {};
for (const [i, p] of ['Methyltechno', 'Methyltechno - TENDER', 'MELACRYST 3 MG', 'Vita D3', 'NERHAFLUX 40MG'].entries()) {
  const sid = 'CUSTOM_IMPORT_v78test' + i;
  overrides[sid + '-2026-10-actual'] = { fields: { units: 10, value: 100 }, record: { ...imported(p), id: sid + '-2026-10-actual', series_id: sid, product_id: sid, units: null, value: null, estimated: [] } };
}
const recs = dashboardRecords(effectiveRecords(seed, overrides)).filter((r) => r.dataset === 'actual' && r.year === 2026);
const keysByTidy = new Map();
for (const r of recs) {
  const k = comparisonProduct(r), t = canonicalProductName(k);
  if (!keysByTidy.has(t)) keysByTidy.set(t, new Set());
  keysByTidy.get(t).add(k);
}
for (const [t, ks] of keysByTidy) assert.equal(ks.size, 1, t + ': ' + [...ks].join(' | '));
console.log('sales-v78 ok');
