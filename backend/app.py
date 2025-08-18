import pyautogui
import time

# 좌표 설정 (포지션 전환 버튼 위치)
switch_x, switch_y = 1343, 861  # 포지션 전환 버튼 위치

# 엔터키를 눌러 팝업 확인하기
def press_enter_key():
    print("엔터키를 눌러 팝업 확인 중...")
    pyautogui.press('enter')  # 엔터키를 누르기
    time.sleep(0.5)  # 엔터 후 잠시 대기 (시간을 좀 더 줄임)
    print("엔터키 눌림 완료")

# 포지션 전환 버튼 클릭 (좌표로 클릭)
def switch_position():
    print("포지션 전환 버튼 클릭 중...")
    pyautogui.moveTo(switch_x, switch_y, duration=0.3)  # 좌표로 포지션 전환 버튼 클릭
    pyautogui.click()
    time.sleep(1.5)  # 전환 후 잠시 대기 (팝업이 뜰 시간을 고려)
    print("포지션 전환 완료")

# 포지션 전환 후 팝업 처리
def switch_position_and_clear():
    print("포지션 전환을 위한 F8 버튼 클릭 중...")
    switch_position()  # 좌표로 포지션 전환
    time.sleep(1.5)  # 팝업이 뜨는 시간을 기다림 (시간을 줄였음)
    press_enter_key()  # 팝업 처리

def process_signal():
    """신호 처리 (매수/매도)"""
    print("신호 처리 시작")
    switch_position_and_clear()  # F8을 눌러 포지션 전환

if __name__ == "__main__":
    while True:  # 무한 루프를 만들어서 계속해서 신호 대기
        signal = input("신호를 입력하세요 (buy/sell): ")
        if signal in ['buy', 'sell']:
            process_signal()  # 신호에 맞춰 처리
        else:
            print("잘못된 신호입니다. 다시 입력해주세요.")