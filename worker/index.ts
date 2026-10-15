/**
 * Cloudflare Worker entry. Static assets (the whole React app) are served by Workers Static
 * Assets without running this code; only /api/* reaches it (see run_worker_first in
 * wrangler.jsonc). Each room code maps to one Durable Object that holds that game.
 */
import { isRoomCode } from '../src/network/roomCode';

export { Room } from './room';

export interface Env {
  ROOMS: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/api\/room\/([^/]+)\/ws$/);
    if (!m) return new Response('Not found', { status: 404 });
    const code = m[1].toUpperCase();
    if (!isRoomCode(code)) return new Response('Bad room code', { status: 400 });
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    // Only our own pages may open sockets (stops other sites piggybacking on the server).
    const origin = request.headers.get('Origin');
    if (origin && new URL(origin).host !== url.host) return new Response('Forbidden', { status: 403 });
    return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(request);
  },
} satisfies ExportedHandler<Env>;
