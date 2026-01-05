CREATE INDEX "order_files_order_idx" ON "order_files" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_shop_idx" ON "orders" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_payouts_idx" ON "orders" USING btree ("shop_id","status","created_at");--> statement-breakpoint
CREATE INDEX "payouts_shop_idx" ON "payouts" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");