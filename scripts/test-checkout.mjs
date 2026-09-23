import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const out=new URL('../.sites-runtime/checkout-tests/',import.meta.url);await fs.mkdir(out,{recursive:true});
for(const name of ['domain','workflows','checkout']){const src=await fs.readFile(new URL('../lib/'+name+'.ts',import.meta.url),'utf8');await fs.writeFile(new URL(name+'.mjs',out),ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/from (['"])\.\/(domain|workflows)\1/g,"from './$2.mjs'"))}
const {checkoutForm,quoteCheckout,confirmCheckout,dayAfter}=await import(new URL('checkout.mjs',out));
const now=Date.parse('2026-09-23T12:00:00Z');
const form={firstName:'Тест',lastName:'Тестов',patronymic:'',phone:'+7 700 000 00 00',email:'test@example.com',delivery:'courier',city:'Алматы',street:'Тестовая',house:'1',date:dayAfter(1,now),slot:'09:00–12:00',payment:'terminal',consent:true};
const product={id:1,article:'01',name:'Тест',price:100,quantity:10,stores:[{name:'Алматы',quantity:5}],properties:{KRATNOST_MIN:'1'},url:'https://ekt.kz/'};
const state={cart:[{id:1,count:2,price:90,city:'Алматы'}],pending:null};const lookup=async()=>product;
assert.throws(()=>checkoutForm({...form,phone:'abc'},now),/PHONE/);assert.throws(()=>checkoutForm({...form,date:'2026-09-23'},now),/DATE/);assert.throws(()=>checkoutForm({...form,date:'2026-02-30'},now),/DATE/);assert.throws(()=>checkoutForm({...form,consent:false},now),/CONSENT/);assert.throws(()=>checkoutForm({...form,street:''},now),/FORM/);assert.throws(()=>checkoutForm({...form,payment:'online'},now),/FORM/);
assert.equal(checkoutForm({...form,delivery:'pickup',street:'',house:'',cardNumber:'should-not-persist',cvv:'should-not-persist'},now).street,'');assert(!JSON.stringify(checkoutForm({...form,cardNumber:'should-not-persist',cvv:'should-not-persist'},now)).includes('should-not-persist'));
state.checkout=await quoteCheckout(state,form,lookup,now);assert.equal(state.checkout.priceChanged,true);assert.equal(state.checkout.totalKZT,200);assert.equal(state.cart[0].price,90);
const order=await confirmCheckout(state,state.checkout.token,lookup,now);assert.equal(order.status,'demo');assert.equal(order.paymentStatus,'not_paid');assert.equal(order.deliveryFee,null);assert.equal(order.totalKZT,200);assert.equal(state.cart[0].count,2);
await assert.rejects(()=>confirmCheckout(state,'wrong',lookup,now),/EXPIRED/);await assert.rejects(()=>confirmCheckout(state,state.checkout.token,lookup,now+300001),/EXPIRED/);
await assert.rejects(()=>confirmCheckout(state,state.checkout.token,async()=>({...product,price:101}),now),/PRICE_CHANGED/);
await assert.rejects(()=>confirmCheckout({...state,cart:[{...state.cart[0],count:3}]},state.checkout.token,lookup,now),/CHANGED/);
await assert.rejects(()=>quoteCheckout({...state,pending:{}},form,lookup,now),/PENDING/);
await assert.rejects(()=>quoteCheckout({...state,cart:[]},form,lookup,now),/EMPTY/);
await assert.rejects(()=>quoteCheckout(state,form,async()=>({...product,stores:[]}),now));
state.orders=[order];state.checkout=null;assert.equal((await confirmCheckout(state,order.token,async()=>{throw Error('must not re-check duplicate')},now)).id,order.id);
console.log('PASS: checkout required fields, phone/date/consent, pickup, card data excluded, price refresh/reconfirmation, stock, expiry, cart change, pending action, idempotent receipt, no payment/cart mutation');
if(process.argv.includes('--http')){const origin=process.env.TEST_URL||'http://localhost:5173';const r=await fetch(origin+'/api/assistant');const cookie=r.headers.get('set-cookie').split(';')[0];const post=async(body,source=origin)=>fetch(origin+'/api/checkout',{method:'POST',headers:{Cookie:cookie,Origin:source,'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal((await post({action:'quote',form:{...form,date:dayAfter(1)}})).status,409);assert.equal((await post({action:'quote',form},'https://other.invalid')).status,403);assert.equal((await fetch(origin+'/api/checkout')).status,401);const orders=await fetch(origin+'/api/checkout',{headers:{Cookie:cookie}});assert.deepEqual((await orders.json()).orders,[]);console.log('PASS: HTTP session isolation, CSRF, empty cart rejected')}
