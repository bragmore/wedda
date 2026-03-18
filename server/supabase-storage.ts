import { createClient, SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  Category, InsertCategory,
  Vendor, InsertVendor,
  User, InsertUser,
  Order, InsertOrder,
  OrderItem, InsertOrderItem,
  Product,
  Message, InsertMessage,
} from "@shared/schema";
import type { IStorage, CategoryWithParent } from "./storage";

// Re-export SWEDISH_REGIONS
export { SWEDISH_REGIONS } from "./storage";

interface RawCategory {
  id: string;
  slug: string;
  name_sv: string;
  name_en: string;
  icon: string;
  parent_id?: string | null;
}

interface RawVendor {
  name: string;
  category_id: string;
  website: string;
  email: string;
  city: string;
  region?: string;
  price_range: string;
  description: string;
  description_sv?: string;
  description_en?: string;
}

interface RawProduct {
  name: string;
  name_sv?: string;
  name_en?: string;
  category_id: string;
  description: string;
  price_from: number | null;
  price_to: number | null;
  price_min?: number | null;
  price_max?: number | null;
  price_on_demand?: boolean;
  image_url: string;
  vendor_id?: number;
}


function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 48; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

export class SupabaseStorage implements IStorage {
  private supabase: SupabaseClient;

  // Static data loaded from JSON (read-only)
  private categoriesCache: Map<number, CategoryWithParent> = new Map();
  private categorySlugMap: Map<string, number> = new Map();
  private categoryIdMap: Map<string, number> = new Map();
  private vendorsCache: Map<number, Vendor> = new Map();
  private productsCache: Map<number, Product> = new Map();

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_KEY) must be set");
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.loadStaticData();
  }

  private loadStaticData() {
    // Try multiple paths for the data files (works in both dev and serverless)
    const possibleDirs = [
      path.join(process.cwd(), "server"),
      process.cwd(),
      "/var/task/server",
    ];

    let dataDir = possibleDirs[0];
    for (const dir of possibleDirs) {
      if (fs.existsSync(path.join(dir, "data_categories.json"))) {
        dataDir = dir;
        break;
      }
    }

    // Load categories from JSON
    const rawCategories: RawCategory[] = JSON.parse(
      fs.readFileSync(path.join(dataDir, "data_categories.json"), "utf-8")
    );

    let catId = 1;
    rawCategories.forEach((raw, index) => {
      const id = catId++;
      const cat: CategoryWithParent = {
        id,
        slug: raw.id,
        nameSv: raw.name_sv,
        nameEn: raw.name_en,
        descriptionSv: raw.name_sv,
        descriptionEn: raw.name_en,
        icon: raw.icon,
        sortOrder: index + 1,
        parentId: raw.parent_id || null,
      };
      this.categoriesCache.set(id, cat);
      this.categorySlugMap.set(cat.slug, id);
      this.categoryIdMap.set(raw.id, id);
    });

    // Load vendors from JSON
    const rawVendors: RawVendor[] = JSON.parse(
      fs.readFileSync(path.join(dataDir, "data_vendors.json"), "utf-8")
    );

    let vendorId = 1;
    rawVendors.forEach(raw => {
      const numericCatId = this.categoryIdMap.get(raw.category_id);
      if (!numericCatId) return;
      const id = vendorId++;
      const vendor: Vendor = {
        id,
        categoryId: numericCatId,
        name: raw.name,
        descriptionSv: raw.description_sv || raw.description || "",
        descriptionEn: raw.description_en || raw.description || "",
        location: raw.city || "",
        region: raw.region || "Hela Sverige",
        email: raw.email || "",
        phone: null,
        website: raw.website || null,
        imageUrl: null,
        priceRange: raw.price_range || null,
        rating: Math.floor(Math.random() * 2) + 4,
        featured: Math.random() > 0.7,
      };
      this.vendorsCache.set(id, vendor);
    });

    // Load products from JSON
    const rawProducts: RawProduct[] = JSON.parse(
      fs.readFileSync(path.join(dataDir, "data_products.json"), "utf-8")
    );

    let productId = 1;
    rawProducts.forEach(raw => {
      const id = productId++;
      const priceFrom = raw.price_from ?? raw.price_min ?? null;
      const priceTo = raw.price_to ?? raw.price_max ?? null;
      const product: Product = {
        id,
        name: raw.name || raw.name_sv || "",
        category_id: raw.category_id,
        description: raw.description || raw.name_en || raw.name || "",
        price_from: priceFrom,
        price_to: priceTo,
        price_on_demand: raw.price_on_demand ?? (!priceFrom && !priceTo),
        image_url: raw.image_url || "",
        vendor_id: raw.vendor_id,
      };
      this.productsCache.set(id, product);
    });
  }

  // ── Categories (from JSON cache) ─────────────────────────────────────────
  async getCategories(): Promise<CategoryWithParent[]> {
    return [...this.categoriesCache.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getCategoryBySlug(slug: string): Promise<CategoryWithParent | undefined> {
    return [...this.categoriesCache.values()].find(c => c.slug === slug);
  }

  // ── Vendors (from JSON cache) ────────────────────────────────────────────
  async getVendors(categoryId?: string): Promise<Vendor[]> {
    const all = [...this.vendorsCache.values()];
    if (!categoryId) return all;
    const numericId = this.categoryIdMap.get(categoryId);
    if (!numericId) return [];
    return all.filter(v => v.categoryId === numericId);
  }

  async getVendorsByCategory(categoryId: number): Promise<Vendor[]> {
    return [...this.vendorsCache.values()].filter(v => v.categoryId === categoryId);
  }

  async getVendorsByCategoryAndRegion(categorySlug: string, region?: string): Promise<Vendor[]> {
    const numericId = this.categoryIdMap.get(categorySlug);
    if (!numericId) return [];
    let vendors = [...this.vendorsCache.values()].filter(v => v.categoryId === numericId);
    if (region && region !== "Hela Sverige") {
      vendors = vendors.filter(v =>
        v.region === region ||
        v.region === "Hela Sverige" ||
        v.region === "Sverige" ||
        v.location?.toLowerCase().includes(region.toLowerCase())
      );
    }
    return vendors;
  }

  async getVendorById(id: number): Promise<Vendor | undefined> {
    return this.vendorsCache.get(id);
  }

  async getFeaturedVendors(): Promise<Vendor[]> {
    return [...this.vendorsCache.values()].filter(v => v.featured);
  }

  async getRegions(): Promise<string[]> {
    const regions = new Set<string>();
    for (const v of this.vendorsCache.values()) {
      if (v.region && v.region !== "N/A" && v.region !== "Unknown") {
        regions.add(v.region);
      }
    }
    return [...regions].sort();
  }

  // ── Products (from JSON cache) ────────────────────────────────────────────
  async getProducts(categoryId?: string): Promise<Product[]> {
    const all = [...this.productsCache.values()];
    if (!categoryId) return all;
    return all.filter(p => p.category_id === categoryId);
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    return [...this.productsCache.values()].filter(p => p.category_id === categoryId);
  }

  async getProductById(id: number): Promise<Product | undefined> {
    return this.productsCache.get(id);
  }

  async getProductsByVendor(vendorId: number): Promise<Product[]> {
    return [...this.productsCache.values()].filter(p => p.vendor_id === vendorId);
  }

  async searchProducts(query: string): Promise<Product[]> {
    const q = query.toLowerCase();
    return [...this.productsCache.values()].filter(
      p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }

  async getProductsByBudget(maxBudget: number, categoryIds?: string[]): Promise<Product[]> {
    return [...this.productsCache.values()].filter(p => {
      if (categoryIds && !categoryIds.includes(p.category_id)) return false;
      if (p.price_on_demand) return true;
      if (!p.price_from) return true;
      return p.price_from <= maxBudget;
    });
  }

  // ── Users (Supabase) ────────────────────────────────────────────────────
  async createUser(user: InsertUser): Promise<User> {
    const { data, error } = await this.supabase
      .from("wedda_users")
      .insert({
        email: user.email,
        name: user.name,
        password_hash: user.passwordHash || null,
        phone: user.phone || null,
        region: user.region || null,
        guest_count: user.guestCount || null,
        budget: user.budget || null,
        wedding_date: user.weddingDate || null,
        visitor_id: user.visitorId || null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create user: ${error.message}`);
    return this.mapDbUser(data);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from("wedda_users")
      .select()
      .eq("email", email)
      .maybeSingle();

    if (error || !data) return undefined;
    return this.mapDbUser(data);
  }

  async getUserByVisitorId(visitorId: string): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from("wedda_users")
      .select()
      .eq("visitor_id", visitorId)
      .maybeSingle();

    if (error || !data) return undefined;
    return this.mapDbUser(data);
  }

  async getUserById(id: number): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from("wedda_users")
      .select()
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return undefined;
    return this.mapDbUser(data);
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.region !== undefined) dbUpdates.region = updates.region;
    if (updates.guestCount !== undefined) dbUpdates.guest_count = updates.guestCount;
    if (updates.budget !== undefined) dbUpdates.budget = updates.budget;
    if (updates.weddingDate !== undefined) dbUpdates.wedding_date = updates.weddingDate;
    if (updates.passwordHash !== undefined) dbUpdates.password_hash = updates.passwordHash;
    if (updates.email !== undefined) dbUpdates.email = updates.email;

    const { data, error } = await this.supabase
      .from("wedda_users")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) return undefined;
    return this.mapDbUser(data);
  }

  private mapDbUser(data: any): User {
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      passwordHash: data.password_hash,
      phone: data.phone,
      region: data.region,
      guestCount: data.guest_count,
      budget: data.budget,
      weddingDate: data.wedding_date,
      visitorId: data.visitor_id,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
    };
  }

  // ── Auth Sessions (persisted in Supabase — serverless-safe) ─────────────
  async createSession(userId: number): Promise<string> {
    const token = generateToken();
    const { error } = await this.supabase
      .from("wedda_sessions")
      .insert({ token, user_id: userId });
    if (error) console.error("[session] Failed to persist session:", error.message);
    return token;
  }

  async getUserByToken(token: string): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from("wedda_sessions")
      .select("user_id")
      .eq("token", token)
      .maybeSingle();
    if (error || !data) return undefined;
    return this.getUserById(data.user_id);
  }

  deleteSession(token: string): void {
    this.supabase
      .from("wedda_sessions")
      .delete()
      .eq("token", token)
      .then(({ error }) => {
        if (error) console.error("[session] Failed to delete session:", error.message);
      });
  }

  // ── Password Reset (HMAC-signed tokens — stateless, serverless-safe) ───
  private getResetSecret(): string {
    // Use Supabase key as HMAC secret (always available)
    return process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || "wedda-reset-secret";
  }

  createResetToken(email: string): string | null {
    const expires = Date.now() + 3600000; // 1 hour
    const payload = JSON.stringify({ email, expires });
    const payloadB64 = Buffer.from(payload).toString("base64url");
    const sig = crypto.createHmac("sha256", this.getResetSecret()).update(payloadB64).digest("base64url");
    // Return a short 6-digit code + the signed token (code is for UX, token is for verification)
    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit code
    const fullToken = `${code}.${payloadB64}.${sig}`;
    return fullToken;
  }

  verifyResetToken(token: string): string | null {
    try {
      const parts = token.trim().split(".");
      if (parts.length !== 3) return null;
      const [, payloadB64, sig] = parts;
      const expectedSig = crypto.createHmac("sha256", this.getResetSecret()).update(payloadB64).digest("base64url");
      if (sig !== expectedSig) return null;
      const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
      if (Date.now() > payload.expires) return null;
      return payload.email;
    } catch {
      return null;
    }
  }

  deleteResetToken(_token: string): void {
    // No-op: stateless tokens don't need deletion
  }

  // ── Orders (Supabase) ───────────────────────────────────────────────────
  async createOrder(order: InsertOrder): Promise<Order> {
    const { data, error } = await this.supabase
      .from("wedda_orders")
      .insert({
        user_id: order.userId,
        status: order.status || "pending",
        total_estimate: order.totalEstimate || 0,
        notes: order.notes || null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create order: ${error.message}`);
    return this.mapDbOrder(data);
  }

  async getOrdersByUser(userId: number): Promise<Order[]> {
    const { data, error } = await this.supabase
      .from("wedda_orders")
      .select()
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map(d => this.mapDbOrder(d));
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const { data, error } = await this.supabase
      .from("wedda_orders")
      .select()
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return undefined;
    return this.mapDbOrder(data);
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const { data, error } = await this.supabase
      .from("wedda_orders")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) return undefined;
    return this.mapDbOrder(data);
  }

  private mapDbOrder(data: any): Order {
    return {
      id: data.id,
      userId: data.user_id,
      status: data.status,
      totalEstimate: data.total_estimate,
      notes: data.notes,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
    };
  }

  // ── Order Items (Supabase) ──────────────────────────────────────────────
  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const { data, error } = await this.supabase
      .from("wedda_order_items")
      .insert({
        order_id: item.orderId,
        vendor_id: item.vendorId,
        category_id: item.categoryId,
        product_id: item.productId || null,
        status: item.status || "pending",
        quoted_price: item.quotedPrice || null,
        vendor_message: item.vendorMessage || null,
        delivery_date: item.deliveryDate || null,
        customer_notes: item.customerNotes || null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create order item: ${error.message}`);
    return this.mapDbOrderItem(data);
  }

  async getOrderItemsByOrder(orderId: number): Promise<OrderItem[]> {
    const { data, error } = await this.supabase
      .from("wedda_order_items")
      .select()
      .eq("order_id", orderId);

    if (error || !data) return [];
    return data.map(d => this.mapDbOrderItem(d));
  }

  async getOrderItemById(id: number): Promise<OrderItem | undefined> {
    const { data, error } = await this.supabase
      .from("wedda_order_items")
      .select()
      .eq("id", id)
      .single();

    if (error || !data) return undefined;
    return this.mapDbOrderItem(data);
  }

  async updateOrderItem(id: number, updates: Partial<OrderItem>): Promise<OrderItem | undefined> {
    const dbUpdates: Record<string, any> = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.quotedPrice !== undefined) dbUpdates.quoted_price = updates.quotedPrice;
    if (updates.vendorMessage !== undefined) dbUpdates.vendor_message = updates.vendorMessage;
    if (updates.deliveryDate !== undefined) dbUpdates.delivery_date = updates.deliveryDate;
    if (updates.customerNotes !== undefined) dbUpdates.customer_notes = updates.customerNotes;

    const { data, error } = await this.supabase
      .from("wedda_order_items")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) return undefined;
    return this.mapDbOrderItem(data);
  }

  private mapDbOrderItem(data: any): OrderItem {
    return {
      id: data.id,
      orderId: data.order_id,
      vendorId: data.vendor_id,
      categoryId: data.category_id,
      productId: data.product_id,
      status: data.status,
      quotedPrice: data.quoted_price,
      vendorMessage: data.vendor_message,
      deliveryDate: data.delivery_date,
      customerNotes: data.customer_notes,
    };
  }

  // ── Messages (Supabase) ─────────────────────────────────────────────────
  async createMessage(msg: InsertMessage): Promise<Message> {
    const { data, error } = await this.supabase
      .from("wedda_messages")
      .insert({
        order_id: msg.orderId,
        order_item_id: msg.orderItemId || null,
        sender_type: msg.senderType,
        sender_name: msg.senderName,
        sender_email: msg.senderEmail,
        subject: msg.subject,
        body: msg.body,
        attachments: msg.attachments || [],
        read: msg.read ?? false,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create message: ${error.message}`);
    return this.mapDbMessage(data);
  }

  async getMessagesByOrder(orderId: number): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from("wedda_messages")
      .select()
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (error || !data) return [];
    return data.map(d => this.mapDbMessage(d));
  }

  async getMessagesByUser(userId: number): Promise<Message[]> {
    // First get all user's orders
    const orders = await this.getOrdersByUser(userId);
    if (orders.length === 0) return [];

    const orderIds = orders.map(o => o.id);
    const { data, error } = await this.supabase
      .from("wedda_messages")
      .select()
      .in("order_id", orderIds)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map(d => this.mapDbMessage(d));
  }

  async markMessageRead(id: number): Promise<Message | undefined> {
    const { data, error } = await this.supabase
      .from("wedda_messages")
      .update({ read: true })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) return undefined;
    return this.mapDbMessage(data);
  }

  async getUnreadCountByUser(userId: number): Promise<number> {
    const msgs = await this.getMessagesByUser(userId);
    return msgs.filter(m => !m.read && m.senderType !== "customer").length;
  }

  private mapDbMessage(data: any): Message {
    return {
      id: data.id,
      orderId: data.order_id,
      orderItemId: data.order_item_id,
      senderType: data.sender_type,
      senderName: data.sender_name,
      senderEmail: data.sender_email,
      subject: data.subject,
      body: data.body,
      attachments: data.attachments || [],
      read: data.read,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
    };
  }
}
