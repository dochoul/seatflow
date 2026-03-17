"""PyInstaller 빌드 스크립트"""
import subprocess
import sys

def build():
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--name", "SeatFlow",
        "--windowed",          # GUI 앱 (콘솔 창 없음)
        "--onefile",           # 단일 파일
        "--noconfirm",         # 기존 빌드 덮어쓰기
        "--add-data", "config.py:.",
        "--hidden-import", "setup_dialog",
        "main.py",
    ]
    subprocess.run(cmd, check=True)
    print("\n[빌드 완료] dist/SeatFlow.app")

if __name__ == "__main__":
    build()
