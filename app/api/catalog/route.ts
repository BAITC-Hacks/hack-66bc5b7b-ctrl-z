import snapshot from '@/data/catalog.json';
import {decorate} from '@/lib/domain';
export async function GET(){return Response.json({items:snapshot.items.map(decorate),syncedAt:snapshot.syncedAt},{headers:{'Cache-Control':'public, max-age=300'}})}
