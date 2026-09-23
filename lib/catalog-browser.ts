import {norm,type Product} from './domain';
import {available} from './workflows';
export const categories=[
 {id:'breakers',name:'Автоматические выключатели',kk:'Автоматты ажыратқыштар',short:'Автоматы',kkShort:'Автоматтар'},
 {id:'protection',name:'УЗО и дифференциальная защита',kk:'ҚАҚ және дифференциалды қорғаныс',short:'Защита',kkShort:'Қорғаныс'},
 {id:'relays',name:'Реле и автоматизация',kk:'Реле және автоматика',short:'Автоматизация',kkShort:'Автоматика'},
 {id:'lighting',name:'Светильники и лампы',kk:'Шамдар және жарықтандыру',short:'Освещение',kkShort:'Жарықтандыру'},
 {id:'boxes',name:'Монтажные коробки',kk:'Монтаж қораптары',short:'Коробки',kkShort:'Қораптар'},
 {id:'panels',name:'Щитовое оборудование',kk:'Қалқан жабдықтары',short:'Щиты',kkShort:'Қалқандар'},
 {id:'other',name:'Другие товары',kk:'Басқа тауарлар',short:'Другие товары',kkShort:'Басқа тауарлар'}
];
export function categoryOf(p:Product){const u=p.url.toLowerCase();if(/korobki/.test(u))return 'boxes';if(/shchitovoe/.test(u))return 'panels';if(/rele_|avtomatizatsiya/.test(u))return 'relays';if(/differents|differen/.test(u))return 'protection';if(/svetilniki|megalight/.test(u))return 'lighting';if(/avtomaticheskie|dekraft/.test(u))return 'breakers';return 'other'}
export type CatalogFilters={query:string;category:string;brand:string;stock:boolean;min:string;max:string;sort:string;city:string;amps:string};
export const emptyFilters:CatalogFilters={query:'',category:'all',brand:'all',stock:false,min:'',max:'',sort:'default',city:'Все склады',amps:'all'};
export function filterCatalog(items:Product[],f:CatalogFilters){
 const q=norm(f.query.trim()),tokens=q.split(/\s+/).filter(Boolean);
 const list=items.filter(p=>{
  if(f.category!=='all'&&categoryOf(p)!==f.category)return false;
  if(f.brand!=='all'&&String(p.properties.TORGOVAYA_MARKA||'').trim()!==f.brand)return false;
  if(f.stock&&available(p,f.city)<=0)return false;
  if(f.min!==''&&Number.isFinite(Number(f.min))&&p.price<Number(f.min))return false;
  if(f.max!==''&&Number.isFinite(Number(f.max))&&p.price>Number(f.max))return false;
  if(f.amps!=='all'&&String(p.properties.NOMINALNYY_TOK||'').match(/\d+/)?.[0]!==f.amps)return false;
  const text=norm([p.id,p.article,p.name,...Object.values(p.properties)].join(' '));
  return tokens.every(term=>text.includes(term)||(/автомат|автоматы|автоматын/.test(term)&&categoryOf(p)==='breakers'));
 });
 return list.sort((a,b)=>f.sort==='price-up'?a.price-b.price:f.sort==='price-down'?b.price-a.price:f.sort==='stock'?available(b,f.city)-available(a,f.city):f.sort==='name'?a.name.localeCompare(b.name,'ru'):Number(!!a.warning)-Number(!!b.warning)||Number(available(b,f.city)>0)-Number(available(a,f.city)>0));
}
