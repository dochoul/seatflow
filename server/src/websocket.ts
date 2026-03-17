import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import db from "./db";

let wss: WebSocketServer;
const clients = new Set<WebSocket>();

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    clients.add(ws);
    console.log(`[WS] 클라이언트 연결 (총 ${clients.size}명)`);

    // 최초 연결 시 전체 좌석 현황 전송
    const seats = db
      .prepare(
        `SELECT s.id as seatId, s.zone, s.floor, s.employee_id as employeeId,
                e.name, e.dept,
                COALESCE(ss.status, 'empty') as status,
                ss.updated_at as updatedAt
         FROM seats s
         LEFT JOIN employees e ON s.employee_id = e.id
         LEFT JOIN seat_status ss ON s.id = ss.seat_id`
      )
      .all();

    ws.send(JSON.stringify({ event: "seat_list", data: seats }));

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.event === "subscribe") {
          console.log("[WS] 클라이언트 구독 완료");
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
      console.log(`[WS] 클라이언트 연결 해제 (총 ${clients.size}명)`);
    });
  });
}

export function broadcast(event: string, data: unknown) {
  const message = JSON.stringify({ event, data });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}
