import { pgTable, serial, text, integer, boolean, timestamp, decimal, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  last_password_reset: timestamp("last_password_reset"),
  reset_token: text("reset_token"),
  reset_token_expires: timestamp("reset_token_expires"),
  created_at: timestamp("created_at").defaultNow(),
}, (table) => [
  index("users_email_idx").on(table.email)
]);

export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  password: text("password").default("123456"),
  upi_id: text("upi_id"),
  status: text("status").default('ACTIVE'),
  has_bw: boolean("has_bw").default(false),
  has_color: boolean("has_color").default(false),
  has_bw_a3: boolean("has_bw_a3").default(false),
  has_color_a3: boolean("has_color_a3").default(false),
  last_heartbeat: timestamp("last_heartbeat")
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  shop_id: integer("shop_id").references(() => shops.id),
  status: text("status").default("QUEUED"),
  total_amount: decimal("total_amount").notNull(),
  razorpay_payment_id: text("razorpay_payment_id"),
  razorpay_order_id: text("razorpay_order_id"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("orders_user_idx").on(table.user_id),
  index("orders_shop_idx").on(table.shop_id),
  index("orders_status_idx").on(table.status),
  index("orders_payouts_idx").on(table.shop_id, table.status, table.created_at)
]);

export const otp_verifications = pgTable("otp_verifications", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  otp: text("otp").notNull(),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const order_files = pgTable("order_files", {
  id: serial("id").primaryKey(),
  order_id: integer("order_id").references(() => orders.id),
  file_url: text("file_url").notNull(),
  file_type: text("file_type").notNull(),
  pages: integer("pages").notNull(),
  copies: integer("copies").default(1),
  color: boolean("color").default(false),
  paper_size: text("paper_size").default("A4"),
  cost: decimal("cost").notNull(),
  is_deleted_from_storage: boolean("is_deleted_from_storage").default(false).notNull(),
}, (table) => [
  index("order_files_order_idx").on(table.order_id)
]);

export const payouts = pgTable("payouts", {
  id: serial("id").primaryKey(),
  shop_id: integer("shop_id").references(() => shops.id),
  amount: decimal("amount").notNull(),
  status: text("status").default("PENDING"),
  bw_count: integer("bw_count").default(0),
  color_count: integer("color_count").default(0),
  transaction_ref: text("transaction_ref"),
  created_at: timestamp("created_at").defaultNow(),
}, (table) => [
  index("payouts_shop_idx").on(table.shop_id)
]);
