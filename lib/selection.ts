export type Selection={generatedAt:string;city:string;rows:{id:number;article:string;name:string;count:number;price:number;city:string;url:string}[];unresolved:{line:string;count:number|null;status:string}[]};
export function makeSelection(state:any,items:any[],now=new Date()):Selection{
 const rows=state.cart.map((p:any)=>({id:p.id,article:items.find(v=>v.id===p.id)?.article||String(p.id),name:p.name,count:p.count,price:p.price,city:p.city||state.city||'Все склады',url:/^https:\/\/(?:www\.)?ekt\.kz\//i.test(p.url)?p.url:''}));
 const remaining=new Map<number,number>(rows.map((p:any)=>[p.id,p.count]));
 const unresolved=(state.specification||[]).flatMap((r:any)=>{
  const requested=Number.isSafeInteger(r.count)&&r.count>0?r.count:null;
  const inCart=r.productId?(remaining.get(r.productId)||0):0;
  const used=requested?Math.min(inCart,requested):0;
  if(r.productId)remaining.set(r.productId,inCart-used);
  if(requested&&used===requested)return [];
  return [{line:r.line,count:requested===null?null:requested-used,status:r.status==='not_found'?'Не найдено':!r.productId?'Нужен выбор товара':!requested?'Нужно указать количество':'Не добавлено в корзину'}];
 });
 return {generatedAt:now.toISOString(),city:state.city||'Все склады',rows,unresolved};
}
