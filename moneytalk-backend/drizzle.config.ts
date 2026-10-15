// Nạp .env theo NODE_ENV (vd: NODE_ENV=production npm run db:migrate)
import './src/config/env';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  // Chỉ lấy *.schema.ts — tránh duplicate khi có index.ts re-export
  schema: './src/database/schema/*.schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
