import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { fmt } from '../lib/format';
import { useAuth } from '../App';

interface Stats {
  totalSessions: number; totalHands: number; totalHandsWon: number;
  winRate: number; totalBuyIn: number; totalNet: number;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => { api<Stats>('/api/me/stats').then(setStats).catch(() => {}); }, []);
  if (!user) return <div className="max-w-md mx-auto py-16 text-center text-muted">Hãy đăng nhập để xem hồ sơ.</div>;
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center gap-4 mb-8">
        {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-16 h-16 rounded-full" />
          : <span className="w-16 h-16 rounded-full bg-lav text-lavink flex items-center justify-center text-2xl">{user.name[0]}</span>}
        <div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <div className="text-muted">{user.email}</div>
        </div>
      </div>
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            ['Tổng số buổi chơi', fmt(stats.totalSessions)],
            ['Tổng số ván', fmt(stats.totalHands)],
            ['Số ván thắng', fmt(stats.totalHandsWon)],
            ['Tỉ lệ thắng ván', `${stats.winRate}%`],
            ['Tổng chip đã buy-in', fmt(stats.totalBuyIn)],
            ['Tổng lãi/lỗ', `${stats.totalNet >= 0 ? '+' : ''}${fmt(stats.totalNet)}`],
          ].map(([label, value]) => (
            <div key={label} className="bg-surface border border-line rounded-xl px-4 py-4">
              <div className="text-sm text-muted">{label}</div>
              <div className="text-xl font-bold mt-1">{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
