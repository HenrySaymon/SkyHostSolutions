import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { db, clientsTable, adminUsersTable } from "@workspace/db";

declare module "express-session" {
  interface SessionData {
    clientId?: number;
    adminId?: number;
  }
}

const router: IRouter = Router();

// --- Client Register ---
router.post("/auth/register", async (req, res): Promise<void> => {
  const { name, email, password, phone, company } = req.body;
  if (!name || !email || !password || !phone) {
    res.status(400).json({ error: "Name, email, password and phone are required" });
    return;
  }

  const [existing] = await db.select().from(clientsTable).where(eq(clientsTable.email, email));
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [client] = await db
    .insert(clientsTable)
    .values({ name, email, passwordHash, phone, company: company || null })
    .returning();

  req.session.clientId = client.id;
  res.status(201).json(toClientJson(client));
});

// --- Client Login ---
router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.email, email));
  if (!client) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (client.status === "suspended") {
    res.status(401).json({ error: "Account suspended" });
    return;
  }

  const valid = await bcrypt.compare(password, client.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  req.session.clientId = client.id;
  req.session.adminId = undefined;
  res.json(toClientJson(client));
});

// --- Client Logout ---
router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ message: "Logged out" });
  });
});

// --- Admin Login ---
router.post("/auth/admin/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [admin] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, email));
  if (!admin) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  req.session.adminId = admin.id;
  req.session.clientId = undefined;
  res.json({ id: admin.id, username: admin.username, role: admin.role });
});

// --- Admin Logout ---
router.post("/auth/admin/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ message: "Logged out" });
  });
});

// --- Get Me ---
router.get("/auth/me", async (req, res): Promise<void> => {
  if (req.session.adminId) {
    const [admin] = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.id, req.session.adminId));
    if (admin) {
      res.json({ id: admin.id, username: admin.username, role: admin.role, isAdmin: true });
      return;
    }
  }

  if (!req.session.clientId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, req.session.clientId));

  if (!client) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  res.json(toClientJson(client));
});

function toClientJson(c: typeof clientsTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    company: c.company,
    status: c.status,
  };
}

export { toClientJson };
export default router;
