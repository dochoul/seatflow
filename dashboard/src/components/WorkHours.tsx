import { useEffect, useState } from "react";
import type { Seat, WorkHours as WorkHoursType } from "../types";
import { STATUS_LABELS, STATUS_COLORS } from "../types";

interface Props {
  seats: Seat[];
}

export default function WorkHours({ seats }: Props) {
  const [data, setData] = useState<Record<string, WorkHoursType>>({});

  const employees = seats.filter((s) => s.employeeId);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);

    employees.forEach((seat) => {
      if (!seat.employeeId) return;
      fetch(`/api/work-hours/${seat.employeeId}?date=${today}`)
        .then((r) => r.json())
        .then((wh: WorkHoursType) => {
          setData((prev) => ({ ...prev, [wh.employeeId]: wh }));
        })
        .catch(() => {});
    });
  }, [seats.length]);

  // 30초마다 갱신
  useEffect(() => {
    const interval = setInterval(() => {
      const today = new Date().toISOString().slice(0, 10);
      employees.forEach((seat) => {
        if (!seat.employeeId) return;
        fetch(`/api/work-hours/${seat.employeeId}?date=${today}`)
          .then((r) => r.json())
          .then((wh: WorkHoursType) => {
            setData((prev) => ({ ...prev, [wh.employeeId]: wh }));
          })
          .catch(() => {});
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [seats.length]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-2 font-medium">이름</th>
            <th className="pb-2 font-medium">부서</th>
            <th className="pb-2 font-medium">현재 상태</th>
            <th className="pb-2 font-medium">근무시간</th>
            <th className="pb-2 font-medium">진행률</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {employees
            .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
            .map((seat) => {
              const wh = seat.employeeId ? data[seat.employeeId] : null;
              const pct = wh ? Math.min((wh.workMinutes / wh.targetMinutes) * 100, 100) : 0;
              const barColor = pct >= 100 ? "#2ecc71" : pct >= 50 ? "#2196f3" : "#f39c12";

              return (
                <tr key={seat.seatId} className="hover:bg-gray-50">
                  <td className="py-2.5 font-medium text-gray-800">{seat.name}</td>
                  <td className="py-2.5 text-gray-500">{seat.dept}</td>
                  <td className="py-2.5">
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-xs text-white"
                      style={{ backgroundColor: STATUS_COLORS[seat.status] }}
                    >
                      {STATUS_LABELS[seat.status]}
                    </span>
                  </td>
                  <td className="py-2.5 font-mono text-gray-700">
                    {wh ? wh.workHours : "—"}
                  </td>
                  <td className="w-40 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: barColor }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs text-gray-500">
                        {Math.round(pct)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
