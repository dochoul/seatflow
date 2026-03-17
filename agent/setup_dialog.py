"""첫 실행 시 GUI 설정 다이얼로그 (Mac 네이티브 AppleScript 사용)"""
import subprocess
import sys


def _ask(title: str, message: str, default: str = "") -> str:
    """macOS AppleScript 입력 다이얼로그"""
    script = f'''
    set result to display dialog "{message}" default answer "{default}" with title "{title}" buttons {{"취소", "확인"}} default button "확인"
    return text returned of result
    '''
    try:
        result = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            return ""
        return result.stdout.strip()
    except Exception:
        return ""


def show(default_server_url: str):
    """설정 다이얼로그를 표시하고 (server_url, employee_id, seat_id)를 반환.
    취소 시 None을 반환."""

    server_url = _ask("SeatFlow 설정", "서버 URL을 입력하세요:", default_server_url)
    if not server_url:
        return None

    employee_id = _ask("SeatFlow 설정", "사번을 입력하세요 (예: emp-001):", "emp-")
    if not employee_id:
        return None

    seat_id = _ask("SeatFlow 설정", "좌석 번호를 입력하세요 (예: A-01):", "A-")
    if not seat_id:
        return None

    return server_url, employee_id, seat_id
