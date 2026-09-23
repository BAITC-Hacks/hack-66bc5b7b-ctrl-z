export type Product={id:number;name:string;article:string;price:number;quantity:number;url:string;image?:string;description?:string;stores?:{name:string;quantity:number}[];properties:Record<string,any>;warning?:string};
export const norm=(s:unknown)=>String(s??'').toLowerCase().replace(/ё/g,'е').replace(/(\d)\s*а(?=\s|$)/g,'$1a');
export function decorate(raw:any):Product{
 if(!raw||!Number.isSafeInteger(raw.id)||typeof raw.name!=='string'||!Number.isFinite(raw.price)||!Number.isFinite(raw.quantity)||raw.price<0||raw.quantity<0)throw Error('API вернул неполные данные товара. Уточните у менеджера.');
 const p={...raw,properties:raw.properties||{}};
 const title=p.name.match(/\b(\d+)\s*[АA](?=\s|$)/i)?.[1],prop=String(p.properties.NOMINALNYY_TOK||'').match(/(\d+)/)?.[1];
 if(title&&prop&&title!==prop)p.warning=`Данные расходятся: в названии ток ${title} А, в характеристиках ${prop} А. До выбора и установки уточните номинал у менеджера.`;
 return p;
}
export function search(items:Product[],query:string){
 const q=norm(query);const tokens=q.match(/[\p{L}\d_.-]+/gu)||[];
 const brands=[...new Set(items.map(p=>norm(p.properties.TORGOVAYA_MARKA)).filter(v=>v.length>2))];
 const brand=brands.find(v=>q.includes(v));if(brand)items=items.filter(p=>norm(p.properties.TORGOVAYA_MARKA)===brand||norm(p.name).includes(brand));
 if(/автомат/.test(q))items=items.filter(p=>/автомат|(?:^|\s)(?:ав|ва|ba)\s|диф/.test(norm(p.name+' '+(p.properties.OBYEM||''))));
 const amps=q.match(/(?:^|\s)(\d+)\s*[аa](?:\s|$)/)?.[1];
 const poles=q.match(/(?:^|\s)(\d+)\s*(?:полюс\S*|ф)(?:\s|$)/)?.[1];
 if(amps)items=items.filter(p=>new RegExp('(?:^|[^0-9])'+amps+'\\s*[аa](?:[^а-яa-z0-9]|$)','i').test(norm(p.name))||String(p.properties.NOMINALNYY_TOK||'').match(/\d+/)?.[0]===amps);
 if(poles)items=items.filter(p=>String(p.properties.KOLICHESTVO_POLYUSOV)===poles||new RegExp('(?:^|\\s)'+poles+'(?:ф|p)(?:\\s|$)','i').test(p.name));
 const skip=/^(есть|товар|товары|нужен|нужно|нужна|подбери|найди|покажи|мне|на|в|по|и|или|для|какой|какие|характеристики|наличие|сколько|стоит|цена|сертификат|добавь|добавить|корзину|шт|штук|аналог|аналоги|его|него|этого|этот)$/;
 const terms=tokens.filter(t=>!skip.test(t));
 if(!terms.length)return [];
 return items.map(p=>{const text=norm([p.name,p.article,...Object.values(p.properties)].join(' '));let score=0;for(const t of terms){if([String(p.id),norm(p.article),norm(p.properties.ARTIKULPOSTAVSHCHIKA)].includes(t))score+=100;else if(text.includes(t))score+=4;else if(t.startsWith('автомат')&&/ав |выключател|диф/.test(text))score+=4;else if(t.startsWith('ламп')&&/led|ламп/.test(text))score+=4;else score-=2;}return{p,score}}).filter(v=>v.score>0).sort((a,b)=>b.score-a.score).slice(0,8).map(v=>v.p);
}
export function alternatives(items:Product[],p:Product){
 const keys=['NOMINALNYY_TOK','KOLICHESTVO_POLYUSOV','NOMINALNOE_NAPRYAZHENIE','NOMINALNAYA_OTKLYUCHAYUSHCHAYA_SPOSOBNOST'];
 const family=(v:Product)=>v.url.split('/').slice(0,-2).join('/');
 if(p.warning)return [];
 return items.filter(v=>v.id!==p.id&&v.quantity>0&&!v.warning&&family(v)===family(p)).map(v=>{const matched=keys.filter(k=>p.properties[k]&&v.properties[k]&&norm(p.properties[k])===norm(v.properties[k]));const mismatch=keys.some(k=>p.properties[k]&&v.properties[k]&&norm(p.properties[k])!==norm(v.properties[k]));return{product:v,matched,mismatch}}).filter(v=>!v.mismatch&&v.matched.length>=2).sort((a,b)=>b.matched.length-a.matched.length).slice(0,3);
}
export function validateCount(p:Product,count:number,existing=0){
 if(!Number.isSafeInteger(count)||count<=0||count>100000)throw Error('Количество должно быть целым положительным числом.');
 const step=Number(String(p.properties.KRATNOST_MIN||1).replace(',','.'));
 if(Number.isFinite(step)&&step>1&&Math.abs(count/step-Math.round(count/step))>1e-8)throw Error(`Минимальная кратность товара — ${step} шт.`);
 if(count+existing>p.quantity)throw Error(`Доступно ${p.quantity} шт.; в корзине уже ${existing}. Уменьшите количество.`);
}
export function summary(p:Product){
 const specs=[['NOMINALNYY_TOK','Ток'],['KOLICHESTVO_POLYUSOV','Полюсы'],['NOMINALNOE_NAPRYAZHENIE','Напряжение'],['NOMINALNAYA_OTKLYUCHAYUSHCHAYA_SPOSOBNOST','Отключающая способность'],['TORGOVAYA_MARKA','Бренд']].filter(([k])=>p.properties[k]).map(([k,l])=>`${l}: ${p.properties[k]}`).join(' · ');
 const stores=p.stores?.filter(s=>s.quantity>0).map(s=>`${s.name}: ${s.quantity}`).join('; ');
 return `${p.name}\nАртикул: ${p.article}. Цена: ${p.price.toLocaleString('ru-RU')} ₸. ${p.quantity>0?`В наличии ${p.quantity} шт.`:'Нет в наличии.'}\n${specs||p.description?.slice(0,1000)||'Характеристики в API не заполнены.'}${stores?'\nПо складам: '+stores:''}${p.warning?'\n⚠ '+p.warning:''}\nМинимальная кратность: ${p.properties.KRATNOST_MIN||'не указана'}.`;
}
export function explicitConfirmation(text:string){return /^(да[,]?\s+добавь|подтверждаю(?:\s+добавление)?|да[,]?\s+добавляй)[.!]?$/i.test(text.trim())}
