import threading
from typing import Optional
from PIL import Image, ImageDraw
import pystray

import api_client

# 상태 목록
STATUSES = [
    ("occupied", "착석 중"),
    ("away", "자리비움"),
    ("meeting", "회의 중"),
    ("out", "외출"),
    ("wfh", "재택근무"),
]

STATUS_COLORS = {
    "occupied": "#2ecc71",
    "away": "#f39c12",
    "meeting": "#2196f3",
    "out": "#e74c3c",
    "wfh": "#9b59b6",
}

_icon: Optional[pystray.Icon] = None
_current_status = "occupied"
_on_quit = None


def _make_icon_image(color: str) -> Image.Image:
    """상태 색상의 원형 아이콘 생성"""
    size = 64
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([4, 4, size - 4, size - 4], fill=color)
    return img


def _set_status(status: str):
    """상태 변경 → 아이콘 업데이트 + 서버 전송"""
    global _current_status
    if status == _current_status:
        return
    prev = _current_status
    _current_status = status
    source = "agent" if status in ("occupied", "away") else "manual"
    ok = api_client.send_status(status, source)
    print(f"[SeatFlow] 상태 변경: {prev} → {status} (전송: {'OK' if ok else 'FAIL'})")
    _update_icon()


def _update_icon():
    """현재 상태에 맞게 아이콘과 메뉴 갱신"""
    if _icon is None:
        return
    color = STATUS_COLORS.get(_current_status, "#808080")
    _icon.icon = _make_icon_image(color)
    _icon.menu = _build_menu()


def _make_callback(status_key: str):
    """클로저로 콜백 생성 (Mac pystray 호환)"""
    def callback(icon, item):
        _set_status(status_key)
    return callback


def _build_menu() -> pystray.Menu:
    items = []
    for status_key, label in STATUSES:
        marker = "● " if status_key == _current_status else "○ "
        items.append(
            pystray.MenuItem(marker + label, _make_callback(status_key))
        )
    items.append(pystray.Menu.SEPARATOR)
    items.append(pystray.MenuItem("종료", _quit))
    return pystray.Menu(*items)


def _quit(icon, _item=None):
    global _icon
    api_client.send_status("empty", "agent")  # 종료 시 오프라인 전송
    icon.stop()
    _icon = None
    if _on_quit:
        _on_quit()


def get_current_status() -> str:
    return _current_status


def set_status_from_agent(status: str):
    """에이전트(idle 감지)에서 호출. 수동 상태는 건드리지 않음."""
    if _current_status in ("meeting", "out", "wfh"):
        return  # 수동 설정된 상태는 자동 변경하지 않음
    _set_status(status)


def run(on_quit=None):
    """트레이 아이콘 실행 (메인 스레드에서 호출)"""
    global _icon, _on_quit
    _on_quit = on_quit
    color = STATUS_COLORS[_current_status]
    _icon = pystray.Icon(
        "SeatFlow",
        _make_icon_image(color),
        "SeatFlow",
        _build_menu(),
    )
    _icon.run()
