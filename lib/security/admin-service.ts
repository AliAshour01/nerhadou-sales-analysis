import { createClient } from '@supabase/supabase-js';
import { revokeAll } from './store';
import { origin } from './config';
import { z } from 'zod';
import { deliverNotifications } from './notifications';
import { administrator } from './guard';
import { body, response, failure, SecurityError } from './config';
const change = z.object({ id: z.string().min(1).max(128), version: z.number().int().positive(), action: z.enum(['approve', 'reject', 'suspend', 'reactivate', 'make-admin', 'make-viewer', 'delete-account', 'reset-link']), note: z.string().trim().max(500).default('') }).strict();
export async function usersGet(request: Request, env: any) { try { const actor = await administrator(request, env); const status = new URL(request.url).searchParams.get('status'); if (status && !['pending', 'active', 'rejected', 'suspended'].includes(status)) throw new SecurityError(400, 'Invalid status.'); const rows = await env.DB.prepare(`SELECT id,email,name,role,status,version,created_at,reviewed_at,(SELECT MAX(last_seen) FROM app_sessions WHERE user_id=app_users.id) AS last_seen,(SELECT MAX(last_seen) FROM app_sessions WHERE user_id=app_users.id AND revoked_at IS NULL AND expires_at>${Date.now()}) AS online_seen FROM app_users` + (status ? ' WHERE status=?' : '') + ' ORDER BY created_at DESC LIMIT 500').bind(...(status ? [status] : [])).all(), audit = await env.DB.prepare('SELECT actor,target,action,note,created_at FROM approval_events ORDER BY created_at DESC LIMIT 100').all(); return response({ users: rows.results, audit: audit.results, role: actor.role, privilegedActions: !!env.SUPABASE_SERVICE_ROLE_KEY, mode: actor.platform ? 'platform' : 'standalone' }) ;} catch (e) { return failure(e) ;} }
export async function usersPost(request: Request, env: any) {  
try {
    const actor = await administrator(request, env, true), parsed = change.safeParse(await body(request)); if (!parsed.success) throw new SecurityError(400, 'Invalid approval details.'); const b = parsed.data; if (!actor.platform && ['make-admin', 'make-viewer'].includes(b.action) && actor.session.created_at < Date.now() - 900000) throw new SecurityError(403, 'Sign in again before changing administrator roles.', 'reauth_required'); if (b.id === actor.id) throw new SecurityError(403, 'You cannot change your own access.');
    const user = await env.DB.prepare('SELECT * FROM app_users WHERE id=?').bind(b.id).first(); if (!user) throw new SecurityError(404, 'User not found.'); if (user.version !== b.version) throw new SecurityError(409, 'This request changed. Refresh and review again.'); if (user.role === 'owner') throw new SecurityError(403, 'Owner access cannot be changed here.'); if (user.role === 'admin' && actor.role !== 'owner') throw new SecurityError(403, 'Only the owner can change administrator access.');
    if (['delete-account','reset-link'].includes(b.action)) {
      if(actor.role!=='owner'||actor.platform)throw new SecurityError(403,'Only the standalone owner can perform this action.');
      if(actor.session.created_at<Date.now()-900000)throw new SecurityError(403,'Sign in again before this action.','reauth_required');
      if(!env.SUPABASE_SERVICE_ROLE_KEY)throw new SecurityError(503,'Account recovery/removal needs secure server configuration.','setup_required');
      const client=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
      if(b.action==='reset-link'){
        if(user.status!=='active')throw new SecurityError(409,'Only active accounts can receive reset links.');
        const {data,error}=await client.auth.admin.generateLink({type:'recovery',email:user.email});
        if(error||!data.properties?.hashed_token||data.user?.id!==user.id)throw new SecurityError(503,'Unable to create recovery link.');
        await env.DB.prepare('INSERT INTO approval_events(id,actor,target,action,note,created_at,target_version) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),actor.id,user.id,'reset-link','Owner verified identity out of band',Date.now(),user.version).run();
        return response({ok:true,resetLink:origin(env)+'/auth/#owner_recovery='+encodeURIComponent(data.properties.hashed_token),message:'Single-use link; send privately after verifying identity. Provider recovery expiry applies.'});
      }
      // Revoke app sessions first. On provider failure account is suspended, never silently usable.
      const locked=await env.DB.prepare("UPDATE app_users SET status='suspended',version=version+1 WHERE id=? AND version=?").bind(user.id,user.version).run();if(!locked.meta.changes)throw new SecurityError(409,'Account changed; refresh before retrying.');await revokeAll(env,user.id);
      const {error}=await client.auth.admin.deleteUser(user.id,false);if(error)throw new SecurityError(503,'Provider deletion failed. Account remains suspended; retry after refresh.');
      await env.DB.batch([env.DB.prepare('INSERT INTO approval_events(id,actor,target,action,note,created_at,target_version) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),actor.id,user.id,'delete-account',user.email,Date.now(),user.version+1),env.DB.prepare('DELETE FROM app_sessions WHERE user_id=?').bind(user.id),env.DB.prepare('DELETE FROM app_users WHERE id=?').bind(user.id)]);
      return response({ok:true,deleted:true});
    }
    let status = user.status, role = user.role;
    if (b.action === 'approve' || b.action === 'reject') { if (user.status !== 'pending') throw new SecurityError(409, 'This request is no longer pending.'); status = b.action === 'approve' ? 'active' : 'rejected'; role = 'viewer' ;}
    if (b.action === 'suspend') { if (user.status !== 'active') throw new SecurityError(409, 'Only active users can be suspended.'); status = 'suspended' ;}
    if (b.action === 'reactivate') { if (!['rejected', 'suspended'].includes(user.status)) throw new SecurityError(409, 'This account cannot be reactivated.'); status = 'active' ;}
    if (b.action === 'make-admin' || b.action === 'make-viewer') { if (actor.role !== 'owner' || user.status !== 'active') throw new SecurityError(403, 'Only the owner can change active user roles.'); role = b.action === 'make-admin' ? 'admin' : 'viewer'; if (role === user.role) throw new SecurityError(409, 'This role is already assigned.') ;}
    const now = Date.now(), id = crypto.randomUUID(), next = b.version + 1, actorGuard = actor.platform ? '1=1' : "EXISTS(SELECT 1 FROM app_users actor WHERE actor.id=? AND actor.status='active' AND actor.role IN ('owner','admin'))", actorArgs = actor.platform ? [] : [actor.id];
    const guarded = "EXISTS(SELECT 1 FROM app_users WHERE id=? AND version=? AND reviewed_by=? AND reviewed_at=?)";
    const args = [b.id, next, actor.id, now];
    const results = await env.DB.batch([
      env.DB.prepare(`UPDATE app_users SET status=?,role=?,version=version+1,updated_at=?,reviewed_by=?,reviewed_at=? WHERE id=? AND version=? AND ${actorGuard}`).bind(status, role, now, actor.id, now, b.id, b.version, ...actorArgs),
      env.DB.prepare(`INSERT INTO approval_events(id,actor,target,action,note,created_at,target_version) SELECT ?,?,?,?,?,?,? WHERE ${guarded}`).bind(id, actor.id, b.id, b.action, b.note, now, next, ...args),
      env.DB.prepare(`UPDATE app_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL AND ${guarded}`).bind(now, b.id, ...args),
      env.DB.prepare(`INSERT INTO notification_outbox(id,recipient,kind,payload,created_at) SELECT ?,?,?,?,? WHERE ${guarded}`).bind(id, user.email, 'access_changed', JSON.stringify({ status }), now, ...args)
    ]);
    if (!results[0].meta.changes) throw new SecurityError(409, 'Access changed in another session. Refresh and review again.'); const notifications = await deliverNotifications(env).catch(() => ({ enabled: false, sent: 0 })); return response({ ok: true, status, role, version: next, notificationQueued: true, notificationsEnabled: notifications.enabled });
  } catch (e) { return failure(e) ;}
}
