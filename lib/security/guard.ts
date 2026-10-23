import { mode, origin, SecurityError, assertOrigin } from './config';
import { csrf } from './crypto';
import { readSession } from './store';
export async function principal(request: Request, env: any) {
  if (new URL(request.url).origin !== origin(env)) throw new SecurityError(403, 'Invalid application origin.');
  if (mode(env) === 'platform') {
    const id = request.headers.get('oai-authenticated-user-id'), email = request.headers.get('oai-authenticated-user-email')?.toLowerCase();
    if (!id || !email) throw new SecurityError(401, 'Sign in required.', 'sign_in_required');
    // Only the exact private platform origin may use platform-asserted identity. Never enabled on the independent Worker.
    if (!env.PLATFORM_OWNER_EMAIL) throw new SecurityError(503, 'Platform identity is not configured.');
    return { id, email, name: email, role: email === env.PLATFORM_OWNER_EMAIL.toLowerCase() ? 'owner' : 'viewer', status: 'active', platform: true, session: null };
  }
  const session = await readSession(request, env), user = session.user; return { ...user, platform: false, session };
}
export async function approved(request: Request, env: any) { if (mode(env) === 'standalone' && env.AUTH_SETUP_VERIFIED !== 'true') throw new SecurityError(503, 'The workspace is closed while access is being tested.', 'setup_incomplete'); const p = await principal(request, env); if (p.status !== 'active') throw new SecurityError(403, p.status === 'pending' ? 'Your account is awaiting approval.' : 'This account is not active.', p.status); if (p.session?.purpose === 'recovery') throw new SecurityError(403, 'Complete password recovery first.', 'recovery_only'); if (!p.platform && (['owner', 'admin'].includes(p.role) || p.session.who.requiresMfa) && p.session.who.aal !== 'aal2') throw new SecurityError(403, 'Complete two-factor verification.', 'mfa_required'); return p ;}
export async function administrator(request: Request, env: any, mutating = false) { const p = await approved(request, env); if (!['owner', 'admin'].includes(p.role)) throw new SecurityError(403, 'Administrator access required.'); if (mutating) { assertOrigin(request, env); if (p.session) csrf(request, p.session) ;} return p ;}
export async function owner(request: Request, env: any) { const p = await administrator(request, env, true); if (p.role !== 'owner') throw new SecurityError(403, 'Owner access required.'); return p ;}
