import { pgTable, serial, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  phone: varchar("phone", { length: 20 }).notNull(),
  created_at: timestamp("created_at").defaultNow()
});

export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name"),
  username: varchar("username", { length: 50 }).unique().notNull(),
  password: text("password").notNull(),
  created_at: timestamp("created_at").defaultNow()
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  shop_id: integer("shop_id").references(() => shops.id),
  file_url: text("file_url"),
  pages: integer("pages"),
  copies: integer("copies"),
  color: boolean("color"),
  amount: integer("amount"),
  payment_status: varchar("payment_status", { length: 20 }).default("PAID"),
  status: varchar("status", { length: 20 }).default("QUEUED"),
  created_at: timestamp("created_at").defaultNow()
});
