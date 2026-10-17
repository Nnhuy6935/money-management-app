CREATE TYPE "group_invitation_status" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "group_member_role" AS ENUM('OWNER', 'MEMBER');--> statement-breakpoint
CREATE TYPE "group_status" AS ENUM('ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "group_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"group_id" uuid NOT NULL,
	"inviter_id" uuid NOT NULL,
	"invitee_id" uuid NOT NULL,
	"status" "group_invitation_status" DEFAULT 'PENDING'::"group_invitation_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "group_member_role" DEFAULT 'MEMBER'::"group_member_role" NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(100) NOT NULL,
	"description" text,
	"owner_id" uuid NOT NULL,
	"status" "group_status" DEFAULT 'ACTIVE'::"group_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invite_id" varchar(16);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_invite_id_key" UNIQUE("invite_id");--> statement-breakpoint
-- Backfill invite_id cho user cũ: 8 ký tự, bỏ O/0/I/1; trùng thì sinh lại
DO $$
DECLARE
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  r record;
  code text;
BEGIN
  FOR r IN SELECT id FROM "users" WHERE "invite_id" IS NULL LOOP
    LOOP
      SELECT string_agg(substr(alphabet, floor(random() * 32)::int + 1, 1), '')
        INTO code FROM generate_series(1, 8);
      BEGIN
        UPDATE "users" SET "invite_id" = code WHERE id = r.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- trùng mã → thử lại
      END;
    END LOOP;
  END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "invite_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "group_invitations_pending_uidx" ON "group_invitations" ("group_id","invitee_id") WHERE "status" = 'PENDING';--> statement-breakpoint
CREATE INDEX "group_invitations_invitee_status_idx" ON "group_invitations" ("invitee_id","status");--> statement-breakpoint
CREATE INDEX "group_invitations_group_status_idx" ON "group_invitations" ("group_id","status");--> statement-breakpoint
CREATE INDEX "group_invitations_inviter_status_idx" ON "group_invitations" ("inviter_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "group_members_active_uidx" ON "group_members" ("group_id","user_id") WHERE "left_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "group_members_one_owner_uidx" ON "group_members" ("group_id") WHERE "role" = 'OWNER' and "left_at" is null;--> statement-breakpoint
CREATE INDEX "group_members_user_idx" ON "group_members" ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_group_spent_at_idx" ON "transactions" ("group_id","spent_at");--> statement-breakpoint
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_group_id_groups_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_inviter_id_users_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_invitee_id_users_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_group_id_groups_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id");