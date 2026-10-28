import assert from 'node:assert/strict';
import {build} from 'esbuild';
const output=await build({entryPoints:['lib/security/guard.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {principal}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const origins=['https://nerhadou-commercial-hub.royal-fly-3435.chatgpt.site','https://nerhadou-commercial-hub.ali-ashour01.chatgpt.site'];
const headers={'oai-authenticated-user-id':'private-owner','oai-authenticated-user-email':'ali.ashour01@gmail.com'};
for(const APP_ORIGIN of origins){
 const env={AUTH_MODE:'platform',APP_ORIGIN,PLATFORM_OWNER_EMAIL:'ali.ashour01@gmail.com'};
 assert.equal((await principal(new Request(APP_ORIGIN+'/api/auth/me',{headers}),env)).role,'owner');
 await assert.rejects(()=>principal(new Request(APP_ORIGIN+'/api/auth/me'),env),e=>e.status===401);
 await assert.rejects(()=>principal(new Request('https://sales.nerhadou.workers.dev/api/auth/me',{headers}),env),e=>e.status===403);
}
const unknown='https://unrelated.chatgpt.site';
await assert.rejects(()=>principal(new Request(unknown+'/api/auth/me',{headers}),{AUTH_MODE:'platform',APP_ORIGIN:unknown}),e=>e.status===503);
await assert.rejects(()=>principal(new Request(origins[1]+'/api/auth/me',{headers}),{AUTH_MODE:'standalone',APP_ORIGIN:origins[1]}));
console.log('PASS: verified preview origins, missing identity, exact request origin, unknown preview denial and standalone fail-closed');
