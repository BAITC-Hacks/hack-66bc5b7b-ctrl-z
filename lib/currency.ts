import type {Locale} from './i18n';
export type Rates={date:string;USD:number;RUB:number;source:string};
// Verified against the NBK dated feed. Used only with its actual date displayed.
export const initialRates:Rates={date:'2026-09-23',USD:447.85,RUB:5.31,source:'https://nationalbank.kz/ru/page/RSS'};
export const currencyFor=(locale:Locale)=>locale==='en'?'USD':locale==='ru'?'RUB':'KZT';
export const symbolFor=(locale:Locale)=>locale==='en'?'$':locale==='ru'?'₽':'₸';
export const localeTag=(locale:Locale)=>locale==='en'?'en-US':locale==='ru'?'ru-RU':'kk-KZ';
export const rateFor=(locale:Locale,rates:Rates)=>locale==='kk'?1:rates[currencyFor(locale) as 'USD'|'RUB'];
export const convertPrice=(kzt:number,locale:Locale,rates:Rates)=>Math.round((kzt/rateFor(locale,rates)+Number.EPSILON)*100)/100;
export const formatAmount=(amount:number,locale:Locale)=>new Intl.NumberFormat(localeTag(locale),{style:'currency',currency:currencyFor(locale),minimumFractionDigits:2,maximumFractionDigits:2}).format(amount);
export const lineAmount=(kzt:number,count:number,locale:Locale,rates:Rates)=>Math.round(convertPrice(kzt,locale,rates)*100)*count/100;
export const formatMoney=(kzt:number,locale:Locale,rates:Rates,count=1)=>formatAmount(lineAmount(kzt,count,locale,rates),locale);
export function localDate(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Almaty',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}
export function parseRates(xml:string,expected:string):Rates{
 const date=xml.match(/<date>\s*(\d{2})\.(\d{2})\.(\d{4})\s*<\/date>/);
 if(!date||`${date[3]}-${date[2]}-${date[1]}`!==expected)throw Error('Rate date does not match');
 const result:Rates={date:expected,USD:0,RUB:0,source:initialRates.source};
 for(const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)){
  const code=match[1].match(/<title>\s*(USD|RUB)\s*<\/title>/)?.[1] as 'USD'|'RUB'|undefined;
  if(!code)continue;
  const value=Number(match[1].match(/<description>\s*([\d.,]+)\s*<\/description>/)?.[1]?.replace(',','.'));
  const quant=Number(match[1].match(/<quant>\s*(\d+)\s*<\/quant>/)?.[1]);
  if(!Number.isFinite(value)||value<=0||!Number.isFinite(quant)||quant<=0)throw Error('Invalid rate');
  result[code]=Number((value/quant).toFixed(10));
 }
 if(!result.USD||!result.RUB)throw Error('Missing rates');return result;
}
