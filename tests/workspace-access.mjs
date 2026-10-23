import assert from 'node:assert/strict';
for(const role of ['viewer','admin','owner']){
 const ownerNode={hidden:true},adminNode={hidden:true},notes={children:[],append(p){this.children.push(p)}};let calls=0;
 globalThis.document={querySelectorAll:s=>s==='[data-owner-only]'?[ownerNode]:[adminNode],getElementById:()=>notes,createElement:()=>({textContent:''})};
 const me={user:{role}};globalThis.window={nerhadouSecurity:{me,ready:Promise.resolve(me)},addEventListener(){}};
 globalThis.fetch=async path=>{calls++;assert.equal(role,'owner');assert.equal(path,'/api/owner/release-notes');return {ok:true,json:async()=>({notes:['UI02 preview']})}};
 await import('../public/workspace-access.js?role='+role);await new Promise(setImmediate);
 assert.equal(ownerNode.hidden,role!=='owner');assert.equal(adminNode.hidden,role==='viewer');assert.equal(calls,role==='owner'?1:0);assert.equal(notes.children.length,role==='owner'?1:0);
}
console.log('Workspace access passed: fail-closed owner notes, no viewer/admin fetch, role-based planning visibility.');
