# backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import pyautogui
import time

app = Flask(__name__)
CORS(app)

buy_x, buy_y = 1081, 861
send_x, send_y = 933, 602

def click_at_position(x, y):
    pyautogui.moveTo(x, y, duration=0.5)
    pyautogui.click()
    print(f"클릭 완료: ({x}, {y})")

def auto_buy_order():
    print("매수 버튼 클릭 중...")
    click_at_position(buy_x, buy_y)
    time.sleep(1.5)
    print("전송 버튼 클릭 중...")
    click_at_position(send_x, send_y)

@app.route('/api/signal', methods=['POST'])
def receive_signal():
    data = request.get_json()
    signal_type = data.get('signalType')

    if signal_type == 'buy':
        auto_buy_order()
    elif signal_type == 'sell':
        # 매도도 필요하면 비슷하게 구현
        pass

    return jsonify({"status": "clicked", "signal": signal_type})

if __name__ == '__main__':
    app.run(port=5000)