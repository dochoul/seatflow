import json
import os

# .env 파일 로드 (있으면)
def _load_dotenv():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ.setdefault(key.strip(), value.strip())

_load_dotenv()

def _get_config_path():
    """PyInstaller 번들 여부와 무관하게 앱 지원 디렉토리에 저장"""
    support_dir = os.path.join(
        os.path.expanduser("~"), "Library", "Application Support", "SeatFlow"
    )
    os.makedirs(support_dir, exist_ok=True)
    return os.path.join(support_dir, "config.json")

CONFIG_PATH = _get_config_path()

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

    # 환경변수가 있으면 config.json보다 우선
    SERVER_URL = os.environ.get("SEATFLOW_SERVER_URL", SERVER_URL)
    EMPLOYEE_ID = os.environ.get("SEATFLOW_EMPLOYEE_ID", EMPLOYEE_ID)
    SEAT_ID = os.environ.get("SEATFLOW_SEAT_ID", SEAT_ID)
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
