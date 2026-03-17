import { useState } from "react";
import type { Seat, SeatStatus } from "../types";
import { STATUS_LABELS, STATUS_COLORS } from "../types";

interface Props {
  seats: Seat[];
}

const MANUAL_STATUSES: SeatStatus[] = ["occupied", "away", "meeting", "out", "wfh"];

export default function SeatMap({ seats }: Props) {
  const [changing, setChanging] = useState<string | null>(null);

  // 존별로 그룹핑
  const zones = seats.reduce(
    (acc, seat) => {
      const zone = seat.zone;
      if (!acc[zone]) acc[zone] = [];
      acc[zone].push(seat);
      return acc;
    },
    {} as Record<string, Seat[]>
  );

  async function changeStatus(seatId: string, employeeId: string, status: SeatStatus) {
    setChanging(null);
    await fetch("/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seatId, employeeId, status, source: "manual" }),
    });
  }

  return (
    <div className="space-y-6">
      {Object.entries(zones)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([zone, zoneSeats]) => (
          <div key={zone}>
            <h3 className="mb-2 text-sm font-semibold text-gray-500">{zone} 구역</h3>
            <div className="grid grid-cols-5 gap-3">
              {zoneSeats
                .sort((a, b) => a.seatId.localeCompare(b.seatId))
                .map((seat) => (
                  <div key={seat.seatId} className="relative">
                    <button
                      onClick={() => seat.employeeId && setChanging(changing === seat.seatId ? null : seat.seatId)}
                      className="w-full rounded-lg border-2 p-3 text-center transition-all hover:shadow-md"
                      style={{
                        borderColor: STATUS_COLORS[seat.status],
                        backgroundColor: STATUS_COLORS[seat.status] + "18",
                      }}
                    >
                      <div
                        className="mx-auto mb-1 h-3 w-3 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[seat.status] }}
                      />
                      <div className="text-xs font-medium text-gray-800">
                        {seat.name || seat.seatId}
                      </div>
                      <div className="text-[10px] text-gray-500">{seat.seatId}</div>
                      <div
                        className="mt-1 text-[10px] font-medium"
                        style={{ color: STATUS_COLORS[seat.status] }}
                      >
                        {STATUS_LABELS[seat.status]}
                      </div>
                    </button>

                    {/* 상태 변경 드롭다운 */}
                    {changing === seat.seatId && seat.employeeId && (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white p-1 shadow-lg">
                        {MANUAL_STATUSES.map((s) => (
                          <button
                            key={s}
                            onClick={() => changeStatus(seat.seatId, seat.employeeId!, s)}
                            className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-gray-100"
                          >
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: STATUS_COLORS[s] }}
                            />
                            {STATUS_LABELS[s]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
    </div>
  );
}
