import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { api, type User } from './lib/api';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import TablePage from './pages/TablePage';
import GuidePage from './pages/GuidePage';
import HistoryPage from './pages/HistoryPage';
import SessionDetailPage from './pages/SessionDetailPage';
import ProfilePage from './pages/ProfilePage';

const AuthCtx = createContext<{ user: User | null; refresh: () => Promise<void> }>({ user: null, refresh: async () => {} });
export const useAuth = () => useContext(AuthCtx);

function Shell({ children }: { children: ReactNode }) {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="border-b border-line bg-surface">
        <div className="max-w-6xl mx-auto px-4 min-h-14 py-2 flex flex-wrap items-center gap-x-5 gap-y-1">
          <Link to="/" className="font-bold text-lg tracking-wide">♠ Poker Friends</Link>
          <nav className="flex gap-4 text-sm text-muted order-3 w-full sm:w-auto sm:order-none overflow-x-auto whitespace-nowrap">
            <Link to="/phong-cho" className="hover:text-ink">Phòng chờ</Link>
            <Link to="/huong-dan" className="hover:text-ink">Hướng dẫn</Link>
            <Link to="/lich-su" className="hover:text-ink">Lịch sử</Link>
            <Link to="/ho-so" className="hover:text-ink">Hồ sơ</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {user ? (
              <>
                {user.avatarUrl && <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />}
                <span className="text-sm hidden sm:inline">{user.name}</span>
                <button
                  className="text-sm text-muted hover:text-ink"
                  onClick={async () => { await api('/api/auth/logout', { method: 'POST' }); await refresh(); navigate('/'); }}
                >Đăng xuất</button>
              </>
            ) : (
              <Link to="/" className="text-sm text-win font-semibold">Đăng nhập</Link>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    try {
      const d = await api<{ user: User }>('/api/auth/me');
      setUser(d.user);
    } catch { setUser(null); } finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);
  if (loading) return <div className="min-h-screen bg-bg text-muted flex items-center justify-center">Đang tải…</div>;
  return (
    <AuthCtx.Provider value={{ user, refresh }}>
      <BrowserRouter>
        <Shell>
          <Routes>
            <Route path="/" element={user ? <Navigate to="/phong-cho" replace /> : <LoginPage />} />
            <Route path="/phong-cho" element={<LobbyPage />} />
            <Route path="/ban/:code" element={<TablePage />} />
            <Route path="/huong-dan" element={<GuidePage />} />
            <Route path="/lich-su" element={<HistoryPage />} />
            <Route path="/lich-su/:id" element={<SessionDetailPage />} />
            <Route path="/ho-so" element={<ProfilePage />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </AuthCtx.Provider>
  );
}
