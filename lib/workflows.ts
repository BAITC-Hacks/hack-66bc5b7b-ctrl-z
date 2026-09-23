import {search,validateCount,norm,type Product} from './domain';
export const cities=['Все склады','Алматы','Астана','Шымкент','Актау','Атырау','Караганда','Усть-Каменогорск','Тараз','Талдыкорган'];
export function available(p:Product,city='Все склады'){
 if(city==='Все склады')return p.quantity;
 const names=city==='Астана'?['астана','нур-султан']:[norm(city)];
 return (p.stores||[]).filter(s=>names.some(n=>norm(s.name)===n||norm(s.name).startsWith(n+' ('))).reduce((a,s)=>a+Math.max(0,s.quantity),0);
}
export function parseSpecification(text:string,items:Product[]){
 const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 if(lines.length>60)throw Error('В одной спецификации допускается до 60 строк. Разделите файл на части.');
 return lines.filter(l=>!/^\s*(?:артикул|наименование|№|код)\s*[;|\t,].*(?:кол|колич|quantity)/i.test(l)).map((line,index)=>{
  const explicit=line.match(/(?:^|[\s;|])([+-]?\d+(?:[.,]\d+)?)\s*(?:шт\.?|штук|штуки)(?:\s|$)/i);
  const delimiter=/[;|\t]/.test(line)?/[;|\t]/: /,/;
  const parts=line.split(delimiter).map(x=>x.trim().replace(/^"|"$/g,''));
  const last=parts.at(-1)||'';const numericTail=parts.length>1&&/^[+-]?\d+(?:[.,]\d+)?$/.test(last);
  const amount=explicit?.[1]||(numericTail?last:null);
  const count=amount===null?null:Number(amount.replace(',','.'));
  const query=numericTail?parts.slice(0,-1).join(' '):line.replace(/([+-]?\d+(?:[.,]\d+)?)\s*(?:шт\.?|штук|штуки)(?:\s|$)/i,' ');
  const tokens=query.match(/[\p{L}\d_.-]+/gu)||[];
  const exact=items.filter(p=>tokens.some(t=>[String(p.id),p.article,String(p.properties.ARTIKULPOSTAVSHCHIKA||'')].includes(t)));
  const candidates=exact.length?exact:search(items,query).slice(0,4);
  return {index,line,query,count,productId:exact.length===1?exact[0].id:null,candidates,status:!candidates.length?'not_found':exact.length===1?'exact':'choose'};
 });
}
type CartLine={id:number;name:string;price:number;count:number;url:string;city?:string};
export async function stageChange(cart:CartLine[],kind:'add'|'set'|'remove'|'batch',rows:{id:number;count:number}[],city:string,lookup:(id:number)=>Promise<Product>){
 if(!cities.includes(city))throw Error('Выберите город из списка.');
 if(!Array.isArray(rows)||!rows.length||rows.length>20)throw Error('Выберите от 1 до 20 товаров.');
 const combined=new Map<number,number>();
 for(const r of rows){if(!Number.isSafeInteger(r.id)||r.id<=0)throw Error('Некорректный товар.');if(kind!=='remove'&&(!Number.isSafeInteger(r.count)||r.count<=0))throw Error('У каждой выбранной позиции должно быть целое положительное количество.');combined.set(r.id,(combined.get(r.id)||0)+r.count)}
 if((kind==='set'||kind==='remove')&&combined.size!==1)throw Error('Изменяйте одну позицию за раз.');
 const lines=[];
 for(const [id,count] of combined){
  const existing=cart.find(p=>p.id===id);if((kind==='set'||kind==='remove')&&!existing)throw Error('Товар уже отсутствует в корзине.');
  const p=kind==='remove'?{...existing,quantity:0,properties:{},article:''} as Product:await lookup(id);
  const before=existing?.count||0,after=kind==='remove'?0:kind==='set'?count:before+count;
  if(after>0){const qty=available(p,city);validateCount({...p,quantity:qty},after);}
  lines.push({product:p,count,before,after});
 }
 return {kind,city,lines,product:lines[0].product,count:lines[0].count,token:crypto.randomUUID(),expires:Date.now()+300000};
}
export async function confirmChange(cart:CartLine[],pending:any,token:string,lookup:(id:number)=>Promise<Product>){
 if(!pending||pending.token!==token)throw Error('Нет действующего подтверждения. Выберите действие заново.');
 if(pending.expires<Date.now())return{cart,pending:null,text:'Срок подтверждения истёк. Подготовьте действие заново.'};
 const kind=pending.kind||'add',city=pending.city||'Все склады';
 const previous=pending.lines||[{product:pending.product,count:pending.count}];
 const renewed=await stageChange(cart,kind,previous.map((l:any)=>({id:l.product.id,count:l.count})),city,lookup);
 if(kind!=='remove'&&renewed.lines.some((l:any,i:number)=>l.product.price!==previous[i].product.price))return{cart,pending:renewed,text:'Цена одной или нескольких позиций изменилась. Проверьте новые суммы и подтвердите ещё раз.'};
 let next=cart.map(p=>({...p}));
 for(const line of renewed.lines){next=next.filter(p=>p.id!==line.product.id);if(line.after>0)next.push({id:line.product.id,name:line.product.name,price:line.product.price,count:line.after,url:line.product.url,city})}
 return{cart:next,pending:null,text:kind==='remove'?'Товар удалён из демонстрационной корзины.':kind==='set'?'Количество обновлено после подтверждения.':'Выбранные товары добавлены в демонстрационную корзину. Товар не зарезервирован.',cartUrl:'/#cart'};
}
export function managerDraft(state:any){
 return ['Обращение в Электрокомплект','Дата: '+new Date().toLocaleString('ru-RU',{timeZone:'Asia/Almaty'}),'Город / фильтр наличия: '+(state.city||'Все склады'),'','Прошу помочь с подбором и уточнить условия покупки.','', ...(state.specification?.length?['Исходная спецификация и результат первого поиска:',...state.specification.map((r:any)=>r.line+' — '+(r.status==='not_found'?'НЕ НАЙДЕНО':r.status==='choose'?'нужен выбор товара':'совпадение артикула')),'']:[]),'Выбранные товары (демонстрационная корзина, не заказ):',...(state.cart.length?state.cart.map((p:CartLine)=>`${p.name}\nID ${p.id} · ${p.count} шт. · ${p.price} ₸/ед.\n${p.url}`):['Товары пока не добавлены.']),'','Последние вопросы и ответы:',...(state.messages||state.history?.map((m:any)=>({role:m.role,text:m.content}))||[]).slice(-12).map((m:any)=>(m.role==='user'?'Покупатель: ':'Консультант: ')+m.text),'','Нужно подтвердить совместимость, доступность, сертификаты и сроки.'].join('\n');
}
