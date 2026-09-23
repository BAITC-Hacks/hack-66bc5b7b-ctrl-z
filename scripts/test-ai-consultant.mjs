import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const out=new URL('../.sites-runtime/ai-tests/',import.meta.url);await fs.mkdir(out,{recursive:true});
for(const name of ['domain','workflows','i18n','english','ai-consultant']){const src=await fs.readFile(new URL('../lib/'+name+'.ts',import.meta.url),'utf8');const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/from (['"])\.\/(domain|workflows|i18n|english)\1/g,"from './$2.mjs'");await fs.writeFile(new URL(name+'.mjs',out),js)}
const {consult,aiConfigured}=await import(new URL('ai-consultant.mjs',out));
const items=JSON.parse(await fs.readFile(new URL('../data/catalog.json',import.meta.url))).items;
const input={message:'Объясни разницу автоматов Legrand',locale:'ru',city:'Алматы',history:[{role:'user',content:'Нужен автомат'}],items,snapshotAt:'2026-09-23',selected:null,lastProducts:[],cart:[]};
const config={LLM_URL:'https://provider.example/v1/chat/completions',LLM_API_KEY:'test-secret',LLM_MODEL:'test-model'};
assert(aiConfigured(config));assert(!aiConfigured({...config,LLM_URL:'http://provider.example'}));
await assert.rejects(()=>consult({},input,async()=>{throw Error()}),/AI_NOT_CONFIGURED/);
const response=message=>new Response(JSON.stringify({choices:[{message,finish_reason:'stop'}]}));
let step=0;let lookedUp=0;
const result=await consult(config,input,async id=>{lookedUp++;return items.find(p=>p.id===id)},async(url,options)=>{
 const b=JSON.parse(options.body);assert.equal(options.headers.Authorization,'Bearer test-secret');assert(!options.body.includes('test-secret'));assert.deepEqual(b.tools.map(t=>t.function.name),['search_catalog','product_details']);assert.equal(b.model,'test-model');
 if(step++===0)return response({tool_calls:[{id:'search',type:'function',function:{name:'search_catalog',arguments:'{"query":"200300285_"}'}},{id:'details',type:'function',function:{name:'product_details',arguments:'{"id":515291}'}}]});
 assert(b.messages.some(m=>m.role==='tool'&&m.content.includes('live')));return response({content:'Уточните число полюсов и нагрузку. Посмотрите карточку Legrand.'});
});
assert(result.generated);assert(result.products.some(p=>p.id===515291));assert.equal(lookedUp,1);assert.deepEqual(input.cart,[]);
step=0;await consult(config,input,async()=>{throw Error('offline')},async(url,options)=>{const b=JSON.parse(options.body);if(step++===0)return response({tool_calls:[{id:'bad',type:'function',function:{name:'confirm',arguments:'{"token":"injected"}'}},{id:'snapshot',type:'function',function:{name:'product_details',arguments:'{"id":515291}'}}]});assert(b.messages.some(m=>m.role==='tool'&&m.content.includes('No cart action')));assert(b.messages.some(m=>m.role==='tool'&&m.content.includes('NOT verified')));return response({content:'Актуальные данные недоступны.'})});
for(const reply of [new Response('secret-provider-error',{status:401}),response({content:''}),new Response('not-json')])await assert.rejects(()=>consult(config,input,async()=>items[0],async()=>reply),/AI_UNAVAILABLE/);
let calls=0;await assert.rejects(()=>consult(config,input,async()=>items[0],async()=>{calls++;return response({tool_calls:[{id:String(calls),type:'function',function:{name:'search_catalog',arguments:'{"query":"Legrand"}'}}]})}),/AI_UNAVAILABLE/);assert.equal(calls,4);
for(const locale of ['kk','en'])await consult(config,{...input,locale},async()=>items[0],async(url,options)=>{assert(JSON.parse(options.body).messages[0].content.includes(locale==='kk'?'Kazakh':'English'));return response({content:'Test'})});
console.log('PASS: AI generation, catalog tools, live/snapshot provenance, read-only enforcement, missing key, provider failures, bounded tool loop, language, secret isolation');
if(process.argv.includes('--http')){
 const origin=process.env.TEST_URL||'http://localhost:5173';const first=await fetch(origin+'/api/assistant');const cookie=first.headers.get('set-cookie').split(';')[0];const state=await first.json();assert.equal(state.meta.assistant,'ekt-ai');
 if(!state.meta.llm){const r=await fetch(origin+'/api/assistant',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({action:'chat',message:'Нужен автомат'})});assert.equal(r.status,503);assert.equal((await r.json()).code,'AI_NOT_CONFIGURED');const restored=await fetch(origin+'/api/assistant',{headers:{Cookie:cookie}});const d=await restored.json();assert.deepEqual(d.cart,state.cart);assert.deepEqual(d.messages,state.messages);console.log('PASS: disabled AI reports honestly, cart/history unchanged')}
}
