import { Router, type IRouter } from "express";
import { eq, and, desc, count, sql } from "drizzle-orm";
import crypto from "node:crypto";
import { db, clientsTable, ordersTable, invoicesTable, ticketsTable, ticketRepliesTable, servicesTable } from "@workspace/db";

declare module "express-session" {
  interface SessionData {
    clientId?: number;
    adminId?: number;
  }
}

const router: IRouter = Router();

const PAYPAL_API_BASE =
  process.env.PAYPAL_ENVIRONMENT === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

export type RazorpaySettings = {
  enabled: boolean;
  keyId: string;
  keySecret: string;
  accountName: string;
  description: string;
};

export const razorpaySettings: RazorpaySettings = {
  enabled: process.env.RAZORPAY_ENABLED === "true",
  keyId: process.env.RAZORPAY_KEY_ID ?? "",
  keySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
  accountName: process.env.RAZORPAY_ACCOUNT_NAME ?? "SkyHostSolutions",
  description: process.env.RAZORPAY_DESCRIPTION ?? "SkyHostSolutions invoice payment",
};

export type UpiSettings = {
  enabled: boolean;
  upiId: string;
  payeeName: string;
  instructions: string;
  qrImageUrl: string;
};

export const upiSettings: UpiSettings = {
  enabled: process.env.UPI_ENABLED === "true",
  upiId: process.env.UPI_ID ?? "",
  payeeName: process.env.UPI_PAYEE_NAME ?? "SkyHostSolutions",
  instructions: process.env.UPI_INSTRUCTIONS ?? "Pay with UPI and share the transaction reference with support.",
  qrImageUrl: process.env.UPI_QR_IMAGE_URL ?? "",
};

function isPayPalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

function isRazorpayConfigured() {
  return Boolean(razorpaySettings.enabled && razorpaySettings.keyId && razorpaySettings.keySecret);
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

// Auth guard for client routes
router.use("/client", (req, res, next) => {
  if (!req.session.clientId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
});

// --- Client Dashboard ---
router.get("/client/dashboard", async (req, res): Promise<void> => {
  const clientId = req.session.clientId!;

  const [totalOrdersResult] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(eq(ordersTable.clientId, clientId));

  const [activeOrdersResult] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(and(eq(ordersTable.clientId, clientId), eq(ordersTable.status, "active")));

  const [pendingOrdersResult] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(and(eq(ordersTable.clientId, clientId), eq(ordersTable.status, "pending")));

  const [openTicketsResult] = await db
    .select({ count: count() })
    .from(ticketsTable)
    .where(and(eq(ticketsTable.clientId, clientId), eq(ticketsTable.status, "open")));

  const [newTicketResponsesResult] = await db
    .select({ count: count() })
    .from(ticketsTable)
    .where(and(eq(ticketsTable.clientId, clientId), eq(ticketsTable.status, "in_progress")));

  const [unpaidInvoicesResult] = await db
    .select({ count: count() })
    .from(invoicesTable)
    .where(and(eq(invoicesTable.clientId, clientId), eq(invoicesTable.status, "unpaid")));

  const recentOrders = await db
    .select({
      id: ordersTable.id,
      clientId: ordersTable.clientId,
      serviceId: ordersTable.serviceId,
      serviceName: servicesTable.name,
      status: ordersTable.status,
      notes: ordersTable.notes,
      amount: ordersTable.amount,
      currency: ordersTable.currency,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
    })
    .from(ordersTable)
    .leftJoin(servicesTable, eq(ordersTable.serviceId, servicesTable.id))
    .where(eq(ordersTable.clientId, clientId))
    .orderBy(desc(ordersTable.createdAt))
    .limit(5);

  const recentTickets = await db
    .select({
      id: ticketsTable.id,
      clientId: ticketsTable.clientId,
      subject: ticketsTable.subject,
      status: ticketsTable.status,
      priority: ticketsTable.priority,
      createdAt: ticketsTable.createdAt,
      updatedAt: ticketsTable.updatedAt,
    })
    .from(ticketsTable)
    .where(eq(ticketsTable.clientId, clientId))
    .orderBy(desc(ticketsTable.createdAt))
    .limit(5);

  res.json({
    totalOrders: totalOrdersResult?.count ?? 0,
    activeOrders: activeOrdersResult?.count ?? 0,
    pendingOrders: pendingOrdersResult?.count ?? 0,
    openTickets: openTicketsResult?.count ?? 0,
    newTicketResponses: newTicketResponsesResult?.count ?? 0,
    unpaidInvoices: unpaidInvoicesResult?.count ?? 0,
    recentOrders: recentOrders.map((o) => ({
      ...o,
      clientName: null,
      amount: Number(o.amount),
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    })),
    recentTickets: recentTickets.map((t) => ({
      ...t,
      clientName: null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
});

// --- Client Orders ---
router.get("/client/orders", async (req, res): Promise<void> => {
  const clientId = req.session.clientId!;

  const orders = await db
    .select({
      id: ordersTable.id,
      clientId: ordersTable.clientId,
      serviceId: ordersTable.serviceId,
      serviceName: servicesTable.name,
      status: ordersTable.status,
      notes: ordersTable.notes,
      amount: ordersTable.amount,
      currency: ordersTable.currency,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
    })
    .from(ordersTable)
    .leftJoin(servicesTable, eq(ordersTable.serviceId, servicesTable.id))
    .where(eq(ordersTable.clientId, clientId))
    .orderBy(desc(ordersTable.createdAt));

  res.json(
    orders.map((o) => ({
      ...o,
      clientName: null,
      amount: Number(o.amount),
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    })),
  );
});

// --- Client Place Order ---
async function getUsdRates() {
  try {
    const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    if (!response.ok) throw new Error("Failed to fetch currency rates");
    const data = (await response.json()) as { rates?: Record<string, number> };
    return { USD: 1, EUR: data.rates?.EUR ?? 0.92, INR: data.rates?.INR ?? 83.5 };
  } catch {
    return { USD: 1, EUR: 0.92, INR: 83.5 };
  }
}

router.post("/client/orders", async (req, res): Promise<void> => {
  const clientId = req.session.clientId!;
  const { serviceId, notes, currency, sslDetails } = req.body as {
    serviceId: number;
    notes?: string;
    currency?: string;
    sslDetails?: unknown;
  };
  if (!serviceId) { res.status(400).json({ error: "serviceId is required" }); return; }

  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, serviceId));
  if (!service) { res.status(404).json({ error: "Service not found" }); return; }

  const cur = (currency === "EUR" || currency === "INR") ? currency : "USD";
  const rates = await getUsdRates();
  const usdAmount = Number(service.priceUsd);
  const amount = String((usdAmount * (rates[cur] ?? 1)).toFixed(2));

  const [order] = await db.insert(ordersTable).values({
    clientId,
    serviceId,
    status: "pending",
    amount,
    currency: cur,
    notes: notes || null,
    sslDetails: sslDetails || null,
  }).returning();

  res.status(201).json({
    ...order,
    serviceName: service.name,
    clientName: null,
    amount: Number(order.amount),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  });
});

router.patch("/client/profile", async (req, res): Promise<void> => {
  const clientId = req.session.clientId!;
  const { name, email, phone, company } = req.body as {
    name?: string;
    email?: string;
    phone?: string;
    company?: string | null;
  };

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (phone !== undefined) updates.phone = String(phone).trim();
  if (company !== undefined) updates.company = company ? String(company).trim() : null;
  if (email !== undefined) {
    const nextEmail = String(email).trim().toLowerCase();
    const [existing] = await db.select().from(clientsTable).where(eq(clientsTable.email, nextEmail));
    if (existing && existing.id !== clientId) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }
    updates.email = nextEmail;
  }

  const [client] = await db.update(clientsTable).set(updates).where(eq(clientsTable.id, clientId)).returning();
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }
  res.json({
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    company: client.company,
    status: client.status,
  });
});

// --- Client Invoices ---
router.get("/client/invoices", async (req, res): Promise<void> => {
  const clientId = req.session.clientId!;

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
    .where(eq(invoicesTable.clientId, clientId))
    .orderBy(desc(invoicesTable.createdAt));

  res.json(invoices.map(({ invoice, serviceId, serviceName, orderStatus }) =>
    toInvoiceJson(invoice, null, { serviceId, serviceName, orderStatus }),
  ));
});

router.get("/client/invoices/:id", async (req, res): Promise<void> => {
  const clientId = req.session.clientId!;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [row] = await db
    .select({
      invoice: invoicesTable,
      serviceId: ordersTable.serviceId,
      serviceName: servicesTable.name,
      orderStatus: ordersTable.status,
    })
    .from(invoicesTable)
    .leftJoin(ordersTable, eq(invoicesTable.orderId, ordersTable.id))
    .leftJoin(servicesTable, eq(ordersTable.serviceId, servicesTable.id))
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.clientId, clientId)));

  if (!row) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  res.json(toInvoiceJson(row.invoice, null, {
    serviceId: row.serviceId,
    serviceName: row.serviceName,
    orderStatus: row.orderStatus,
  }));
});

router.get("/client/payments/paypal/config", (_req, res): void => {
  res.json({
    enabled: isPayPalConfigured(),
    clientId: process.env.PAYPAL_CLIENT_ID ?? null,
    environment: process.env.PAYPAL_ENVIRONMENT === "live" ? "live" : "sandbox",
  });
});

router.get("/client/payments/razorpay/config", (_req, res): void => {
  res.json({
    enabled: isRazorpayConfigured(),
    keyId: razorpaySettings.keyId || null,
    accountName: razorpaySettings.accountName,
    description: razorpaySettings.description,
  });
});

router.get("/client/payments/upi/config", (_req, res): void => {
  res.json({
    enabled: Boolean(upiSettings.enabled && upiSettings.upiId),
    upiId: upiSettings.upiId,
    payeeName: upiSettings.payeeName,
    instructions: upiSettings.instructions,
    qrImageUrl: upiSettings.qrImageUrl,
  });
});

router.post("/client/invoices/:id/razorpay/create-order", async (req, res): Promise<void> => {
  const clientId = req.session.clientId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.clientId, clientId)));

  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
  if (invoice.status === "paid") { res.status(400).json({ error: "Invoice is already paid" }); return; }
  if (invoice.status === "refunded") { res.status(400).json({ error: "Refunded invoices cannot be paid" }); return; }
  if (!isRazorpayConfigured()) { res.status(503).json({ error: "Razorpay gateway is not configured" }); return; }

  try {
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: getRazorpayAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(Number(invoice.amount) * 100),
        currency: invoice.currency,
        receipt: invoice.invoiceNumber,
        notes: {
          invoiceId: String(invoice.id),
          invoiceNumber: invoice.invoiceNumber,
        },
      }),
    });
    const data = (await response.json()) as { id?: string; error?: { description?: string } };
    if (!response.ok || !data.id) {
      throw new Error(data.error?.description ?? "Unable to create Razorpay order");
    }
    res.json({ razorpayOrderId: data.id, amount: Math.round(Number(invoice.amount) * 100), currency: invoice.currency });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Unable to create Razorpay order" });
  }
});

router.post("/client/invoices/:id/razorpay/verify", async (req, res): Promise<void> => {
  const clientId = req.session.clientId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const razorpayOrderId = String(req.body?.razorpay_order_id ?? "");
  const razorpayPaymentId = String(req.body?.razorpay_payment_id ?? "");
  const razorpaySignature = String(req.body?.razorpay_signature ?? "");

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    res.status(400).json({ error: "Razorpay payment verification data is required" });
    return;
  }

  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.clientId, clientId)));

  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
  if (invoice.status === "paid") { res.json(toInvoiceJson(invoice)); return; }
  if (!isRazorpayConfigured()) { res.status(503).json({ error: "Razorpay gateway is not configured" }); return; }

  const expectedSignature = crypto
    .createHmac("sha256", razorpaySettings.keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    res.status(400).json({ error: "Razorpay payment signature is invalid" });
    return;
  }

  const [updated] = await db.update(invoicesTable).set({
    status: "paid",
    paidAt: new Date(),
    transactionId: `razorpay:${razorpayPaymentId}`,
  }).where(eq(invoicesTable.id, invoice.id)).returning();

  res.json(toInvoiceJson(updated));
});

router.post("/client/invoices/:id/paypal/create-order", async (req, res): Promise<void> => {
  const clientId = req.session.clientId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.clientId, clientId)));

  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
  if (invoice.status === "paid") { res.status(400).json({ error: "Invoice is already paid" }); return; }
  if (invoice.status === "refunded") { res.status(400).json({ error: "Refunded invoices cannot be paid" }); return; }
  if (!isPayPalConfigured()) { res.status(503).json({ error: "PayPal gateway is not configured" }); return; }

  try {
    const accessToken = await getPayPalAccessToken();
    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            custom_id: String(invoice.id),
            invoice_id: invoice.invoiceNumber,
            description: `SkyHostSolutions invoice ${invoice.invoiceNumber}`,
            amount: {
              currency_code: invoice.currency,
              value: Number(invoice.amount).toFixed(2),
            },
          },
        ],
      }),
    });
    const data = (await response.json()) as { id?: string; message?: string };
    if (!response.ok || !data.id) throw new Error(data.message ?? "Unable to create PayPal order");
    res.json({ paypalOrderId: data.id });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Unable to create PayPal order" });
  }
});

router.post("/client/invoices/:id/paypal/capture", async (req, res): Promise<void> => {
  const clientId = req.session.clientId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const paypalOrderId = String(req.body?.paypalOrderId ?? "");
  if (!paypalOrderId) { res.status(400).json({ error: "paypalOrderId is required" }); return; }

  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.clientId, clientId)));

  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
  if (invoice.status === "paid") { res.json(toInvoiceJson(invoice)); return; }
  if (!isPayPalConfigured()) { res.status(503).json({ error: "PayPal gateway is not configured" }); return; }

  try {
    const accessToken = await getPayPalAccessToken();
    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    const data = (await response.json()) as {
      status?: string;
      message?: string;
      purchase_units?: Array<{
        payments?: { captures?: Array<{ id?: string; status?: string; amount?: { currency_code?: string; value?: string } }> };
      }>;
    };
    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
    const captureAmount = capture?.amount;
    const expectedAmount = Number(invoice.amount).toFixed(2);

    if (!response.ok || data.status !== "COMPLETED" || capture?.status !== "COMPLETED" || !capture.id) {
      throw new Error(data.message ?? "PayPal payment was not completed");
    }
    if (captureAmount?.currency_code !== invoice.currency || Number(captureAmount.value).toFixed(2) !== expectedAmount) {
      throw new Error("PayPal payment amount did not match this invoice");
    }

    const [updated] = await db.update(invoicesTable).set({
      status: "paid",
      paidAt: new Date(),
      transactionId: `paypal:${capture.id}`,
    }).where(eq(invoicesTable.id, invoice.id)).returning();

    res.json(toInvoiceJson(updated));
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Payment capture failed" });
  }
});

// --- Client Tickets ---
router.get("/client/tickets", async (req, res): Promise<void> => {
  const clientId = req.session.clientId!;

  const tickets = await db
    .select({
      id: ticketsTable.id,
      clientId: ticketsTable.clientId,
      serviceId: ticketServiceIdColumn(),
      serviceName: servicesTable.name,
      subject: ticketsTable.subject,
      status: ticketsTable.status,
      priority: ticketsTable.priority,
      createdAt: ticketsTable.createdAt,
      updatedAt: ticketsTable.updatedAt,
    })
    .from(ticketsTable)
    .leftJoin(servicesTable, eq(ticketServiceIdColumn(), servicesTable.id))
    .where(eq(ticketsTable.clientId, clientId))
    .orderBy(desc(ticketsTable.createdAt));

  res.json(
    tickets.map((t) => ({
      ...t,
      clientName: null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  );
});

router.post("/client/tickets", async (req, res): Promise<void> => {
  const clientId = req.session.clientId!;
  const { subject, message, priority, serviceId } = req.body;

  if (!subject || !message || !priority || !serviceId) {
    res.status(400).json({ error: "Subject, related service, message and priority are required" });
    return;
  }
  if (!hasTicketServiceColumn()) {
    res.status(503).json({ error: "Ticket service selection is pending a database migration" });
    return;
  }

  const selectedServiceId = Number(serviceId);
  const [clientOrder] = await db
    .select({ serviceId: ordersTable.serviceId })
    .from(ordersTable)
    .where(and(eq(ordersTable.clientId, clientId), eq(ordersTable.serviceId, selectedServiceId)))
    .limit(1);

  if (!clientOrder) {
    res.status(400).json({ error: "Selected service is not linked to your account" });
    return;
  }

  const [ticket] = await db
    .insert(ticketsTable)
    .values({ clientId, serviceId: selectedServiceId, subject, priority, status: "open" })
    .returning();

  // Insert first message as reply
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId));
  await db.insert(ticketRepliesTable).values({
    ticketId: ticket.id,
    clientId,
    authorName: client?.name ?? "Client",
    message,
    isAdmin: "false",
  });

  res.status(201).json({
    ...ticket,
    clientName: client?.name ?? null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  });
});

router.get("/client/tickets/:id", async (req, res): Promise<void> => {
  const clientId = req.session.clientId!;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [ticket] = await db
    .select({
      id: ticketsTable.id,
      clientId: ticketsTable.clientId,
      serviceId: ticketServiceIdColumn(),
      serviceName: servicesTable.name,
      subject: ticketsTable.subject,
      status: ticketsTable.status,
      priority: ticketsTable.priority,
      createdAt: ticketsTable.createdAt,
      updatedAt: ticketsTable.updatedAt,
    })
    .from(ticketsTable)
    .leftJoin(servicesTable, eq(ticketServiceIdColumn(), servicesTable.id))
    .where(and(eq(ticketsTable.id, id), eq(ticketsTable.clientId, clientId)));

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const replies = await db
    .select()
    .from(ticketRepliesTable)
    .where(eq(ticketRepliesTable.ticketId, id))
    .orderBy(ticketRepliesTable.createdAt);

  res.json({
    ticket: {
      ...ticket,
      clientName: null,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    },
    replies: replies.map((r) => ({
      ...r,
      isAdmin: r.isAdmin === "true",
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

router.post("/client/tickets/:id/replies", async (req, res): Promise<void> => {
  const clientId = req.session.clientId!;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { message } = req.body;

  if (!message) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  const [ticket] = await db
    .select({
      id: ticketsTable.id,
      clientId: ticketsTable.clientId,
      status: ticketsTable.status,
    })
    .from(ticketsTable)
    .where(and(eq(ticketsTable.id, id), eq(ticketsTable.clientId, clientId)));

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId));

  const [reply] = await db
    .insert(ticketRepliesTable)
    .values({
      ticketId: id,
      clientId,
      authorName: client?.name ?? "Client",
      message,
      isAdmin: "false",
    })
    .returning();

  // Reopen if closed or resolved
  if (ticket.status === "closed" || ticket.status === "resolved") {
    await db.update(ticketsTable).set({ status: "open" }).where(eq(ticketsTable.id, id));
  }

  res.status(201).json({
    ...reply,
    isAdmin: false,
    createdAt: reply.createdAt.toISOString(),
  });
});

type InvoiceOrderDetails = {
  serviceId?: number | null;
  serviceName?: string | null;
  orderStatus?: string | null;
};

function toInvoiceJson(inv: typeof invoicesTable.$inferSelect, clientName?: string | null, order?: InvoiceOrderDetails) {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    clientId: inv.clientId,
    clientName: clientName ?? null,
    orderId: inv.orderId,
    orderName: order?.serviceName ?? null,
    serviceId: order?.serviceId ?? null,
    serviceName: order?.serviceName ?? null,
    orderStatus: order?.orderStatus ?? null,
    amount: Number(inv.amount),
    currency: inv.currency,
    status: inv.status,
    dueDate: inv.dueDate.toISOString(),
    paidAt: inv.paidAt?.toISOString() ?? null,
    transactionId: inv.transactionId ?? null,
    refundedAt: inv.refundedAt?.toISOString() ?? null,
    mergedInto: inv.mergedInto ?? null,
    notes: inv.notes,
    refundNote: (inv as { refundNote?: string | null }).refundNote ?? null,
    createdAt: inv.createdAt.toISOString(),
  };
}

export { toInvoiceJson };
export default router;
