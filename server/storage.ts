import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Works in both ESM (dev) and CJS (production build)
let _currentDir: string;
try {
  // ESM: import.meta.url is defined
  if (typeof import.meta !== "undefined" && typeof import.meta.url === "string") {
    _currentDir = path.dirname(fileURLToPath(import.meta.url));
  } else {
    _currentDir = process.cwd();
  }
} catch {
  _currentDir = process.cwd();
}
import {
  Category, InsertCategory,
  Vendor, InsertVendor,
  User, InsertUser,
  Order, InsertOrder,
  OrderItem, InsertOrderItem,
  Product,
  Message, InsertMessage,
} from "@shared/schema";

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

// Swedish regions for the wizard location step
export const SWEDISH_REGIONS = [
  "Stockholm", "Västra Götaland", "Skåne", "Uppsala", "Östergötland",
  "Jönköping", "Halland", "Västmanland", "Örebro", "Dalarna",
  "Värmland", "Västerbotten", "Norrbotten", "Jämtland", "Västernorrland",
  "Gävleborg", "Södermanland", "Blekinge", "Kalmar", "Gotland", "Kronoberg",
  "Hela Sverige"
];

export interface IStorage {
  // Categories
  getCategories(): Promise<Category[]>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;

  // Vendors
  getVendors(categoryId?: string): Promise<Vendor[]>;
  getVendorsByCategory(categoryId: number): Promise<Vendor[]>;
  getVendorsByCategoryAndRegion(categorySlug: string, region?: string): Promise<Vendor[]>;
  getVendorById(id: number): Promise<Vendor | undefined>;
  getFeaturedVendors(): Promise<Vendor[]>;
  getRegions(): Promise<string[]>;

  // Products
  getProducts(categoryId?: string): Promise<Product[]>;
  getProductsByCategory(categoryId: string): Promise<Product[]>;
  getProductById(id: number): Promise<Product | undefined>;
  getProductsByVendor(vendorId: number): Promise<Product[]>;
  searchProducts(query: string): Promise<Product[]>;
  getProductsByBudget(maxBudget: number, categoryIds?: string[]): Promise<Product[]>;

  // Users
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVisitorId(visitorId: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;

  // Auth sessions
  createSession(userId: number): string;
  getUserByToken(token: string): Promise<User | undefined>;
  deleteSession(token: string): void;

  // Password reset
  createResetToken(email: string): string | null;
  verifyResetToken(token: string): string | null; // returns email
  deleteResetToken(token: string): void;

  // Orders
  createOrder(order: InsertOrder): Promise<Order>;
  getOrdersByUser(userId: number): Promise<Order[]>;
  getOrderById(id: number): Promise<Order | undefined>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;

  // Order Items
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  getOrderItemsByOrder(orderId: number): Promise<OrderItem[]>;
  updateOrderItem(id: number, updates: Partial<OrderItem>): Promise<OrderItem | undefined>;

  // Messages
  createMessage(msg: InsertMessage): Promise<Message>;
  getMessagesByOrder(orderId: number): Promise<Message[]>;
  getMessagesByUser(userId: number): Promise<Message[]>;
  markMessageRead(id: number): Promise<Message | undefined>;
  getUnreadCountByUser(userId: number): Promise<number>;
}

// Extended category with parent info for the API
export interface CategoryWithParent extends Category {
  parentId: string | null;
}

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 48; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

export class MemStorage implements IStorage {
  private categories: Map<number, CategoryWithParent> = new Map();
  private categorySlugMap: Map<string, number> = new Map();
  private categoryIdMap: Map<string, number> = new Map();
  private vendors: Map<number, Vendor> = new Map();
  private products: Map<number, Product> = new Map();
  private users: Map<number, User> = new Map();
  private orders: Map<number, Order> = new Map();
  private orderItems: Map<number, OrderItem> = new Map();
  private messagesMap: Map<number, Message> = new Map();
  private sessions: Map<string, number> = new Map(); // token -> userId
  private resetTokens: Map<string, { email: string; expires: number }> = new Map();
  private nextIds = { category: 1, vendor: 1, user: 1, order: 1, orderItem: 1, product: 1, message: 1 };

  constructor() {
    this.loadData();
  }

  private loadData() {
    // Try multiple paths: works in dev (cwd/server), production (cwd/server), and Netlify Functions
    const candidates = [
      path.join(process.cwd(), "server"),
      path.join(_currentDir),
      path.join(_currentDir, "..", "server"),
      path.join(_currentDir, ".."),
      "/var/task/server",
    ];
    let dataDir = candidates[0];
    for (const dir of candidates) {
      if (fs.existsSync(path.join(dir, "data_categories.json"))) {
        dataDir = dir;
        break;
      }
    }
    console.log(`[storage] Loading data from: ${dataDir}`);

    // Load categories
    const rawCategories: RawCategory[] = JSON.parse(
      fs.readFileSync(path.join(dataDir, "data_categories.json"), "utf-8")
    );

    rawCategories.forEach((raw, index) => {
      const id = this.nextIds.category++;
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
      this.categories.set(id, cat);
      this.categorySlugMap.set(cat.slug, id);
      this.categoryIdMap.set(raw.id, id);
    });

    // Load vendors
    const rawVendors: RawVendor[] = JSON.parse(
      fs.readFileSync(path.join(dataDir, "data_vendors.json"), "utf-8")
    );

    rawVendors.forEach(raw => {
      const numericCatId = this.categoryIdMap.get(raw.category_id);
      if (!numericCatId) return;
      const id = this.nextIds.vendor++;
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
      this.vendors.set(id, vendor);
    });

    // Load products
    const rawProducts: RawProduct[] = JSON.parse(
      fs.readFileSync(path.join(dataDir, "data_products.json"), "utf-8")
    );

    rawProducts.forEach(raw => {
      const id = this.nextIds.product++;
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
      this.products.set(id, product);
    });
  }

  // Categories
  async getCategories(): Promise<CategoryWithParent[]> {
    return [...this.categories.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getCategoryBySlug(slug: string): Promise<CategoryWithParent | undefined> {
    return [...this.categories.values()].find(c => c.slug === slug);
  }

  // Vendors
  async getVendors(categoryId?: string): Promise<Vendor[]> {
    const all = [...this.vendors.values()];
    if (!categoryId) return all;
    const numericId = this.categoryIdMap.get(categoryId);
    if (!numericId) return [];
    return all.filter(v => v.categoryId === numericId);
  }

  async getVendorsByCategory(categoryId: number): Promise<Vendor[]> {
    return [...this.vendors.values()].filter(v => v.categoryId === categoryId);
  }

  async getVendorsByCategoryAndRegion(categorySlug: string, region?: string): Promise<Vendor[]> {
    const numericId = this.categoryIdMap.get(categorySlug);
    if (!numericId) return [];
    let vendors = [...this.vendors.values()].filter(v => v.categoryId === numericId);
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
    return this.vendors.get(id);
  }

  async getFeaturedVendors(): Promise<Vendor[]> {
    return [...this.vendors.values()].filter(v => v.featured);
  }

  async getRegions(): Promise<string[]> {
    const regions = new Set<string>();
    for (const v of this.vendors.values()) {
      if (v.region && v.region !== "N/A" && v.region !== "Unknown") {
        regions.add(v.region);
      }
    }
    return [...regions].sort();
  }

  // Products
  async getProducts(categoryId?: string): Promise<Product[]> {
    const all = [...this.products.values()];
    if (!categoryId) return all;
    return all.filter(p => p.category_id === categoryId);
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    return [...this.products.values()].filter(p => p.category_id === categoryId);
  }

  async getProductById(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductsByVendor(vendorId: number): Promise<Product[]> {
    return [...this.products.values()].filter(p => p.vendor_id === vendorId);
  }

  async searchProducts(query: string): Promise<Product[]> {
    const q = query.toLowerCase();
    return [...this.products.values()].filter(
      p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }

  async getProductsByBudget(maxBudget: number, categoryIds?: string[]): Promise<Product[]> {
    return [...this.products.values()].filter(p => {
      if (categoryIds && !categoryIds.includes(p.category_id)) return false;
      if (p.price_on_demand) return true;
      if (!p.price_from) return true;
      return p.price_from <= maxBudget;
    });
  }

  // Users
  async createUser(user: InsertUser): Promise<User> {
    const id = this.nextIds.user++;
    const newUser: User = {
      ...user,
      id,
      passwordHash: user.passwordHash ?? null,
      phone: user.phone ?? null,
      region: user.region ?? null,
      guestCount: user.guestCount ?? null,
      budget: user.budget ?? null,
      weddingDate: user.weddingDate ?? null,
      visitorId: user.visitorId ?? null,
      createdAt: new Date(),
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return [...this.users.values()].find(u => u.email === email);
  }

  async getUserByVisitorId(visitorId: string): Promise<User | undefined> {
    return [...this.users.values()].find(u => u.visitorId === visitorId);
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates, id }; // prevent id change
    this.users.set(id, updated);
    return updated;
  }

  // Auth sessions
  createSession(userId: number): string {
    const token = generateToken();
    this.sessions.set(token, userId);
    return token;
  }

  async getUserByToken(token: string): Promise<User | undefined> {
    const userId = this.sessions.get(token);
    if (!userId) return undefined;
    return this.users.get(userId);
  }

  deleteSession(token: string): void {
    this.sessions.delete(token);
  }

  // Password reset
  createResetToken(email: string): string | null {
    const user = [...this.users.values()].find(u => u.email === email);
    if (!user) return null;
    const token = generateToken();
    this.resetTokens.set(token, { email, expires: Date.now() + 3600000 }); // 1 hour
    return token;
  }

  verifyResetToken(token: string): string | null {
    const entry = this.resetTokens.get(token);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.resetTokens.delete(token);
      return null;
    }
    return entry.email;
  }

  deleteResetToken(token: string): void {
    this.resetTokens.delete(token);
  }

  // Orders
  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.nextIds.order++;
    const newOrder: Order = { ...order, id, status: order.status ?? "pending", totalEstimate: order.totalEstimate ?? 0, notes: order.notes ?? null, createdAt: new Date() };
    this.orders.set(id, newOrder);
    return newOrder;
  }

  async getOrdersByUser(userId: number): Promise<Order[]> {
    return [...this.orders.values()].filter(o => o.userId === userId);
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    order.status = status;
    return order;
  }

  // Order Items
  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const id = this.nextIds.orderItem++;
    const newItem: OrderItem = {
      ...item,
      id,
      productId: item.productId ?? null,
      status: item.status ?? "pending",
      quotedPrice: item.quotedPrice ?? null,
      vendorMessage: item.vendorMessage ?? null,
      deliveryDate: item.deliveryDate ?? null,
      customerNotes: item.customerNotes ?? null,
    };
    this.orderItems.set(id, newItem);
    return newItem;
  }

  async getOrderItemsByOrder(orderId: number): Promise<OrderItem[]> {
    return [...this.orderItems.values()].filter(i => i.orderId === orderId);
  }

  async updateOrderItem(id: number, updates: Partial<OrderItem>): Promise<OrderItem | undefined> {
    const item = this.orderItems.get(id);
    if (!item) return undefined;
    Object.assign(item, updates);
    return item;
  }

  // Messages
  async createMessage(msg: InsertMessage): Promise<Message> {
    const id = this.nextIds.message++;
    const newMsg: Message = {
      ...msg,
      id,
      orderItemId: msg.orderItemId ?? null,
      attachments: msg.attachments ?? [],
      read: msg.read ?? false,
      createdAt: new Date(),
    };
    this.messagesMap.set(id, newMsg);
    return newMsg;
  }

  async getMessagesByOrder(orderId: number): Promise<Message[]> {
    return [...this.messagesMap.values()]
      .filter(m => m.orderId === orderId)
      .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
  }

  async getMessagesByUser(userId: number): Promise<Message[]> {
    // Get all orders for this user, then get messages for those orders
    const userOrders = [...this.orders.values()].filter(o => o.userId === userId);
    const orderIds = new Set(userOrders.map(o => o.id));
    return [...this.messagesMap.values()]
      .filter(m => orderIds.has(m.orderId))
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async markMessageRead(id: number): Promise<Message | undefined> {
    const msg = this.messagesMap.get(id);
    if (!msg) return undefined;
    msg.read = true;
    return msg;
  }

  async getUnreadCountByUser(userId: number): Promise<number> {
    const msgs = await this.getMessagesByUser(userId);
    return msgs.filter(m => !m.read && m.senderType !== "customer").length;
  }
}

// Use Supabase storage when SUPABASE_URL is set, otherwise fall back to in-memory
function createStorage(): IStorage {
  if (process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY)) {
    try {
      const { SupabaseStorage } = require("./supabase-storage");
      console.log("[storage] Using Supabase storage");
      return new SupabaseStorage();
    } catch (e: any) {
      console.warn(`[storage] Failed to init Supabase storage, falling back to in-memory: ${e.message}`);
      return new MemStorage();
    }
  }
  console.log("[storage] Using in-memory storage");
  return new MemStorage();
}

export const storage = createStorage();
