import {env} from 'cloudflare:workers';
export const settings=()=>env as unknown as Record<string,any>;
export type State={checkout?:any;orders?:any[];city?:string;specification?:any[];cart:any[];pending:any;selected:number|null;history:any[];messages?:any[];lastProducts?:number[];searchQuery?:string;rate:{at:number;count:number}};
export const emptyState=():State=>({cart:[],pending:null,selected:null,history:[],rate:{at:Date.now(),count:0}});
export async function session(request:Request,create=false){
 const db=settings().DB;if(!db)throw Error('Хранилище корзины не настроено.');
 const match=request.headers.get('cookie')?.match(/(?:^|;\s*)ekt_session=([a-f0-9-]{36})(?:;|$)/);
 if(match){const row=await db.prepare('SELECT state,revision FROM sessions WHERE id=? AND expires>?').bind(match[1],Date.now()).first();if(row)return{id:match[1],state:JSON.parse(row.state) as State,revision:row.revision,fresh:false}}
 if(!create)throw Error('Сессия истекла. Обновите страницу.');
 const id=crypto.randomUUID(),state=emptyState();
 await db.prepare('INSERT INTO sessions (id,state,revision,expires) VALUES (?,?,0,?)').bind(id,JSON.stringify(state),Date.now()+86400000).run();
 // Expired chat and cart records are removed during normal traffic.
 await db.prepare('DELETE FROM sessions WHERE expires<?').bind(Date.now()).run();
 return{id,state,revision:0,fresh:true};
}
export async function save(s:Awaited<ReturnType<typeof session>>){
 const result=await settings().DB.prepare('UPDATE sessions SET state=?, revision=revision+1 WHERE id=? AND revision=? AND expires>?').bind(JSON.stringify(s.state),s.id,s.revision,Date.now()).run();
 if(result.meta.changes!==1)throw Error('Состояние изменилось в другом запросе. Обновите страницу и повторите действие.');
}
