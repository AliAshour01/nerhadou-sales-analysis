// Visibility derives from the server-verified identity; release text is fetched only for the owner.
const ready=window.nerhadouSecurity?.ready;
function apply(){const role=window.nerhadouSecurity?.me?.user?.role;document.querySelectorAll('[data-owner-only]').forEach(n=>n.hidden=role!=='owner');document.querySelectorAll('[data-admin-only]').forEach(n=>n.hidden=!['owner','admin'].includes(role))}
window.updateWorkspaceVisibility=apply;
if(ready)ready.then(async me=>{apply();if(me?.user?.role!=='owner')return;try{const r=await fetch('/api/owner/release-notes',{cache:'no-store'});if(!r.ok)return;const {notes}=await r.json(),container=document.getElementById('release-notes');for(const text of notes){const p=document.createElement('p');p.textContent=text;container.append(p)}}catch{/* Optional owner details must never block the dashboard. */}});
window.addEventListener('commercial:data',apply);
