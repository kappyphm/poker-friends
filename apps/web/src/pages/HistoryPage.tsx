import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmt } from '../lib';

interface SessionRow {
  id: string; tableName: string; tableCode: string;
  totalBuyIn: number; rebuyCount: number; endChips: number | null; net: number | null;
  handsPlayed: number; handsWon: number; biggestPot: number;
  joinedAt: string; leftAt: string | null;
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    api<{ sessions: SessionRow[] }>('/api/me/sessions').then((d) => setSessions(d.sessions)).catch((e) => setError((e as Error).message));
  }, []);
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Lịch sử chơi</h1>
      {error && <div className="text-red-400 mb-4">{error}</div>}
      {sessions.length === 0 && !error && <div className="text-neutral-500">Chưa có buổi chơi nào.</div>}
      <div className="space-y-2">
        {sessions.map((s) => (
          <Link key={s.id} to={`/lich-su/${s.id}`} className="block bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-semibold">{s.tableName}</span>
              <span className="text-neutral-400 text-sm">mã {s.tableCode}</span>
              <span className="text-neutral-400 text-sm">{new Date(s.joinedAt).toLocaleString('vi-VN')}</span>
              {!s.leftAt && <span className="text-emerald-400 text-sm">Đang chơi</span>}
            </div>
            <div className="text-sm text-neutral-300 mt-1">
              Buy-in: {fmt(s.totalBuyIn)} chip ({s.rebuyCount} lần mua thêm) · Số ván: {s.handsPlayed} · Thắng: {s.handsWon}
              {s.endChips !== null && <> · Chip kết thúc: {fmt(s.endChips)}</>}
              {s.net !== null && <> · Kết quả: <span className={s.net >= 0 ? 'text-emerald-400' : 'text-red-400'}>{s.net >= 0 ? '+' : ''}{fmt(s.net)}</span></>}
              {' '}· Pot thắng lớn nhất: {fmt(s.biggestPot)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
