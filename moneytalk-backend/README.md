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

## Cấu trúc database

| File / thư mục | Vai trò |
| --- | --- |
| `src/db/schema.ts` | Định nghĩa bảng (source of truth) |
| `src/db/index.ts` | Client Drizzle dùng trong NestJS |
| `drizzle.config.ts` | Config cho drizzle-kit |
| `drizzle/` | SQL migration do `generate` tạo ra (commit vào Git) |

## Scripts Drizzle

| Script | Lệnh gốc | Khi nào dùng |
| --- | --- | --- |
| `npm run db:generate` | `drizzle-kit generate` | Sau khi sửa `schema.ts` — tạo file SQL migration |
| `npm run db:migrate` | `drizzle-kit migrate` | Apply các migration chưa chạy lên database |
| `npm run db:push` | `drizzle-kit push` | Sync schema thẳng lên DB (chỉ local / prototype) |
| `npm run db:studio` | `drizzle-kit studio` | Mở GUI xem / sửa data |
| `npm run db:pull` | `drizzle-kit pull` | Introspect DB có sẵn → schema TypeScript |
| `npm run db:check` | `drizzle-kit check` | Kiểm tra conflict giữa các migration |

---

## Mỗi lần update database — làm theo thứ tự này

Quy trình chuẩn (team / staging / production): **sửa schema → generate → review SQL → migrate → commit**.

### Bước 1 — Sửa schema

Chỉnh `src/db/schema.ts` (thêm/sửa/xóa bảng, cột, index, …).

Ví dụ thêm cột:

```ts
export const usersTable = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  // cột mới
  phone: varchar({ length: 20 }),
});
```

### Bước 2 — Generate migration

```bash
npm run db:generate
```

Drizzle so sánh schema hiện tại với snapshot trước đó và tạo folder SQL trong `drizzle/`.

Có thể đặt tên migration:

```bash
npx drizzle-kit generate --name add_users_phone
```

### Bước 3 — Review file SQL

Mở file `.sql` vừa tạo trong `drizzle/`, kiểm tra câu lệnh có đúng ý không (đặc biệt khi rename / drop cột).

### Bước 4 — Apply lên database

```bash
npm run db:migrate
```

Chạy trên môi trường nào thì `DATABASE_URL` trong `.env` phải trỏ đúng DB đó.

### Bước 5 — Commit

Commit **cả** thay đổi schema **và** folder migration trong `drizzle/`:

```bash
git add src/db/schema.ts drizzle/
git commit -m "db: add users.phone"
```

Người khác (hoặc CI/server) chỉ cần:

```bash
npm run db:migrate
```

---

## Lần đầu setup database trên máy mới

1. Tạo DB PostgreSQL và điền `DATABASE_URL` trong `.env`
2. Cài dependency: `npm install`
3. Apply toàn bộ migration:

```bash
npm run db:migrate
```

4. (Tuỳ chọn) mở Studio kiểm tra:

```bash
npm run db:studio
```

---

## Dev nhanh với `db:push` (không dùng production)

Khi đang prototype local và **không cần** lịch sử migration:

```bash
# Sửa schema.ts rồi:
npm run db:push
```

Schema được push thẳng lên DB, **không** tạo file trong `drizzle/`.

> Không dùng `db:push` cho staging/production. Production luôn dùng `generate` + `migrate`.

---

## Checklist nhanh mỗi lần đổi schema

```text
[ ] 1. Sửa src/db/schema.ts
[ ] 2. npm run db:generate
[ ] 3. Review file SQL trong drizzle/
[ ] 4. npm run db:migrate
[ ] 5. Commit schema + drizzle/
```

## Lưu ý

- `DATABASE_URL` không commit lên Git (chỉ có trong `.env` / secret CI).
- Đừng sửa tay file SQL migration đã được apply trên shared DB; tạo migration mới nếu cần sửa tiếp.
- Rename cột/bảng: Drizzle có thể hỏi confirm trong lúc `generate` — đọc kỹ prompt trước khi chọn.
