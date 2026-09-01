ALTER TABLE "transaction_types" DROP CONSTRAINT "transaction_types_code_key";--> statement-breakpoint
ALTER TABLE "transaction_types" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "transaction_types" ADD COLUMN "flow" "transaction_flow";--> statement-breakpoint
ALTER TABLE "transaction_types" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "transaction_types" SET "flow" = 'expense', "is_default" = true WHERE "flow" IS NULL;--> statement-breakpoint
ALTER TABLE "transaction_types" ALTER COLUMN "flow" SET NOT NULL;--> statement-breakpoint
INSERT INTO "transaction_types" ("code", "name", "flow", "is_default")
SELECT 'salary', 'Salary', 'income', true
WHERE NOT EXISTS (
  SELECT 1 FROM "transaction_types"
  WHERE "code" = 'salary' AND "flow" = 'income' AND "user_id" IS NULL
);--> statement-breakpoint
INSERT INTO "transaction_types" ("code", "name", "flow", "is_default")
SELECT 'gift', 'Gift', 'income', true
WHERE NOT EXISTS (
  SELECT 1 FROM "transaction_types"
  WHERE "code" = 'gift' AND "flow" = 'income' AND "user_id" IS NULL
);--> statement-breakpoint
ALTER TABLE "transaction_types" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_types_default_code_flow_uidx" ON "transaction_types" ("code","flow") WHERE "user_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_types_user_code_flow_uidx" ON "transaction_types" ("user_id","code","flow") WHERE "user_id" is not null;--> statement-breakpoint
ALTER TABLE "transaction_types" ADD CONSTRAINT "transaction_types_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
