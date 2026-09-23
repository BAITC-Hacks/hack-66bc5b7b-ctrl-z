import {writeFile, mkdir,rename,readFile} from 'node:fs/promises';
const user=process.env.EKT_API_USER, pass=process.env.EKT_API_PASSWORD;
if(!user||!pass) throw Error('Set EKT_API_USER and EKT_API_PASSWORD');
const headers={Authorization:'Basic '+Buffer.from(`${user}:${pass}`).toString('base64')};
async function get(path){for(let attempt=0;attempt<3;attempt++){try{const r=await fetch('https://ekt.kz/api/products'+path,{headers,signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`EKT ${r.status}`);return await r.json()}catch(e){if(attempt===2)throw e;await new Promise(r=>setTimeout(r,600*(attempt+1)))}}}
const pageSetting=process.env.CATALOG_PAGES||'30',pages=pageSetting==='all'?Infinity:Number(pageSetting),cap=Number(process.env.CATALOG_MAX_PRODUCTS||10000);
if(!(pages>0)||!Number.isSafeInteger(cap)||cap<20)throw Error('Invalid pagination settings');
await mkdir('work',{recursive:true});await mkdir('data',{recursive:true});
let records=[],start=1,complete=false,readPages=0;
if(process.argv.includes('--resume')){try{const saved=JSON.parse(await readFile('work/catalog-progress.json','utf8'));records=saved.items;start=saved.nextPage;readPages=start-1}catch{}}
const ids=new Set(records.map(p=>p.id));
for(let page=start;page<=pages&&records.length<cap;page++){
 const list=await get(`?page=${page}`);if(!Array.isArray(list.items))throw Error('Unexpected list schema');if(!list.items.length){complete=true;break}
 const fresh=list.items.filter(p=>!ids.has(p.id));if(!fresh.length)throw Error('Pagination repeated an earlier page; prior catalog preserved');
 for(let i=0;i<fresh.length&&records.length<cap;i+=4){const batch=await Promise.all(fresh.slice(i,i+Math.min(4,cap-records.length)).map(p=>get(`/detail?id=${p.id}`)));for(const p of batch){if(!Number.isFinite(p.price)||!Number.isFinite(p.quantity)||p.quantity<0||!p.id)throw Error('Incomplete product data; prior catalog preserved');ids.add(p.id);records.push(p)}}
 const partial=fresh.some(p=>!ids.has(p.id));readPages=partial?page-1:page;await writeFile('work/catalog-progress.json',JSON.stringify({nextPage:partial?page:page+1,items:records}));console.log(`Page ${page}: ${records.length} products`);
}
if(!records.length)throw Error('Empty catalog; prior catalog preserved');
const snapshot={syncedAt:new Date().toISOString(),pages:readPages,complete,items:records};
const serialized=JSON.stringify(snapshot,null,2);if(Buffer.byteLength(serialized)>12*1024*1024)throw Error('Catalog exceeds 12 MB embedded snapshot limit. Use a database index for production; previous snapshot preserved.');
await writeFile('data/catalog.next.json',serialized);await rename('data/catalog.next.json','data/catalog.json');
console.log(JSON.stringify({count:records.length,complete,pages:readPages}));
