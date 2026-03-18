import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { storage, SWEDISH_REGIONS } from "./storage";
import { sendEmail } from "./email";
import type { User } from "@shared/schema";

// Extend Express Request to include auth user
declare global {
  namespace Express {
    interface Request {
      authUser?: User;
    }
  }
}

// ── Vendor token HMAC utilities ────────────────────────────────────────────
const VENDOR_TOKEN_SECRET = process.env.VENDOR_TOKEN_SECRET || process.env.SESSION_SECRET || "wedda-vendor-token-secret-change-me";

function createVendorToken(orderItemId: number): string {
  const payload = `${orderItemId}`;
  const sig = crypto.createHmac("sha256", VENDOR_TOKEN_SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

function verifyVendorToken(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac("sha256", VENDOR_TOKEN_SECRET).update(payload).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) return null;
  const orderItemId = parseInt(payload, 10);
  if (isNaN(orderItemId)) return null;
  return orderItemId;
}

// Auth middleware - extracts user from Bearer token
async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const user = await storage.getUserByToken(token);
    if (user) {
      req.authUser = user;
    }
  }
  next();
}

// Require auth - returns 401 if not authenticated
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.authUser) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

// Strip password_hash from user before sending to client
function safeUser(user: User): Omit<User, "passwordHash"> & { passwordHash?: undefined } {
  const { passwordHash, ...safe } = user;
  return safe;
}

// Get the base URL for links in emails
function getBaseUrl(_req: Request): string {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  return "https://imaginative-fenglisu-d5e61c.netlify.app";
}

export async function registerRoutes(server: Server, app: Express) {
  // Health check — used by Coolify/Docker to verify container is alive
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  // Apply auth middleware to all routes
  app.use(authMiddleware);

  // ── Auth Routes ──────────────────────────────────────────────────────────────

  // Register
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { email, password, name, phone } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = await storage.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await storage.createUser({
      email,
      name,
      passwordHash,
      phone: phone || null,
    });

    const token = await storage.createSession(user.id);

    // Send welcome email
    try {
      sendEmail(
        [email],
        "Välkommen till Wedda! 🎊",
        `Hej ${name}!\n\nVälkommen till Wedda – Sveriges bröllopsguide.\n\nDitt konto har skapats och du kan nu börja planera ert drömbröllop.\n\nGå till vår bröllopsguide för att komma igång med att välja leverantörer och skapa ert personliga bröllopspaket.\n\nHar du frågor? Kontakta oss på jonatan.siden@gmail.com\n\nVarma hälsningar,\nTeamet på Wedda`
      );
    } catch (e) { /* non-blocking */ }

    res.json({ user: safeUser(user), token });
  });

  // Login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await storage.getUserByEmail(email);
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = await storage.createSession(user.id);
    res.json({ user: safeUser(user), token });
  });

  // Forgot password
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Check user exists first
    const user = await storage.getUserByEmail(email);
    if (user) {
      const resetToken = storage.createResetToken(email);
      if (resetToken) {
        try {
          sendEmail(
            [email],
            "Återställ ditt Wedda-lösenord",
            `Hej ${user.name}!\n\nVi har fått en begäran om att återställa ditt lösenord på Wedda.\n\nDin återställningskod:\n\n${resetToken}\n\nSå här gör du:\n1. Gå tillbaka till Wedda och klicka på "Ange återställningskod"\n2. Klistra in koden ovan\n3. Välj ditt nya lösenord\n\nKoden gäller i 1 timme.\n\nOm du inte begärde detta kan du ignorera detta meddelande.\n\nVarma hälsningar,\nTeamet på Wedda`
          );
          console.log(`[RESET] Token created for ${email}`);
        } catch (e) {
          console.error("[RESET] Email send error:", e);
        }
      }
    } else {
      console.log(`[RESET] No user found for email: ${email}`);
    }

    // Always return success to avoid leaking whether email exists
    res.json({ success: true, message: "If the email exists, a reset code has been sent" });
  });

  // Reset password
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const email = storage.verifyResetToken(token);
    if (!email) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await storage.updateUser(user.id, { passwordHash });
    storage.deleteResetToken(token);

    res.json({ success: true });
  });

  // Get current user
  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    res.json(safeUser(req.authUser!));
  });

  // Update profile
  app.put("/api/auth/profile", requireAuth, async (req: Request, res: Response) => {
    const { name, phone, region, guestCount, budget, weddingDate } = req.body;
    const updates: Partial<User> = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (region !== undefined) updates.region = region;
    if (guestCount !== undefined) updates.guestCount = guestCount;
    if (budget !== undefined) updates.budget = budget;
    if (weddingDate !== undefined) updates.weddingDate = weddingDate;

    const updated = await storage.updateUser(req.authUser!.id, updates);
    if (!updated) return res.status(404).json({ error: "User not found" });
    res.json(safeUser(updated));
  });

  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      storage.deleteSession(authHeader.slice(7));
    }
    res.json({ success: true });
  });

  // ── Categories ───────────────────────────────────────────────────────────────

  app.get("/api/categories", async (_req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });

  app.get("/api/categories/:slug", async (req, res) => {
    const category = await storage.getCategoryBySlug(req.params.slug);
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json(category);
  });

  // ── Regions ──────────────────────────────────────────────────────────────────

  app.get("/api/regions", async (_req, res) => {
    const regions = await storage.getRegions();
    res.json(regions);
  });

  app.get("/api/regions/all", (_req, res) => {
    res.json(SWEDISH_REGIONS);
  });

  // ── Vendors ──────────────────────────────────────────────────────────────────

  app.get("/api/vendors", async (req, res) => {
    const category = req.query.category as string | undefined;
    const region = req.query.region as string | undefined;
    if (category && region) {
      const vendors = await storage.getVendorsByCategoryAndRegion(category, region);
      res.json(vendors);
    } else {
      const vendors = await storage.getVendors(category);
      res.json(vendors);
    }
  });

  app.get("/api/vendors/featured", async (_req, res) => {
    const vendors = await storage.getFeaturedVendors();
    res.json(vendors);
  });

  app.get("/api/vendors/category/:categoryId", async (req, res) => {
    const vendors = await storage.getVendorsByCategory(parseInt(req.params.categoryId));
    res.json(vendors);
  });

  app.get("/api/vendors/:id", async (req, res) => {
    const vendor = await storage.getVendorById(parseInt(req.params.id));
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    res.json(vendor);
  });

  app.get("/api/vendors/:id/products", async (req, res) => {
    const products = await storage.getProductsByVendor(parseInt(req.params.id));
    res.json(products);
  });

  // ── Products ─────────────────────────────────────────────────────────────────

  app.get("/api/products", async (req, res) => {
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const maxBudget = req.query.maxBudget ? parseInt(req.query.maxBudget as string) : undefined;

    if (search) {
      const products = await storage.searchProducts(search);
      if (category) {
        res.json(products.filter(p => p.category_id === category));
      } else {
        res.json(products);
      }
      return;
    }

    if (maxBudget) {
      const categoryIds = category ? [category] : undefined;
      const products = await storage.getProductsByBudget(maxBudget, categoryIds);
      res.json(products);
      return;
    }

    const products = await storage.getProducts(category);
    res.json(products);
  });

  app.get("/api/products/:id", async (req, res) => {
    const product = await storage.getProductById(parseInt(req.params.id));
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  });

  // ── Users (legacy) ───────────────────────────────────────────────────────────

  app.post("/api/users", async (req, res) => {
    const { email, name, weddingDate } = req.body;
    if (!email || !name) return res.status(400).json({ error: "Email and name are required" });

    const visitorId = req.headers["x-visitor-id"] as string || undefined;
    let user = await storage.getUserByEmail(email);
    if (!user) {
      user = await storage.createUser({ email, name, weddingDate, visitorId });
    }
    res.json(safeUser(user));
  });

  app.get("/api/users/me", async (req, res) => {
    // Prefer auth token
    if (req.authUser) return res.json(safeUser(req.authUser));
    const visitorId = req.headers["x-visitor-id"] as string;
    if (!visitorId) return res.status(401).json({ error: "No visitor ID" });
    const user = await storage.getUserByVisitorId(visitorId);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(safeUser(user));
  });

  // ── Orders ───────────────────────────────────────────────────────────────────

  app.post("/api/orders", async (req, res) => {
    const { userId, notes, items } = req.body;
    if (!userId || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "userId and items are required" });
    }

    let totalEstimate = 0;
    const order = await storage.createOrder({ userId, notes, status: "pending", totalEstimate: 0 });

    const vendorEmails: { email: string; vendorName: string; items: { desc: string; token: string }[] }[] = [];

    for (const item of items) {
      const vendor = await storage.getVendorById(item.vendorId);
      const product = item.productId ? await storage.getProductById(item.productId) : null;

      const orderItem = await storage.createOrderItem({
        orderId: order.id,
        vendorId: item.vendorId,
        categoryId: item.categoryId,
        productId: item.productId || null,
        customerNotes: item.customerNotes || null,
        status: "sent",
        quotedPrice: null,
        vendorMessage: null,
        deliveryDate: null,
      });

      // Generate vendor response token for this order item
      const vendorToken = createVendorToken(orderItem.id);

      if (product && product.price_from) {
        totalEstimate += product.price_from;
      }

      if (vendor?.email) {
        const existing = vendorEmails.find(v => v.email === vendor.email);
        const itemDesc = product ? product.name : `Service request`;
        if (existing) {
          existing.items.push({ desc: itemDesc, token: vendorToken });
        } else {
          vendorEmails.push({
            email: vendor.email,
            vendorName: vendor.name,
            items: [{ desc: itemDesc, token: vendorToken }],
          });
        }
      }

      // Create system message for each vendor in the order
      if (vendor) {
        const user = await storage.getUserById(userId);
        await storage.createMessage({
          orderId: order.id,
          orderItemId: null,
          senderType: "system",
          senderName: "Wedda",
          senderEmail: "noreply@wedda.se",
          subject: `Ny förfrågan via Wedda`,
          body: `Beställning skickad till ${vendor.name} för ${product?.name || "tjänst"}.\n\nKund: ${user?.name || "Okänd"}\nE-post: ${user?.email || ""}\nTelefon: ${user?.phone || "Ej angivet"}`,
          read: false,
        });
      }
    }

    await storage.updateOrderStatus(order.id, "sent");

    // Send real emails to vendors with response links
    const baseUrl = getBaseUrl(req);
    const user = await storage.getUserById(userId);
    for (const ve of vendorEmails) {
      try {
        const itemLines = ve.items.map(i =>
          `  - ${i.desc}\n    Svara här: ${baseUrl}/#/vendor/respond/${i.token}`
        ).join("\n");

        sendEmail(
          [ve.email],
          `Ny bröllopsförfrågan via Wedda`,
          `Hej ${ve.vendorName}!\n\nNi har fått en ny förfrågan via Wedda.\n\nKund: ${user?.name || "Okänd"}\nE-post: ${user?.email || ""}\nTelefon: ${user?.phone || "Ej angivet"}\n\n${ve.items.length === 1 ? "Efterfrågad tjänst" : "Efterfrågade tjänster"}:\n${itemLines}\n\nKlicka på länken ovan för att svara kunden och lämna en offert direkt på Wedda.\n\nMed vänlig hälsning,\nWedda – Sveriges bröllopsguide\nwedda.se`
        );
      } catch (e) { /* non-blocking */ }
    }

    // Send confirmation email to customer
    if (user?.email) {
      try {
        sendEmail(
          [user.email],
          `Din beställning #${order.id} är skickad!`,
          `Hej ${user.name}!\n\nDin beställning har skickats till följande leverantörer:\n${vendorEmails.map(ve => `  - ${ve.vendorName} (${ve.items.map(i => i.desc).join(", ")})`).join("\n")}\n\nLeverantörerna kommer att kontakta dig med offerter.\n\nDu kan följa din beställning i din portal på Wedda.\n\nVarma hälsningar,\nTeamet på Wedda`
        );
      } catch (e) { /* non-blocking */ }
    }

    // Send admin notification
    try {
      sendEmail(
        ["jonatan.siden@gmail.com", "svenake62@gmail.com"],
        `[Wedda Admin] Ny beställning #${order.id}`,
        `Ny beställning har skapats på Wedda.\n\nKund: ${user?.name} (${user?.email})\nTelefon: ${user?.phone || "Ej angivet"}\n\nLeverantörer:\n${vendorEmails.map(ve => `  - ${ve.vendorName}: ${ve.items.map(i => i.desc).join(", ")}`).join("\n")}\n\nTotal uppskattning: ${totalEstimate.toLocaleString("sv-SE")} kr`
      );
    } catch (e) { /* non-blocking */ }

    const orderItems = await storage.getOrderItemsByOrder(order.id);
    res.json({
      order: { ...order, status: "sent", totalEstimate },
      items: orderItems,
      vendorEmails,
    });
  });

  app.get("/api/orders/user/:userId", async (req, res) => {
    const orders = await storage.getOrdersByUser(parseInt(req.params.userId));
    const result = [];
    for (const order of orders) {
      const items = await storage.getOrderItemsByOrder(order.id);
      // Resolve vendor and product names for each item
      const enrichedItems = await Promise.all(items.map(async (item) => {
        const vendor = await storage.getVendorById(item.vendorId);
        const product = item.productId ? await storage.getProductById(item.productId) : null;
        return {
          ...item,
          vendorName: vendor?.name || `Leverantör #${item.vendorId}`,
          vendorEmail: vendor?.email || "",
          productName: product?.name || (vendor?.name ? `Tjänst från ${vendor.name}` : "Tjänst"),
        };
      }));
      result.push({ ...order, items: enrichedItems });
    }
    res.json(result);
  });

  app.get("/api/orders/:id", async (req, res) => {
    const order = await storage.getOrderById(parseInt(req.params.id));
    if (!order) return res.status(404).json({ error: "Order not found" });
    const items = await storage.getOrderItemsByOrder(order.id);
    res.json({ ...order, items });
  });

  // Simulate vendor response (for demo — admin only)
  app.post("/api/orders/:orderId/items/:itemId/quote", async (req, res) => {
    const { quotedPrice, vendorMessage, deliveryDate } = req.body;
    const item = await storage.updateOrderItem(parseInt(req.params.itemId), {
      quotedPrice,
      vendorMessage,
      deliveryDate,
      status: "quoted",
    });
    if (!item) return res.status(404).json({ error: "Item not found" });

    // Create a vendor message for the quote
    const vendor = await storage.getVendorById(item.vendorId);
    if (vendor) {
      await storage.createMessage({
        orderId: item.orderId,
        orderItemId: item.id,
        senderType: "vendor",
        senderName: vendor.name,
        senderEmail: vendor.email,
        subject: `Offert från ${vendor.name}`,
        body: `${vendorMessage || "Vi har skickat en offert."}\n\nOffererat pris: ${quotedPrice?.toLocaleString("sv-SE")} kr${deliveryDate ? `\nLeveransdatum: ${deliveryDate}` : ""}`,
        read: false,
      });
    }

    res.json(item);
  });

  // Accept/decline a quote
  app.post("/api/orders/:orderId/items/:itemId/accept", requireAuth, async (req, res) => {
    const item = await storage.getOrderItemById(parseInt(req.params.itemId));
    if (!item || item.orderId !== parseInt(req.params.orderId)) {
      return res.status(404).json({ error: "Item not found" });
    }
    if (item.status !== "quoted") {
      return res.status(400).json({ error: "Item is not in quoted status" });
    }

    const updated = await storage.updateOrderItem(item.id, { status: "accepted" });

    // Notify vendor via email
    const vendor = await storage.getVendorById(item.vendorId);
    const user = req.authUser!;
    if (vendor?.email) {
      try {
        sendEmail(
          [vendor.email],
          `Offert accepterad – ${user.name} via Wedda`,
          `Hej ${vendor.name}!\n\nGoda nyheter! Kunden ${user.name} har accepterat er offert på ${item.quotedPrice?.toLocaleString("sv-SE")} kr.\n\nKontaktuppgifter:\nE-post: ${user.email}\nTelefon: ${user.phone || "Ej angivet"}\n\nVänligen kontakta kunden för att komma överens om nästa steg.\n\nMed vänlig hälsning,\nWedda – Sveriges bröllopsguide`
        );
      } catch (e) { /* non-blocking */ }
    }

    res.json(updated);
  });

  app.post("/api/orders/:orderId/items/:itemId/decline", requireAuth, async (req, res) => {
    const item = await storage.getOrderItemById(parseInt(req.params.itemId));
    if (!item || item.orderId !== parseInt(req.params.orderId)) {
      return res.status(404).json({ error: "Item not found" });
    }
    if (item.status !== "quoted") {
      return res.status(400).json({ error: "Item is not in quoted status" });
    }

    const updated = await storage.updateOrderItem(item.id, { status: "declined" });
    res.json(updated);
  });

  // Price request for price-on-demand items
  app.post("/api/price-request", async (req, res) => {
    const { productId, vendorId, customerEmail, customerName, message } = req.body;
    const vendor = await storage.getVendorById(vendorId);
    const product = productId ? await storage.getProductById(productId) : null;

    res.json({
      success: true,
      message: "Price request sent",
      vendorEmail: vendor?.email || "No email available",
      productName: product?.name || "Unknown product",
    });
  });

  // ── Vendor Response (public — token-authenticated) ─────────────────────────

  // Get order item details for vendor response page
  app.get("/api/vendor/respond/:token", async (req, res) => {
    const orderItemId = verifyVendorToken(req.params.token);
    if (orderItemId === null) {
      return res.status(403).json({ error: "Ogiltig eller manipulerad länk" });
    }

    const item = await storage.getOrderItemById(orderItemId);
    if (!item) {
      return res.status(404).json({ error: "Förfrågan hittades inte" });
    }

    const order = await storage.getOrderById(item.orderId);
    const vendor = await storage.getVendorById(item.vendorId);
    const product = item.productId ? await storage.getProductById(item.productId) : null;
    const user = order ? await storage.getUserById(order.userId) : null;

    res.json({
      orderItemId: item.id,
      orderId: item.orderId,
      status: item.status,
      customerNotes: item.customerNotes,
      quotedPrice: item.quotedPrice,
      vendorMessage: item.vendorMessage,
      deliveryDate: item.deliveryDate,
      vendorName: vendor?.name || "Okänd leverantör",
      productName: product?.name || "Tjänst",
      customerName: user?.name || "Okänd kund",
      customerEmail: user?.email || "",
      customerPhone: user?.phone || null,
      weddingDate: user?.weddingDate || null,
    });
  });

  // Submit vendor response
  app.post("/api/vendor/respond/:token", async (req, res) => {
    const orderItemId = verifyVendorToken(req.params.token);
    if (orderItemId === null) {
      return res.status(403).json({ error: "Ogiltig eller manipulerad länk" });
    }

    const item = await storage.getOrderItemById(orderItemId);
    if (!item) {
      return res.status(404).json({ error: "Förfrågan hittades inte" });
    }

    const { message, quotedPrice, deliveryDate } = req.body;
    if (!message && !quotedPrice) {
      return res.status(400).json({ error: "Ange ett meddelande eller en offert" });
    }

    const vendor = await storage.getVendorById(item.vendorId);
    const order = await storage.getOrderById(item.orderId);
    const product = item.productId ? await storage.getProductById(item.productId) : null;
    const vendorName = vendor?.name || "Leverantör";
    const vendorEmail = vendor?.email || "";

    // Update order item with quote if provided
    const updates: Record<string, any> = {};
    if (quotedPrice) {
      updates.quotedPrice = parseInt(quotedPrice, 10);
      updates.status = "quoted";
    }
    if (message) {
      updates.vendorMessage = message;
    }
    if (deliveryDate) {
      updates.deliveryDate = deliveryDate;
    }

    await storage.updateOrderItem(item.id, updates);

    // Create message in portal
    let body = message || "Vi har skickat en offert.";
    if (quotedPrice) {
      body += `\n\nOffererat pris: ${parseInt(quotedPrice, 10).toLocaleString("sv-SE")} kr`;
    }
    if (deliveryDate) {
      body += `\nLeveransdatum: ${deliveryDate}`;
    }

    await storage.createMessage({
      orderId: item.orderId,
      orderItemId: item.id,
      senderType: "vendor",
      senderName: vendorName,
      senderEmail: vendorEmail,
      subject: quotedPrice ? `Offert från ${vendorName}` : `Meddelande från ${vendorName}`,
      body,
      read: false,
    });

    // Notify customer via email
    if (order) {
      const customer = await storage.getUserById(order.userId);
      if (customer?.email) {
        try {
          const productLabel = product?.name || "tjänst";
          sendEmail(
            [customer.email],
            `${vendorName} har svarat på din förfrågan`,
            `Hej ${customer.name}!\n\n${vendorName} har svarat på din förfrågan gällande ${productLabel}.\n\n${quotedPrice ? `Offert: ${parseInt(quotedPrice, 10).toLocaleString("sv-SE")} kr\n` : ""}${deliveryDate ? `Leveransdatum: ${deliveryDate}\n` : ""}${message ? `Meddelande:\n${message}\n` : ""}\nLogga in på Wedda för att se svaret och hantera offerten i din portal.\n\nVarma hälsningar,\nTeamet på Wedda`
          );
        } catch (e) { /* non-blocking */ }
      }
    }

    res.json({ success: true });
  });

  // ── Messages ─────────────────────────────────────────────────────────────────

  // Get messages for an order
  app.get("/api/orders/:orderId/messages", async (req, res) => {
    const messages = await storage.getMessagesByOrder(parseInt(req.params.orderId));
    res.json(messages);
  });

  // Post a message to an order (also sends email to vendor if customer message)
  app.post("/api/orders/:orderId/messages", async (req, res) => {
    const orderId = parseInt(req.params.orderId);
    const { senderType, senderName, senderEmail, subject, body, orderItemId, vendorEmail: targetVendorEmail } = req.body;

    if (!body) {
      return res.status(400).json({ error: "Message body is required" });
    }

    const message = await storage.createMessage({
      orderId,
      orderItemId: orderItemId || null,
      senderType: senderType || "customer",
      senderName: senderName || req.authUser?.name || "Kund",
      senderEmail: senderEmail || req.authUser?.email || "",
      subject: subject || "Meddelande",
      body,
      read: false,
    });

    // If customer sends a message, email it to the vendor
    if ((senderType || "customer") === "customer" && targetVendorEmail) {
      try {
        sendEmail(
          [targetVendorEmail],
          `Meddelande från kund via Wedda`,
          `Hej!\n\nNi har fått ett meddelande från en kund via Wedda.\n\nKund: ${senderName || req.authUser?.name || "Okänd"}\nE-post: ${senderEmail || req.authUser?.email || ""}\n\nMeddelande:\n${body}\n\nVänligen svara kunden direkt på deras e-post ovan.\n\nMed vänlig hälsning,\nWedda – Sveriges bröllopsguide`
        );
        console.log(`[MSG] Customer message emailed to vendor: ${targetVendorEmail}`);
      } catch (e) {
        console.error("[MSG] Failed to email vendor:", e);
      }
    }

    res.json(message);
  });

  // Get all messages for the authenticated user
  app.get("/api/messages", requireAuth, async (req: Request, res: Response) => {
    const messages = await storage.getMessagesByUser(req.authUser!.id);
    res.json(messages);
  });

  // Get unread count
  app.get("/api/messages/unread-count", requireAuth, async (req: Request, res: Response) => {
    const count = await storage.getUnreadCountByUser(req.authUser!.id);
    res.json({ count });
  });

  // Mark message as read
  app.put("/api/messages/:id/read", async (req, res) => {
    const message = await storage.markMessageRead(parseInt(req.params.id));
    if (!message) return res.status(404).json({ error: "Message not found" });
    res.json(message);
  });
}
