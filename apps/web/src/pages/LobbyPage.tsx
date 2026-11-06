import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fmt } from '../lib';
import { useAuth } from '../App';

interface TableRow {
  id: string; code: string; name: string; seats: number;
  minBuyIn: number; smallBlind: number; bigBlind: number; createdAt: string;
}

export default function LobbyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: 'Bàn tối thứ sáu', seats: 9, minBuyIn: 200, smallBlind: 5, bigBlind: 10 });
  const [joinCode, setJoinCode] = useState('');
  const [mine, setMine] = useState<{ hosted: TableRow[]; joined: TableRow[] }>({ hosted: [], joined: [] });
  const [error, setError] = useState('');

  const load = () => { api<typeof mine>('/api/tables/mine').then(setMine).catch(() => {}); };
  useEffect(() => { if (user) load(); }, [user]);

  if (!user) return <div className="max-w-md mx-auto py-16 text-center text-neutral-400">Hãy đăng nhập để vào phòng chờ.</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-8">
      <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4">Tạo bàn mới</h2>
        <label className="block text-sm text-neutral-400 mb-1">Tên bàn</label>
        <input className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 mb-3" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Số ghế (3–10)</label>
            <input type="number" min={3} max={10} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2" value={form.seats}
              onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Buy-in tối thiểu (chip)</label>
            <input type="number" min={1} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2" value={form.minBuyIn}
              onChange={(e) => setForm({ ...form, minBuyIn: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Small Blind</label>
            <input type="number" min={1} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2" value={form.smallBlind}
              onChange={(e) => setForm({ ...form, smallBlind: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Big Blind</label>
            <input type="number" min={1} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2" value={form.bigBlind}
              onChange={(e) => setForm({ ...form, bigBlind: Number(e.target.value) })} />
          </div>
        </div>
        <p className="text-xs text-neutral-500 mt-3">Blind cố định suốt buổi chơi, không tăng theo thời gian, không có ante.</p>
        {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
        <button
          className="mt-4 w-full bg-emerald-700 hover:bg-emerald-600 rounded-lg py-2.5 font-semibold"
          onClick={async () => {
            try {
              const d = await api<{ table: TableRow }>('/api/tables', { method: 'POST', body: JSON.stringify(form) });
              navigate(`/ban/${d.table.code}`);
            } catch (e) { setError((e as Error).message); }
          }}
        >Tạo bàn</button>
      </section>

      <div className="space-y-8">
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">Vào bàn bằng mã mời</h2>
          <div className="flex gap-2">
            <input className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 uppercase" placeholder="Mã 6 ký tự"
              value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} />
            <button className="bg-blue-700 hover:bg-blue-600 rounded-lg px-4 font-semibold"
              onClick={() => joinCode && navigate(`/ban/${joinCode}`)}>Vào bàn</button>
            <button className="bg-neutral-700 hover:bg-neutral-600 rounded-lg px-4 font-semibold"
              onClick={() => joinCode && navigate(`/ban/${joinCode}?mode=spectator`)}>Xem</button>
          </div>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">Bàn của tôi</h2>
          {[...mine.hosted, ...mine.joined].length === 0 && <div className="text-neutral-500 text-sm">Chưa có bàn nào.</div>}
          <ul className="space-y-2">
            {[...mine.hosted.map((t) => ({ ...t, role: 'Chủ bàn' })), ...mine.joined.map((t) => ({ ...t, role: 'Đã chơi' }))].map((t) => (
              <li key={t.id}>
                <button className="w-full text-left bg-black/30 hover:bg-black/50 border border-white/10 rounded-lg px-4 py-3"
                  onClick={() => navigate(`/ban/${t.code}`)}>
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-neutral-400 text-sm"> · mã {t.code} · {t.seats} ghế · buy-in tối thiểu {fmt(t.minBuyIn)} · blind {t.smallBlind}/{t.bigBlind} · {t.role}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
