# PROGRESS — poker-friends

## Trạng thái: MVP HOÀN THÀNH (2026-11-06), dev servers đang chạy trong tmux `poker-api` / `poker-web`

## Đã làm và đã kiểm chứng
- [x] Monorepo pnpm workspaces: `apps/api` (Express + TS + Drizzle + PostgreSQL + Socket.IO, cổng 4000), `apps/web` (React + TS + Vite + Tailwind, cổng 5173), `packages/shared` (poker engine thuần)
- [x] Auth: Google OAuth (passport) + dev-login sau cờ `DEV_AUTH=true` trong `apps/api/.env`
- [x] Game: bàn private mã mời 6 ký tự, host tạo bàn (ghế 3–10, min buy-in, SB/BB cố định), host start khi ≥3 người có chip; buy-in bắt buộc, rebuy chỉ giữa 2 ván/khi hết chip; luật Texas Hold'em đầy đủ (side pot, split pot + chip lẻ theo vị trí, muck khi thua showdown trừ all-in); timer 30s (hết giờ check/fold); mất kết nối giữ ghế 5 phút + auto-fold tới lượt; spectator không bao giờ nhận bài tẩy
- [x] Persistence: users / tables / table_sessions / hands (board, pot, winners, action log từng street, hole cards, showdown) qua Drizzle + Postgres 16 (docker compose)
- [x] Web: đăng nhập, phòng chờ (tạo bàn / vào bằng mã / bàn của tôi), bàn chơi (bàn felt oval, chip xanh dương/đỏ/trắng/đen — không dùng vàng), trang `/huong-dan`, lịch sử buổi chơi → chi tiết từng ván, hồ sơ/thống kê
- [x] `pnpm -r build`: cả 3 package build sạch
- [x] Unit test engine (`packages/shared`): **16/16 pass** — deck/shuffle theo seed, đánh giá bài (wheel, tứ quý, cù lũ, kicker, hòa), side pot, split pot chip lẻ
- [x] Postgres chạy (container `poker-postgres`), `drizzle-kit push` áp schema thành công
- [x] **E2E** (`node scripts/e2e.mjs`): **15/15 pass** — 3 người chơi + 1 khán giả qua dev-login; ván chạy tới showdown, pot 30, người thắng "Thùng" (Flush); tổng stack sau ván = 3000 = tổng buy-in (bảo toàn chip); khán giả không nhận bài tẩy trong suốt ván; session của cả 3 người có handsPlayed=1 và chi tiết session có ván đã lưu
- [x] Kiểm thêm kịch bản raise/fold: raise tới 100, 2 người fold, pot 115 trao cho người raise (không phải lật bài), tổng chip vẫn 3000

## Cổng đã giải phóng
- Cổng 5173 bị dev server SCMS FE chiếm (tmux `scms-fe`) — đã kill session `scms-fe` theo quyền user cho ngày 2026-11-06 23:25 để chạy poker-web. Muốn chạy lại SCMS FE: `tmux new-session -d -s scms-fe` trong thư mục scms-fe rồi `pnpm dev` (hoặc npm run dev).
- Cổng 4000 và 5432 trống từ đầu, không phải kill gì.

## Cách chạy lại sau khi máy khởi động lại
```bash
cd ~/Projects/03_software/poker-friends
docker compose up -d
tmux new-session -d -s poker-api "cd apps/api && pnpm dev"
tmux new-session -d -s poker-web "cd apps/web && pnpm dev"
# Mở http://localhost:5173
```

## Còn lại phía user (bắt buộc trước khi dùng Google thật)
- Tạo Google OAuth credentials (Google Cloud Console) và điền `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` vào `apps/api/.env`.
  Authorized redirect URI: `http://localhost:4000/auth/google/callback`
- Trước khi có credentials: giữ `DEV_AUTH=true` và dùng ô "Đăng nhập thử nghiệm" ở trang chủ. TUYỆT ĐỐI tắt `DEV_AUTH` nếu triển khai thật.

## Đơn giản hoá có chủ đích (V1)
- Trạng thái ván đang chơi giữ trong bộ nhớ của API (restart API giữa ván sẽ mất ván đó); dữ liệu đã kết thúc (bàn, buổi chơi, ván đã xong) nằm an toàn trong Postgres.
- Session dùng express-session mặc định (in-memory store) — đủ cho chơi bạn bè local.
- Chưa có chat/voice, tournament, public lobby, admin panel (đúng phạm vi V1 đã chốt).
