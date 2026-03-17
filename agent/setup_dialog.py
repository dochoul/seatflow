"""첫 실행 시 GUI 설정 다이얼로그"""
import tkinter as tk
from tkinter import messagebox


def show(default_server_url: str):
    """설정 다이얼로그를 표시하고 (server_url, employee_id, seat_id)를 반환.
    취소 시 None을 반환."""

    result = {}

    root = tk.Tk()
    root.title("SeatFlow 초기 설정")
    root.resizable(False, False)

    # 창 크기 및 중앙 배치
    w, h = 380, 250
    x = (root.winfo_screenwidth() - w) // 2
    y = (root.winfo_screenheight() - h) // 2
    root.geometry(f"{w}x{h}+{x}+{y}")

    frame = tk.Frame(root, padx=20, pady=15)
    frame.pack(fill="both", expand=True)

    tk.Label(frame, text="SeatFlow 초기 설정", font=("system", 16, "bold")).pack(pady=(0, 15))

    # 서버 URL
    row1 = tk.Frame(frame)
    row1.pack(fill="x", pady=3)
    tk.Label(row1, text="서버 URL", width=10, anchor="w").pack(side="left")
    server_entry = tk.Entry(row1)
    server_entry.insert(0, default_server_url)
    server_entry.pack(side="left", fill="x", expand=True)

    # 사번
    row2 = tk.Frame(frame)
    row2.pack(fill="x", pady=3)
    tk.Label(row2, text="사번", width=10, anchor="w").pack(side="left")
    emp_entry = tk.Entry(row2)
    emp_entry.insert(0, "emp-")
    emp_entry.pack(side="left", fill="x", expand=True)

    # 좌석 번호
    row3 = tk.Frame(frame)
    row3.pack(fill="x", pady=3)
    tk.Label(row3, text="좌석 번호", width=10, anchor="w").pack(side="left")
    seat_entry = tk.Entry(row3)
    seat_entry.insert(0, "A-")
    seat_entry.pack(side="left", fill="x", expand=True)

    def on_ok():
        emp = emp_entry.get().strip()
        seat = seat_entry.get().strip()
        if not emp or not seat:
            messagebox.showwarning("입력 오류", "사번과 좌석 번호를 입력해주세요.")
            return
        result["server_url"] = server_entry.get().strip()
        result["employee_id"] = emp
        result["seat_id"] = seat
        root.destroy()

    def on_cancel():
        root.destroy()

    # 버튼
    btn_frame = tk.Frame(frame)
    btn_frame.pack(pady=(15, 0))
    tk.Button(btn_frame, text="확인", width=10, command=on_ok).pack(side="left", padx=5)
    tk.Button(btn_frame, text="취소", width=10, command=on_cancel).pack(side="left", padx=5)

    # Enter키로 확인
    root.bind("<Return>", lambda e: on_ok())
    emp_entry.focus_set()

    root.mainloop()

    if result:
        return result["server_url"], result["employee_id"], result["seat_id"]
    return None
