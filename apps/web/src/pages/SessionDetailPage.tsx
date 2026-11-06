import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, fmt } from '../lib';
import { PlayingCard } from '../components/cards';

interface HandRow {
  id: string; handNumber: number; board: string[]; totalPot: number;
  winners: { userId: string; name: string; amount: number; handName: string | null }[];
  actionLog: { street: string; name: string; action: string; amount: number }[];
  myCards: string[];
  showdownInfo: Record<string, string> | null;
  createdAt: string;
}
interface SessionDetail {
  id: string; tableName: string; tableCode: string; totalBuyIn: number; rebuyCount: number;
  endChips: number | null; net: number | null; handsPlayed: number; handsWon: number; biggestPot: number;
}
const ACTION_VI: Record<string, string> = {
  fold: 'úp bỏ', check: 'check', call: 'call', raise: 'raise', 'all-in': 'all-in',
  'small-blind': 'đặt small blind', 'big-blind': 'đặt big blind',
};

export default function SessionDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<{ session: SessionDetail; hands: HandRow[] } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api<{ session: SessionDetail; hands: HandRow[] }>(`/api/me/sessions/${id}`)
      .then(setData).catch((e) => setError((e as Error).message));
  }, [id]);
  if (error) return <div className="max-w-3xl mx-auto py-16 text-center text-red-400">{error}</div>;
  if (!data) return <div className="max-w-3xl mx-auto py-16 text-center text-neutral-400">Đang tải…</div>;
  const s = data.session;
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">{s.tableName} <span className="text-neutral-400 text-base">mã {s.tableCode}</span></h1>
      <div className="text-neutral-300 mb-8">
        Tổng buy-in {fmt(s.totalBuyIn)} chip · {s.rebuyCount} lần mua thêm · {s.handsPlayed} ván, thắng {s.handsWon} · Pot thắng lớn nhất {fmt(s.biggestPot)}
        {s.endChips !== null && <> · Chip kết thúc {fmt(s.endChips)}</>}
        {s.net !== null && <> · Kết quả <span className={s.net >= 0 ? 'text-emerald-400' : 'text-red-400'}>{s.net >= 0 ? '+' : ''}{fmt(s.net)}</span></>}
      </div>
      <h2 className="text-lg font-bold mb-3">Chi tiết từng ván</h2>
      {data.hands.length === 0 && <div className="text-neutral-500">Chưa có ván nào được ghi lại.</div>}
      <div className="space-y-2">
        {data.hands.map((h) => (
          <div key={h.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <button className="w-full text-left" onClick={() => setOpen(open === h.id ? null : h.id)}>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="font-semibold">Ván #{h.handNumber}</span>
                <span className="flex gap-1">{h.board.map((c, i) => <PlayingCard key={i} card={c} small />)}</span>
                {h.myCards.length > 0 && (
                  <span className="flex items-center gap-1 text-sm text-neutral-300">Bài của bạn:
                    {h.myCards.map((c, i) => <PlayingCard key={i} card={c} small />)}
                  </span>
                )}
                <span className="text-sm">Pot: {fmt(h.totalPot)}</span>
                <span className="text-sm text-emerald-300">
                  {h.winners.map((w) => `${w.name} +${fmt(w.amount)}${w.handName ? ` (${w.handName})` : ''}`).join(' · ')}
                </span>
              </div>
            </button>
            {open === h.id && (
              <div className="mt-3 border-t border-white/10 pt-3 text-sm text-neutral-300 space-y-1">
                {h.showdownInfo && Object.entries(h.showdownInfo).map(([uid, name]) => (
                  <div key={uid}>Bài lật ở showdown: {name}</div>
                ))}
                <div className="text-neutral-400">Diễn biến:</div>
                {h.actionLog.map((a, i) => (
                  <div key={i}>· [{a.street}] {a.name} {ACTION_VI[a.action] ?? a.action}{a.amount > 0 ? ` ${fmt(a.amount)} chip` : ''}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
