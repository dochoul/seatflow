import requests
import threading
import time
from collections import deque

import config

# 오프라인 큐 (서버 연결 실패 시 저장)
_queue: deque = deque(maxlen=50)
_retry_thread = None
_running = False


def send_status(status: str, source: str = "agent") -> bool:
    """서버에 상태 전송. 실패 시 큐에 저장."""
    payload = {
        "employeeId": config.EMPLOYEE_ID,
        "seatId": config.SEAT_ID,
        "status": status,
        "source": source,
    }
    try:
        r = requests.post(
            f"{config.SERVER_URL}/api/status",
            json=payload,
            timeout=5,
        )
        return r.status_code == 200
    except requests.RequestException:
        _queue.append(payload)
        _ensure_retry_thread()
        return False


def _ensure_retry_thread():
    global _retry_thread, _running
    if _retry_thread and _retry_thread.is_alive():
        return
    _running = True
    _retry_thread = threading.Thread(target=_retry_loop, daemon=True)
    _retry_thread.start()


def _retry_loop():
    """큐에 쌓인 상태를 재전송 (최대 5회 시도)"""
    global _running
    retries = 0
    while _running and _queue and retries < 5:
        time.sleep(10)
        payload = _queue[0]
        try:
            r = requests.post(
                f"{config.SERVER_URL}/api/status",
                json=payload,
                timeout=5,
            )
            if r.status_code == 200:
                _queue.popleft()
                retries = 0
            else:
                retries += 1
        except requests.RequestException:
            retries += 1
    _running = False
