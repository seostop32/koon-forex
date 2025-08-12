import pyautogui
import time

# 좌표 설정 (본인 화면에 맞게 수정)
buy_x, buy_y = 1081, 861
sell_x, sell_y = 1100, 860
send_x, send_y = 933, 602

position_open = False  # 현재 포지션 상태

def click_at_position(x, y):
    pyautogui.moveTo(x, y, duration=0.5)
    pyautogui.click()
    print(f"클릭 완료: ({x}, {y})")

def auto_buy_order():
    global position_open
    if not position_open:
        print("매수 버튼 클릭 중...")
        click_at_position(buy_x, buy_y)
        time.sleep(1.5)
        print("전송 버튼 클릭 중...")
        click_at_position(send_x, send_y)
        position_open = True
        print("포지션 열림 (매수 완료)")
    else:
        print("이미 포지션 열려있음. 매수 패스.")

def auto_sell_order():
    global position_open
    if position_open:
        print("매도 버튼 클릭 중...")
        click_at_position(sell_x, sell_y)
        time.sleep(1.5)
        print("전송 버튼 클릭 중...")
        click_at_position(send_x, send_y)
        position_open = False
        print("포지션 닫힘 (매도 완료)")
    else:
        print("포지션 없음. 매도 패스.")

if __name__ == "__main__":
    auto_buy_order()   # 매수 시도
    time.sleep(5)
    auto_buy_order()   # 두 번째 매수 시도 (실패해야 정상)
    time.sleep(5)
    auto_sell_order()  # 매도 시도
    time.sleep(5)
    auto_sell_order()  # 두 번째 매도 시도 (실패해야 정상)