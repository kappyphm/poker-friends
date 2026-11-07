import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { api } from '../lib/api';
import { useAuth } from '../App';
import type { TableState } from '../components/table/types.js';

/**
 * Owns the table socket connection and everything that flows over it:
 * live table state, server errors, the join/buy-in flow and player actions.
 */
export function useTableSocket(code: string | undefined) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<TableState | null>(null);
  const [error, setError] = useState('');
  const [buyIn, setBuyIn] = useState(1000);
  const [joined, setJoined] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    api<{ table: { minBuyIn: number } }>(`/api/tables/code/${code}`)
      .then((d) => setBuyIn(Math.max(d.table.minBuyIn, d.table.minBuyIn * 5)))
      .catch((e) => setError((e as Error).message));
  }, [code]);

  useEffect(() => {
    if (!user) return;
    const socket = io({ withCredentials: true });
    socketRef.current = socket;
    socket.on('table:state', (s: TableState) => setState(s));
    socket.on('error', (e: { message: string }) => setError(e.message));
    return () => { socket.disconnect(); };
  }, [user]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  const doJoin = (asSpectator: boolean) => {
    setError('');
    socketRef.current?.emit('table:join', {
      code, mode: asSpectator ? 'spectator' : 'player', buyIn: asSpectator ? undefined : buyIn,
    });
    setJoined(true);
  };

  const act = (action: string, amount?: number) => {
    socketRef.current?.emit('player:action', { action, amount });
  };

  const leaveTable = () => socketRef.current?.emit('player:leave');
  const startHand = () => socketRef.current?.emit('host:start');
  const rebuy = (amount: number) => socketRef.current?.emit('player:rebuy', { amount });

  return { user, state, error, buyIn, setBuyIn, joined, now, doJoin, act, leaveTable, startHand, rebuy };
}
