export type SeatStatus = "occupied" | "away" | "meeting" | "out" | "wfh" | "empty";

export interface Seat {
  seatId: string;
  zone: string;
  floor: number;
  employeeId: string | null;
  name: string | null;
  dept: string | null;
  status: SeatStatus;
  source?: string;
  updatedAt?: string;
}

export interface ActivityLog {
  id: number;
  seatId: string;
  employeeId: string;
  name: string;
  status: SeatStatus;
  source: string;
  createdAt: string;
}

export interface StatusChangeEvent {
  seatId: string;
  employeeId: string;
  status: SeatStatus;
  source: string;
  timestamp: string;
}

export const STATUS_LABELS: Record<SeatStatus, string> = {
  occupied: "착석",
  away: "자리비움",
  meeting: "회의중",
  out: "외출",
  wfh: "재택",
  empty: "공석",
};

export const STATUS_COLORS: Record<SeatStatus, string> = {
  occupied: "#2ecc71",
  away: "#f39c12",
  meeting: "#2196f3",
  out: "#e74c3c",
  wfh: "#9b59b6",
  empty: "#e0e0e0",
};
