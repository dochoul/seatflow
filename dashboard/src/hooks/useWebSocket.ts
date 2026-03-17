import { useEffect, useRef, useState, useCallback } from "react";
import type { Seat, StatusChangeEvent } from "../types";

interface UseWebSocketReturn {
  seats: Seat[];
  connected: boolean;
}

// 프로덕션: 같은 호스트, 개발: localhost:3000
const WS_URL = window.location.hostname === "localhost"
  ? `ws://localhost:3000`
  : `wss://${window.location.host}`;

export function useWebSocket(): UseWebSocketReturn {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // REST fallback: WebSocket 연결 전에도 데이터 표시
  useEffect(() => {
    fetch("/api/seats")
      .then((r) => r.json())
      .then((data) => setSeats(data))
      .catch(() => {});
  }, []);

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ event: "subscribe" }));
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);

      if (msg.event === "seat_list") {
        setSeats(msg.data);
      }

      if (msg.event === "status_changed") {
        const change = msg.data as StatusChangeEvent;
        setSeats((prev) =>
          prev.map((seat) =>
            seat.seatId === change.seatId
              ? { ...seat, status: change.status, source: change.source, updatedAt: change.timestamp }
              : seat
          )
        );
      }
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { seats, connected };
}
