export const dynamic='force-dynamic';
import {env} from 'cloudflare:workers';
import {approved} from '../../../lib/security/guard';
import {failure} from '../../../lib/security/config';
import seed from '../../../private/seed.json';
import {snapshotFrom} from '../../../public/data-core.js';
import {readWorkspace} from '../../../lib/data-storage';
export async function GET(request:Request){
 try{await approved(request,env)}catch(e){return failure(e)}
 try{const value=new URL(request.url).searchParams.get('year'),year=value==null||value==='latest'?undefined:Number(value);if(year!==undefined&&(!Number.isInteger(year)||year<2000||year>2100))return Response.json({error:'Invalid year.'},{status:400});const {state:s,overrides}=await readWorkspace(env.DB),data=snapshotFrom(seed,overrides,{year});if(year!==undefined&&!data.availableYears.includes(year))return Response.json({error:'No monthly actual data for this year.'},{status:404});return Response.json({...data,revision:s?.revision??0},{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Shared data unavailable'},{status:503})}
}
