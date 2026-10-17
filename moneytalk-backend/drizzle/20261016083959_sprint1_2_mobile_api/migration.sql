CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"icon_key" varchar(50) NOT NULL,
	"color" varchar(7) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipt_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"transaction_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"amount" bigint,
	"type_id" uuid,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "refresh_token_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "transaction_types" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "transaction_types" ADD COLUMN "icon_key" varchar(50) DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction_types" ADD COLUMN "color" varchar(7) DEFAULT '#7F96B0' NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction_types" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction_types" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "payment_method_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "spent_at" timestamp with time zone;--> statement-breakpoint
-- Dữ liệu cũ: spent_at = created_at
UPDATE "transactions" SET "spent_at" = "created_at" WHERE "spent_at" IS NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "spent_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "spent_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "amount" SET DATA TYPE bigint USING round("amount")::bigint;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_refresh_token_hash_key" UNIQUE("refresh_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_default_code_uidx" ON "payment_methods" ("code") WHERE "user_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_user_code_uidx" ON "payment_methods" ("user_id","code") WHERE "user_id" is not null;--> statement-breakpoint
CREATE INDEX "receipt_items_transaction_idx" ON "receipt_items" ("transaction_id","position");--> statement-breakpoint
CREATE INDEX "transactions_user_spent_at_idx" ON "transactions" ("user_id","spent_at");--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_transaction_id_transactions_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_type_id_transaction_types_id_fkey" FOREIGN KEY ("type_id") REFERENCES "transaction_types"("id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payment_method_id_payment_methods_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id");