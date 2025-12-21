CREATE TABLE "payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer,
	"amount" numeric NOT NULL,
	"status" text DEFAULT 'PENDING',
	"bw_count" integer DEFAULT 0,
	"color_count" integer DEFAULT 0,
	"transaction_ref" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "upi_id" text;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;