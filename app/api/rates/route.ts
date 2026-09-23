import {initialRates,localDate,parseRates} from '@/lib/currency';
let saved=initialRates,checkedAt=0;
export async function GET(){
 const today=localDate();let unavailable=false;
 if(saved.date!==today||Date.now()-checkedAt>3600000){
  try{const date=today.split('-').reverse().join('.');const response=await fetch(`https://nationalbank.kz/rss/get_rates.cfm?fdate=${date}`,{signal:AbortSignal.timeout(8000),cache:'no-store'});if(!response.ok)throw Error('Rates unavailable');saved=parseRates(await response.text(),today);checkedAt=Date.now()}catch{unavailable=true}
 }
 return Response.json({...saved,stale:saved.date!==today,unavailable},{headers:{'Cache-Control':'no-store'}});
}
