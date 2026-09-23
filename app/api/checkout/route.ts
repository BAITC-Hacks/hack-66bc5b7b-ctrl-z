import {session,save} from '@/lib/store';
import {quoteCheckout,confirmCheckout} from '@/lib/checkout';
import {liveProduct} from '@/lib/ekt';
const json=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export async function GET(request:Request){try{const s=await session(request);return json({orders:s.state.orders||[]})}catch{return json({error:'SESSION'},401)}}
export async function POST(request:Request){
 try{
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'ORIGIN'},403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'FORM'},415);
  const raw=await request.text();if(raw.length>12000)return json({error:'FORM'},413);
  const b=JSON.parse(raw),s=await session(request);
  if(b.action==='quote'){s.state.checkout=await quoteCheckout(s.state,b.form,liveProduct);await save(s);return json({quote:s.state.checkout})}
  if(b.action==='confirm'){const order=await confirmCheckout(s.state,b.token,liveProduct);if(!s.state.orders?.some(o=>o.token===order.token)){s.state.orders=[order,...(s.state.orders||[])].slice(0,5);s.state.checkout=null;await save(s)}return json({order})}
  return json({error:'FORM'},400);
 }catch(e:any){const known=['FORM','PHONE','EMAIL','CITY','DATE','CONSENT','EMPTY','PENDING','EXPIRED','CHANGED','PRICE_CHANGED'];return json({error:known.includes(e.message)?e.message:'CHECK_FAILED'},409)}
}
