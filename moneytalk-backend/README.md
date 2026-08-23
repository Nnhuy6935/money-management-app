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

### Dùng JWT trên Swagger

1. `POST /api/auth/login` (hoặc register) → copy `accessToken`
2. Bấm **Authorize** → dán token (hoặc `Bearer <token>`)
3. Gọi các API còn lại

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
