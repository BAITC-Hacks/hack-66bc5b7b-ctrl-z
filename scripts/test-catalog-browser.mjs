import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import ts from 'typescript';
const base=new URL('../.sites-runtime/catalog-tests/',import.meta.url);await mkdir(base,{recursive:true});
for(const name of ['domain','workflows','catalog-browser']){const src=await readFile(new URL('../lib/'+name+'.ts',import.meta.url),'utf8');let js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;js=js.replaceAll("'./domain'","'./domain.mjs'").replaceAll("'./workflows'","'./workflows.mjs'");await writeFile(new URL(name+'.mjs',base),js)}
const {filterCatalog,emptyFilters,categoryOf,categories}=await import(new URL('catalog-browser.mjs',base));const{available}=await import(new URL('workflows.mjs',base));const data=JSON.parse(await readFile(new URL('../data/catalog.json',import.meta.url),'utf8'));const items=data.items;
assert.equal(filterCatalog(items,emptyFilters).length,items.length);
assert.deepEqual(filterCatalog(items,{...emptyFilters,query:'200300273_'}).map(p=>p.id),[515279]);
assert(filterCatalog(items,{...emptyFilters,category:'breakers',query:'автомат',brand:'Legrand'}).every(p=>p.properties.TORGOVAYA_MARKA==='Legrand'&&categoryOf(p)==='breakers'));
assert(filterCatalog(items,{...emptyFilters,stock:true,city:'Алматы'}).every(p=>available(p,'Алматы')>0));
assert(filterCatalog(items,{...emptyFilters,min:'1000',max:'5000'}).every(p=>p.price>=1000&&p.price<=5000));
assert.equal(filterCatalog(items,{...emptyFilters,min:'5000',max:'1000'}).length,0);
const sorted=filterCatalog(items,{...emptyFilters,sort:'price-up'});assert(sorted.every((p,i)=>i===0||p.price>=sorted[i-1].price));
const amps=filterCatalog(items,{...emptyFilters,amps:'40'});assert(amps.length>0);assert(amps.every(p=>String(p.properties.NOMINALNYY_TOK).match(/\d+/)?.[0]==='40'));
const groups=categories.map(c=>items.filter(p=>categoryOf(p)===c.id).length);assert.equal(groups.reduce((a,b)=>a+b,0),items.length);
const featured=filterCatalog(items,emptyFilters).filter(p=>p.image).filter((p,i,all)=>all.findIndex(x=>categoryOf(x)===categoryOf(p))===i).slice(0,4);assert.equal(new Set(featured.map(categoryOf)).size,featured.length);
console.log('PASS: complete catalog, exact SKU, category/brand combinations, city stock, price bounds, sorting, current filter, category counts, featured category diversity');
const response=await fetch((process.env.TEST_URL||'http://localhost:5173')+'/api/catalog');assert.equal(response.status,200);const api=await response.json();assert.equal(api.items.length,items.length);assert(api.syncedAt);assert(!JSON.stringify(api).includes('EKT_API_PASSWORD'));
console.log('PASS: public catalog endpoint and snapshot date');
