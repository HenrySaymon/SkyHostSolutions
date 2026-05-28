import { Router, type IRouter } from "express";
import { and, eq, desc, count, sql, sum, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { db, clientsTable, adminUsersTable, servicesTable, ordersTable, invoicesTable, ticketsTable, ticketRepliesTable } from "@workspace/db";
import { toServiceJson } from "./services";
import { razorpaySettings, toInvoiceJson, upiSettings } from "./client";

function getMailTransport() {
  const host = smtpSettings.host || process.env.SMTP_HOST;
  const user = smtpSettings.user || process.env.SMTP_USER;
  const pass = smtpSettings.pass || process.env.SMTP_PASS;
  if (host) {
    return nodemailer.createTransport({
      host,
      port: Number(smtpSettings.port || process.env.SMTP_PORT || 587),
      secure: smtpSettings.secure || process.env.SMTP_SECURE === "true",
      auth: user || pass ? { user, pass } : undefined,
    });
  }
  return null;
}

declare module "express-session" {
  interface SessionData {
    clientId?: number;
    adminId?: number;
  }
}

const router: IRouter = Router();

type AppearanceSettings = {
  themeMode: "dark" | "light";
  primaryColor: string;
  backgroundColor: string;
  cardColor: string;
  textColor: string;
  brandColor: string;
  brandSkyColor: string;
  brandHostColor: string;
  brandSolutionsColor: string;
  buttonShape: "square" | "soft" | "pill";
};

const defaultAppearance: AppearanceSettings = {
  themeMode: "dark",
  primaryColor: "#0ea5e9",
  backgroundColor: "#0f172a",
  cardColor: "#111c2f",
  textColor: "#f8fafc",
  brandColor: "#38bdf8",
  brandSkyColor: "#38bdf8",
  brandHostColor: "#818cf8",
  brandSolutionsColor: "#f0f6ff",
  buttonShape: "soft",
};

let appearanceSettings: AppearanceSettings = defaultAppearance;

type SmtpSettings = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

let smtpSettings: SmtpSettings = {
  host: process.env.SMTP_HOST ?? "",
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true",
  user: process.env.SMTP_USER ?? "",
  pass: process.env.SMTP_PASS ?? "",
  from: process.env.SMTP_FROM ?? "",
};

const PAYPAL_API_BASE =
  process.env.PAYPAL_ENVIRONMENT === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

function getPayPalCaptureId(transactionId?: string | null) {
  return transactionId?.startsWith("paypal:") ? transactionId.slice("paypal:".length) : null;
}

function getRazorpayPaymentId(transactionId?: string | null) {
  return transactionId?.startsWith("razorpay:") ? transactionId.slice("razorpay:".length) : null;
}

function getRazorpayAuthHeader() {
  return `Basic ${Buffer.from(`${razorpaySettings.keyId}:${razorpaySettings.keySecret}`).toString("base64")}`;
}

function hasTicketServiceColumn() {
  return process.env.TICKETS_SERVICE_ID_AVAILABLE === "true";
}

function ticketServiceIdColumn() {
  return hasTicketServiceColumn() ? sql<number | null>`tickets.service_id` : sql<number | null>`NULL`;
}

async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("PayPal gateway is not configured");

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = (await response.json()) as { access_token?: string; error_description?: string };
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description ?? "Unable to authenticate with PayPal");
  }
  return data.access_token;
}

router.get("/appearance", (_req, res) => {
  res.json(appearanceSettings);
});

// Admin auth guard
router.use("/admin", (req, res, next) => {
  if (req.path === "/admin/login" || req.path === "/admin/logout") {
    next();
    return;
  }
  if (!req.session.adminId) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }
  next();
});

router.patch("/admin/appearance", (req, res) => {
  appearanceSettings = {
    ...appearanceSettings,
    ...req.body,
    themeMode: ["dark", "light"].includes(req.body?.themeMode) ? req.body.themeMode : appearanceSettings.themeMode,
    buttonShape: ["square", "soft", "pill"].includes(req.body?.buttonShape) ? req.body.buttonShape : appearanceSettings.buttonShape,
  };
  res.json(appearanceSettings);
});

router.get("/admin/smtp", (_req, res) => {
  res.json({ ...smtpSettings, pass: smtpSettings.pass ? "********" : "" });
});

router.patch("/admin/smtp", (req, res) => {
  smtpSettings = {
    host: req.body.host ?? smtpSettings.host,
    port: Number(req.body.port ?? smtpSettings.port),
    secure: Boolean(req.body.secure),
    user: req.body.user ?? smtpSettings.user,
    pass: req.body.pass && req.body.pass !== "********" ? req.body.pass : smtpSettings.pass,
    from: req.body.from ?? smtpSettings.from,
  };
  res.json({ ...smtpSettings, pass: smtpSettings.pass ? "********" : "" });
});

router.get("/admin/payments/razorpay", (_req, res) => {
  res.json({
    enabled: razorpaySettings.enabled,
    keyId: razorpaySettings.keyId,
    keySecret: razorpaySettings.keySecret ? "********" : "",
    accountName: razorpaySettings.accountName,
    description: razorpaySettings.description,
  });
});

router.patch("/admin/payments/razorpay", (req, res) => {
  razorpaySettings.enabled = Boolean(req.body.enabled);
  razorpaySettings.keyId = req.body.keyId ?? razorpaySettings.keyId;
  razorpaySettings.keySecret =
    req.body.keySecret && req.body.keySecret !== "********"
      ? req.body.keySecret
      : razorpaySettings.keySecret;
  razorpaySettings.accountName = req.body.accountName ?? razorpaySettings.accountName;
  razorpaySettings.description = req.body.description ?? razorpaySettings.description;

  res.json({
    enabled: razorpaySettings.enabled,
    keyId: razorpaySettings.keyId,
    keySecret: razorpaySettings.keySecret ? "********" : "",
    accountName: razorpaySettings.accountName,
    description: razorpaySettings.description,
  });
});

router.get("/admin/payments/upi", (_req, res) => {
  res.json(upiSettings);
});

router.patch("/admin/payments/upi", (req, res) => {
  upiSettings.enabled = Boolean(req.body.enabled);
  upiSettings.upiId = req.body.upiId ?? upiSettings.upiId;
  upiSettings.payeeName = req.body.payeeName ?? upiSettings.payeeName;
  upiSettings.instructions = req.body.instructions ?? upiSettings.instructions;
  upiSettings.qrImageUrl = req.body.qrImageUrl ?? upiSettings.qrImageUrl;
  res.json(upiSettings);
});

// --- Admin Dashboard ---
router.get("/admin/dashboard", async (_req, res): Promise<void> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalClientsResult] = await db.select({ count: count() }).from(clientsTable);
  const [totalOrdersResult] = await db.select({ count: count() }).from(ordersTable);
  const [activeOrdersResult] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(eq(ordersTable.status, "active"));
  const [pendingOrdersResult] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(eq(ordersTable.status, "pending"));
  const [openTicketsResult] = await db
    .select({ count: count() })
    .from(ticketsTable)
    .where(eq(ticketsTable.status, "open"));
  const [inProgressTicketsResult] = await db
    .select({ count: count() })
    .from(ticketsTable)
    .where(eq(ticketsTable.status, "in_progress"));
  const [revenueResult] = await db
    .select({ total: sum(invoicesTable.amount) })
    .from(invoicesTable)
    .where(eq(invoicesTable.status, "paid"));
  const [unpaidInvoicesResult] = await db
    .select({ count: count(), total: sum(invoicesTable.amount) })
    .from(invoicesTable)
    .where(eq(invoicesTable.status, "unpaid"));
  const [todayClientsResult] = await db
    .select({ count: count() })
    .from(clientsTable)
    .where(sql`created_at >= ${todayStart}`);

  const recentOrders = await db
    .select({
      id: ordersTable.id,
      clientId: ordersTable.clientId,
      clientName: clientsTable.name,
      serviceId: ordersTable.serviceId,
      serviceName: servicesTable.name,
      status: ordersTable.status,
      notes: ordersTable.notes,
      sslDetails: ordersTable.sslDetails,
      amount: ordersTable.amount,
      currency: ordersTable.currency,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
    })
    .from(ordersTable)
    .leftJoin(clientsTable, eq(ordersTable.clientId, clientsTable.id))
    .leftJoin(servicesTable, eq(ordersTable.serviceId, servicesTable.id))
    .orderBy(desc(ordersTable.createdAt))
    .limit(5);

  const recentTickets = await db
    .select({
      id: ticketsTable.id,
      clientId: ticketsTable.clientId,
      clientName: clientsTable.name,
      subject: ticketsTable.subject,
      status: ticketsTable.status,
      priority: ticketsTable.priority,
      createdAt: ticketsTable.createdAt,
      updatedAt: ticketsTable.updatedAt,
    })
    .from(ticketsTable)
    .leftJoin(clientsTable, eq(ticketsTable.clientId, clientsTable.id))
    .orderBy(desc(ticketsTable.createdAt))
    .limit(5);

  const ordersByStatus = await db
    .select({ status: ordersTable.status, count: count() })
    .from(ordersTable)
    .groupBy(ordersTable.status);

  const revenueByMonth = await db.execute(sql`
    SELECT 
      TO_CHAR(created_at, 'Mon YYYY') as month,
      SUM(amount)::numeric as revenue
    FROM invoices
    WHERE status = 'paid'
    GROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at)
    ORDER BY DATE_TRUNC('month', created_at) DESC
    LIMIT 6
  `);

  res.json({
    totalClients: totalClientsResult?.count ?? 0,
    totalOrders: totalOrdersResult?.count ?? 0,
    activeOrders: activeOrdersResult?.count ?? 0,
    pendingOrders: pendingOrdersResult?.count ?? 0,
    openTickets: openTicketsResult?.count ?? 0,
    inProgressTickets: inProgressTicketsResult?.count ?? 0,
    totalRevenue: Number(revenueResult?.total ?? 0),
    unpaidInvoicesCount: Number(unpaidInvoicesResult?.count ?? 0),
    unpaidInvoicesAmount: Number(unpaidInvoicesResult?.total ?? 0),
    todayClients: Number(todayClientsResult?.count ?? 0),
    recentOrders: recentOrders.map((o) => ({
      ...o,
      amount: Number(o.amount),
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    })),
    recentTickets: recentTickets.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    ordersByStatus: ordersByStatus.map((s) => ({ status: s.status, count: Number(s.count) })),
    revenueByMonth: (revenueByMonth.rows as { month: string; revenue: string }[]).map((r) => ({
      month: r.month,
      revenue: Number(r.revenue),
    })),
  });
});

// --- Admin Clients ---
router.get("/admin/clients", async (_req, res): Promise<void> => {
  const clients = await db.select().from(clientsTable).orderBy(desc(clientsTable.createdAt));
  res.json(
    clients.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      company: c.company,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    })),
  );
});

router.post("/admin/clients", async (req, res): Promise<void> => {
  const { name, email, password, phone, company } = req.body;
  if (!name || !email || !password || !phone) {
    res.status(400).json({ error: "Name, email, password and phone are required" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const [client] = await db
    .insert(clientsTable)
    .values({ name, email, passwordHash, phone, company: company || null })
    .returning();
  res.status(201).json({
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    company: client.company,
    status: client.status,
    createdAt: client.createdAt.toISOString(),
  });
});

router.patch("/admin/clients/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { name, email, phone, company, status } = req.body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (phone !== undefined) updates.phone = String(phone).trim();
  if (company !== undefined) updates.company = company || null;
  if (status) updates.status = status;
  if (email !== undefined) {
    const nextEmail = String(email).trim().toLowerCase();
    const [existing] = await db.select().from(clientsTable).where(eq(clientsTable.email, nextEmail));
    if (existing && existing.id !== id) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }
    updates.email = nextEmail;
  }

  const [client] = await db.update(clientsTable).set(updates).where(eq(clientsTable.id, id)).returning();
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json({
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    company: client.company,
    status: client.status,
    createdAt: client.createdAt.toISOString(),
  });
});

router.delete("/admin/clients/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(clientsTable).where(eq(clientsTable.id, id));
  res.sendStatus(204);
});

// --- Admin Services ---
router.get("/admin/services", async (_req, res): Promise<void> => {
  const services = await db.select().from(servicesTable).orderBy(servicesTable.id);
  res.json(services.map(toServiceJson));
});

router.post("/admin/services", async (req, res): Promise<void> => {
  const { name, slug, category, shortDescription, description, features, priceUsd, priceEur, priceInr, imageUrl, enabled } = req.body;
  const [service] = await db
    .insert(servicesTable)
    .values({
      name,
      slug,
      category,
      shortDescription,
      description: description || "",
      features: features || [],
      priceUsd: String(priceUsd ?? 0),
      priceEur: String(priceEur ?? 0),
      priceInr: String(priceInr ?? 0),
      imageUrl: imageUrl || "",
      enabled: enabled !== false,
    })
    .returning();
  res.status(201).json(toServiceJson(service));
});

router.patch("/admin/services/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const updates: Record<string, unknown> = {};
  const allowed = ["name", "slug", "category", "shortDescription", "description", "features", "priceUsd", "priceEur", "priceInr", "imageUrl", "enabled"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      if (key === "priceUsd" || key === "priceEur" || key === "priceInr") {
        updates[key] = String(req.body[key]);
      } else {
        updates[key] = req.body[key];
      }
    }
  }
  const [service] = await db.update(servicesTable).set(updates).where(eq(servicesTable.id, id)).returning();
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  res.json(toServiceJson(service));
});

router.delete("/admin/services/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(servicesTable).where(eq(servicesTable.id, id));
  res.sendStatus(204);
});

// --- Admin Orders ---
router.get("/admin/orders", async (_req, res): Promise<void> => {
  const orders = await db
    .select({
      id: ordersTable.id,
      clientId: ordersTable.clientId,
      clientName: clientsTable.name,
      serviceId: ordersTable.serviceId,
      serviceName: servicesTable.name,
      status: ordersTable.status,
      notes: ordersTable.notes,
      sslDetails: ordersTable.sslDetails,
      amount: ordersTable.amount,
      currency: ordersTable.currency,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
    })
    .from(ordersTable)
    .leftJoin(clientsTable, eq(ordersTable.clientId, clientsTable.id))
    .leftJoin(servicesTable, eq(ordersTable.serviceId, servicesTable.id))
    .orderBy(desc(ordersTable.createdAt));

  res.json(
    orders.map((o) => ({
      ...o,
      amount: Number(o.amount),
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    })),
  );
});

router.post("/admin/orders", async (req, res): Promise<void> => {
  const { clientId, serviceId, notes, amount, currency, sslDetails } = req.body;
  const [order] = await db
    .insert(ordersTable)
    .values({ clientId, serviceId, notes: notes || null, amount: String(amount), currency: currency || "USD",
      sslDetails: sslDetails || null })
    .returning();
  res.status(201).json({
    ...order,
    clientName: null,
    serviceName: null,
    amount: Number(order.amount),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  });
});

router.get("/admin/orders/:id/invoices", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const invoices = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.orderId, id))
    .orderBy(desc(invoicesTable.createdAt));
  res.json(invoices.map((inv) => toInvoiceJson(inv)));
});

router.patch("/admin/orders/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { status, notes, sslDetails } = req.body;
  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (notes !== undefined) updates.notes = notes || null;
  if (sslDetails !== undefined) updates.sslDetails = sslDetails || null;

  const [order] = await db.update(ordersTable).set(updates).where(eq(ordersTable.id, id)).returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json({
    ...order,
    clientName: null,
    serviceName: null,
    amount: Number(order.amount),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  });
});

// --- Admin Clients (extended with profile) ---
router.get("/admin/clients/:id/profile", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, id));
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }

  const orders = await db
    .select({ id: ordersTable.id, serviceId: ordersTable.serviceId, serviceName: servicesTable.name,
      status: ordersTable.status, amount: ordersTable.amount, currency: ordersTable.currency,
      notes: ordersTable.notes, sslDetails: ordersTable.sslDetails, createdAt: ordersTable.createdAt })
    .from(ordersTable)
    .leftJoin(servicesTable, eq(ordersTable.serviceId, servicesTable.id))
    .where(eq(ordersTable.clientId, id))
    .orderBy(desc(ordersTable.createdAt));

  const invoices = await db
    .select({
      invoice: invoicesTable,
      serviceId: ordersTable.serviceId,
      serviceName: servicesTable.name,
      orderStatus: ordersTable.status,
    })
    .from(invoicesTable)
    .leftJoin(ordersTable, eq(invoicesTable.orderId, ordersTable.id))
    .leftJoin(servicesTable, eq(ordersTable.serviceId, servicesTable.id))
    .where(eq(invoicesTable.clientId, id))
    .orderBy(desc(invoicesTable.createdAt));

  const tickets = await db
    .select({
      id: ticketsTable.id,
      clientId: ticketsTable.clientId,
      serviceId: ticketServiceIdColumn(),
      subject: ticketsTable.subject,
      status: ticketsTable.status,
      priority: ticketsTable.priority,
      createdAt: ticketsTable.createdAt,
      updatedAt: ticketsTable.updatedAt,
    })
    .from(ticketsTable)
    .where(eq(ticketsTable.clientId, id)).orderBy(desc(ticketsTable.createdAt));

  const clientServices = await db
    .select({
      serviceId: ordersTable.serviceId,
      serviceName: servicesTable.name,
      orderId: ordersTable.id,
      status: ordersTable.status,
      amount: ordersTable.amount,
      currency: ordersTable.currency,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable)
    .leftJoin(servicesTable, eq(ordersTable.serviceId, servicesTable.id))
    .where(eq(ordersTable.clientId, id))
    .orderBy(desc(ordersTable.createdAt));

  res.json({
    client: { id: client.id, name: client.name, email: client.email, phone: client.phone,
      company: client.company, status: client.status, createdAt: client.createdAt.toISOString() },
    orders: orders.map(o => ({ ...o, amount: Number(o.amount), createdAt: o.createdAt.toISOString() })),
    invoices: invoices.map(({ invoice, serviceId, serviceName, orderStatus }) =>
      toInvoiceJson(invoice, client.name, { serviceId, serviceName, orderStatus }),
    ),
    tickets: tickets.map(t => ({ ...t, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() })),
    services: clientServices.map((s) => ({
      ...s,
      amount: Number(s.amount),
      createdAt: s.createdAt.toISOString(),
    })),
  });
});

// --- Admin Users ---
router.get("/admin/users", async (_req, res): Promise<void> => {
  const users = await db.select({ id: adminUsersTable.id, username: adminUsersTable.username,
    email: adminUsersTable.email, role: adminUsersTable.role,
    permissions: adminUsersTable.permissions, createdAt: adminUsersTable.createdAt })
    .from(adminUsersTable).orderBy(adminUsersTable.id);
  res.json(users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })));
});

router.post("/admin/users", async (req, res): Promise<void> => {
  const { username, email, password, role, permissions } = req.body;
  if (!username || !email || !password) { res.status(400).json({ error: "username, email, and password are required" }); return; }
  const existing = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, email));
  if (existing.length > 0) { res.status(409).json({ error: "Email already in use" }); return; }
  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(adminUsersTable)
    .values({ username, email, passwordHash, role: role || "admin", permissions: permissions || [] })
    .returning();
  res.status(201).json({ id: user.id, username: user.username, email: user.email,
    role: user.role, permissions: user.permissions, createdAt: user.createdAt.toISOString() });
});

router.patch("/admin/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { username, email, role, permissions, password } = req.body;
  const updates: Record<string, unknown> = {};
  if (username) updates.username = username;
  if (email) updates.email = email;
  if (role) updates.role = role;
  if (permissions !== undefined) updates.permissions = permissions;
  if (password) updates.passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.update(adminUsersTable).set(updates).where(eq(adminUsersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id: user.id, username: user.username, email: user.email,
    role: user.role, permissions: user.permissions, createdAt: user.createdAt.toISOString() });
});

router.delete("/admin/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const adminCount = await db.select({ count: count() }).from(adminUsersTable);
  if ((adminCount[0]?.count ?? 0) <= 1) { res.status(400).json({ error: "Cannot delete the last admin user" }); return; }
  await db.delete(adminUsersTable).where(eq(adminUsersTable.id, id));
  res.sendStatus(204);
});

// --- Admin Invoices ---
router.get("/admin/invoices", async (_req, res): Promise<void> => {
  const invoices = await db
    .select({
      id: invoicesTable.id, invoiceNumber: invoicesTable.invoiceNumber,
      clientId: invoicesTable.clientId, clientName: clientsTable.name,
      clientEmail: clientsTable.email, orderId: invoicesTable.orderId,
      serviceId: ordersTable.serviceId, serviceName: servicesTable.name,
      amount: invoicesTable.amount, currency: invoicesTable.currency,
      status: invoicesTable.status, dueDate: invoicesTable.dueDate,
      paidAt: invoicesTable.paidAt, transactionId: invoicesTable.transactionId,
      refundedAt: invoicesTable.refundedAt, mergedInto: invoicesTable.mergedInto,
      notes: invoicesTable.notes,
      refundNote: sql<string | null>`invoices.refund_note`,
      createdAt: invoicesTable.createdAt,
    })
    .from(invoicesTable)
    .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
    .leftJoin(ordersTable, eq(invoicesTable.orderId, ordersTable.id))
    .leftJoin(servicesTable, eq(ordersTable.serviceId, servicesTable.id))
    .orderBy(desc(invoicesTable.createdAt));

  res.json(invoices.map((inv) => ({
    ...inv,
    amount: Number(inv.amount),
    dueDate: inv.dueDate.toISOString(),
    paidAt: inv.paidAt?.toISOString() ?? null,
    refundedAt: inv.refundedAt?.toISOString() ?? null,
    createdAt: inv.createdAt.toISOString(),
  })));
});

router.post("/admin/invoices", async (req, res): Promise<void> => {
  const { clientId, orderId, amount, currency, dueDate, notes } = req.body;
  if (orderId) {
    const [existing] = await db.select().from(invoicesTable).where(eq(invoicesTable.orderId, Number(orderId)));
    if (existing) {
      res.status(409).json({ error: `Invoice already published: ${existing.invoiceNumber}`, invoice: toInvoiceJson(existing) });
      return;
    }
  }
  const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const [invoice] = await db.insert(invoicesTable).values({
    invoiceNumber, clientId, orderId: orderId || null,
    amount: String(amount), currency: currency || "USD",
    dueDate: new Date(dueDate), notes: notes || null,
  }).returning();
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId));
  res.status(201).json(toInvoiceJson(invoice, client?.name));
});

router.patch("/admin/invoices/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { status, amount, currency, dueDate, paidAt, transactionId, refundedAt, refundNote, notes } = req.body;
  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (amount !== undefined) updates.amount = String(amount);
  if (currency !== undefined) updates.currency = currency;
  if (dueDate !== undefined) updates.dueDate = new Date(dueDate);
  if (paidAt !== undefined) updates.paidAt = paidAt ? new Date(paidAt) : null;
  if (transactionId !== undefined) updates.transactionId = transactionId || null;
  if (refundedAt !== undefined) updates.refundedAt = refundedAt ? new Date(refundedAt) : null;
  if (refundNote !== undefined) updates.refundNote = refundNote || null;
  if (notes !== undefined) updates.notes = notes || null;

  const [invoice] = await db.update(invoicesTable).set(updates).where(eq(invoicesTable.id, id)).returning();
  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, invoice.clientId));
  res.json(toInvoiceJson(invoice, client?.name));
});

router.post("/admin/invoices/:id/refund", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const refundNote = typeof req.body?.refundNote === "string" && req.body.refundNote.trim()
    ? req.body.refundNote.trim()
    : null;

  const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
  if (invoice.refundedAt || invoice.status === "refunded") {
    res.status(400).json({ error: "Invoice is already refunded" });
    return;
  }
  if (invoice.status !== "paid") {
    res.status(400).json({ error: "Only paid invoices can be refunded" });
    return;
  }

  const captureId = getPayPalCaptureId(invoice.transactionId);
  const razorpayPaymentId = getRazorpayPaymentId(invoice.transactionId);
  let gatewayNote: string | null = null;

  if (captureId) {
    try {
      const accessToken = await getPayPalAccessToken();
      const response = await fetch(`${PAYPAL_API_BASE}/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: {
            currency_code: invoice.currency,
            value: Number(invoice.amount).toFixed(2),
          },
          note_to_payer: refundNote ?? "Refund from SkyHostSolutions",
        }),
      });
      const data = (await response.json()) as { id?: string; status?: string; message?: string };
      if (!response.ok || (data.status !== "COMPLETED" && data.status !== "PENDING")) {
        throw new Error(data.message ?? "PayPal refund failed");
      }
      gatewayNote = `PayPal refund ${data.id ?? ""}`.trim();
    } catch (error) {
      res.status(502).json({ error: error instanceof Error ? error.message : "PayPal refund failed" });
      return;
    }
  } else if (razorpayPaymentId) {
    if (!razorpaySettings.keyId || !razorpaySettings.keySecret) {
      res.status(503).json({ error: "Razorpay gateway is not configured" });
      return;
    }

    try {
      const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpayPaymentId)}/refund`, {
        method: "POST",
        headers: {
          Authorization: getRazorpayAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(Number(invoice.amount) * 100),
          notes: {
            invoiceId: String(invoice.id),
            refundNote: refundNote ?? "Refund from SkyHostSolutions",
          },
        }),
      });
      const data = (await response.json()) as { id?: string; status?: string; error?: { description?: string } };
      if (!response.ok || !data.id) {
        throw new Error(data.error?.description ?? "Razorpay refund failed");
      }
      gatewayNote = `Razorpay refund ${data.id}`.trim();
    } catch (error) {
      res.status(502).json({ error: error instanceof Error ? error.message : "Razorpay refund failed" });
      return;
    }
  }

  const note = [refundNote, gatewayNote].filter(Boolean).join("\n") || null;
  const updates: Record<string, unknown> = {
    status: "refunded",
    refundedAt: new Date(),
    refundNote: note,
  };
  const [updated] = await db.update(invoicesTable).set(updates).where(eq(invoicesTable.id, id)).returning();

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, updated.clientId));
  res.json(toInvoiceJson(updated, client?.name));
});

router.post("/admin/invoices/merge", async (req, res): Promise<void> => {
  const { invoiceIds, dueDate, notes } = req.body as { invoiceIds: number[]; dueDate: string; notes?: string };
  if (!Array.isArray(invoiceIds) || invoiceIds.length < 2) {
    res.status(400).json({ error: "Select at least 2 invoices to merge" }); return;
  }
  const toMerge = await db.select().from(invoicesTable).where(inArray(invoicesTable.id, invoiceIds));
  if (toMerge.length !== invoiceIds.length) { res.status(404).json({ error: "Some invoices not found" }); return; }
  const clientId = toMerge[0].clientId;
  if (!toMerge.every(i => i.clientId === clientId)) { res.status(400).json({ error: "All invoices must belong to the same client" }); return; }
  const totalAmount = toMerge.reduce((s, i) => s + Number(i.amount), 0);
  const currency = toMerge[0].currency;
  const invoiceNumber = `INV-MERGE-${Date.now()}`;
  const [merged] = await db.insert(invoicesTable).values({
    invoiceNumber, clientId, amount: String(totalAmount), currency,
    dueDate: new Date(dueDate || Date.now() + 30 * 86400000),
    notes: notes || `Merged from: ${toMerge.map(i => i.invoiceNumber).join(", ")}`,
  }).returning();
  await db.update(invoicesTable).set({ status: "merged", mergedInto: merged.id }).where(inArray(invoicesTable.id, invoiceIds));
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId));
  res.status(201).json(toInvoiceJson(merged, client?.name));
});

router.post("/admin/invoices/:id/send-email", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!inv) { res.status(404).json({ error: "Invoice not found" }); return; }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, inv.clientId));
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }

  const invoiceNumber = inv.invoiceNumber;
  const amount = Number(inv.amount).toFixed(2);
  const dueDate = inv.dueDate.toDateString();
  const bg = appearanceSettings.backgroundColor;
  const card = appearanceSettings.cardColor;
  const text = appearanceSettings.textColor;
  const primary = appearanceSettings.primaryColor;

  const html = `<div style="margin:0;padding:32px;background:${bg};font-family:Inter,Segoe UI,Arial,sans-serif;color:${text}">
    <div style="max-width:640px;margin:0 auto;background:${card};border:1px solid rgba(255,255,255,.12);border-radius:18px;overflow:hidden">
      <div style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,.12)">
        <div style="font-size:22px;font-weight:800"><span style="color:${appearanceSettings.brandSkyColor}">Sky</span><span style="color:${appearanceSettings.brandHostColor}">Host</span><span style="color:${appearanceSettings.brandSolutionsColor}">Solutions</span></div>
        <div style="margin-top:10px;font-size:34px;font-weight:800;color:${text}">Invoice ${invoiceNumber}</div>
        <div style="display:inline-block;margin-top:14px;padding:6px 12px;border-radius:999px;background:${primary};color:${bg};font-size:12px;font-weight:800;letter-spacing:.08em">${inv.status.toUpperCase()}</div>
      </div>
      <div style="padding:28px 32px">
        <p style="margin:0 0 18px;color:${text};font-size:15px">Dear ${client.name},</p>
        <p style="margin:0 0 24px;color:rgba(255,255,255,.72);font-size:14px;line-height:1.6">Your invoice is ready. Please review the details below.</p>
        <table style="width:100%;border-collapse:separate;border-spacing:0;margin:0 0 24px;border:1px solid rgba(255,255,255,.10);border-radius:12px;overflow:hidden">
          <tr><td style="padding:14px 16px;background:rgba(255,255,255,.04);color:rgba(255,255,255,.68)">Invoice #</td><td style="padding:14px 16px;text-align:right;font-weight:700">${invoiceNumber}</td></tr>
          <tr><td style="padding:14px 16px;background:rgba(255,255,255,.04);color:rgba(255,255,255,.68)">Amount</td><td style="padding:14px 16px;text-align:right;font-weight:800;color:${primary}">${amount} ${inv.currency}</td></tr>
          <tr><td style="padding:14px 16px;background:rgba(255,255,255,.04);color:rgba(255,255,255,.68)">Due Date</td><td style="padding:14px 16px;text-align:right;font-weight:700">${dueDate}</td></tr>
          <tr><td style="padding:14px 16px;background:rgba(255,255,255,.04);color:rgba(255,255,255,.68)">Status</td><td style="padding:14px 16px;text-align:right;font-weight:700">${inv.status.toUpperCase()}</td></tr>
        </table>
        ${inv.notes ? `<div style="padding:14px 16px;border-radius:12px;background:rgba(255,255,255,.05);color:rgba(255,255,255,.78);font-size:14px"><strong style="color:${text}">Notes:</strong> ${inv.notes}</div>` : ""}
        <p style="margin:28px 0 0;color:rgba(255,255,255,.72);font-size:14px">Thank you for your business.</p>
      </div>
      <div style="padding:18px 32px;border-top:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.5);font-size:12px">SkyHostSolutions - support@skyhostsolutions.com</div>
    </div>
  </div>`;

  const transport = getMailTransport();
  if (transport) {
    try {
      await transport.sendMail({
        from: smtpSettings.from || process.env.SMTP_FROM || `"SkyHostSolutions" <${smtpSettings.user || process.env.SMTP_USER}>`,
        to: client.email,
        subject: `Invoice ${invoiceNumber} — ${amount} ${inv.currency} due ${dueDate}`,
        html,
      });
      res.json({ sent: true, to: client.email });
    } catch (smtpErr: unknown) {
      const msg = smtpErr instanceof Error ? smtpErr.message : "SMTP send failed";
      res.status(500).json({ error: msg });
    }
  } else {
    // SMTP not configured — return preview
    res.json({ sent: false, preview: true, to: client.email, html,
      message: "SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS environment variables to enable email sending." });
  }
});

// --- Admin Tickets ---
router.get("/admin/tickets", async (_req, res): Promise<void> => {
  const tickets = await db
    .select({
      id: ticketsTable.id,
      clientId: ticketsTable.clientId,
      clientName: clientsTable.name,
      serviceId: ticketServiceIdColumn(),
      serviceName: servicesTable.name,
      subject: ticketsTable.subject,
      status: ticketsTable.status,
      priority: ticketsTable.priority,
      createdAt: ticketsTable.createdAt,
      updatedAt: ticketsTable.updatedAt,
    })
    .from(ticketsTable)
    .leftJoin(clientsTable, eq(ticketsTable.clientId, clientsTable.id))
    .leftJoin(servicesTable, eq(ticketServiceIdColumn(), servicesTable.id))
    .orderBy(desc(ticketsTable.createdAt));

  res.json(
    tickets.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  );
});

router.get("/admin/tickets/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [ticketRow] = await db
    .select({
      id: ticketsTable.id,
      clientId: ticketsTable.clientId,
      clientName: clientsTable.name,
      clientEmail: clientsTable.email,
      clientPhone: clientsTable.phone,
      clientCompany: clientsTable.company,
      serviceId: ticketServiceIdColumn(),
      serviceName: servicesTable.name,
      subject: ticketsTable.subject,
      status: ticketsTable.status,
      priority: ticketsTable.priority,
      createdAt: ticketsTable.createdAt,
      updatedAt: ticketsTable.updatedAt,
    })
    .from(ticketsTable)
    .leftJoin(clientsTable, eq(ticketsTable.clientId, clientsTable.id))
    .leftJoin(servicesTable, eq(ticketServiceIdColumn(), servicesTable.id))
    .where(eq(ticketsTable.id, id));

  if (!ticketRow) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const replies = await db
    .select()
    .from(ticketRepliesTable)
    .where(eq(ticketRepliesTable.ticketId, id))
    .orderBy(ticketRepliesTable.createdAt);

  const clientServices = await db
    .select({
      serviceId: ordersTable.serviceId,
      serviceName: servicesTable.name,
      orderId: ordersTable.id,
      status: ordersTable.status,
      amount: ordersTable.amount,
      currency: ordersTable.currency,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable)
    .leftJoin(servicesTable, eq(ordersTable.serviceId, servicesTable.id))
    .where(eq(ordersTable.clientId, ticketRow.clientId))
    .orderBy(desc(ordersTable.createdAt));

  res.json({
    ticket: {
      ...ticketRow,
      createdAt: ticketRow.createdAt.toISOString(),
      updatedAt: ticketRow.updatedAt.toISOString(),
    },
    replies: replies.map((r) => ({
      ...r,
      isAdmin: r.isAdmin === "true",
      createdAt: r.createdAt.toISOString(),
    })),
    clientServices: clientServices.map((s) => ({
      ...s,
      amount: Number(s.amount),
      createdAt: s.createdAt.toISOString(),
    })),
  });
});

router.patch("/admin/tickets/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { status, priority, serviceId } = req.body;
  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (priority) updates.priority = priority;
  if (serviceId !== undefined) {
    if (!hasTicketServiceColumn()) {
      res.status(503).json({ error: "Ticket service selection is pending a database migration" });
      return;
    }
    const nextServiceId = Number(serviceId);
    const [ticketRow] = await db.select({ clientId: ticketsTable.clientId }).from(ticketsTable).where(eq(ticketsTable.id, id));
    if (!ticketRow) { res.status(404).json({ error: "Ticket not found" }); return; }
    const [clientOrder] = await db
      .select({ id: ordersTable.id })
      .from(ordersTable)
      .where(and(eq(ordersTable.clientId, ticketRow.clientId), eq(ordersTable.serviceId, nextServiceId)))
      .limit(1);
    if (!clientOrder) { res.status(400).json({ error: "Selected service does not belong to this client" }); return; }
    updates.serviceId = nextServiceId;
  }

  const [ticket] = await db
    .update(ticketsTable)
    .set(updates)
    .where(eq(ticketsTable.id, id))
    .returning({
      id: ticketsTable.id,
      clientId: ticketsTable.clientId,
      subject: ticketsTable.subject,
      status: ticketsTable.status,
      priority: ticketsTable.priority,
      createdAt: ticketsTable.createdAt,
      updatedAt: ticketsTable.updatedAt,
    });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }
  res.json({
    ...ticket,
    clientName: null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  });
});

router.post("/admin/tickets/:id/replies", async (req, res): Promise<void> => {
  const adminId = req.session.adminId!;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { message } = req.body;

  if (!message) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  const [admin] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, adminId));
  const [reply] = await db
    .insert(ticketRepliesTable)
    .values({
      ticketId: id,
      adminId,
      authorName: admin?.username ?? "Support",
      message,
      isAdmin: "true",
    })
    .returning();

  // Update ticket to in_progress when admin replies
  await db.update(ticketsTable).set({ status: "in_progress" }).where(eq(ticketsTable.id, id));

  res.status(201).json({
    ...reply,
    isAdmin: true,
    createdAt: reply.createdAt.toISOString(),
  });
});

export default router;
