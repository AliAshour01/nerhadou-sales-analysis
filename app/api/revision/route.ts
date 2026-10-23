export const dynamic='force-dynamic';
import {env} from 'cloudflare:workers';
import {approved} from '../../../lib/security/guard';
import {failure} from '../../../lib/security/config';
import seed from '../../../private/seed.json';
export async function GET(request:Request){
 try{await approved(request,env)}catch(e){return failure(e)}
 try{const row=await env.DB.prepare('SELECT revision FROM workspace_state WHERE id=1').first() as any;return Response.json({revision:row?.revision??0,sourceVersion:seed.version},{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Unable to check updates.'},{status:503})}
}
