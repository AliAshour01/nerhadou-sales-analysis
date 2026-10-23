export const dynamic='force-dynamic';
import {env} from 'cloudflare:workers';
import {getAuth,postAuth} from '../../../../lib/security/auth-service';
const action=(r:Request)=>new URL(r.url).pathname.split('/').filter(Boolean).at(-1)||'';
export const GET=(request:Request)=>getAuth(request,env,action(request));
export const POST=(request:Request)=>postAuth(request,env,action(request));
