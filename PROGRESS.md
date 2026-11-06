# PROGRESS — poker-friends

## Trạng thái: ĐANG XÂY DỰNG

## Đã làm
- [x] Kiểm tra SSH, toolchain trên máy: node v26.12.0, pnpm 12.16.1, docker 29.9.2, git 2.56.0
- [x] Scaffold monorepo (pnpm workspaces: apps/api, apps/web, packages/shared), git init nhánh main
- [x] Cài dependencies bằng pnpm CLI cho cả 3 package + socket.io-client ở root cho e2e

## Việc tiếp theo
- [ ] Đẩy source lên máy, set scripts qua pnpm pkg set
- [ ] Build + unit test engine
- [ ] Postgres (docker compose) + drizzle push
- [ ] Chạy api/web, test e2e
- [ ] Commit từng bước

## Ghi chú cổng
- 5173 lúc kiểm tra đang bị chiếm bởi dev server SCMS FE (tmux scms-fe, node pid 313430). User đã cho phép kill khi poker cần cổng — sẽ ghi rõ nếu phải kill.
- 4000, 5432, 3000 đang trống.

## Còn lại phía user
- Tạo Google OAuth credentials và điền vào apps/api/.env (redirect URI: http://localhost:4000/auth/google/callback). Trước đó dùng DEV_AUTH=true + dev-login để test.
