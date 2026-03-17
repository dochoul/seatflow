import sys


def get_idle_seconds() -> float:
    """마지막 입력(마우스/키보드)으로부터 경과한 초를 반환"""
    if sys.platform == "win32":
        import ctypes

        class LASTINPUTINFO(ctypes.Structure):
            _fields_ = [("cbSize", ctypes.c_uint), ("dwTime", ctypes.c_uint)]

        lii = LASTINPUTINFO()
        lii.cbSize = ctypes.sizeof(lii)
        ctypes.windll.user32.GetLastInputInfo(ctypes.byref(lii))
        millis = ctypes.windll.kernel32.GetTickCount() - lii.dwTime
        return millis / 1000.0

    elif sys.platform == "darwin":
        import Quartz

        return Quartz.CGEventSourceSecondsSinceLastEventType(
            Quartz.kCGEventSourceStateHIDSystemState,
            Quartz.kCGAnyInputEventType,
        )

    else:
        # Linux fallback: xprintidle
        import subprocess

        result = subprocess.run(["xprintidle"], capture_output=True, text=True)
        return int(result.stdout.strip()) / 1000.0
