import { pgTable, serial, text, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  password: text("password").default("123456"),
  has_bw: boolean("has_bw").default(true),
  has_color: boolean("has_color").default(false)
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  shop_id: integer("shop_id").references(() => shops.id),
  status: text("status").default("QUEUED"),
  total_amount: decimal("total_amount").notNull(),
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
  cost: decimal("cost").notNull(),
});