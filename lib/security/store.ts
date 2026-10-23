import { cookie, hash, random, seal, unseal, sessionCookie } from './crypto';
import { SecurityError, mode, origin, standalone } from './config';
import { identity, provider, providerFailure } from './provider';
export async function event(env: any, actor: string | null, name: string) { await env.DB.prepare('INSERT INTO security_events(id,actor,event,created_at) VALUES(?,?,?,?)').bind(crypto.randomUUID(), actor, name, Date.now()).run() ;}
export async function ensureUser(env: any, who: any) {
  const now = Date.now(), statements = [env.DB.prepare("INSERT INTO app_users(id,email,name,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(who.id, who.email, who.name, now, now)];
  if (env.OWNER_EMAIL) statements.push(env.DB.prepare("INSERT OR IGNORE INTO notification_outbox(id,recipient,kind,payload,created_at) SELECT ?,?,'approval_requested','{}',? WHERE EXISTS(SELECT 1 FROM app_users WHERE id=? AND status='pending')").bind('request-' + who.id, env.OWNER_EMAIL, now, who.id));
  await env.DB.batch(statements); const user = await env.DB.prepare('SELECT * FROM app_users WHERE id=?').bind(who.id).first(); if (!user || user.email !== who.email) throw new SecurityError(403, 'Your account needs an administrator review.', 'email_changed'); return user;
}
export async function createSession(env: any, auth: any, purpose = 'login') {
  const who = await identity(env, auth.access_token), user = await ensureUser(env, who), token = random(), id = await hash(token), now = Date.now(), ttl = purpose === 'recovery' ? 600000 : 86400000, csrf = random();
  const sealed = await seal(env, { access: auth.access_token, refresh: auth.refresh_token, expires: auth.expires_at }, id);
  await env.DB.prepare('INSERT INTO app_sessions(id,user_id,provider_session,sealed,csrf,created_at,last_seen,expires_at,purpose) VALUES(?,?,?,?,?,?,?,?,?)').bind(id, who.id, who.providerSession, sealed, csrf, now, now, now + ttl, purpose).run();
  await event(env, who.id, purpose === 'recovery' ? 'recovery_verified' : 'signed_in'); return { user, who, id, csrf, token, cookie: sessionCookie(token, Math.floor(ttl / 1000)), purpose };
}
export async function readSession(request: Request, env: any) {
  standalone(env); if (new URL(request.url).origin !== origin(env)) throw new SecurityError(403, 'Invalid application origin.'); const token = cookie(request); if (!token) throw new SecurityError(401, 'Please sign in.', 'sign_in_required'); const id = await hash(token); let row = await env.DB.prepare('SELECT * FROM app_sessions WHERE id=?').bind(id).first(); const now = Date.now(); if (!row || row.revoked_at || row.expires_at <= now || row.last_seen < now - 1800000) throw new SecurityError(401, 'Please sign in again.', 'session_expired');
  let auth = await unseal(env, row.sealed, id);
  if (!Number.isFinite(auth.expires) || auth.expires * 1000 < now + 60000) {
    const lock = random(), locked = await env.DB.prepare('UPDATE app_sessions SET refresh_lock=?,refresh_until=? WHERE id=? AND revoked_at IS NULL AND refresh_until<?').bind(lock, now + 15000, id, now).run();
    if (!locked.meta.changes) throw new SecurityError(503, 'Session is refreshing. Please retry.', 'session_refreshing');
    try {      
const { data, error } = await provider(env).auth.refreshSession({ refresh_token: auth.refresh }); if (error && ((error as any).status >= 500 || error.name === 'AuthRetryableFetchError')) throw new SecurityError(503, 'Sign-in service unavailable. Please retry.'); if (error || !data.session) { await env.DB.prepare('UPDATE app_sessions SET revoked_at=? WHERE id=?').bind(now, id).run(); throw new SecurityError(401, 'Please sign in again.', 'session_expired') ;}
      const who = await identity(env, data.session.access_token); if (who.id !== row.user_id || who.providerSession !== row.provider_session) throw new SecurityError(401, 'Please sign in again.'); auth = { access: data.session.access_token, refresh: data.session.refresh_token, expires: data.session.expires_at }; const saved = await env.DB.prepare('UPDATE app_sessions SET sealed=?,refresh_lock=NULL,refresh_until=0 WHERE id=? AND refresh_lock=? AND revoked_at IS NULL').bind(await seal(env, auth, id), id, lock).run(); if (!saved.meta.changes) throw new SecurityError(401, 'Please sign in again.');
    } finally { await env.DB.prepare('UPDATE app_sessions SET refresh_lock=NULL,refresh_until=0 WHERE id=? AND refresh_lock=?').bind(id, lock).run() ;}
  }
  const who = await identity(env, auth.access); if (who.id !== row.user_id || who.providerSession !== row.provider_session) throw new SecurityError(401, 'Please sign in again.');
  const user = await env.DB.prepare('SELECT * FROM app_users WHERE id=?').bind(who.id).first(); if (!user || user.email !== who.email) throw new SecurityError(403, 'Your account needs an administrator review.', 'email_changed');
  const touched = await env.DB.prepare('UPDATE app_sessions SET last_seen=? WHERE id=? AND revoked_at IS NULL AND expires_at>?').bind(now, id, now).run(); if (!touched.meta.changes) throw new SecurityError(401, 'Please sign in again.');
  return { ...row, user, who, auth, csrf: row.csrf, id };
}
export async function sessionClient(env: any, session: any) { const client = provider(env), { error } = await client.auth.setSession({ access_token: session.auth.access, refresh_token: session.auth.refresh }); if (error) providerFailure(error); return client ;}
export async function revoke(env: any, id: string) { await env.DB.prepare('UPDATE app_sessions SET revoked_at=? WHERE id=? AND revoked_at IS NULL').bind(Date.now(), id).run() ;}
export async function revokeAll(env: any, user: string) { await env.DB.prepare('UPDATE app_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL').bind(Date.now(), user).run() ;}
