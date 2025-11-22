CREATE TABLE "order_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"file_url" text NOT NULL,
	"pages" integer NOT NULL,
	"file_type" varchar(20),
	"color" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "copies" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "amount" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "color_pages" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "bw_pages" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "order_files" ADD CONSTRAINT "order_files_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "file_url";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "pages";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "color";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "payment_status";