# SeatFlow - 이석관리 시스템

사무실 직원의 착석 현황을 실시간으로 파악하기 위한 이석관리 시스템 PoC.
400명 규모 회사를 대상으로, 우선 10~20명 파일럿 그룹으로 운영 중.

## 핵심 기능

- **자동 상태 감지**: 마우스/키보드 idle 15분 이상 → 자동 "자리비움" 처리
- **활동 복귀 감지**: 자리비움 상태에서 입력 감지 시 자동 "착석" 전환
- **수동 상태 변경**: 메뉴바에서 "회의중", "외출", "재택" 등 직접 설정
- **수동 상태 보호**: 수동 설정된 상태는 에이전트가 자동 변경하지 않음
- **실시간 대시보드**: WebSocket으로 상태 변경 즉시 반영
- **활동 로그**: 모든 상태 변경 이력 기록

## 시스템 아키텍처

```
[PC 에이전트] → HTTP POST → [백엔드 서버] → WebSocket → [웹 대시보드]
  (Python/rumps)              (Node.js/Express)           (React/Vite)
                                    ↕
                                 (SQLite)
```

| 컴포넌트 | 역할 | 기술 |
|---|---|---|
| PC 에이전트 | idle 감지, 상태 전송, 메뉴바 아이콘 | Python + rumps |
| 백엔드 서버 | REST API, WebSocket 브로드캐스트, DB | Node.js + Express + ws |
| 웹 대시보드 | 실시간 좌석 배치도, 활동 로그 | React + TypeScript + Tailwind CSS |
| DB | 직원/좌석/상태/로그 저장 | SQLite (PoC용) |

## 프로젝트 구조

```
seatflow/
├── agent/                  # PC 에이전트 (Python)
│   ├── main.py             # 메인 진입점 (idle 감지 루프 + heartbeat)
│   ├── idle_detector.py    # idle 감지 (Mac: Quartz, Windows: ctypes)
│   ├── tray_icon.py        # macOS 메뉴바 아이콘 (rumps)
│   ├── api_client.py       # 서버 HTTP 통신 (실패 시 큐잉 + 재시도)
│   ├── config.py           # 설정 로드 (.env → 환경변수 → config.json)
│   ├── setup_dialog.py     # 첫 실행 시 AppleScript 설정 다이얼로그
│   ├── build.py            # PyInstaller 빌드 (ad-hoc 서명 포함)
│   ├── requirements.txt
│   └── .env                # 로컬 환경변수 (git 제외)
│
├── server/                 # 백엔드 서버 (Node.js)
│   ├── src/
│   │   ├── index.ts        # Express + WebSocket 서버
│   │   ├── db.ts           # SQLite 연결 및 스키마 초기화
│   │   ├── websocket.ts    # WebSocket 관리 및 브로드캐스트
│   │   ├── seed.ts         # 파일럿 그룹 초기 데이터
│   │   └── routes/
│   │       ├── status.ts   # POST /api/status (상태 업데이트)
│   │       ├── seats.ts    # GET /api/seats (좌석 조회)
│   │       └── work-hours.ts # 근무시간 API
│   └── package.json
│
├── dashboard/              # 웹 대시보드 (React)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Dashboard.tsx       # 상태별 통계
│   │   │   ├── SeatMap.tsx         # 좌석 배치도
│   │   │   ├── PeopleList.tsx      # 직원 현황 목록
│   │   │   └── ActivityLog.tsx     # 실시간 활동 로그
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts     # WebSocket 연결 + 자동 재연결
│   │   └── types/
│   │       └── index.ts
│   └── package.json
│
└── CLAUDE.md               # AI 개발 컨텍스트 문서
```

## 실행 방법

### 1. 백엔드 서버

```bash
cd server
npm install
npm run seed    # 초기 데이터 입력 (최초 1회)
npm run dev     # 개발 서버 시작 (http://localhost:3000)
```

### 2. 웹 대시보드

```bash
cd dashboard
npm install
npm run dev     # 개발 서버 시작 (http://localhost:5173)
```

### 3. PC 에이전트 (macOS)

```bash
cd agent
pip3 install rumps requests pyobjc-framework-Quartz
python3 main.py
```

첫 실행 시 설정 다이얼로그가 나타납니다:
1. **서버 URL** - 로컬: `http://localhost:3000` / 프로덕션: `https://seatflow-production-5a2d.up.railway.app`
2. **사번** - 예: `emp-001`
3. **좌석 번호** - 예: `A-01`

설정은 `~/Library/Application Support/SeatFlow/config.json`에 저장됩니다.

## 환경변수 설정

에이전트는 `.env` 파일 또는 환경변수로 설정을 오버라이드할 수 있습니다.
환경변수 > config.json 순으로 우선 적용됩니다.

```bash
# agent/.env
SEATFLOW_SERVER_URL=http://localhost:3000
SEATFLOW_EMPLOYEE_ID=emp-001
SEATFLOW_SEAT_ID=A-01
```

## API 명세

### REST API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/status` | 상태 업데이트 |
| `GET` | `/api/seats` | 전체 좌석 현황 |
| `GET` | `/api/seats/:seatId` | 특정 좌석 조회 |
| `GET` | `/api/activity?limit=50` | 활동 로그 조회 |

**POST /api/status 요청 예시**

```bash
curl -s -X POST http://localhost:3000/api/status \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"emp-001","seatId":"A-01","status":"meeting","source":"manual"}'
```

상태값: `occupied` | `away` | `meeting` | `out` | `wfh` | `empty`

### WebSocket

서버 주소로 WebSocket 연결 시:
- **연결 즉시**: `seat_list` 이벤트로 전체 좌석 현황 수신
- **상태 변경 시**: `status_changed` 이벤트로 실시간 업데이트 수신

## 에이전트 동작 방식

### 상태 전환 규칙

```
착석(occupied) → 15분 idle → 자리비움(away)    [자동, source: agent]
자리비움(away) → 입력 감지 → 착석(occupied)     [자동, source: agent]
회의중/외출/재택 → 에이전트가 자동 변경하지 않음  [수동 해제 필요]
```

### 메뉴바 아이콘

macOS 메뉴바에 상태별 이모지로 표시:

| 상태 | 아이콘 |
|------|--------|
| 착석 | 🟢 |
| 자리비움 | 🟡 |
| 회의중 | 🔵 |
| 외출 | 🔴 |
| 재택 | 🟣 |

### 기타 동작
- **Heartbeat**: 30초마다 현재 상태를 서버에 전송
- **오프라인 큐**: 서버 연결 실패 시 로컬 큐에 저장 후 재시도 (최대 5회)
- **종료 시**: 서버에 `empty` 상태 전송

## macOS .app 빌드 (배포용)

```bash
cd agent
pip3 install pyinstaller
python3 build.py
```

빌드 결과: `dist/SeatFlow.app`
- PyInstaller로 패키징
- LSUIElement 설정 (Dock 아이콘 숨김, 메뉴바 전용)
- ad-hoc 코드 서명 자동 적용
- 빌드 시 SERVER_URL을 프로덕션 URL로 자동 패치

> **참고**: PyInstaller 빌드는 빌드한 macOS 버전에서만 안정적으로 동작합니다.
> 다른 macOS 버전의 사용자는 소스 실행(`python3 main.py`)을 권장합니다.

## 배포 현황

| 컴포넌트 | 환경 | URL |
|----------|------|-----|
| 백엔드 서버 | Railway | https://seatflow-production-5a2d.up.railway.app |
| 웹 대시보드 | Railway (서버에서 정적 파일 서빙) | 위와 동일 |
| PC 에이전트 | 각 직원 PC에 설치 | - |

## 파일럿 그룹 (15명)

| 사번 | 이름 | 부서 | 좌석 |
|------|------|------|------|
| emp-001 | David | 개발팀 | A-01 |
| emp-002 | Gilbert | 개발팀 | A-02 |
| emp-003 | Chang | 개발팀 | A-03 |
| emp-004 | Victoria | 개발팀 | A-04 |
| emp-005 | Mory | 개발팀 | A-05 |
| emp-006 | Terry | 백엔드개발팀 | B-01 |
| emp-007 | Henson | 디자인팀 | B-02 |
| emp-008 | 임수빈 | 기획팀 | B-03 |
| emp-009 | 한지민 | 디자인팀 | C-01 |
| emp-010 | 오현우 | 디자인팀 | C-02 |
| emp-011 | 송예린 | 디자인팀 | C-03 |
| emp-012 | 조성민 | 인프라팀 | D-01 |
| emp-013 | 류하영 | 인프라팀 | D-02 |
| emp-014 | 배준혁 | 경영지원팀 | E-01 |
| emp-015 | 신나연 | 경영지원팀 | E-02 |

## 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| 에이전트 | Python | 3.9+ |
| 에이전트 메뉴바 | rumps | 0.4.0 |
| 에이전트 idle 감지 | pyobjc-framework-Quartz | - |
| 서버 | Node.js + Express | - |
| 서버 WebSocket | ws | 8.x |
| DB | better-sqlite3 | 9.x |
| 대시보드 | React + TypeScript | 19.x |
| 대시보드 빌드 | Vite | 7.x |
| 대시보드 스타일 | Tailwind CSS | 4.x |

## 개발 시 주의사항

1. **에이전트는 키 내용을 절대 수집하지 않는다.** idle 시간(마지막 입력으로부터 경과한 초)만 감지.
2. **트레이 아이콘에 현재 상태를 항상 표시**해서 직원이 자신의 상태를 인지할 수 있게 한다.
3. **에이전트 종료 시 서버에 "오프라인" 상태 전송** — 퇴근한 건지 에러인지 구분 가능.
4. PoC이므로 인증/보안은 최소화. 추후 JWT or SSO 연동 예정.
5. SQLite는 PoC용. 정식 서비스 시 PostgreSQL로 전환 예정.
