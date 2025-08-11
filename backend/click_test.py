import pyautogui
import time

# 매수 버튼 좌표 (직접 찍은 좌표로 바꿔줘)
buy_x, buy_y = 1081, 861

# 전송 버튼 좌표 (직접 찍은 좌표로 바꿔줘)
send_x, send_y = 933, 602

def click_at_position(x, y):
    pyautogui.moveTo(x, y, duration=0.5)
    pyautogui.click()
    print(f"클릭 완료: ({x}, {y})")

def auto_buy_order():
    print("매수 버튼 클릭 중...")
    click_at_position(buy_x, buy_y)
    time.sleep(1.5)  # 확인 창 뜰 시간 기다리기
    print("전송 버튼 클릭 중...")
    click_at_position(send_x, send_y)

if __name__ == "__main__":
    auto_buy_order()