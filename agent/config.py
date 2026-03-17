import json
import os

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.json")

# 기본값
SERVER_URL = "http://localhost:3000"
EMPLOYEE_ID = ""
SEAT_ID = ""
IDLE_THRESHOLD = 15 * 60  # 15분 (초)
CHECK_INTERVAL = 10       # 10초마다 체크 (최대 10초 오차)


def load():
    """config.json에서 설정 로드"""
    global SERVER_URL, EMPLOYEE_ID, SEAT_ID, IDLE_THRESHOLD, CHECK_INTERVAL

    if not os.path.exists(CONFIG_PATH):
        return False

    with open(CONFIG_PATH, "r") as f:
        cfg = json.load(f)

    SERVER_URL = cfg.get("server_url", SERVER_URL)
    EMPLOYEE_ID = cfg.get("employee_id", EMPLOYEE_ID)
    SEAT_ID = cfg.get("seat_id", SEAT_ID)
    IDLE_THRESHOLD = cfg.get("idle_threshold", IDLE_THRESHOLD)
    CHECK_INTERVAL = cfg.get("check_interval", CHECK_INTERVAL)
    return True


def save(server_url, employee_id, seat_id):
    """설정 저장"""
    global SERVER_URL, EMPLOYEE_ID, SEAT_ID

    SERVER_URL = server_url
    EMPLOYEE_ID = employee_id
    SEAT_ID = seat_id

    cfg = {
        "server_url": SERVER_URL,
        "employee_id": EMPLOYEE_ID,
        "seat_id": SEAT_ID,
        "idle_threshold": IDLE_THRESHOLD,
        "check_interval": CHECK_INTERVAL,
    }
    with open(CONFIG_PATH, "w") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)
