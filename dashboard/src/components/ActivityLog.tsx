import { useEffect, useState } from "react";
import type { ActivityLog as ActivityLogType } from "../types";
import { STATUS_LABELS, STATUS_COLORS } from "../types";

export default function ActivityLog() {
  const [logs, setLogs] = useState<ActivityLogType[]>([]);

  useEffect(() => {
    fetch("/api/activity?limit=30")
      .then((r) => r.json())
      .then(setLogs)
      .catch(() => {});

    // 10초마다 갱신
    const interval = setInterval(() => {
      fetch("/api/activity?limit=30")
        .then((r) => r.json())
        .then(setLogs)
        .catch(() => {});
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "방금";
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    return `${Math.floor(hours / 24)}일 전`;
  }

  return (
    <div className="space-y-2">
      {logs.length === 0 && (
        <p className="py-4 text-center text-sm text-gray-400">활동 기록이 없습니다</p>
      )}
      {logs.map((log) => (
        <div key={log.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: STATUS_COLORS[log.status] }}
          />
          <div className="min-w-0 flex-1">
            <span className="font-medium">{log.name}</span>
            <span className="text-gray-400"> → </span>
            <span style={{ color: STATUS_COLORS[log.status] }}>
              {STATUS_LABELS[log.status]}
            </span>
            <span className="ml-1 text-xs text-gray-400">({log.source})</span>
          </div>
          <span className="flex-shrink-0 text-xs text-gray-400">{timeAgo(log.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}
