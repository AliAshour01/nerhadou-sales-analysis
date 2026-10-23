export const dynamic='force-dynamic';
import {env} from 'cloudflare:workers';
import {usersGet,usersPost} from '../../../../lib/security/admin-service';
export const GET=(request:Request)=>usersGet(request,env);
export const POST=(request:Request)=>usersPost(request,env);
