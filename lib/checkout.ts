import {validateCount,type Product} from './domain';
import {available,cities} from './workflows';
export const deliverySlots=['09:00–12:00','12:00–15:00','15:00–18:00'];
export function dayAfter(days:number,now=Date.now()){return new Date(now+5*3600000+days*86400000).toISOString().slice(0,10)}
export function checkoutForm(raw:any,now=Date.now()){
 if(!raw||typeof raw!=='object')throw Error('FORM');
 const text=(key:string,max:number,required=false)=>{const v=typeof raw[key]==='string'?raw[key].trim():'';if(v.length>max||(required&&!v))throw Error('FORM');return v};
 const firstName=text('firstName',80,true),lastName=text('lastName',80,true),patronymic=text('patronymic',80),phone=text('phone',30,true),email=text('email',120);
 if(!/^\+?[\d\s()-]+$/.test(phone)||phone.replace(/\D/g,'').length<10||phone.replace(/\D/g,'').length>15)throw Error('PHONE');
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('EMAIL');
 if(!['courier','pickup'].includes(raw.delivery)||!['cash','terminal','invoice'].includes(raw.payment))throw Error('FORM');
 if(!cities.includes(raw.city)||raw.city==='Все склады')throw Error('CITY');
 const date=text('date',10,true);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date<dayAfter(1,now)||date>dayAfter(30,now)||!deliverySlots.includes(raw.slot))throw Error('DATE');
 if(raw.consent!==true)throw Error('CONSENT');
 return {firstName,lastName,patronymic,phone,email,delivery:raw.delivery as 'courier'|'pickup',city:raw.city as string,street:raw.delivery==='courier'?text('street',160,true):'',house:raw.delivery==='courier'?text('house',30,true):'',apartment:raw.delivery==='courier'?text('apartment',30):'',entrance:raw.delivery==='courier'?text('entrance',30):'',floor:raw.delivery==='courier'?text('floor',20):'',date,slot:raw.slot as string,payment:raw.payment as string,comment:text('comment',1000),consent:true};
}
export function cartKey(cart:any[]){return JSON.stringify(cart.map(p=>[p.id,p.count,p.price,p.city]).sort((a,b)=>a[0]-b[0]))}
export async function checkoutLines(cart:any[],city:string,lookup:(id:number)=>Promise<Product>){
 if(!cart.length||cart.length>50)throw Error('EMPTY');
 return Promise.all(cart.map(async row=>{const p=await lookup(row.id);if(p.id!==row.id)throw Error('PRODUCT');validateCount({...p,quantity:available(p,city)},row.count);if(!Number.isFinite(p.price)||p.price<0)throw Error('PRICE');return {id:p.id,article:p.article,name:p.name,count:row.count,price:p.price,url:p.url}}));
}
export async function quoteCheckout(state:any,form:any,lookup:(id:number)=>Promise<Product>,now=Date.now()){
 if(state.pending)throw Error('PENDING');
 const customer=checkoutForm(form,now),lines=await checkoutLines(state.cart,customer.city,lookup);
 return {token:crypto.randomUUID(),expires:now+300000,cartKey:cartKey(state.cart),customer,lines,totalKZT:Math.round(lines.reduce((sum,p)=>sum+p.price*p.count,0)*100)/100,priceChanged:lines.some(p=>state.cart.find((x:any)=>x.id===p.id)?.price!==p.price)};
}
export async function confirmCheckout(state:any,token:unknown,lookup:(id:number)=>Promise<Product>,now=Date.now()){
 if(typeof token!=='string')throw Error('EXPIRED');
 const existing=state.orders?.find((o:any)=>o.token===token);if(existing)return existing;
 const q=state.checkout;
 if(!q||q.token!==token||q.expires<now)throw Error('EXPIRED');
 if(state.pending||q.cartKey!==cartKey(state.cart))throw Error('CHANGED');
 checkoutForm(q.customer,now);
 const lines=await checkoutLines(state.cart,q.customer.city,lookup);
 if(lines.some((p,i)=>p.price!==q.lines[i]?.price))throw Error('PRICE_CHANGED');
 return {token,id:'DEMO-'+token.slice(0,8).toUpperCase(),createdAt:new Date(now).toISOString(),status:'demo',customer:q.customer,lines,totalKZT:q.totalKZT,paymentStatus:'not_paid',deliveryFee:null};
}
