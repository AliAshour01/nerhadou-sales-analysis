import { z } from 'zod';
import { deliverNotifications } from './notifications';
import { mode, origin, standalone, assertOrigin, body, response, failure, SecurityError, companyEmail, password, registrationPolicy, ownerSetup, assertSetupEmail } from './config';
import { csrf, sessionCookie } from './crypto';
import { provider, providerFailure } from './provider';
import { authLimits, limit } from './rate-limit';
import { createSession, readSession, sessionClient, revoke, revokeAll, event } from './store';
const input = z.object({ tokenHash:z.string().regex(/^[a-fA-F0-9]{40,128}$/).optional(), email: z.string().max(254).optional(), password: z.string().max(256).optional(), name: z.string().trim().min(2).max(120).optional(), captcha: z.string().min(1).max(2048).optional(), code: z.string().regex(/^\d{6,10}$/).optional(), factorId: z.string().uuid().optional(), challengeId: z.string().uuid().optional(), currentPassword: z.string().max(256).optional() }).strict();
const generic = { message: 'If the details are eligible, check your company email for the next step.' };
async function captcha(request: Request, env: any, token: string | undefined, action: string) { if (!token) throw new SecurityError(400, 'Complete the security check.', 'captcha_required'); const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: request.headers.get('cf-connecting-ip') || undefined }), signal: AbortSignal.timeout(10000) }); if (!res.ok) throw new SecurityError(503, 'Security check unavailable.'); const data = await res.json() as any; if (!data.success || data.hostname !== new URL(origin(env)).hostname || data.action !== action) throw new SecurityError(400, 'Security check failed. Please retry.', 'captcha_failed') ;}
export async function getAuth(request: Request, env: any, action: string) {  
try {
    if (action === 'config') { const m = mode(env); let ready = m === 'platform'; if (m === 'standalone') { try { standalone(env); ready = true ;} catch { ready = false ;} } return response({ mode: m, ready, siteKey: ready && m === 'standalone' ? env.TURNSTILE_SITE_KEY : null, version: 30, registrationPolicy: registrationPolicy(env), ownerSetup: ownerSetup(env) }) ;}
    if (action !== 'me') throw new SecurityError(404, 'Not found.');
    if (mode(env) === 'platform') { const { principal } = await import('./guard'); const p = await principal(request, env); return response({ user: { id: p.id, email: p.email, name: p.name, role: p.role, status: p.status }, mode: 'platform', csrf: null }) ;}
    const s = await readSession(request, env); return response({ user: { id: s.user.id, email: s.user.email, name: s.user.name, role: s.user.role, status: s.user.status }, mode: 'standalone', csrf: s.csrf, purpose: s.purpose, mfa: s.who.aal === 'aal2', mfaRequired: !['owner', 'admin'].includes(s.user.role) && s.who.requiresMfa });
  } catch (e) { return failure(e) ;}
}
export async function postAuth(request: Request, env: any, action: string) {  
let actor: string | null = null; try {
    standalone(env); assertOrigin(request, env);
    if (registrationPolicy(env) === 'admin_review' && ['recover', 'resend', 'verify', 'verify-recovery'].includes(action)) throw new SecurityError(409, 'Email recovery is not enabled. Contact the workspace administrator.', 'email_flow_disabled'); const parsed = input.safeParse(await body(request)); if (!parsed.success) throw new SecurityError(400, 'Invalid form details.'); const b = parsed.data;
    if(action==='owner-recovery'){
      await authLimits(request,env,action,b.tokenHash?.slice(0,24)||'invalid');if(!b.tokenHash)throw new SecurityError(400,'Invalid recovery link.');
      const {data,error}=await provider(env).auth.verifyOtp({token_hash:b.tokenHash,type:'recovery'});
      if(error||!data.session)throw new SecurityError(400,'This link expired or was already used. Contact the owner.');
      const s=await createSession(env,data.session,'recovery');if(s.user.status!=='active') {await revokeAll(env,s.user.id);throw new SecurityError(403,'Account is inactive.');}
      return response({ok:true},200,{'Set-Cookie':s.cookie});
    }
    if (['signup', 'signin', 'recover', 'resend', 'verify', 'verify-recovery'].includes(action)) {
      const email = companyEmail(b.email); assertSetupEmail(env, email); await authLimits(request, env, action, email);
      if (['signup', 'signin', 'recover', 'resend'].includes(action)) {
        // The provider consumes this token exactly once. Supabase CAPTCHA protection must be enabled too.
        if (!b.captcha) throw new SecurityError(400, 'Complete the security check.', 'captcha_required');
      } else await captcha(request, env, b.captcha, action);
      const client = provider(env);
      if (action === 'signup') {
        const pw = password(b.password); if (!b.name) throw new SecurityError(400, 'Enter your full name.'); const { data, error } = await client.auth.signUp({ email, password: pw, options: { data: { full_name: b.name }, captchaToken: b.captcha } }); if (error?.status === 429) providerFailure(error); if (error && error.status >= 500) providerFailure(error);
        if (registrationPolicy(env) === 'admin_review') {
          if (error) return response({ error: 'Unable to create an account with these details. If you already registered, sign in.', code: 'registration_failed' }, 400);
          if (!data.session) throw new SecurityError(503, 'Registration setup is incomplete. Contact the workspace owner.', 'configuration_required');
          const s = await createSession(env, data.session);
          return response({ ok: true, status: s.user.status, role: s.user.role, message: 'Waiting for administrator approval.' }, 200, { 'Set-Cookie': s.cookie });
        }
        return response(generic);
      }
      if (action === 'recover') { const { error } = await client.auth.resetPasswordForEmail(email, { captchaToken: b.captcha, redirectTo: origin(env) + '/auth/' }); if (error?.status === 429 || error?.status >= 500) providerFailure(error); return response(generic) ;}
      if (action === 'resend') { const { error } = await client.auth.resend({ type: 'signup', email, options: { captchaToken: b.captcha } }); if (error?.status === 429 || error?.status >= 500) providerFailure(error); return response(generic) ;}
      let result: any;
      if (action === 'signin') { if (typeof b.password !== 'string' || !b.password || new TextEncoder().encode(b.password).length > 72) throw new SecurityError(401, 'Unable to sign in. Check your details or verify your email.'); result = await client.auth.signInWithPassword({ email, password: b.password, options: { captchaToken: b.captcha } }) ;}
      else { if (!b.code) throw new SecurityError(400, 'Enter the email verification code.'); result = await client.auth.verifyOtp({ email, token: b.code, type: action === 'verify-recovery' ? 'recovery' : 'signup' }) ;}
      if (result.error || !result.data.session) providerFailure(result.error); const s = await createSession(env, result.data.session, action === 'verify-recovery' ? 'recovery' : 'login'); await deliverNotifications(env).catch(() => { }); return response({ ok: true, status: s.user.status, role: s.user.role, purpose: s.purpose }, 200, { 'Set-Cookie': s.cookie });
    }
    const s = await readSession(request, env); actor = s.user.id; csrf(request, s); await limit(env, 'session:' + s.id + ':' + action, 15, 300);
    if (action === 'signout') { await revoke(env, s.id); try { await (await sessionClient(env, s)).auth.signOut({ scope: 'local' }) ;} catch { } return response({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) }) ;}
    if (action === 'signout-all') { await revokeAll(env, s.user.id); try { await (await sessionClient(env, s)).auth.signOut({ scope: 'global' }) ;} catch { } return response({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) }) ;}
    if (s.purpose === 'recovery' && action !== 'password') throw new SecurityError(403, 'This session can only complete password recovery.');
    const client = await sessionClient(env, s);
    if (action === 'password') {
      const pw = password(b.password); if (s.purpose !== 'recovery' && !b.currentPassword) throw new SecurityError(400, 'Enter your current password.');
      if (s.purpose !== 'recovery') { const checked = await provider(env).auth.signInWithPassword({ email: s.user.email, password: b.currentPassword!, options: { captchaToken: b.captcha } }); if (checked.error) providerFailure(checked.error); if (!['owner', 'admin'].includes(s.user.role) && s.who.requiresMfa && s.who.aal !== 'aal2') throw new SecurityError(403, 'Two-factor verification required.') ;}
      const { error } = await client.auth.updateUser({ password: pw, ...(s.purpose === 'recovery' ? {} : { current_password: b.currentPassword }) }); if (error) throw new SecurityError(400, 'Unable to change password. Check the password requirements.'); await revokeAll(env, s.user.id); try { await client.auth.signOut({ scope: 'global' }) ;} catch { } await event(env, s.user.id, 'password_changed'); return response({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
    }
    if (action === 'mfa-list') { const { data, error } = await client.auth.mfa.listFactors(); if (error) providerFailure(error); return response({ factors: data.totp.map(f => ({ id: f.id, status: f.status, friendly_name: f.friendly_name })) }) ;}
    if (action === 'mfa-enroll') { const { data, error } = await client.auth.mfa.listFactors(); if (error) providerFailure(error); if (data.totp.some(f => f.status === 'verified')) throw new SecurityError(409, 'Use your existing authenticator.'); const enrolled = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Nerhadou Commercial Hub' }); if (enrolled.error) providerFailure(enrolled.error); return response({ id: enrolled.data.id, secret: enrolled.data.totp.secret, uri: enrolled.data.totp.uri }) ;}
    if (action === 'mfa-unenroll') {
      if (s.who.aal !== 'aal2') throw new SecurityError(403, 'Verify your current authenticator before turning it off.', 'mfa_required');
      if (s.created_at < Date.now() - 900000) throw new SecurityError(403, 'Verify your authenticator again before turning it off.', 'reauth_required');
      if (!b.factorId) throw new SecurityError(400, 'Choose an authenticator.');
      const { data, error } = await client.auth.mfa.listFactors(); if (error) providerFailure(error);
      if (!data.totp.some(f => f.id === b.factorId && f.status === 'verified')) throw new SecurityError(404, 'Authenticator not found.');
      const removed = await client.auth.mfa.unenroll({ factorId: b.factorId }); if (removed.error) providerFailure(removed.error);
      await revokeAll(env, s.user.id); await event(env, s.user.id, 'mfa_disabled');
      return response({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
    }
    if (action === 'mfa-challenge') { if (!b.factorId) throw new SecurityError(400, 'Choose an authenticator.'); const { data, error } = await client.auth.mfa.challenge({ factorId: b.factorId }); if (error) providerFailure(error); return response({ challengeId: data.id }) ;}
    if (action === 'mfa-verify') {
      if (!b.factorId || !b.challengeId || !b.code) throw new SecurityError(400, 'Enter the authenticator code.'); const { data, error } = await client.auth.mfa.verify({ factorId: b.factorId, challengeId: b.challengeId, code: b.code }); if (error) providerFailure(error); const replacement = await createSession(env, data); await revoke(env, s.id); await event(env, s.user.id, 'mfa_verified'); return response({ ok: true }, 200, { 'Set-Cookie': replacement.cookie });
    }
    throw new SecurityError(404, 'Not found.');
  } catch (e) { if (e instanceof SecurityError && [400, 401, 403].includes(e.status) && env.DB && env.AUTH_MODE === 'standalone') await event(env, actor, 'auth_failed:' + e.code).catch(() => { }); return failure(e) ;}
}
