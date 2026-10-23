export const dynamic='force-dynamic';
import {env} from 'cloudflare:workers';
import {approved} from '../../../../lib/security/guard';
import {failure,SecurityError} from '../../../../lib/security/config';
import {releaseNotes} from '../../../../lib/release-notes';
export async function GET(request:Request){try{const actor=await approved(request,env);if(actor.role!=='owner')throw new SecurityError(403,'Owner access required.');return Response.json({notes:releaseNotes},{headers:{'Cache-Control':'private, no-store'}})}catch(e){return failure(e)}}
