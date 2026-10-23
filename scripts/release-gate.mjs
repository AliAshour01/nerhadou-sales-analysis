import fs from 'node:fs';import assert from 'node:assert/strict';
const root='dist/client';assert(fs.existsSync(root),'Build first');const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);const files=walk(root);
assert(!files.some(p=>/\/(seed|data)\.json$/.test(p)),'Sales source files must not be public');assert(!files.some(p=>p.endsWith('.map')),'Public source maps are forbidden');
const seed=JSON.parse(fs.readFileSync('private/seed.json'));const forbidden=JSON.stringify(seed.records.slice(0,3));for(const p of files.filter(p=>/\.(js|html|json)$/.test(p))){const text=fs.readFileSync(p,'utf8');assert(!text.includes(forbidden),'Sales source embedded in '+p);assert(!/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["']eyJ/.test(text),'Service-role key leaked')}
const config=JSON.parse(fs.readFileSync('dist/server/wrangler.json'));assert.equal(config.assets.run_worker_first,true,'All static assets must pass the security boundary');
console.log('Built-artifact gate passed: no public sales JSON, source maps or embedded source sample; Worker runs before static assets.');
