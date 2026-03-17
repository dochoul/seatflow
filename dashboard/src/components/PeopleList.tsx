import type { Seat } from "../types";
import { STATUS_LABELS, STATUS_COLORS } from "../types";

interface Props {
  seats: Seat[];
}

export default function PeopleList({ seats }: Props) {
  const people = seats
    .filter((s) => s.employeeId)
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-600">이름</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">부서</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">좌석</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">상태</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {people.map((s) => (
            <tr key={s.seatId} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium">{s.name}</td>
              <td className="px-3 py-2 text-gray-500">{s.dept}</td>
              <td className="px-3 py-2 text-gray-500">{s.seatId}</td>
              <td className="px-3 py-2">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: STATUS_COLORS[s.status] }}
                >
                  {STATUS_LABELS[s.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
