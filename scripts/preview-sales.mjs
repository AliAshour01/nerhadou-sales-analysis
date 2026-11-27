// Local read-only preview of the Sales page with the baseline seed. Usage: node scripts/preview-sales.mjs  -> http://localhost:4173/
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const PUB=path.resolve('public'),SEED=path.resolve('private/seed.json');
const core=await import(path.join(PUB,'data-core.js'));
const seed=JSON.parse(fs.readFileSync(SEED,'utf8'));
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
http.createServer((req,res)=>{const u=new URL(req.url,'http://x');const j=o=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(o))};
 if(u.pathname==='/api/auth/me')return j({user:{id:'qa',email:'qa@local',name:'QA Owner',role:'owner',status:'active'},csrf:'x'});
 if(u.pathname==='/api/snapshot'){const y=u.searchParams.get('year');return j({...core.snapshotFrom(seed,{},y?{year:Number(y)}:{}),revision:0})}
 if(u.pathname==='/api/data')return j({seed,overrides:{},revision:0,updatedAt:null,isAdmin:true,audit:[]});
 if(u.pathname==='/api/revision')return j({revision:0});
 if(u.pathname.startsWith('/api/')){res.writeHead(404);return res.end('{}')}
 const f=path.join(PUB,u.pathname==='/'?'index.html':u.pathname);if(!f.startsWith(PUB)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end()}
 res.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res)}).listen(4173,()=>console.log('http://localhost:4173/'));
