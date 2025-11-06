import { Router } from "express";
import { query } from "../db.js";

const router = Router();

router.get("/health", async (_req, res) => {
  try {
    const db = await query("select now() as now");
    res.json({ ok: true, db_time: db.rows[0].now });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
