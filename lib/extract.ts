import {unzipSync,strFromU8} from 'fflate';
const decode=(s:string)=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));
const text=(s:string)=>decode(s.replace(/<[^>]+>/g,' ')).replace(/[ \t]+/g,' ').trim();
export async function extractFile(bytes:Uint8Array,name:string){
 if(name.endsWith('.txt')||name.endsWith('.csv'))return new TextDecoder().decode(bytes).slice(0,12000);
 if(name.endsWith('.pdf')){const {getDocumentProxy,extractText}=await import('unpdf');const pdf=await getDocumentProxy(bytes,{maxImageSize:4000000});try{if(pdf.numPages>25)throw Error('Допускается до 25 страниц PDF.');const r=await extractText(pdf,{mergePages:true});return String(r.text).slice(0,12000)}finally{await (pdf as any).destroy?.()}}
 if(!name.endsWith('.docx')&&!name.endsWith('.xlsx'))throw Error('Поддерживаются DOCX, XLSX, PDF, TXT, CSV и JPEG.');
 let total=0;const files=unzipSync(bytes,{filter:f=>{if(!/^(word\/document.xml|xl\/sharedStrings.xml|xl\/worksheets\/sheet\d+.xml)$/.test(f.name))return false;total+=f.originalSize;if(total>4000000)throw Error('Слишком большой распакованный документ.');return true}});
 if(name.endsWith('.docx')){const data=files['word/document.xml'];if(!data)throw Error('Некорректный DOCX.');return text(strFromU8(data).replace(/<\/w:p>/g,'\n')).slice(0,12000)}
 const strings=files['xl/sharedStrings.xml']?[...strFromU8(files['xl/sharedStrings.xml']).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(m=>text(m[1])):[];
 const rows=Object.entries(files).filter(([n])=>n.startsWith('xl/worksheets/')).map(([,data])=>[...strFromU8(data).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map(r=>[...r[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)].map(c=>{const value=c[2].match(/<v[^>]*>(.*?)<\/v>/)?.[1]||'';return /t="s"/.test(c[1])?strings[Number(value)]||'':/t="inlineStr"/.test(c[1])?text(c[2]):decode(value)}).join(' | ')).join('\n')).join('\n');return rows.slice(0,12000);
}
