# PROGRESS — poker-friends

## Trạng thái: MVP HOÀN THÀNH (2026-11-06). Cập nhật 2026-11-07: giao diện bàn đã đổi sang bàn chữ nhật; toàn bộ tiến trình poker đã DỪNG theo lệnh user (xem mục cuối) — chạy lại theo mục "Cách chạy lại" bên dưới.

## Đã làm và đã kiểm chứng
- [x] Monorepo pnpm workspaces: `apps/api` (Express + TS + Drizzle + PostgreSQL + Socket.IO, cổng 4000), `apps/web` (React + TS + Vite + Tailwind, cổng 5173), `packages/shared` (poker engine thuần)
- [x] Auth: Google OAuth (passport) + dev-login sau cờ `DEV_AUTH=true` trong `apps/api/.env`
- [x] Game: bàn private mã mời 6 ký tự, host tạo bàn (ghế 3–10, min buy-in, SB/BB cố định), host start khi ≥3 người có chip; buy-in bắt buộc, rebuy chỉ giữa 2 ván/khi hết chip; luật Texas Hold'em đầy đủ (side pot, split pot + chip lẻ theo vị trí, muck khi thua showdown trừ all-in); timer 30s (hết giờ check/fold); mất kết nối giữ ghế 5 phút + auto-fold tới lượt; spectator không bao giờ nhận bài tẩy
- [x] Persistence: users / tables / table_sessions / hands (board, pot, winners, action log từng street, hole cards, showdown) qua Drizzle + Postgres 16 (docker compose)
- [x] Web: đăng nhập, phòng chờ (tạo bàn / vào bằng mã / bàn của tôi), bàn chơi (felt chữ nhật từ 2026-11-07: người chơi hiện tại ở cạnh dưới, người chơi còn lại ở cạnh trên, icon trạng thái online từng ghế, chip hiển thị bằng số — không còn icon chip màu), trang `/huong-dan`, lịch sử buổi chơi → chi tiết từng ván, hồ sơ/thống kê
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

## Cập nhật 2026-11-07 — Giao diện bàn chữ nhật + Funnel + dọn dẹp tiến trình
- [x] Bàn chơi `/ban/:code` đổi từ oval sang **bàn chữ nhật** (commit `8713d9c`): người chơi hiện tại ở **cạnh dưới** (ghế lớn, hiện bài tẩy cỡ đầy đủ), mọi người chơi còn lại + ghế trống ở **cạnh trên** thành một hàng; board + pot ở giữa; khán giả (không có người chơi hiện tại) thì tất cả ghế nằm ở cạnh trên.
- [x] Mỗi ghế có **icon trạng thái online** (chấm xanh = đang kết nối, chấm đỏ = mất kết nối, tooltip tiếng Việt) lấy từ cờ `connected` trong state.
- [x] **Bỏ toàn bộ icon/hình chip màu** khỏi trang bàn: stack, cược, pot đều là số thuần kèm chữ "chip"; đã xoá `ChipStack`/`ChipDot` khỏi `components/cards.tsx`.
- [x] Kiểm chứng: `pnpm --filter web build` sạch; restart `poker-web` → HTTP 200; chạy lại `node scripts/e2e.mjs` → **15/15 pass** (bảo toàn chip 3000, khán giả không thấy bài tẩy). Ảnh chụp bàn thật lúc đang đánh (3 bot + 1 người, pre-flop): `docs/table-ui-rectangular.png` (commit `8026de1`).
- [ ] **Tailscale Funnel: CHƯA bật** — tailnet chưa kích hoạt Funnel. Cần user tự mở link duyệt của Tailscale: https://login.tailscale.com/f/funnel?node=nL13jjtTN711CNTRL rồi mới chạy được `tailscale funnel --bg 5173`. `DEV_AUTH` vẫn giữ `=true` theo lệnh user (chỉ tạm thời).
- [x] **Dọn dẹp theo lệnh user (2026-11-07)**: đã kill tmux `poker-web`, `poker-api`, `poker-bots`; `docker compose down` (gỡ container `poker-postgres`, KHÔNG xoá volume — dữ liệu còn nguyên); cổng 5173/4000 đã trống; không còn tiến trình node/vite/tsx nào của poker-friends. Tailscale vẫn chạy; funnel chưa từng bật nên không có gì để tắt. Muốn chơi lại: chạy đúng mục "Cách chạy lại sau khi máy khởi động lại" ở trên.

## Cập nhật 2026-11-07 (tiếp) — Ô người chơi ngoài bàn, lá bài trong bàn
- [x] Trang bàn `/ban/:code` (commit `8f258bb`): **ô thông tin người chơi** (avatar, chấm online, tên, stack số, badge D/SB/BB, vắng/all-in, thanh đếm giờ lượt) chuyển ra **NGOÀI** mặt felt — người chơi khác ở trên cạnh trên, người chơi hiện tại ở dưới cạnh dưới. **Lá bài** nằm **TRONG** felt sát cạnh của từng người: bài úp/ngửa trong felt ngay dưới ô thông tin (cạnh trên) và ngay trên ô thông tin (cạnh dưới, bài của mình cỡ đầy đủ, ngửa). Pill "Cược: X chip" nằm trên felt cạnh lá bài; ghế trống là ô ngoài cạnh trên, không có bài trong bàn; khán giả: mọi ô ở ngoài cạnh trên, bài trong cạnh trên. Lượt của ai thì cả ô ngoài lẫn cụm bài trong bàn cùng phát sáng viền emerald.
- [x] Kiểm chứng: `pnpm --filter web build` sạch; `node scripts/e2e.mjs` **15/15 pass**; ảnh chụp mới (ván thật pre-flop, bàn 8DYPRB: 3 bot + người chơi trình duyệt) đã thay `docs/table-ui-rectangular.png` — ô thông tin ngoài felt, bài trong felt cả hai cạnh, chấm online trên ô ngoài, không còn hình chip.
- [x] Dọn dẹp sau test (theo lệnh user): kill tmux `poker-api`/`poker-web`/`poker-bots`, `docker compose down` (giữ volume), cổng 5173/4000 trống. Chạy lại theo mục "Cách chạy lại sau khi máy khởi động lại".
