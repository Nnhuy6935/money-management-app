# MoneyTalk Backend

NestJS API + PostgreSQL với [Drizzle ORM](https://orm.drizzle.team/).

## Yêu cầu

- Node.js 20+
- PostgreSQL đang chạy
- File `.env` (copy từ `.env.example`)

```bash
cp .env.example .env
# Sửa DATABASE_URL cho đúng máy bạn
```

## Cài đặt & chạy app

```bash
npm install
npm run start:dev
```

API chạy tại `http://localhost:3000/api`.

Swagger UI: **http://localhost:3000/api/docs**

---

## Cấu trúc dự án

```text
src/
├── main.ts                    # Bootstrap app, global prefix /api
├── app.module.ts              # Root module — import feature modules ở đây
├── common/                    # Shared code dùng chung
│   ├── constants/             # Injection tokens, constants
│   └── types/                 # Shared TypeScript types
├── database/                  # Database layer
│   ├── database.module.ts     # Global Drizzle module (DI)
│   ├── database.provider.ts
│   └── schema/                # Drizzle schema (1 file / bảng)
│       ├── index.ts
│       └── users.schema.ts
└── modules/                   # Feature modules (theo domain)
    ├── health/                # Health check
    └── users/                 # Ví dụ module CRUD hoàn chỉnh
        ├── users.module.ts
        ├── users.controller.ts
        ├── users.service.ts
        ├── dto/
        └── index.ts

templates/feature-module/      # Template tạo module mới
scripts/generate-module.mjs    # Script generate module từ template
drizzle/                       # SQL migrations
```

### Quy ước mỗi feature module

| File | Vai trò |
| --- | --- |
| `*.module.ts` | Đăng ký controller, service |
| `*.controller.ts` | HTTP routes (`/api/<feature>`) |
| `*.service.ts` | Business logic + truy vấn DB |
| `dto/` | Input/output types cho API |
| `index.ts` | Public exports của module |

Schema DB đặt riêng tại `src/database/schema/<feature>.schema.ts`, export qua `index.ts`.

---

## Tạo module tính năng mới

Dùng script generate từ template:

```bash
npm run generate:module transactions
```

Script sẽ tạo:

- `src/modules/transactions/` — module, controller, service, DTOs
- `src/database/schema/transactions.schema.ts` — schema mẫu

Sau đó:

1. Sửa schema trong `src/database/schema/transactions.schema.ts`
2. Sửa DTOs trong `src/modules/transactions/dto/`
3. Import module vào `src/app.module.ts`:

```ts
import { TransactionsModule } from './modules/transactions/transactions.module';

@Module({
  imports: [DatabaseModule, HealthModule, UsersModule, TransactionsModule],
})
export class AppModule {}
```

4. Chạy migration:

```bash
npm run db:generate
npm run db:migrate
```

### Module gợi ý cho MoneyTalk

| Module | Route | Mô tả |
| --- | --- | --- |
| `users` | `/api/users` | Quản lý user (đã có) |
| `auth` | `/api/auth` | Đăng nhập / đăng ký |
| `accounts` | `/api/accounts` | Ví / tài khoản |
| `transactions` | `/api/transactions` | Thu chi |
| `categories` | `/api/categories` | Danh mục |
| `budgets` | `/api/budgets` | Ngân sách |

---

## API endpoints hiện có

| Method | Route | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | Health check |
| POST | `/api/auth/register` | Public | Đăng ký → trả JWT |
| POST | `/api/auth/login` | Public | Đăng nhập → trả JWT |
| GET | `/api/auth/me` | Bearer | Profile hiện tại |
| GET | `/api/users` | Admin | Danh sách users |
| GET | `/api/users/:id` | Self / Admin | Chi tiết user |
| PATCH | `/api/users/:id` | Self / Admin | Cập nhật (role chỉ admin) |
| DELETE | `/api/users/:id` | Admin | Xóa user |
| GET | `/api/stats/overview` | Admin | Thống kê |
| GET | `/api/transaction-types` | Bearer | Loại giao dịch (default + custom của user) |
| POST | `/api/transaction-types` | Bearer | Thêm loại giao dịch custom |
| POST | `/api/uploads/image` | Bearer | Upload ảnh qua backend (khuyên dùng) |
| POST | `/api/uploads/presign` | Bearer | Lấy presigned URL (client PUT trực tiếp) |
| POST | `/api/transactions` | Bearer | Tạo giao dịch (truyền `imageUrl`) |
| GET | `/api/transactions/me` | Bearer | Danh sách giao dịch (lọc ngày) |
| GET | `/api/transactions/me/:id` | Bearer | Chi tiết giao dịch |
| PATCH | `/api/transactions/me/:id` | Bearer | Sửa giao dịch |
| DELETE | `/api/transactions/me/:id` | Bearer | Xóa giao dịch + ảnh R2 |
| GET | `/api/transactions/user/:userId` | Admin | Giao dịch theo user |
| GET | `/api/friends` | Bearer | Danh sách bạn bè |
| GET | `/api/friends/requests/incoming` | Bearer | Lời mời nhận được |
| GET | `/api/friends/requests/outgoing` | Bearer | Lời mời đã gửi |
| POST | `/api/friends/requests` | Bearer | Gửi lời mời kết bạn |
| PATCH | `/api/friends/requests/:id/accept` | Bearer | Chấp nhận lời mời |
| PATCH | `/api/friends/requests/:id/reject` | Bearer | Từ chối lời mời |
| DELETE | `/api/friends/:userId` | Bearer | Huỷ kết bạn |

### Dùng JWT trên Swagger

1. `POST /api/auth/login` (hoặc register) → copy `accessToken`
2. Bấm **Authorize** → dán token (hoặc `Bearer <token>`)
3. Gọi các API còn lại

---

## Cấu hình biến môi trường (`.env`)

```bash
cp .env.example .env
```

### 1. `DATABASE_URL` (Supabase)

1. Mở [Supabase Dashboard](https://supabase.com/dashboard) → chọn project  
2. **Project Settings** → **Database**  
3. Mục **Connection string** → chọn **URI**  
4. Copy chuỗi, thay `[YOUR-PASSWORD]` bằng database password  
5. Gợi ý:
   - App (`start:dev`): **Pooler** (thường port `6543`)
   - `db:migrate` nếu lỗi: tạm dùng **Direct** (host `db.<ref>.supabase.co`, port `5432`)

Ví dụ:

```env
DATABASE_URL=postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

---

### 2. `JWT_SECRET` / `JWT_EXPIRES_IN`

```bash
openssl rand -base64 32
```

Dán kết quả vào:

```env
JWT_SECRET=paste_openssl_output_here
JWT_EXPIRES_IN=7d
```

---

### 3. Cloudflare R2 (upload ảnh)

#### 3.1. `R2_ACCOUNT_ID`

1. Đăng nhập [Cloudflare Dashboard](https://dash.cloudflare.com/)  
2. Sidebar phải / Overview account → **Account ID** (chuỗi hex)  
3. Hoặc vào **R2** → nhìn URL / overview cũng có Account ID  

```env
R2_ACCOUNT_ID=0123456789abcdef0123456789abcdef
```

#### 3.2. Tạo bucket → `R2_BUCKET_NAME`

1. Cloudflare → **R2 Object Storage** → **Create bucket**  
2. Đặt tên (vd `moneytalk`) — chỉ chữ thường, số, dấu `-`  

```env
R2_BUCKET_NAME=moneytalk
```

#### 3.3. API Token → `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY`

1. R2 → **Overview** → **Manage R2 API Tokens** (hoặc Account API Tokens liên quan R2)  
2. **Create API token**  
3. Permissions: **Object Read & Write** (hoặc Admin Read & Write nếu cần)  
4. Scope: chọn bucket `moneytalk` (hoặc All buckets khi dev)  
5. Create → Cloudflare hiện **một lần**:
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`  
   (Copy ngay — không xem lại được)

```env
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 3.4. Public URL → `R2_PUBLIC_URL`

Ảnh phải mở được qua HTTP công khai:

**Cách A — R2.dev subdomain (nhanh để test)**  
1. Vào bucket → **Settings**  
2. **Public access** → **Allow Access** / Connect **R2.dev** subdomain  
3. Copy URL dạng `https://pub-xxxxx.r2.dev`  

```env
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxxxxxxxxx.r2.dev
```

**Cách B — Custom domain (production)**  
1. Bucket → **Settings** → **Custom Domains** → gắn domain (vd `cdn.moneytalk.com`)  
2. Điền:

```env
R2_PUBLIC_URL=https://cdn.moneytalk.com
```

> Không dùng endpoint S3 (`*.r2.cloudflarestorage.com`) làm `R2_PUBLIC_URL` — đó là API private, trình duyệt không mở ảnh được.

#### Troubleshooting — URL ảnh không mở được

| Triệu chứng | Nguyên nhân | Cách xử lý |
| --- | --- | --- |
| XML / AccessDenied | Dùng nhầm **`uploadUrl`** (presigned) thay vì **`publicUrl`** | Chỉ mở `publicUrl` / `url` từ presign response |
| 404 Not Found | Chưa PUT file lên `uploadUrl`, hoặc PUT lỗi | PUT lại file, kiểm tra response **200** |
| File tải về nhưng hỏng | PUT gửi **FormData** thay vì binary thô | `body: file` + header `Content-Type: image/jpeg` |
| 401/403 trên r2.dev | Bucket chưa bật **Public access** | Bucket → Settings → Allow Access / R2.dev subdomain |

**PUT đúng (JavaScript):**
```javascript
await fetch(uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': contentType },
  body: file, // File/Blob gốc, không bọc FormData
});
// Sau đó mới dùng publicUrl
```

#### 3.5. `R2_ENDPOINT` (optional)

Thường **không cần** set. App tự dùng:

```text
https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com
```

Chỉ set khi Cloudflare hướng dẫn endpoint khác.

---

### Checklist `.env` đầy đủ

```env
DATABASE_URL=...
JWT_SECRET=...
JWT_EXPIRES_IN=7d

R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=moneytalk
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
```

Sau khi lưu `.env`, restart:

```bash
npm run start:dev
```

Test: Swagger → Authorize → `POST /api/uploads/presign` → PUT file lên `uploadUrl` → `POST /api/transactions`.

---

## Giao dịch thu/chi (ảnh + metadata)

Ảnh lưu **R2**; metadata lưu **PostgreSQL** (`transactions`, `transaction_types`).

### Loại giao dịch (`transaction_types`)

Mỗi loại thuộc **expense** hoặc **income**, có `isDefault` (hệ thống) hoặc custom (user tạo).

**Expense mặc định:** `food`, `shopping`, `transport`, `entertainment`, `health`, `education`, `other`

**Income mặc định:** `salary`, `gift`

```http
GET /api/transaction-types?flow=expense
GET /api/transaction-types?flow=income
```

**Thêm loại custom:**

```http
POST /api/transaction-types
Content-Type: application/json

{
  "name": "Freelance",
  "flow": "income",
  "code": "freelance"
}
```

`code` tuỳ chọn — bỏ trống sẽ tự sinh từ `name`. `typeId` khi tạo giao dịch phải **khớp `flow`**.

### Upload ảnh

#### Cách A — Qua backend (khuyên dùng, test Swagger dễ)

`POST /api/uploads/image` — `multipart/form-data`, field `file`.

Response `url` / `publicUrl` → dùng làm `imageUrl` khi tạo transaction.

#### Cách B — Presigned URL (client PUT trực tiếp lên R2)

**Bước 1 — Xin URL upload**

`POST /api/uploads/presign` — `application/json`:

| Field | Bắt buộc | Mô tả |
| --- | --- | --- |
| `contentType` | ✓ | `image/jpeg`, `image/png`, `image/webp`, `image/gif` |

Response:

```json
{
  "uploadUrl": "https://...r2.cloudflarestorage.com/...?X-Amz-Signature=...",
  "key": "transactions/1/uuid.jpg",
  "url": "https://cdn.example.com/transactions/1/uuid.jpg",
  "contentType": "image/jpeg",
  "expiresIn": 900
}
```

**Bước 2 — Upload trực tiếp lên R2**

Client gọi **PUT** lên `uploadUrl` (không qua backend):

```http
PUT {uploadUrl}
Content-Type: image/jpeg

<binary file data>
```

`Content-Type` phải **khớp** với `contentType` đã gửi ở bước 1.

### Tạo giao dịch (bước 3)

`POST /api/transactions` — `application/json`:

| Field | Bắt buộc | Mô tả |
| --- | --- | --- |
| `imageUrl` | ✓ | `url` từ bước 1 (sau khi PUT xong) |
| `amount` | ✓ | Số tiền |
| `flow` | ✓ | `income` hoặc `expense` |
| `typeId` | | ID từ `/transaction-types` (có thể null) |
| `description` | | Mô tả |

### Lấy theo user + ngày (giờ Việt Nam UTC+7)

```http
GET /api/transactions/me?date=2026-08-23
GET /api/transactions/me?from=2026-08-01&to=2026-08-31
GET /api/transactions/me?flow=expense&typeId=1&page=1&limit=20
```

Sau khi đổi schema, chạy:

```bash
npm run db:generate
npm run db:migrate
```

---

## Database & Drizzle

| File / thư mục | Vai trò |
| --- | --- |
| `src/database/schema/` | Định nghĩa bảng (source of truth) |
| `src/database/database.module.ts` | Inject Drizzle vào NestJS |
| `drizzle.config.ts` | Config cho drizzle-kit |
| `drizzle/` | SQL migration (commit vào Git) |

### Scripts Drizzle

| Script | Khi nào dùng |
| --- | --- |
| `npm run db:generate` | Sau khi sửa schema — tạo file SQL migration |
| `npm run db:migrate` | Apply migration lên database |
| `npm run db:push` | Sync schema thẳng lên DB (chỉ local) |
| `npm run db:studio` | Mở GUI xem / sửa data |
| `npm run db:pull` | Introspect DB → schema TypeScript |
| `npm run db:check` | Kiểm tra conflict migration |

---

## Mỗi lần update database

Quy trình chuẩn: **sửa schema → generate → review SQL → migrate → commit**.

### Bước 1 — Sửa schema

Chỉnh file trong `src/database/schema/` (ví dụ `users.schema.ts`).

> **IDs:** Tất cả primary key / foreign key dùng **UUID** (`gen_random_uuid()`). JWT `sub` cũng là UUID string. Migration `uuid_primary_keys` **xóa và tạo lại** bảng — cần đăng ký lại user sau khi migrate.

### Bước 2 — Generate migration

```bash
npm run db:generate
# hoặc đặt tên:
npx drizzle-kit generate --name add_users_phone
```

### Bước 3 — Review file SQL

Mở file `.sql` trong `drizzle/`, kiểm tra câu lệnh.

### Bước 4 — Apply lên database

```bash
npm run db:migrate
```

### Bước 5 — Commit

```bash
git add src/database/schema/ drizzle/
git commit -m "db: add users.phone"
```

---

## Checklist nhanh

```text
[ ] 1. Sửa src/database/schema/
[ ] 2. npm run db:generate
[ ] 3. Review SQL trong drizzle/
[ ] 4. npm run db:migrate
[ ] 5. Commit schema + drizzle/
```

## Lưu ý

- `DATABASE_URL` không commit lên Git.
- Không dùng `db:push` cho staging/production.
- Đừng sửa tay migration đã apply trên shared DB.
