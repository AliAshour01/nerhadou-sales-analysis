import { SecurityError } from './config';
const bytes = (hex: string) => Uint8Array.from(hex.match(/../g) || [], s => parseInt(s, 16));
const hex = (b: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(b), n => n.toString(16).padStart(2, '0')).join('');
export const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export const hash = async (s: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
export async function hmac(env: any, s: string) { const key = await crypto.subtle.importKey('raw', bytes(env.SESSION_ENCRYPTION_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(s))) ;}
async function key(env: any) { if (!/^[a-f0-9]{64}$/i.test(env.SESSION_ENCRYPTION_KEY || '')) throw new SecurityError(503, 'Session service unavailable.'); return crypto.subtle.importKey('raw', bytes(env.SESSION_ENCRYPTION_KEY), 'AES-GCM', false, ['encrypt', 'decrypt']) ;}
export async function seal(env: any, value: unknown, aad: string) { const iv = crypto.getRandomValues(new Uint8Array(12)), cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(aad) }, await key(env), new TextEncoder().encode(JSON.stringify(value))); return hex(iv) + '.' + hex(cipher) ;}
export async function unseal(env: any, value: string, aad: string) { try { const [iv, cipher] = value.split('.'); return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(iv), additionalData: new TextEncoder().encode(aad) }, await key(env), bytes(cipher)))) ;} catch { throw new SecurityError(401, 'Please sign in again.', 'session_expired') ;} }
export const COOKIE = '__Host-nerhadou_session';
export function cookie(request: Request) { const matches = (request.headers.get('cookie') || '').split(';').map(s => s.trim()).filter(s => s.startsWith(COOKIE + '=')); if (matches.length !== 1) return null; const token = matches[0].slice(COOKIE.length + 1); return /^[a-f0-9]{64}$/.test(token) ? token : null ;}
export function sessionCookie(token: string, maxAge = 86400) { return `${COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAge}` ;}
export function csrf(request: Request, session: any) { if (request.headers.get('x-csrf-token') !== session.csrf) throw new SecurityError(403, 'Invalid security token. Reload and retry.', 'csrf_failed') ;}
