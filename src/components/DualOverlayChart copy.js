import React, { useState, useEffect, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { sendSignal } from './SignalSender'; // Webhook 신호를 전송하는 함수

// 신호 기록을 위한 객체
const alertedSignals = useRef(new Set());  // 알림을 보낸 신호 기록
const currentState = useRef('flat'); // 신호 상태 추적 ('flat', 'buy', 'sell')

const DualOverlayChart = () => {
  const [signals, setSignals] = useState([]);

  const playSound = () => {
    const audio = new Audio('/notify.mp3');
    audio.play();
  };

  // 신호를 처리하는 함수
  const processUTBotSignals = (newSignals) => {
    newSignals.forEach((signal) => {
      const key = `${signal.type}-${signal.entry}-${signal.time}`;
      
      // 신호 상태가 'flat'일 때만 알림을 보내는 조건
      if (!alertedSignals.current.has(key) && currentState.current === 'flat') {
        // 신호 처리
        alertedSignals.current.add(key);

        // 상태 변경: 매수 신호 발생 시 상태를 'buy', 매도 신호 발생 시 상태를 'sell'
        if (signal.type === 'buy') {
          currentState.current = 'buy';
        } else if (signal.type === 'sell') {
          currentState.current = 'sell';
        }

        // 알림 표시
        toast.info(
          `${signal.type === 'buy' ? '📈 매수' : 
            signal.type === 'sell' ? '📉 매도' :
            signal.type === 'stoploss_long' ? '🚫 롱 손절' :
            signal.type === 'stoploss_short' ? '🚫 숏 손절' : '신호'} 발생!`,
          {
            position: 'bottom-center',
            autoClose: 4000,
            pauseOnFocusLoss: false,
            pauseOnHover: false,
            closeOnClick: false,
            draggable: false,
            theme: 'colored',
          }
        );

        // 사운드 재생
        playSound();

        // 신호 전송 (웹훅)
        sendSignal(signal.type, signal.entry);
      }

      // 상태가 'buy'인 경우에는 매도 신호가 들어올 때만 상태 변경
      if (currentState.current === 'buy' && signal.type === 'sell') {
        currentState.current = 'flat'; // 매도 후 상태 초기화
      }

      // 상태가 'sell'인 경우에는 매수 신호가 들어올 때만 상태 변경
      if (currentState.current === 'sell' && signal.type === 'buy') {
        currentState.current = 'flat'; // 매수 후 상태 초기화
      }
    });
  };

  useEffect(() => {
    // 예시: 6초마다 새로운 신호가 들어온다고 가정
    const interval = setInterval(() => {
      const newSignals = [
        { type: 'buy', entry: true, time: Date.now() }, // 임의의 신호 데이터
        { type: 'sell', entry: true, time: Date.now() + 1000 },
      ];

      processUTBotSignals(newSignals); // 새로운 신호 처리

    }, 6000);

    return () => clearInterval(interval); // 클린업
  }, []);

  return (
    <div>
      <h1>UT Bot Alerts</h1>
      <ToastContainer />
    </div>
  );
};

export default DualOverlayChart;