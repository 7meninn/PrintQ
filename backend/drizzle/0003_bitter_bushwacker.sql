ALTER TABLE "shops" ADD COLUMN "has_bw" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "has_color" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "shops" DROP COLUMN "is_active";