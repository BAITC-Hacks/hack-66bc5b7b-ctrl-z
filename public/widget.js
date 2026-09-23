(()=>{
 if(window.EKTWidget)return;
 const source=document.currentScript;const app=new URL(source?.dataset.app||new URL(source.src).origin);
 if(app.protocol!=='https:'&&!(app.protocol==='http:'&&['localhost','127.0.0.1'].includes(app.hostname)))return;
 const host=document.createElement('div');host.id='ekt-assistant-widget';const root=host.attachShadow({mode:'open'});
 const style=document.createElement('style');style.textContent=':host{position:fixed;z-index:2147483000;right:20px;bottom:20px;font-family:Arial,sans-serif}button{cursor:pointer;font:600 14px Arial;border:0}.launcher{background:#173e67;color:white;box-shadow:0 6px 22px #163c6633;padding:16px 22px;border-radius:28px}.panel{position:absolute;right:0;bottom:68px;width:min(460px,calc(100vw - 32px));height:min(760px,calc(100dvh - 115px));border:1px solid #c7d7e5;border-radius:16px;background:white;overflow:hidden;box-shadow:0 12px 60px #0c294438}.panel[hidden]{display:none}.bar{height:38px;display:flex;justify-content:space-between;align-items:center;background:#173e67;color:white;font-size:12px;padding:0 13px}.bar button{color:white;background:transparent;font-size:22px;padding:4px 8px}.panel iframe{width:100%;height:calc(100% - 38px);border:0;display:block}@media(max-width:520px){:host{right:12px;bottom:12px}.launcher{padding:14px 18px}.panel{width:calc(100vw - 24px);height:calc(100dvh - 102px)}}';
 const button=document.createElement('button');button.className='launcher';button.type='button';button.textContent='Помочь с выбором?';button.setAttribute('aria-label','Открыть консультант Электрокомплект');button.setAttribute('aria-expanded','false');
 const panel=document.createElement('section');panel.className='panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Консультант по электротехнике');
 const bar=document.createElement('div');bar.className='bar';const title=document.createElement('span');title.textContent='Электрокомплект · Консультант';const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Закрыть консультант');bar.append(title,close);panel.append(bar);
 let frame;
 function hide(){panel.hidden=true;button.setAttribute('aria-expanded','false');button.focus()}
 button.onclick=()=>{if(app.origin!==location.origin){window.open(new URL('/',app).href,'_blank','noopener,noreferrer');return}if(!panel.hidden){hide();return}if(!frame){frame=document.createElement('iframe');frame.src=new URL('/widget',app).href;frame.title='Чат-консультант Электрокомплект';panel.append(frame)}panel.hidden=false;button.setAttribute('aria-expanded','true');close.focus()};close.onclick=hide;
 const escape=e=>{if(e.key==='Escape'&&!panel.hidden)hide()};document.addEventListener('keydown',escape);
 root.append(style,panel,button);document.body.append(host);window.EKTWidget={destroy(){document.removeEventListener('keydown',escape);host.remove();delete window.EKTWidget}};
})();
