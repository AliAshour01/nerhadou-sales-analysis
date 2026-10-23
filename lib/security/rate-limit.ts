import { hmac } from './crypto';
import { SecurityError } from './config';
export async function limit(env: any, key: string, max: number, seconds: number) { const name = await hmac(env, key), stub = env.AUTH_RATE_LIMITER.get(env.AUTH_RATE_LIMITER.idFromName(name)), res = await stub.fetch('https://limiter/check', { method: 'POST', body: JSON.stringify({ max, seconds }) }); if (res.status === 429) throw new SecurityError(429, 'Too many attempts. Please wait and retry.', 'rate_limited'); if (!res.ok) throw new SecurityError(503, 'Sign-in protection is temporarily unavailable.') ;}
export async function authLimits(request: Request, env: any, action: string, email = '') { const ip = request.headers.get('cf-connecting-ip') || 'unknown'; await limit(env, 'ip:' + ip + ':' + action, action === 'signin' ? 80 : 30, 300); if (email) await limit(env, 'email:' + email + ':' + action, action === 'signin' ? 5 : action === 'verify' || action === 'mfa-verify' ? 8 : 3, action === 'signin' ? 900 : 600) ;}
// Exported from the independent Worker. Storage transactions make parallel requests count once each.
export class AuthRateLimiter {
  constructor(private state: any) { }
  async fetch(request: Request) { const { max, seconds } = await request.json() as any; if (!Number.isInteger(max) || max < 1 || max > 200 || !Number.isInteger(seconds) || seconds < 1 || seconds > 3600) return new Response(null, { status: 400 }); const now = Date.now(), allowed = await this.state.storage.transaction(async (tx: any) => { let row = await tx.get('counter'); if (!row || row.expires <= now) row = { count: 0, expires: now + seconds * 1000 }; if (row.count >= max) return false; row.count++; await tx.put('counter', row); await tx.setAlarm(row.expires + 1000); return true ;}); return new Response(null, { status: allowed ? 204 : 429 }) ;}
  async alarm() { await this.state.storage.deleteAll() ;}
}
