// One release/cache configuration; run before packaging. --check is read-only.
import fs from 'node:fs';
import path from 'node:path';
const release=JSON.parse(fs.readFileSync('release.config.json','utf8'));
const check=process.argv.includes('--check');let changed=0;
function visit(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())visit(file);else if(item.name.endsWith('.html')||['management.js','comparison.js','breakdown.js'].includes(item.name)){
 const old=fs.readFileSync(file,'utf8');let next=old;
 if(item.name.endsWith('.html'))next=next.replace(/((?:src|href)="[^"?]+\.(?:js|css|png)\?v=)[^"&]+/g,'$1'+release.assetToken);
 else next=next.replace(/(from\s+['"][^'"?]+\.js\?v=)[^'"]+/g,'$1'+release.assetToken);
 if(file==='public/index.html')next=next.replace(/V\d+ · Release \d{4}-\d{2}-\d{2}/g,`V${release.version} · Release ${release.date}`);
 if(next!==old){changed++;if(!check)fs.writeFileSync(file,next);}
}}}
visit('public');
if(check&&changed)throw Error(changed+' release assets out of sync; run node scripts/sync-release.mjs');
console.log(`V${release.version} release/cache ${check?'check passed':'synchronised'} (${changed} files).`);
