import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "seatflow.db");

const db = new Database(DB_PATH);

// WAL 모드로 동시 읽기 성능 향상
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dept TEXT,
    seat_id TEXT
  );

  CREATE TABLE IF NOT EXISTS seats (
    id TEXT PRIMARY KEY,
    zone TEXT,
    floor INTEGER,
    employee_id TEXT REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS seat_status (
    seat_id TEXT PRIMARY KEY REFERENCES seats(id),
    status TEXT DEFAULT 'empty',
    source TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seat_id TEXT,
    employee_id TEXT,
    status TEXT,
    source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;
