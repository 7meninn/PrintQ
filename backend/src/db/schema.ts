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

  color_pages: integer("color_pages").default(0),
  bw_pages: integer("bw_pages").default(0),
  copies: integer("copies").default(1),
  amount: integer("amount").notNull(),

  status: varchar("status", { length: 20 }).default("QUEUED"),

  created_at: timestamp("created_at").defaultNow()
});

export const order_files = pgTable("order_files", {
  id: serial("id").primaryKey(),
  order_id: integer("order_id").references(() => orders.id).notNull(),

  file_url: text("file_url").notNull(),
  pages: integer("pages").notNull(),
  file_type: varchar("file_type", { length: 20 }),
  color: boolean("color").default(false),

  created_at: timestamp("created_at").defaultNow()
});

