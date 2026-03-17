import { Router, Request, Response } from "express";
import db from "../db";

const router = Router();

// GET /api/seats — 전체 좌석 현황 조회
router.get("/", (_req: Request, res: Response) => {
  const seats = db
    .prepare(
      `SELECT s.id as seatId, s.zone, s.floor, s.employee_id as employeeId,
              e.name, e.dept,
              COALESCE(ss.status, 'empty') as status,
              ss.source,
              ss.updated_at as updatedAt
       FROM seats s
       LEFT JOIN employees e ON s.employee_id = e.id
       LEFT JOIN seat_status ss ON s.id = ss.seat_id
       ORDER BY s.id`
    )
    .all();

  res.json(seats);
});

// GET /api/seats/:seatId — 특정 좌석 상세 조회
router.get("/:seatId", (req: Request, res: Response) => {
  const seat = db
    .prepare(
      `SELECT s.id as seatId, s.zone, s.floor, s.employee_id as employeeId,
              e.name, e.dept,
              COALESCE(ss.status, 'empty') as status,
              ss.source,
              ss.updated_at as updatedAt
       FROM seats s
       LEFT JOIN employees e ON s.employee_id = e.id
       LEFT JOIN seat_status ss ON s.id = ss.seat_id
       WHERE s.id = ?`
    )
    .get(req.params.seatId);

  if (!seat) {
    res.status(404).json({ error: "좌석을 찾을 수 없습니다" });
    return;
  }

  res.json(seat);
});

export default router;
