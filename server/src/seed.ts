import db from "./db";

// 기존 데이터 초기화
db.exec(`
  DELETE FROM activity_log;
  DELETE FROM seat_status;
  DELETE FROM seats;
  DELETE FROM employees;
`);

// 파일럿 그룹 직원 15명
const employees = [
  { id: "emp-001", name: "David", dept: "개발팀", seatId: "A-01" },
  { id: "emp-002", name: "Gilbert", dept: "개발팀", seatId: "A-02" },
  { id: "emp-003", name: "Chang", dept: "개발팀", seatId: "A-03" },
  { id: "emp-004", name: "Victoria", dept: "개발팀", seatId: "A-04" },
  { id: "emp-005", name: "정도현", dept: "개발팀", seatId: "A-05" },
  { id: "emp-006", name: "강하늘", dept: "기획팀", seatId: "B-01" },
  { id: "emp-007", name: "윤서준", dept: "기획팀", seatId: "B-02" },
  { id: "emp-008", name: "임수빈", dept: "기획팀", seatId: "B-03" },
  { id: "emp-009", name: "한지민", dept: "디자인팀", seatId: "C-01" },
  { id: "emp-010", name: "오현우", dept: "디자인팀", seatId: "C-02" },
  { id: "emp-011", name: "송예린", dept: "디자인팀", seatId: "C-03" },
  { id: "emp-012", name: "조성민", dept: "인프라팀", seatId: "D-01" },
  { id: "emp-013", name: "류하영", dept: "인프라팀", seatId: "D-02" },
  { id: "emp-014", name: "배준혁", dept: "경영지원팀", seatId: "E-01" },
  { id: "emp-015", name: "신나연", dept: "경영지원팀", seatId: "E-02" },
];

// 좌석 등록 (직원 배정 좌석 + 빈 좌석 포함)
const seats = [
  ...employees.map((e) => ({ id: e.seatId, zone: e.seatId.split("-")[0], floor: 1, employeeId: e.id })),
  // 빈 좌석
  { id: "A-06", zone: "A", floor: 1, employeeId: null },
  { id: "B-04", zone: "B", floor: 1, employeeId: null },
  { id: "C-04", zone: "C", floor: 1, employeeId: null },
  { id: "D-03", zone: "D", floor: 1, employeeId: null },
  { id: "E-03", zone: "E", floor: 1, employeeId: null },
];

const insertEmployee = db.prepare(
  "INSERT INTO employees (id, name, dept, seat_id) VALUES (?, ?, ?, ?)"
);
const insertSeat = db.prepare(
  "INSERT INTO seats (id, zone, floor, employee_id) VALUES (?, ?, ?, ?)"
);
const insertStatus = db.prepare(
  "INSERT INTO seat_status (seat_id, status, source) VALUES (?, ?, ?)"
);

const seedAll = db.transaction(() => {
  for (const e of employees) {
    insertEmployee.run(e.id, e.name, e.dept, e.seatId);
  }
  for (const s of seats) {
    insertSeat.run(s.id, s.zone, s.floor, s.employeeId);
    // 직원 있는 좌석은 occupied, 빈 좌석은 empty
    insertStatus.run(s.id, s.employeeId ? "occupied" : "empty", s.employeeId ? "manual" : null);
  }
});

seedAll();

console.log(`[Seed] 직원 ${employees.length}명, 좌석 ${seats.length}개 등록 완료`);
