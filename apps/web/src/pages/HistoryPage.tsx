import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { fmt } from '../lib/format';

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
      {error && <div className="text-lose mb-4">{error}</div>}
      {sessions.length === 0 && !error && <div className="text-muted">Chưa có buổi chơi nào.</div>}
      <div className="space-y-2">
        {sessions.map((s) => (
          <Link key={s.id} to={`/lich-su/${s.id}`} className="block bg-surface hover:bg-inset border border-line rounded-xl px-4 py-3">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-semibold">{s.tableName}</span>
              <span className="text-muted text-sm">mã {s.tableCode}</span>
              <span className="text-muted text-sm">{new Date(s.joinedAt).toLocaleString('vi-VN')}</span>
              {!s.leftAt && <span className="text-win text-sm">Đang chơi</span>}
            </div>
            <div className="text-sm mt-1">
              Buy-in: {fmt(s.totalBuyIn)} chip ({s.rebuyCount} lần mua thêm) · Số ván: {s.handsPlayed} · Thắng: {s.handsWon}
              {s.endChips !== null && <> · Chip kết thúc: {fmt(s.endChips)}</>}
              {s.net !== null && <> · Kết quả: <span className={s.net >= 0 ? 'text-win' : 'text-lose'}>{s.net >= 0 ? '+' : ''}{fmt(s.net)}</span></>}
              {' '}· Pot thắng lớn nhất: {fmt(s.biggestPot)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
