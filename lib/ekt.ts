import {decorate} from './domain';
import {settings} from './store';
export async function liveProduct(id:number){
 if(!Number.isSafeInteger(id)||id<=0)throw Error('Некорректный ID товара.');
 const e=settings();if(!e.EKT_API_USER||!e.EKT_API_PASSWORD)throw Error('Доступ к живому каталогу не настроен. Добавление недоступно.');
 let r:Response;try{r=await fetch(`https://ekt.kz/api/products/detail?id=${id}`,{headers:{Authorization:'Basic '+btoa(e.EKT_API_USER+':'+e.EKT_API_PASSWORD)},signal:AbortSignal.timeout(8000)})}catch{throw Error('Каталог временно недоступен. Не удалось проверить цену и остаток; корзина не изменена.')}
 if(!r.ok)throw Error('Каталог не подтвердил товар. Корзина не изменена.');const p=decorate(await r.json());if(p.id!==id)throw Error('API вернул другой товар.');return p;
}
