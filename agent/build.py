"""PyInstaller 빌드 스크립트 (Apple Silicon 호환)"""
import subprocess
import sys
import re

PRODUCTION_SERVER_URL = "https://seatflow-production-5a2d.up.railway.app"
CONFIG_FILE = "config.py"


def _patch_server_url():
    """빌드 시 config.py의 SERVER_URL을 프로덕션 URL로 임시 교체"""
    with open(CONFIG_FILE, "r") as f:
        original = f.read()
    patched = re.sub(
        r'SERVER_URL = ".*?"',
        f'SERVER_URL = "{PRODUCTION_SERVER_URL}"',
        original,
    )
    with open(CONFIG_FILE, "w") as f:
        f.write(patched)
    return original


def _restore_config(original):
    """빌드 후 config.py를 원래 내용으로 복원"""
    with open(CONFIG_FILE, "w") as f:
        f.write(original)


def build():
    original = _patch_server_url()
    print(f"[빌드] SERVER_URL → {PRODUCTION_SERVER_URL}")

    try:
        cmd = [
            sys.executable, "-m", "PyInstaller",
            "--name", "SeatFlow",
            "--windowed",           # GUI 앱 (콘솔 창 없음)
            "--noconfirm",          # 기존 빌드 덮어쓰기
            # Apple Silicon 전용 (arm64)
            "--hidden-import", "rumps",
            "--hidden-import", "pkg_resources.py2_warn",
            "--hidden-import", "setup_dialog",
            "--hidden-import", "idle_detector",
            "--hidden-import", "api_client",
            "--hidden-import", "tray_icon",
            "--hidden-import", "config",
            "--collect-all", "rumps",
            "main.py",
        ]
        subprocess.run(cmd, check=True)

        # 메뉴바 전용 앱 설정 (Dock 아이콘 숨김)
        import plistlib
        plist_path = "dist/SeatFlow.app/Contents/Info.plist"
        with open(plist_path, "rb") as f:
            plist = plistlib.load(f)
        plist["LSUIElement"] = True
        with open(plist_path, "wb") as f:
            plistlib.dump(plist, f)
        print("[빌드] LSUIElement 설정 완료 (Dock 아이콘 숨김)")

        # ad-hoc 코드 서명 (사내 배포용)
        subprocess.run(
            ["codesign", "--force", "--deep", "--sign", "-", "dist/SeatFlow.app"],
            check=True,
        )
        print("[빌드] ad-hoc 코드 서명 완료")

        print("\n[빌드 완료] dist/SeatFlow.app")
        print("[안내] dist/SeatFlow.app 을 /Applications 폴더로 복사하세요.")
    finally:
        _restore_config(original)
        print("[빌드] config.py 원래 값으로 복원 완료")


if __name__ == "__main__":
    build()
