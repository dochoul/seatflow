# SeatFlow - 이석관리 시스템 PoC

## 프로젝트 개요

사무실 직원의 착석 현황을 실시간으로 파악하기 위한 이석관리 시스템 PoC.
400명 규모 회사를 대상으로, 우선 10~20명 파일럿 그룹으로 시작한다.

### 핵심 판단 방식
- **마우스/키보드 idle 감지**: N분 이상 입력 없으면 자동으로 "자리비움" 처리
- **본인 수동 변경**: "회의중", "외출", "재택" 등 세부 상태는 직접 설정
- 100% 정확도는 목표가 아님. "대략 자리에 있나 없나" 파악이 목적

---

## 시스템 아키텍처

```
[PC 에이전트] → HTTP/WebSocket → [백엔드 서버] → WebSocket → [웹 대시보드]
  (Python)                        (Node.js)                    (React)
                                      ↕
                                   (SQLite)
```

### 컴포넌트별 역할

| 컴포넌트 | 역할 | 기술 |
|---|---|---|
| PC 에이전트 | idle 감지, 상태 전송, 트레이 아이콘 | Python |
| 백엔드 서버 | 상태 수신, 실시간 푸시, DB 저장 | Node.js + Express |
| 웹 대시보드 | 실시간 착석 현황, 관리자 기능 | React + TypeScript |
| DB | 상태 이력 저장 | SQLite (PoC용) |

---

## 디렉토리 구조

```
seatflow/
├── agent/                  # PC 에이전트 (Python)
│   ├── main.py             # 메인 진입점
│   ├── idle_detector.py    # idle 감지 로직
│   ├── tray_icon.py        # 시스템 트레이 UI
│   ├── api_client.py       # 서버 통신
│   ├── config.py           # 설정 (서버 URL, idle 임계값 등)
│   ├── requirements.txt
│   └── build.py            # PyInstaller 빌드 스크립트
│
├── server/                 # 백엔드 서버 (Node.js)
│   ├── src/
│   │   ├── index.ts        # 서버 진입점
│   │   ├── routes/
│   │   │   ├── status.ts   # 상태 업데이트 API
│   │   │   └── seats.ts    # 좌석 조회 API
│   │   ├── websocket.ts    # WebSocket 핸들러
│   │   └── db.ts           # SQLite 연결 및 쿼리
│   ├── package.json
│   └── tsconfig.json
│
└── dashboard/              # 웹 대시보드 (React)
    ├── src/
    │   ├── App.tsx
    │   ├── components/
    │   │   ├── Dashboard.tsx       # 통계 대시보드
    │   │   ├── SeatMap.tsx         # 자리 배치도
    │   │   ├── PeopleList.tsx      # 재직 현황
    │   │   └── ActivityLog.tsx     # 활동 로그
    │   ├── hooks/
    │   │   └── useWebSocket.ts     # WebSocket 연결 훅
    │   └── types/
    │       └── index.ts            # 공통 타입 정의
    ├── package.json
    └── vite.config.ts
```

---

## 개발 순서

> 반드시 이 순서대로 개발한다. 에이전트는 서버가 있어야 테스트 가능하기 때문.

### Step 1: 백엔드 서버

**API 엔드포인트**

```
POST /api/status
  - body: { employeeId, seatId, status, source }
  - status: "occupied" | "away" | "meeting" | "out" | "wfh"
  - source: "agent" | "manual"
  - 응답: { success, timestamp }

GET /api/seats
  - 전체 좌석 현황 조회
  - 응답: [{ seatId, employeeId, name, dept, status, updatedAt }]

GET /api/seats/:seatId
  - 특정 좌석 상세 조회

GET /api/activity?limit=50
  - 최근 활동 로그 조회
```

**WebSocket 이벤트**

```
서버 → 클라이언트:
  "status_changed": { seatId, employeeId, status, timestamp }
  "seat_list": [전체 좌석 현황]  // 클라이언트 최초 연결 시

클라이언트 → 서버:
  "subscribe": {}  // 연결 시 전송
```

**DB 스키마**

```sql
-- 직원 테이블
CREATE TABLE employees (
  id TEXT PRIMARY KEY,        -- 사번 or 이메일
  name TEXT NOT NULL,
  dept TEXT,
  seat_id TEXT
);

-- 좌석 테이블
CREATE TABLE seats (
  id TEXT PRIMARY KEY,        -- ex) "A-01"
  zone TEXT,                  -- ex) "A"
  floor INTEGER,              -- 1, 2
  employee_id TEXT REFERENCES employees(id)
);

-- 현재 상태 테이블
CREATE TABLE seat_status (
  seat_id TEXT PRIMARY KEY REFERENCES seats(id),
  status TEXT DEFAULT 'empty', -- occupied | away | meeting | out | wfh | empty
  source TEXT,                 -- agent | manual
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 활동 로그 테이블
CREATE TABLE activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seat_id TEXT,
  employee_id TEXT,
  status TEXT,
  source TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### Step 2: 웹 대시보드

기존 프로토타입(단일 HTML)을 React + TypeScript + Vite로 변환.

**주요 구현 사항**
- `useWebSocket` 훅으로 서버와 실시간 연결
- 연결 끊겼을 때 자동 재연결 로직
- 좌석 상태 변경 시 애니메이션으로 표시
- 관리자가 수동으로 상태 변경 가능

**스타일링**
- Tailwind CSS 사용
- 기존 프로토타입의 색상 시스템 유지
  - 착석: `#2ecc71` (green)
  - 자리비움: `#f39c12` (amber)  
  - 회의중: `#2196f3` (blue)
  - 공석: `#e0e0e0` (gray)

---

### Step 3: PC 에이전트 (Python)

**idle 감지 로직**

```python
# Windows: ctypes로 GetLastInputInfo 호출
# Mac: Quartz 라이브러리의 CGEventSourceSecondsSinceLastEventType 사용

IDLE_THRESHOLD = 15 * 60  # 15분 (초 단위, 설정 가능)
CHECK_INTERVAL = 30        # 30초마다 체크

def get_idle_seconds():
    if sys.platform == "win32":
        # Windows
        import ctypes
        class LASTINPUTINFO(ctypes.Structure):
            _fields_ = [("cbSize", ctypes.c_uint), ("dwTime", ctypes.c_uint)]
        lii = LASTINPUTINFO()
        lii.cbSize = ctypes.sizeof(lii)
        ctypes.windll.user32.GetLastInputInfo(ctypes.byref(lii))
        millis = ctypes.windll.kernel32.GetTickCount() - lii.dwTime
        return millis / 1000.0
    elif sys.platform == "darwin":
        # Mac
        import Quartz
        return Quartz.CGEventSourceSecondsSinceLastEventType(
            Quartz.kCGEventSourceStateHIDSystemState,
            Quartz.kCGAnyInputEventType
        )
```

**상태 전환 규칙**

```
현재 상태: occupied
  → idle >= IDLE_THRESHOLD: "away" 로 자동 변경 (source: "agent")

현재 상태: away
  → 입력 감지됨: "occupied" 로 자동 변경 (source: "agent")

현재 상태: meeting | out | wfh (수동 설정)
  → 에이전트가 자동 변경하지 않음 (수동 해제 필요)
```

**트레이 아이콘 메뉴**

```
[SeatFlow]
──────────
● 착석 중
○ 자리비움
○ 회의 중
○ 외출
○ 재택근무
──────────
설정...
종료
```

**서버 통신**
- 상태 변경 시 즉시 POST /api/status 호출
- 서버 연결 실패 시 로컬에 큐잉 후 재시도 (최대 5회)
- 30초마다 heartbeat 전송 (서버에서 에이전트 생사 확인용)

**패키징**

```bash
# Windows: .exe 생성
pyinstaller --onefile --windowed --icon=icon.ico main.py

# Mac: .app 생성
pyinstaller --onefile --windowed --icon=icon.icns main.py
```

---

## 필요 라이브러리

**에이전트 (Python)**

```
# requirements.txt
pystray==0.19.5        # 트레이 아이콘 (Windows/Mac 공통)
Pillow==10.0.0         # 트레이 아이콘 이미지 처리
requests==2.31.0       # HTTP 통신
pyinstaller==6.0.0     # 실행파일 패키징

# Mac 전용
pyobjc-framework-Quartz  # idle 감지
```

**서버 (Node.js)**

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "ws": "^8.14.0",
    "better-sqlite3": "^9.0.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/express": "^4.17.0",
    "@types/ws": "^8.5.0",
    "tsx": "^4.0.0"
  }
}
```

**대시보드 (React)**

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0"
  }
}
```

---

## 환경 설정

**에이전트 config.py**

```python
SERVER_URL = "http://your-server:3000"  # 서버 주소
EMPLOYEE_ID = ""                         # 실행 시 입력 or 설정 파일에서 읽기
SEAT_ID = ""                             # 실행 시 입력 or 설정 파일에서 읽기
IDLE_THRESHOLD = 15 * 60                 # idle 판단 기준 (초), 기본 15분
CHECK_INTERVAL = 30                      # 상태 체크 주기 (초)
```

**서버 .env**

```
PORT=3000
DB_PATH=./seatflow.db
```

---

## PoC 검증 체크리스트

- [ ] Windows에서 idle 감지 정상 동작
- [ ] Mac에서 idle 감지 정상 동작
- [ ] 네트워크 끊겼다 재연결 시 에이전트 정상 복구
- [ ] 웹 대시보드에서 상태 변경이 실시간으로 반영됨
- [ ] 수동 상태 변경 시 에이전트가 덮어쓰지 않음
- [ ] 10명 동시 접속 시 성능 이상 없음
- [ ] 에이전트 설치/제거가 직원 혼자 가능한 수준인지

---

## 개발 시 주의사항

1. **에이전트는 키 내용을 절대 수집하지 않는다.** idle 시간(마지막 입력으로부터 경과한 초)만 감지.
2. **트레이 아이콘에 현재 상태를 항상 표시**해서 직원이 자신의 상태를 인지할 수 있게 한다.
3. **에이전트 종료 시 서버에 "오프라인" 상태 전송** — 퇴근한 건지 에러인지 구분 가능하게.
4. PoC이므로 인증/보안은 최소화. 추후 JWT or SSO 연동 예정.
5. SQLite는 PoC용. 정식 서비스 시 PostgreSQL로 전환 예정.