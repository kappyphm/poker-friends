# Poker Friends

Game poker Texas Hold'em online chơi vui cùng bạn bè — không tiền thật, không số dư tài khoản.
Vào bàn là mua chip, rời bàn là kết thúc buổi chơi và mọi số liệu được ghi vào lịch sử.

## Tính năng

- Đăng nhập bằng Google (OAuth) — hoặc dev-login khi bật `DEV_AUTH=true` để test local.
- Bàn private, vào bằng mã mời 6 ký tự hoặc link. Chủ bàn cấu hình: số ghế 3–10, buy-in tối thiểu, Small Blind / Big Blind (cố định suốt buổi, không ante).
- Chủ bàn bấm bắt đầu ván khi có tối thiểu 3 người có chip. Đủ luật Texas Hold'em: dealer button, blind, pre-flop/flop/turn/river, fold/check/call/raise/all-in, side pot, split pot, showdown, muck bài khi thua (trừ khi có all-in).
- Mỗi lượt 30 giây, hết giờ tự check hoặc tự úp bỏ. Mất kết nối được giữ ghế 5 phút.
- Khán giả (spectator) xem bàn bằng mã mời, không bao giờ thấy bài tẩy của người chơi.
- Lịch sử & thống kê: từng buổi chơi (tổng buy-in, số lần rebuy, chip kết thúc, lãi/lỗ, số ván, pot thắng lớn nhất) và chi tiết từng ván (bài chung, diễn biến cược từng street, chia pot).
- Trang hướng dẫn luật chơi và thứ hạng bài tại `/huong-dan`.

## Cấu trúc

- `apps/api` — Express + TypeScript + Drizzle ORM + PostgreSQL + Socket.IO (cổng 4000)
- `apps/web` — React + TypeScript + Vite + Tailwind CSS (cổng 5173)
- `packages/shared` — types dùng chung + poker engine thuần (đánh giá bài, chia pot) có unit test
- `scripts/e2e.mjs` — test end-to-end tự động (3 người chơi + 1 khán giả qua dev-login)

## Chạy local

Yêu cầu: Node.js, pnpm, Docker.

```bash
# 1. Database
docker compose up -d

# 2. Cấu hình API
cp apps/api/.env.example apps/api/.env
# Điền GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (xem mục Google OAuth bên dưới)
# Khi chỉ test local có thể để DEV_AUTH=true và dùng đăng nhập thử nghiệm trên trang chủ

# 3. Cài dependencies và đẩy schema
pnpm install
pnpm --filter api exec drizzle-kit push

# 4. Chạy
pnpm --filter api dev    # API tại http://localhost:4000
pnpm --filter web dev    # Web tại http://localhost:5173
```

Mở http://localhost:5173, đăng nhập, tạo bàn và gửi mã mời cho bạn bè.

## Google OAuth

1. Vào Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID (Web application).
2. Thêm Authorized redirect URI: `http://localhost:4000/auth/google/callback`
3. Dán Client ID và Client Secret vào `apps/api/.env`.

## Kiểm thử

```bash
pnpm --filter @poker/shared test   # unit test poker engine
node scripts/e2e.mjs               # e2e: cần API đang chạy với DEV_AUTH=true và DB đã có schema
```
