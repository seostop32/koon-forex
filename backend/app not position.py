import pyautogui
import time

# 좌표 설정 (본인 화면에 맞게 수정)
buy_x, buy_y = 1081, 861
sell_x, sell_y = 1254, 855
send_x, send_y = 933, 602
close_x, close_y = 1168, 859  # 청산 버튼 위치

# 파일 경로
position_file = 'position_state.txt'

def save_position_state(state):
    """포지션 상태를 파일에 저장"""
    with open(position_file, 'w') as f:
        f.write(state)

def load_position_state():
    """파일에서 포지션 상태를 불러오기"""
    try:
        with open(position_file, 'r') as f:
            return f.read().strip()
    except FileNotFoundError:
        return 'none'  # 파일이 없으면 포지션 없음으로 설정

def click_at_position(x, y):
    """지정된 위치로 클릭하기"""
    pyautogui.moveTo(x, y, duration=0.5)
    pyautogui.click()
    print(f"클릭 완료: ({x}, {y})")

def auto_buy_order():
    """매수 주문"""
    position_state = load_position_state()
    if position_state == 'none':
        print("매수 버튼 클릭 중...")
        click_at_position(buy_x, buy_y)
        time.sleep(1.5)
        print("전송 버튼 클릭 중...")
        click_at_position(send_x, send_y)
        save_position_state('buy')  # 포지션 상태를 'buy'로 업데이트
        print("포지션 열림 (매수 완료)")
    elif position_state == 'sell':
        print("매도 포지션 -> 매수로 스위칭")
        click_at_position(close_x, close_y)  # 청산 버튼 클릭
        time.sleep(1.5)
        click_at_position(send_x, send_y)
        time.sleep(2)
        click_at_position(buy_x, buy_y)
        time.sleep(1.5)
        click_at_position(send_x, send_y)
        save_position_state('buy')  # 포지션 상태를 'buy'로 업데이트
        print("포지션 스위칭 완료 (매수)")

def auto_sell_order():
    """매도 주문"""
    position_state = load_position_state()
    if position_state == 'none':
        print("포지션 없음 -> 신규 매도 주문")
        click_at_position(sell_x, sell_y)
        time.sleep(1.5)
        click_at_position(send_x, send_y)
        save_position_state('sell')  # 포지션 상태를 'sell'로 업데이트
        print("포지션 열림 (매도 완료)")
    elif position_state == 'buy':
        print("매수 포지션 -> 매도로 스위칭")
        click_at_position(close_x, close_y)  # 청산 버튼 클릭
        time.sleep(1.5)
        click_at_position(send_x, send_y)
        time.sleep(2)
        click_at_position(sell_x, sell_y)
        time.sleep(1.5)
        click_at_position(send_x, send_y)
        save_position_state('sell')  # 포지션 상태를 'sell'로 업데이트
        print("포지션 스위칭 완료 (매도)")

def auto_clear_position():
    """포지션 청산"""
    position_state = load_position_state()
    if position_state == 'none':
        print("포지션 없음 -> 청산할 포지션 없음")
    else:
        print("청산 버튼 클릭 중...")
        click_at_position(close_x, close_y)  # 청산 버튼 클릭
        time.sleep(1.5)
        click_at_position(send_x, send_y)
        save_position_state('none')  # 포지션 상태를 'none'으로 업데이트
        print("포지션 청산 완료")

# 신호 처리 (외부 신호 받기)
def process_signal(signal):
    position_state = load_position_state()
    if signal == 'buy':
        if position_state == 'sell':  # 매도 포지션이 있을 때
            auto_clear_position()  # 청산 먼저
            time.sleep(1)
        auto_buy_order()  # 매수 주문
    elif signal == 'sell':
        if position_state == 'buy':  # 매수 포지션이 있을 때
            auto_clear_position()  # 청산 먼저
            time.sleep(1)
        auto_sell_order()  # 매도 주문

if __name__ == "__main__":
    while True:
        # 신호 받아서 처리
        # 예시: 신호를 받아서 처리하는 부분. 실제로 신호를 받는 로직이 필요함.
        signal = input("신호를 입력하세요 (buy/sell): ")
        if signal in ['buy', 'sell']:
            process_signal(signal)  # 신호에 맞춰 처리
        else:
            print("잘못된 신호입니다. 다시 입력해주세요.")