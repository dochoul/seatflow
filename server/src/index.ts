import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import statusRouter from "./routes/status";
import seatsRouter from "./routes/seats";
import { setupWebSocket } from "./websocket";
import db from "./db";

const PORT = parseInt(process.env.PORT || "3000", 10);

const app = express();
app.use(cors());
app.use(express.json());

// REST API
app.use("/api/status", statusRouter);
app.use("/api/seats", seatsRouter);

// GET /api/activity — 최근 활동 로그
app.get("/api/activity", (req, res) => {
  const limit = Math.min(parseInt((req.query.limit as string) || "50", 10), 200);

  const logs = db
    .prepare(
      `SELECT al.id, al.seat_id as seatId, al.employee_id as employeeId,
              e.name, al.status, al.source, al.created_at as createdAt
       FROM activity_log al
       LEFT JOIN employees e ON al.employee_id = e.id
       ORDER BY al.created_at DESC
       LIMIT ?`
    )
    .all(limit);

  res.json(logs);
});

// 프로덕션: 대시보드 정적 파일 서빙
const dashboardPath = path.join(__dirname, "..", "..", "dashboard", "dist");
app.use(express.static(dashboardPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(dashboardPath, "index.html"));
});

// HTTP + WebSocket 서버
const server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`[SeatFlow] 서버 시작: http://localhost:${PORT}`);
  console.log(`[SeatFlow] WebSocket: ws://localhost:${PORT}`);
});
