import type { Seat } from "../types";
import { STATUS_COLORS } from "../types";

interface Props {
  seats: Seat[];
}

export default function Dashboard({ seats }: Props) {
  const assigned = seats.filter((s) => s.employeeId);
  const statusCounts = assigned.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const stats = [
    { key: "occupied", label: "착석", count: statusCounts["occupied"] || 0 },
    { key: "away", label: "자리비움", count: statusCounts["away"] || 0 },
    { key: "meeting", label: "회의중", count: statusCounts["meeting"] || 0 },
    { key: "out", label: "외출", count: statusCounts["out"] || 0 },
    { key: "wfh", label: "재택", count: statusCounts["wfh"] || 0 },
  ] as const;

  return (
    <div className="grid grid-cols-5 gap-4">
      {stats.map((s) => (
        <div
          key={s.key}
          className="rounded-xl p-4 text-center text-white shadow"
          style={{ backgroundColor: STATUS_COLORS[s.key] }}
        >
          <div className="text-3xl font-bold">{s.count}</div>
          <div className="text-sm opacity-90">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
