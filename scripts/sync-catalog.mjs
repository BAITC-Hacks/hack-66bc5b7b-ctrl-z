import {writeFile, mkdir} from 'node:fs/promises';
const user=process.env.EKT_API_USER, pass=process.env.EKT_API_PASSWORD;
if(!user||!pass) throw Error('Set EKT_API_USER and EKT_API_PASSWORD');
const headers={Authorization:'Basic '+Buffer.from(`${user}:${pass}`).toString('base64')};
async function get(path){const r=await fetch('https://ekt.kz/api/products'+path,{headers,signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`EKT ${r.status}`);return r.json()}
const records=[];
for(let page=1;page<=Number(process.env.CATALOG_PAGES||5);page++){
 const list=await get(`?page=${page}`); if(!Array.isArray(list.items))throw Error('Unexpected list schema');if(!list.items.length)break;
 for(let i=0;i<list.items.length;i+=4){records.push(...await Promise.all(list.items.slice(i,i+4).map(p=>get(`/detail?id=${p.id}`))));}
 console.log(`Page ${page}: ${records.length} products`);
}
await mkdir('data',{recursive:true});await writeFile('data/catalog.json',JSON.stringify({syncedAt:new Date().toISOString(),pages:Number(process.env.CATALOG_PAGES||5),items:records},null,2));
