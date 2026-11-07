import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../App';

export default function LoginPage() {
  const [devAuth, setDevAuth] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { refresh } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api<{ devAuth: boolean }>('/api/auth/config').then((d) => setDevAuth(d.devAuth)).catch(() => {});
  }, []);

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-4">♠♥♦♣</div>
      <h1 className="text-3xl font-bold mb-2">Poker Friends</h1>
      <p className="text-muted mb-8">Texas Hold'em chơi vui cùng bạn bè. Không tiền thật — vào bàn là mua chip, rời bàn là ghi lại lịch sử.</p>
      <a
        href="/auth/google"
        className="block w-full bg-white text-neutral-900 border border-line font-semibold rounded-lg py-3 hover:bg-neutral-100 transition"
      >
        Đăng nhập bằng Google
      </a>
      {devAuth && (
        <div className="mt-8 border border-line rounded-lg p-4">
          <div className="text-sm text-muted mb-3">Đăng nhập thử nghiệm (chỉ bật khi dev)</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên hiển thị, ví dụ: Tuan Anh"
            className="w-full bg-inset border border-line rounded-lg px-3 py-2 mb-3"
          />
          {error && <div className="text-lose text-sm mb-2">{error}</div>}
          <button
            className="w-full bg-accent text-accentink hover:brightness-95 rounded-lg py-2 font-semibold"
            onClick={async () => {
              try {
                await api('/api/auth/dev-login', { method: 'POST', body: JSON.stringify({ name }) });
                await refresh();
                navigate('/phong-cho');
              } catch (e) { setError((e as Error).message); }
            }}
          >Vào chơi</button>
        </div>
      )}
    </div>
  );
}
