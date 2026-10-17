# Deploy MoneyTalk Backend lên Render (Free)

Hướng dẫn deploy API lên **Render Free** — deploy thẳng từ GitHub, có sẵn HTTPS, không cần quản lý server.

```text
App Android ──HTTPS──► Render Web Service (NestJS)
                         https://<tên-service>.onrender.com
                              │
                              ├─► Supabase (Postgres)
                              └─► Cloudflare R2 (ảnh)
```

Thời gian lần đầu: khoảng 15–30 phút.

## Giới hạn của gói Free (cần biết trước)

| Giới hạn | Ảnh hưởng tới MoneyTalk |
| --- | --- |
| **Ngủ sau 15 phút không có request** | Request đầu tiên sau khi ngủ chờ ~30–60s (cold start) → app có thể timeout lần đầu. Xem [cách giảm cold start](#giảm-cold-start-tuỳ-chọn) |
| 512 MB RAM, 0.1 CPU | Đủ cho lượng người dùng nhỏ |
| 750 giờ chạy / tháng / workspace | Đủ cho **1** service chạy cả tháng |
| Không có Shell / SSH, không có Pre-deploy command | Migration chạy trong **Build Command** (đã cấu hình bên dưới) |
| Ổ đĩa không lưu lâu dài | Không ảnh hưởng — ảnh lưu trên R2 |

> Hạn mức có thể thay đổi — kiểm tra lại tại https://render.com/pricing.

---

## Bước 0 — Chuẩn bị

1. **Code đã push lên GitHub** (nhánh `main`). Render build từ GitHub, không lấy code trên máy bạn.
2. **Giá trị production** của các biến (DB, secret, bucket riêng — không dùng của dev):

   | Biến | Lấy ở đâu |
   | --- | --- |
   | `DATABASE_URL` | Supabase — dùng **Session pooler (port `5432`)**, xem lưu ý bên dưới |
   | `JWT_SECRET` | `openssl rand -base64 32` (≥ 32 ký tự, khác dev) |
   | `JWT_EXPIRES_IN` | vd `1h` (access token; client dùng `/api/auth/refresh`) |
   | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | Cloudflare R2 — xem [README mục 3](../README.md#3-cloudflare-r2-upload-ảnh) |

> **Vì sao dùng Session pooler `5432`:** Supabase → **Connect** → chọn **Session pooler**. URL dạng
> `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`.
> - Direct connection (`db.<ref>.supabase.co`) của gói free chỉ có IPv6 → Render không kết nối được.
> - Transaction pooler (`6543`) có thể làm `drizzle-kit migrate` lỗi. Session pooler dùng được cho cả app lẫn migration.

---

## Bước 1 — Tạo Web Service

1. Đăng ký / đăng nhập https://dashboard.render.com bằng GitHub.
2. **New** → **Web Service** → **Git Provider** → chọn repo `money-management-app` (cấp quyền cho Render nếu chưa thấy repo).
3. Điền cấu hình:

| Mục | Giá trị |
| --- | --- |
| Name | `moneytalk-api` (→ URL `https://moneytalk-api.onrender.com`; nếu trùng Render thêm hậu tố) |
| Language | `Node` |
| Branch | `main` |
| Region | **Singapore** (gần Việt Nam nhất) |
| **Root Directory** | `moneytalk-backend` |
| **Build Command** | `npm install -g pnpm@11 && pnpm install --frozen-lockfile && pnpm build && pnpm db:migrate:prod` |
| **Start Command** | `npm run start:prod` |
| Instance Type | **Free** |

Giải thích:

- **Root Directory** — backend nằm trong thư mục con của repo. Render chỉ build thư mục này và chỉ tự deploy khi có thay đổi trong đó (sửa code app Android không làm redeploy BE).
- **Build Command** — cài pnpm (dự án dùng `pnpm-lock.yaml`), cài dependencies đúng lockfile, build ra `dist/main.js`, rồi **chạy migration** lên DB production. Migration lỗi → deploy dừng, bản cũ vẫn chạy.
- **Start Command** — dùng `npm run` vì pnpm cài ở bước build không có sẵn lúc chạy. Script `start:prod` tự set `NODE_ENV=production`.

---

## Bước 2 — Biến môi trường

Cùng trang tạo service, mục **Environment Variables** → **Add Environment Variable** (hoặc **Add from .env** để dán nhiều dòng):

```env
NODE_VERSION=24
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
JWT_SECRET=<openssl rand -base64 32>
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN_DAYS=30
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_URL=...
```

> ⚠️ **Không thêm biến `NODE_ENV`.** Nếu đặt `NODE_ENV=production` ở đây, `pnpm install` sẽ bỏ qua devDependencies (`@nestjs/cli`, `typescript`, `drizzle-kit`) → build lỗi. Các script `start:prod` / `db:migrate:prod` đã tự set `NODE_ENV=production`.
>
> ⚠️ **Không thêm `PORT`.** Render tự cấp `PORT`, app đã đọc biến này.
>
> `NODE_VERSION=24` để Render dùng Node 24 (giống máy local).

---

## Bước 3 — Health check

Mục **Advanced** → **Health Check Path**: `/api/health`

Render dùng đường dẫn này để biết app đã chạy xong trước khi chuyển traffic sang bản mới.

---

## Bước 4 — Deploy

Bấm **Deploy Web Service**. Theo dõi tab **Logs**:

1. Build: cài pnpm → `pnpm install` → `nest build` → `drizzle-kit migrate`.
2. Start — log phải có:

   ```text
   [Bootstrap] NODE_ENV=production | port=10000 | env files: (none)
   ```

   (`env files: (none)` là đúng — trên Render biến lấy từ Environment, không từ file.)
3. Trạng thái chuyển **Live**.

---

## Bước 5 — Kiểm tra

```bash
curl https://moneytalk-api.onrender.com/api/health
# {"status":"ok","timestamp":"..."}
```

Trong app Android, đổi base URL production thành:

```text
https://moneytalk-api.onrender.com/api/
```

> Do cold start, nên đặt **timeout của HTTP client trong app ≥ 60 giây** (connect + read), hoặc hiển thị trạng thái "Đang kết nối máy chủ…" ở lần gọi đầu.

---

## Deploy bản cập nhật

**Auto-Deploy** bật sẵn: mỗi lần push lên `main` có thay đổi trong `moneytalk-backend/`, Render tự build + migrate + deploy.

```bash
git push origin main
```

Deploy thủ công: Dashboard → service → **Manual Deploy** → **Deploy latest commit**.
Quay lại bản cũ: tab **Events** → chọn bản deploy trước → **Rollback**.

---

## Giảm cold start (tuỳ chọn)

Dùng dịch vụ cron miễn phí ping API định kỳ để service không ngủ:

1. Tạo tài khoản https://cron-job.org (hoặc UptimeRobot).
2. Tạo job gọi `GET https://moneytalk-api.onrender.com/api/health` **mỗi 10 phút**.

Lưu ý:

- 1 service chạy liên tục ~744 giờ/tháng — vừa trong hạn mức 750 giờ. **Không tạo service free thứ hai** trong cùng workspace, nếu không sẽ hết giờ trước cuối tháng.
- `/api/health` **không truy vấn DB**, nên không giúp Supabase tránh bị pause sau 7 ngày không hoạt động.
- Đây là cách làm phổ biến nhưng không phải tính năng chính thức; Render có thể thay đổi chính sách gói Free.

---

## Xử lý lỗi thường gặp

| Triệu chứng (trong Logs) | Nguyên nhân | Cách xử lý |
| --- | --- | --- |
| `nest: not found` / `tsc: not found` | Đã đặt biến `NODE_ENV=production` → bỏ qua devDependencies | Xoá biến `NODE_ENV` ở Environment, deploy lại |
| `ERR_PNPM_IGNORED_BUILDS` | Package mới có build script chưa khai báo | Thêm vào `allowBuilds` trong `pnpm-workspace.yaml` (true/false), commit, push |
| `ERR_PNPM_OUTDATED_LOCKFILE` | Sửa `package.json` nhưng chưa cập nhật lockfile | Chạy `pnpm install` ở local, commit `pnpm-lock.yaml` |
| `drizzle-kit migrate` lỗi kết nối / timeout | Dùng direct connection (IPv6) hoặc transaction pooler `6543` | Đổi `DATABASE_URL` sang Session pooler `5432` |
| `[env:production] Cấu hình không hợp lệ: Thiếu biến ...` | Thiếu biến ở Environment | Thêm biến → **Save, rebuild, and deploy** |
| `JWT_SECRET production phải là chuỗi ngẫu nhiên >= 32 ký tự` | Secret quá ngắn / giá trị mẫu | Tạo mới bằng `openssl rand -base64 32` |
| Deploy treo ở health check rồi fail | App crash khi khởi động | Xem log phần Start; kiểm tra Health Check Path là `/api/health` |
| Request đầu tiên rất chậm / timeout | Cold start | Bình thường với gói Free — xem [Giảm cold start](#giảm-cold-start-tuỳ-chọn) |
| API trả lỗi DB sau một thời gian dài không dùng | Supabase Free bị pause | Supabase dashboard → **Restore project** |

---

## Bảo mật & lưu ý

- Secret chỉ nhập trong **Environment** của Render — không commit file `.env*`.
- Swagger đã tắt ở production. Cần debug tạm: thêm `SWAGGER_ENABLED=true` → deploy → nhớ xoá đi.
- Khi app có người dùng thật và cần ổn định hơn: nâng instance lên gói trả phí của Render (không ngủ, có Pre-deploy command), hoặc chuyển sang Oracle Always Free theo [deploy-oracle.md](deploy-oracle.md). Code và cấu hình env không cần sửa.
