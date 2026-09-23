"use client";
import {createContext,useContext,useEffect,useState} from 'react';
import {translate,type Locale} from '@/lib/i18n';
const Context=createContext({locale:'ru' as Locale,setLocale:(_v:Locale)=>{},t:(s:unknown)=>String(s??'')});
export function LocaleProvider({children}:{children:React.ReactNode}){
 const [locale,setValue]=useState<Locale>('ru');
 useEffect(()=>{const saved=localStorage.getItem('ekt-locale');if(saved==='kk')setValue(saved);const sync=(e:StorageEvent)=>{if(e.key==='ekt-locale'&&(e.newValue==='ru'||e.newValue==='kk'))setValue(e.newValue)};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)},[]);
 useEffect(()=>{document.documentElement.lang=locale;document.title=locale==='kk'?'Электрокомплект · Кеңесші':'Электрокомплект · Консультант'},[locale]);
 function setLocale(v:Locale){setValue(v);localStorage.setItem('ekt-locale',v)}
 return <Context.Provider value={{locale,setLocale,t:s=>translate(s,locale)}}>{children}</Context.Provider>
}
export const useLocale=()=>useContext(Context);
export function LanguagePicker(){const{locale,setLocale}=useLocale();return <div className="language-picker" role="group" aria-label={locale==='kk'?'Тілді таңдау':'Выбор языка'}>{(['ru','kk'] as const).map(v=><button key={v} lang={v} type="button" aria-pressed={locale===v} onClick={()=>setLocale(v)}>{v==='ru'?'Рус':'Қаз'}</button>)}</div>}
