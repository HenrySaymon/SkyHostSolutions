import { Router, type IRouter } from "express";
import { db, contactsTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/contact", async (req, res): Promise<void> => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  await db.insert(contactsTable).values({ name, email, phone: phone || null, subject, message });
  res.status(201).json({ message: "Message received. We will get back to you shortly." });
});

export default router;
