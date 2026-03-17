import { Router, Request, Response } from "express";
import db from "../db";
import { broadcast } from "../websocket";

const router = Router();

// POST /api/status — 상태 업데이트
router.post("/", (req: Request, res: Response) => {
  const { employeeId, seatId, status, source } = req.body;

  if (!employeeId || !seatId || !status) {
    res.status(400).json({ success: false, error: "employeeId, seatId, status 필수" });
    return;
  }

  const validStatuses = ["occupied", "away", "meeting", "out", "wfh", "empty"];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ success: false, error: `유효한 status: ${validStatuses.join(", ")}` });
    return;
  }

  const now = new Date().toISOString();

  // seat_status upsert
  db.prepare(
    `INSERT INTO seat_status (seat_id, status, source, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(seat_id) DO UPDATE SET status = ?, source = ?, updated_at = ?`
  ).run(seatId, status, source || "manual", now, status, source || "manual", now);

  // activity_log 기록
  db.prepare(
    `INSERT INTO activity_log (seat_id, employee_id, status, source, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(seatId, employeeId, status, source || "manual", now);

  // WebSocket 브로드캐스트
  broadcast("status_changed", {
    seatId,
    employeeId,
    status,
    source: source || "manual",
    timestamp: now,
  });

  res.json({ success: true, timestamp: now });
});

export default router;
