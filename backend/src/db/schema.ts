import { pgTable, serial, text, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";

// 🔹 USERS TABLE
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // Hashed
  created_at: timestamp("created_at").defaultNow(),
});

// 🔹 SHOPS TABLE
export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  is_active: boolean("is_active").default(true),
});

// 🔹 ORDERS TABLE
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  shop_id: integer("shop_id").references(() => shops.id),
  status: text("status").default("QUEUED"), // QUEUED, PRINTING, COMPLETED
  total_amount: decimal("total_amount").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// 🔹 ORDER FILES (Individual files in an order)
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