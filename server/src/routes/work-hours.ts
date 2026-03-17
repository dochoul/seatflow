import { Router, Request, Response } from "express";
import db from "../db";

const router = Router();

// 근무시간으로 인정되는 상태
const WORKING_STATUSES = new Set(["occupied", "meeting"]);

// 점심시간 (분 단위: 12:00 = 720, 13:00 = 780)
const LUNCH_START = 720;
const LUNCH_END = 780;

interface ActivityRow {
  status: string;
  createdAt: string;
}

/**
 * 두 시각 사이의 근무 분을 계산 (점심시간 제외)
 * from, to: 하루 시작부터의 분 (0~1440)
 */
function workMinutesExcludingLunch(from: number, to: number): number {
  if (from >= to) return 0;

  let minutes = to - from;

  // 점심시간과 겹치는 구간 계산
  const overlapStart = Math.max(from, LUNCH_START);
  const overlapEnd = Math.min(to, LUNCH_END);
  if (overlapStart < overlapEnd) {
    minutes -= overlapEnd - overlapStart;
  }

  return minutes;
}

/** Date → 자정부터의 분 */
function toMinutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

// GET /api/work-hours/:employeeId?date=YYYY-MM-DD
router.get("/:employeeId", (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);

  // 해당 날짜의 activity_log 조회
  const dayStart = `${dateStr}T00:00:00`;
  const dayEnd = `${dateStr}T23:59:59`;

  const logs = db
    .prepare(
      `SELECT status, created_at as createdAt
       FROM activity_log
       WHERE employee_id = ? AND created_at >= ? AND created_at <= ?
       ORDER BY created_at ASC`
    )
    .all(employeeId, dayStart, dayEnd) as ActivityRow[];

  if (logs.length === 0) {
    res.json({
      employeeId,
      date: dateStr,
      workMinutes: 0,
      workHours: "0시간 0분",
      targetMinutes: 480,
      details: [],
    });
    return;
  }

  let totalWorkMinutes = 0;
  const details: { from: string; to: string; status: string; minutes: number }[] = [];

  for (let i = 0; i < logs.length; i++) {
    const current = logs[i];
    const currentTime = new Date(current.createdAt);

    // 다음 이벤트 시각 또는 현재 시각(마지막 이벤트인 경우)
    let endTime: Date;
    if (i + 1 < logs.length) {
      endTime = new Date(logs[i + 1].createdAt);
    } else {
      // 마지막 상태는 현재 시각까지 (같은 날짜인 경우만)
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      endTime = today === dateStr ? now : new Date(`${dateStr}T18:00:00`);
    }

    const fromMin = toMinutesOfDay(currentTime);
    const toMin = toMinutesOfDay(endTime);
    const minutes = workMinutesExcludingLunch(fromMin, toMin);

    if (WORKING_STATUSES.has(current.status)) {
      totalWorkMinutes += minutes;
    }

    details.push({
      from: currentTime.toISOString(),
      to: endTime.toISOString(),
      status: current.status,
      minutes,
    });
  }

  const hours = Math.floor(totalWorkMinutes / 60);
  const mins = Math.round(totalWorkMinutes % 60);

  res.json({
    employeeId,
    date: dateStr,
    workMinutes: totalWorkMinutes,
    workHours: `${hours}시간 ${mins}분`,
    targetMinutes: 480,
    details,
  });
});

export default router;
