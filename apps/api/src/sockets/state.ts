import type { Server as SocketServer } from 'socket.io';
import type { GameTable } from '../services/game/GameTable.js';
import { publicState, scheduleTurnTimer } from '../services/tables.service.js';

/** Builds the per-viewer state broadcaster bound to a Socket.IO server. */
export function createStateBroadcaster(io: SocketServer) {
  return function broadcastToRoom(t: GameTable) {
    const room = io.sockets.adapter.rooms.get(`table:${t.cfg.code}`);
    if (!room) return;
    for (const socketId of room) {
      const s = io.sockets.sockets.get(socketId);
      const uid = (s as unknown as { userId?: string })?.userId;
      if (s && uid) s.emit('table:state', publicState(t, uid));
    }
    scheduleTurnTimer(t);
  };
}
