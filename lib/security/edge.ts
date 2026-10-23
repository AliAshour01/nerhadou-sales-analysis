import { mode, origin, SecurityError, failure } from './config';
import { approved } from './guard';
const publicFiles = new Set(['/auth', '/auth/index', '/auth/', '/auth/index.html', '/auth/auth.js', '/auth/auth.css', '/logo.png']);
export async function edgeGate(request: Request, env: any) {  
try {
    const path = decodeURIComponent(new URL(request.url).pathname);
    if (/(?:^|\/)(?:seed|data)\.json$/i.test(path) || path.includes('/private/') || path.endsWith('.map')) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
    const m = mode(env); if (new URL(request.url).origin !== origin(env)) throw new SecurityError(403, 'Invalid application origin.');
    if (path.startsWith('/api/auth/')) return null;
    if (publicFiles.has(path)) return null;
    if (path.startsWith('/api/')) return null; // Each API handler has its own server-side authorization.
    if (m === 'platform') { await approved(request, env); return null ;}
    try { await approved(request, env) ;} catch (e) { if (e instanceof SecurityError && [401, 403].includes(e.status)) return Response.redirect(origin(env) + '/auth/', 303); throw e ;} return null;
  } catch (e) { return failure(e) ;}
}
export function securityHeaders(response: Response, request: Request, env?: any) { const result = new Response(response.body, response), h = result.headers; h.set('X-Content-Type-Options', 'nosniff'); if (env?.AUTH_MODE !== 'platform') h.set('X-Frame-Options', 'DENY'); h.set('Referrer-Policy', 'no-referrer'); h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()'); h.set('Strict-Transport-Security', 'max-age=31536000'); h.set('Content-Security-Policy', `default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; frame-ancestors ${env?.AUTH_MODE === 'platform' ? 'https://chatgpt.com https://*.chatgpt.com' : "'none'"}; base-uri 'none'; form-action 'self'; object-src 'none'`); if (new URL(request.url).pathname.startsWith('/api/') || h.has('Set-Cookie') || h.get('Content-Type')?.includes('text/html')) h.set('Cache-Control', 'private, no-store'); return result ;}
