"""
SeatFlow PC 에이전트
- idle 감지 → 자동 착석/자리비움
- 시스템 트레이 아이콘 → 수동 상태 변경
"""
import sys
import time
import threading

import config
import idle_detector
import api_client
import tray_icon
import setup_dialog


def setup():
    """초기 설정 로드 또는 GUI 입력"""
    if config.load() and config.EMPLOYEE_ID and config.SEAT_ID:
        print(f"[SeatFlow] 설정 로드: {config.EMPLOYEE_ID} / {config.SEAT_ID}")
        return

    result = setup_dialog.show(config.SERVER_URL)
    if result is None:
        sys.exit(0)

    server_url, employee_id, seat_id = result
    config.save(server_url, employee_id, seat_id)
    print(f"[SeatFlow] 설정 저장 완료: {employee_id} / {seat_id}")


def idle_check_loop(stop_event: threading.Event):
    """idle 감지 루프 (백그라운드 스레드)"""
    was_idle = False

    while not stop_event.is_set():
        try:
            idle_sec = idle_detector.get_idle_seconds()
            current = tray_icon.get_current_status()

            if idle_sec >= config.IDLE_THRESHOLD and not was_idle:
                # idle 전환
                tray_icon.set_status_from_agent("away")
                was_idle = True
            elif idle_sec < 5 and was_idle:
                # 활동 복귀
                tray_icon.set_status_from_agent("occupied")
                was_idle = False

        except Exception as e:
            print(f"[SeatFlow] idle 감지 오류: {e}")

        stop_event.wait(config.CHECK_INTERVAL)


def heartbeat_loop(stop_event: threading.Event):
    """30초마다 heartbeat 전송"""
    while not stop_event.is_set():
        current = tray_icon.get_current_status()
        api_client.send_status(current, "agent")
        stop_event.wait(30)


def main():
    setup()

    # 서버에 초기 착석 상태 전송
    api_client.send_status("occupied", "agent")

    stop_event = threading.Event()

    def on_quit():
        stop_event.set()

    # idle 감지 스레드
    idle_thread = threading.Thread(target=idle_check_loop, args=(stop_event,), daemon=True)
    idle_thread.start()

    # heartbeat 스레드
    hb_thread = threading.Thread(target=heartbeat_loop, args=(stop_event,), daemon=True)
    hb_thread.start()

    print(f"[SeatFlow] 에이전트 시작 ({config.EMPLOYEE_ID} / {config.SEAT_ID})")
    print(f"[SeatFlow] idle 임계값: {config.IDLE_THRESHOLD}초, 체크 주기: {config.CHECK_INTERVAL}초")

    # 트레이 아이콘 실행 (메인 스레드, 블로킹)
    tray_icon.run(on_quit=on_quit)

    print("[SeatFlow] 에이전트 종료")


if __name__ == "__main__":
    main()
