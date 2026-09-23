import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const out=path.resolve('.sites-runtime/workflow-tests');await fs.mkdir(out,{recursive:true});
for(const name of ['domain','workflows']){const source=await fs.readFile(`lib/${name}.ts`,'utf8');const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/from ['"]\.\/domain['"]/g,"from './domain.mjs'");await fs.writeFile(path.join(out,name+'.mjs'),compiled)}
const {available,parseSpecification,stageChange,confirmChange,managerDraft}=await import(pathToFileURL(path.join(out,'workflows.mjs')));
const sample=JSON.parse(await fs.readFile('data/catalog.json','utf8')).items;
assert.equal(available(sample.find(p=>p.id===515291),'Алматы'),5);
const p={id:11,article:'A-11',name:'Test product',price:100,quantity:10,properties:{KRATNOST_MIN:'1'},stores:[{name:'Алматы',quantity:5}],url:'https://ekt.kz/catalog/test/11/'};
let current=structuredClone(p);const lookup=async id=>({...structuredClone(current),id});const empty=[];
let proposal=await stageChange(empty,'add',[{id:11,count:2}],'Алматы',lookup);assert.equal(empty.length,0);
current.price=110;let result=await confirmChange(empty,proposal,proposal.token,lookup);assert.equal(result.cart.length,0);assert(result.pending);assert.notEqual(result.pending.token,proposal.token);
result=await confirmChange(empty,result.pending,result.pending.token,lookup);assert.equal(result.cart[0].count,2);assert.equal(result.cart[0].price,110);const cart=result.cart;
proposal=await stageChange(cart,'set',[{id:11,count:3}],'Алматы',lookup);assert.equal(cart[0].count,2);result=await confirmChange(cart,proposal,proposal.token,lookup);assert.equal(result.cart[0].count,3);
await assert.rejects(()=>stageChange(cart,'batch',[{id:11,count:2},{id:11,count:2}],'Алматы',lookup));
for(const count of [0,-1,1.5,NaN])await assert.rejects(()=>stageChange(cart,'set',[{id:11,count}],'Алматы',lookup));
proposal=await stageChange(cart,'add',[{id:11,count:1}],'Алматы',lookup);current.stores[0].quantity=1;await assert.rejects(()=>confirmChange(cart,proposal,proposal.token,lookup));assert.equal(cart[0].count,2);
current.stores[0].quantity=5;proposal=await stageChange(cart,'remove',[{id:11,count:0}],'Алматы',async()=>{throw Error('Must not fetch for removal')});result=await confirmChange(cart,proposal,proposal.token,lookup);assert.equal(result.cart.length,0);assert.equal(cart.length,1);
await assert.rejects(()=>confirmChange(cart,proposal,'wrong-token',lookup));
proposal.expires=0;result=await confirmChange(cart,proposal,proposal.token,lookup);assert.deepEqual(result.cart,cart);assert.equal(result.pending,null);
const immutable=JSON.stringify(cart);await assert.rejects(()=>stageChange(cart,'batch',[{id:11,count:1},{id:12,count:1}],'Алматы',async id=>id===11?current:{...current,id,quantity:0,stores:[]}));assert.equal(JSON.stringify(cart),immutable);
const rows=parseSpecification('Артикул;Количество\nA-11;2\nA-11\nНеизвестный товар;3',[p]);assert.equal(rows.length,3);assert.equal(rows[0].productId,11);assert.equal(rows[0].count,2);assert.equal(rows[1].count,null);assert.equal(rows[2].status,'not_found');assert.equal(parseSpecification('A-11,2',[p])[0].count,2);
assert.match(managerDraft({cart,city:'Алматы',messages:[]}),/демонстрационная корзина/);
console.log('PASS: city stock, price reconfirmation, confirmed edits/removal, cumulative batch limits, stock changes, expired/wrong tokens, failure atomicity, specification matching, manager draft');
if(process.argv.includes('--unit'))process.exit(0);
const origin=process.env.TEST_URL||'http://localhost:5173';const first=await fetch(origin+'/api/assistant');assert.equal(first.status,200);const cookie=first.headers.get('set-cookie').split(';')[0];
async function call(body){const r=await fetch(origin+'/api/assistant',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()}}
let d=await call({action:'city',city:'Алматы'});assert.equal(d.status,200);assert.equal(d.data.city,'Алматы');assert.equal(d.data.cart.length,0);
d=await call({action:'spec_parse',text:'200300285_;2\n200300274_;1'});assert.equal(d.status,200);assert.equal(d.data.specification.length,2);assert.equal(d.data.specification[0].productId,515291);assert.equal(d.data.cart.length,0);
d=await call({action:'handoff'});assert.equal(d.status,200);assert.match(d.data.draft,/Алматы/);assert.equal(d.data.cart.length,0);
d=await call({action:'compare',ids:[515291,515291]});assert.equal(d.status,400);
d=await call({action:'city',city:'Неизвестный'});assert.equal(d.status,400);
const restored=await fetch(origin+'/api/assistant',{headers:{Cookie:cookie}});assert.equal((await restored.json()).city,'Алматы');
console.log('PASS: HTTP city persistence, batch preview without cart mutation, handoff draft, invalid comparison/city rejected');
if(process.argv.includes('--live')){
 d=await call({action:'batch_propose',rows:[{id:515291,count:1},{id:515291,count:1}]});assert.equal(d.status,200,JSON.stringify(d.data));assert.equal(d.data.cart.length,0);assert.equal(d.data.pending.lines[0].count,2);
 d=await call({action:'confirm',token:d.data.pending.token});assert.equal(d.status,200);assert.equal(d.data.cart[0].count,2);
 d=await call({action:'cart_set',id:515291,count:3});assert.equal(d.status,200);assert.equal(d.data.cart[0].count,2);
 d=await call({action:'confirm',token:d.data.pending.token});assert.equal(d.status,200);assert.equal(d.data.cart[0].count,3);
 d=await call({action:'cart_remove',id:515291});assert.equal(d.status,200);assert.equal(d.data.cart.length,1);
 d=await call({action:'confirm',token:d.data.pending.token});assert.equal(d.status,200);assert.equal(d.data.cart.length,0);
 console.log('PASS: live HTTP batch, confirmed quantity edit, confirmed removal');
}
