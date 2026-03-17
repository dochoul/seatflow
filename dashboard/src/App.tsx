import { useWebSocket } from "./hooks/useWebSocket";
import Dashboard from "./components/Dashboard";
import SeatMap from "./components/SeatMap";
import PeopleList from "./components/PeopleList";
import ActivityLog from "./components/ActivityLog";

export default function App() {
  const { seats, connected } = useWebSocket();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">SeatFlow</h1>
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-gray-500">
              {connected ? "실시간 연결됨" : "연결 끊김 — 재연결 중..."}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-6">
        {/* 통계 */}
        <Dashboard seats={seats} />

        <div className="grid grid-cols-3 gap-6">
          {/* 좌석 배치도 */}
          <div className="col-span-2 rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-700">좌석 배치도</h2>
            <SeatMap seats={seats} />
          </div>

          {/* 활동 로그 */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-700">활동 로그</h2>
            <ActivityLog />
          </div>
        </div>

        {/* 재직 현황 테이블 */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-700">재직 현황</h2>
          <PeopleList seats={seats} />
        </div>
      </main>
    </div>
  );
}
