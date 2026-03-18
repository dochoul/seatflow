import threading

import rumps

import api_client

# 상태 목록
STATUSES = [
    ("occupied", "착석 중"),
    ("away", "자리비움"),
    ("meeting", "회의 중"),
    ("out", "외출"),
    ("wfh", "재택근무"),
]

STATUS_EMOJI = {
    "occupied": "🟢",
    "away": "🟡",
    "meeting": "🔵",
    "out": "🔴",
    "wfh": "🟣",
}

_app = None
_current_status = "occupied"
_on_quit = None
_on_ready = None


class SeatFlowApp(rumps.App):
    def __init__(self):
        super().__init__("SeatFlow", title=STATUS_EMOJI["occupied"], quit_button=None)
        self._build_menu()

    def _build_menu(self):
        self.menu.clear()
        for status_key, label in STATUSES:
            marker = "● " if status_key == _current_status else "○ "
            item = rumps.MenuItem(marker + label, callback=self._make_callback(status_key))
            self.menu.add(item)
        self.menu.add(rumps.separator)
        self.menu.add(rumps.MenuItem("종료", callback=self._quit))

    def _make_callback(self, status_key):
        def callback(_):
            _set_status(status_key)
        return callback

    def _quit(self, _):
        api_client.send_status("empty", "agent")
        if _on_quit:
            _on_quit()
        rumps.quit_application()

    def update_display(self):
        """현재 상태에 맞게 메뉴바 아이콘과 메뉴 갱신"""
        self.title = STATUS_EMOJI.get(_current_status, "⚪")
        self._build_menu()


@rumps.notifications
def _notification_handler(info):
    pass


def _set_status(status):
    """상태 변경 → 아이콘 업데이트 + 서버 전송"""
    global _current_status
    if status == _current_status:
        return
    prev = _current_status
    _current_status = status

    # UI 먼저 즉시 업데이트
    if _app:
        _app.update_display()

    # 서버 전송은 백그라운드에서 (메인 스레드 블로킹 방지)
    source = "agent" if status in ("occupied", "away") else "manual"
    def send():
        ok = api_client.send_status(status, source)
        print(f"[SeatFlow] 상태 변경: {prev} → {status} (전송: {'OK' if ok else 'FAIL'})")
    threading.Thread(target=send, daemon=True).start()


def get_current_status():
    return _current_status


def set_status_from_agent(status):
    """에이전트(idle 감지)에서 호출. 수동 상태는 건드리지 않음."""
    if _current_status in ("meeting", "out", "wfh"):
        return
    _set_status(status)


def run(on_quit=None, on_ready=None):
    """트레이 아이콘 실행 (메인 스레드에서 호출)"""
    global _app, _on_quit, _on_ready
    _on_quit = on_quit
    _on_ready = on_ready
    _app = SeatFlowApp()

    if on_ready:
        import threading
        threading.Timer(0.5, on_ready).start()

    _app.run()
