import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const out=new URL('../.sites-runtime/currency-tests/',import.meta.url);await fs.mkdir(out,{recursive:true});
for(const name of ['english','i18n','currency','domain','workflows','catalog-browser']){
 const src=await fs.readFile(new URL('../lib/'+name+'.ts',import.meta.url),'utf8');
 const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/from '(.\/[^']+)'/g,"from '$1.mjs'");
 await fs.writeFile(new URL(name+'.mjs',out),js);
}
const {parseRates,initialRates,convertPrice,lineAmount,formatMoney,localDate}=await import(new URL('currency.mjs',out));
const xml='<rates><date>23.09.2026</date><item><title>USD</title><description>447.85</description><quant>1</quant></item><item><title>RUB</title><description>53.1</description><quant>10</quant></item></rates>';
assert.deepEqual(parseRates(xml,'2026-09-23'),initialRates);
assert.throws(()=>parseRates(xml,'2026-09-24'));
assert.throws(()=>parseRates(xml.replace('447.85','0'),'2026-09-23'));
assert.throws(()=>parseRates(xml.replace('<title>RUB</title>','<title>EUR</title>'),'2026-09-23'));
assert.equal(localDate(new Date('2026-09-22T20:00:00Z')),'2026-09-23');
assert.equal(convertPrice(447.85,'en',initialRates),1);assert.equal(convertPrice(5.31,'ru',initialRates),1);assert.equal(convertPrice(100,'kk',initialRates),100);
assert.equal(lineAmount(64920,2,'en',initialRates),289.92);assert.equal(formatMoney(64920,'en',initialRates,2),'$289.92');
const {translate,catalogQuery}=await import(new URL('i18n.mjs',out));
assert.equal(translate('Добавить','en'),'Add');assert.equal(translate('Добавить','kk'),'Қосу');
assert.match(catalogQuery('Find a 40 A Legrand circuit breaker'),/40 A/);
assert.match(catalogQuery('add 2 units'),/добавь 2 шт/);
const {filterCatalog,emptyFilters}=await import(new URL('catalog-browser.mjs',out));
const data=JSON.parse(await fs.readFile(new URL('../data/catalog.json',import.meta.url),'utf8'));
assert.deepEqual(filterCatalog(data.items,{...emptyFilters,query:'circuit breaker Legrand'}).map(p=>p.id),filterCatalog(data.items,{...emptyFilters,query:'автомат Legrand'}).map(p=>p.id));
assert(filterCatalog(data.items,{...emptyFilters,query:'Find a Legrand circuit breaker'}).length>0);
console.log('PASS: dated NBK XML, currency units, invalid/stale rates rejected, timezone date, rounding, English search and RU/KK/EN labels');

const cheap={...data.items[0],price:53};assert.equal(filterCatalog([cheap],{...emptyFilters,min:'0.12',max:'0.12'},447.85).length,1);
