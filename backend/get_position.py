# get_position.py
import pyautogui
import time

print("🕐 5초 안에 매수 버튼 위에 마우스 올려줘!")
time.sleep(5)  # 5초 대기

x, y = pyautogui.position()
print(f"📍 매수 버튼 좌표는: ({x}, {y})")