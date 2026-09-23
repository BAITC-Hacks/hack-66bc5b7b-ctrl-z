"use client";
import {createContext,useContext,useEffect,useState} from 'react';
import {translate,type Locale} from '@/lib/i18n';
import {initialRates,formatMoney,formatAmount,lineAmount,rateFor,symbolFor,localDate,type Rates} from '@/lib/currency';
const valid=(v:unknown):v is Locale=>v==='ru'||v==='kk'||v==='en';
const Context=createContext({locale:'ru' as Locale,setLocale:(_v:Locale)=>{},t:(s:unknown)=>String(s??''),money:(n:number,count=1)=>formatMoney(n,'ru',initialRates,count),total:(rows:{price:number;count:number}[])=>formatAmount(rows.reduce((sum,p)=>sum+lineAmount(p.price,p.count,'ru',initialRates),0),'ru'),rates:initialRates,rate:initialRates.RUB,symbol:'₽',rateUnavailable:false});
export function LocaleProvider({children}:{children:React.ReactNode}){
 const [locale,setValue]=useState<Locale>('ru'),[rates,setRates]=useState<Rates>(initialRates),[rateUnavailable,setUnavailable]=useState(false);
 useEffect(()=>{try{const saved=localStorage.getItem('ekt-locale');if(valid(saved))setValue(saved)}catch{}const sync=(e:StorageEvent)=>{if(e.key==='ekt-locale'&&valid(e.newValue))setValue(e.newValue)};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)},[]);
 useEffect(()=>{document.documentElement.lang=locale;document.title=locale==='kk'?'Электрокомплект · Кеңесші':locale==='en'?'Elektrokomplekt · Assistant':'Электрокомплект · Консультант'},[locale]);
 useEffect(()=>{let active=true;async function refresh(){try{const r=await fetch('/api/rates',{cache:'no-store'});if(!r.ok)throw Error();const d=await r.json() as Rates & {stale:boolean;unavailable:boolean};if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||!Number.isFinite(d.USD)||d.USD<=0||!Number.isFinite(d.RUB)||d.RUB<=0)throw Error();if(active){setRates(d);setUnavailable(d.stale||d.unavailable)}}catch{if(active)setUnavailable(true)}}refresh();const timer=setInterval(refresh,300000);window.addEventListener('focus',refresh);return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',refresh)}},[]);
 function setLocale(v:Locale){setValue(v);try{localStorage.setItem('ekt-locale',v)}catch{}}
 const money=(n:number,count=1)=>formatMoney(n,locale,rates,count);
 const total=(rows:{price:number;count:number}[])=>formatAmount(rows.reduce((sum,p)=>sum+lineAmount(p.price,p.count,locale,rates),0),locale);
 const t=(value:unknown)=>{let s=String(value??'');if(locale!=='kk')s=s.replace(/\d[\d\s\u00a0\u202f]*(?:[.,]\d+)?\s*₸/g,m=>money(Number(m.replace(/[\s\u00a0\u202f₸]/g,'').replace(',','.'))));return translate(s,locale)};
 return <Context.Provider value={{locale,setLocale,t,money,total,rates,rate:rateFor(locale,rates),symbol:symbolFor(locale),rateUnavailable:rateUnavailable||rates.date!==localDate()}}>{children}</Context.Provider>
}
export const useLocale=()=>useContext(Context);
export function LanguagePicker(){const{locale,setLocale}=useLocale();return <div className="language-picker" role="group" aria-label={locale==='en'?'Language':locale==='kk'?'Тілді таңдау':'Выбор языка'}>{(['ru','kk','en'] as const).map(v=><button key={v} lang={v} type="button" aria-pressed={locale===v} onClick={()=>setLocale(v)}>{v==='ru'?'Рус':v==='kk'?'Қаз':'Eng'}</button>)}</div>}
export function CurrencyNotice(){const{locale,t,rates,rateUnavailable}=useLocale();return <div className="currency-notice"><span>{locale==='kk'?'Бағалар теңгемен':locale==='en'?'Prices in USD':'Цены в рублях'}</span>{locale!=='kk'&&<><a href={rates.source} target="_blank" rel="noreferrer">{t('Курс НБК от')}{' '}{rates.date}: 1 {locale==='en'?'USD':'RUB'} = {locale==='en'?rates.USD:rates.RUB} ₸</a><span>{t('Пересчёт для удобства. Исходные цены — в тенге.')}</span>{rateUnavailable&&<strong role="status">{t('Курс за сегодня недоступен — показан последний проверенный курс.')}</strong>}</>}</div>}
