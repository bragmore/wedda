import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Wedding service categories
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nameSv: text("name_sv").notNull(),
  nameEn: text("name_en").notNull(),
  descriptionSv: text("description_sv").notNull(),
  descriptionEn: text("description_en").notNull(),
  icon: text("icon").notNull(), // lucide icon name
  sortOrder: integer("sort_order").notNull().default(0),
});

// Vendors / companies offering services
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(),
  descriptionSv: text("description_sv").notNull(),
  descriptionEn: text("description_en").notNull(),
  location: text("location").notNull(),
  region: text("region").default("Hela Sverige"),
  email: text("email").notNull(),
  phone: text("phone"),
  website: text("website"),
  imageUrl: text("image_url"),
  priceRange: text("price_range"), // e.g. "$$" or "$$$"
  rating: integer("rating").default(0), // 0-5 stars
  featured: boolean("featured").default(false),
});

// Users (couples planning their wedding)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  phone: text("phone"),
  region: text("region"),
  guestCount: text("guest_count"),
  budget: integer("budget"),
  weddingDate: text("wedding_date"),
  visitorId: text("visitor_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages (vendor-customer conversations)
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  orderItemId: integer("order_item_id"),
  senderType: text("sender_type").notNull(), // "customer" | "vendor" | "system"
  senderName: text("sender_name").notNull(),
  senderEmail: text("sender_email").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  attachments: jsonb("attachments").default([]),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Orders (a complete wedding package request)
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, sent, partial, completed
  totalEstimate: integer("total_estimate").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Individual items within an order (each vendor selection)
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  vendorId: integer("vendor_id").notNull(),
  categoryId: integer("category_id").notNull(),
  productId: integer("product_id"),
  status: text("status").notNull().default("pending"), // pending, sent, quoted, accepted, declined
  quotedPrice: integer("quoted_price"), // in SEK
  vendorMessage: text("vendor_message"),
  deliveryDate: text("delivery_date"),
  customerNotes: text("customer_notes"),
});

// Insert schemas
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });

// Types
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Product type
export interface Product {
  id: number;
  name: string;
  category_id: string;
  description: string;
  price_from: number | null;
  price_to: number | null;
  price_on_demand: boolean;
  image_url: string;
  vendor_id?: number;
}
