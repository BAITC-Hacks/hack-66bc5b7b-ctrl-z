import {session} from '@/lib/store';
import {makeSelection} from '@/lib/selection';
import snapshot from '@/data/catalog.json';
export async function GET(request:Request){
 try{const s=await session(request);const data=makeSelection(s.state,snapshot.items);return Response.json(data,{headers:{'Cache-Control':'no-store'}})}
 catch{return Response.json({error:'Сессия истекла. Обновите страницу.'},{status:400,headers:{'Cache-Control':'no-store'}})}
}
