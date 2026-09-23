import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
// Run once on a fresh local database. Production migrations are handled by Sites.
for(const file of readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort()){
 const r=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--file','drizzle/'+file],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);
}
