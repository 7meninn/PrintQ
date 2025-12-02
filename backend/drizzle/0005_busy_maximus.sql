ALTER TABLE "shops" ALTER COLUMN "has_bw" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "last_heartbeat" timestamp;