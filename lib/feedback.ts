export function withMessageIds(messages:any[]){return messages.map((m,i)=>{if(m.id)return m;let h=2166136261;for(const c of m.role+'|'+m.text)h=Math.imul(h^c.charCodeAt(0),16777619);return {...m,id:`legacy-${i}-${h>>>0}`}})}
export function rateAnswer(messages:any[],id:unknown,value:unknown){
 if(typeof id!=='string'||![1,-1,null].includes(value as any))throw Error('Некорректная оценка ответа.');
 const list=withMessageIds(messages),target=list.find(m=>m.id===id&&m.role==='assistant');
 if(!target)throw Error('Ответ не найден в текущей сессии.');
 return list.map(m=>m.id===id?{...m,rating:value,ratedAt:new Date().toISOString()}:m);
}
