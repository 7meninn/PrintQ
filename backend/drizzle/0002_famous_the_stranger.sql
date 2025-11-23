ALTER TABLE "shops" DROP CONSTRAINT "shops_username_unique";--> statement-breakpoint
ALTER TABLE "order_files" ALTER COLUMN "order_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "order_files" ALTER COLUMN "file_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "order_files" ALTER COLUMN "file_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'QUEUED';--> statement-breakpoint
ALTER TABLE "shops" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "order_files" ADD COLUMN "copies" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "order_files" ADD COLUMN "cost" numeric NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "total_amount" numeric NOT NULL;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password" text NOT NULL;--> statement-breakpoint
ALTER TABLE "order_files" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "color_pages";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "bw_pages";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "copies";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "amount";--> statement-breakpoint
ALTER TABLE "shops" DROP COLUMN "username";--> statement-breakpoint
ALTER TABLE "shops" DROP COLUMN "password";--> statement-breakpoint
ALTER TABLE "shops" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "phone";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");