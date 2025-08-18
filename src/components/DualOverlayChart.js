import React, { useState, useEffect, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { sendSignal } from './SignalSender'; // 웹훅 전송 함수

const alertedSignals = useRef(new Set());
const currentState = useRef('flat');

const DualOverlayChart = () => {
  const [signals, setSignals] = useState([]);
  const [timeframe, setTimeframe] = useState('1m'); // ✅ 선택 가능한 봉

  const playSound = () => {
    const audio = new Audio('/notify.mp3');
    audio.play();
  };

  const processUTBotSignals = (newSignals) => {
    newSignals.forEach((signal) => {
      const key = `${signal.type}-${signal.entry}-${signal.time}-${signal.timeframe}`;

      if (!alertedSignals.current.has(key) && currentState.current === 'flat') {
        alertedSignals.current.add(key);

        if (signal.type === 'buy') {
          currentState.current = 'buy';
        } else if (signal.type === 'sell') {
          currentState.current = 'sell';
        }

        toast.info(
          `${signal.type === 'buy' ? '📈 매수' :
            signal.type === 'sell' ? '📉 매도' :
            signal.type === 'stoploss_long' ? '🚫 롱 손절' :
            signal.type === 'stoploss_short' ? '🚫 숏 손절' : '신호'} 발생! [${signal.timeframe}]`,
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

        playSound();
        sendSignal(signal.type, signal.entry);
      }

      if (currentState.current === 'buy' && signal.type === 'sell') {
        currentState.current = 'flat';
      }

      if (currentState.current === 'sell' && signal.type === 'buy') {
        currentState.current = 'flat';
      }
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      // ⚠️ 여기를 실제 데이터 로딩 API로 교체하면 됨
      const newSignals = [
        {
          type: Math.random() > 0.5 ? 'buy' : 'sell',
          entry: true,
          time: Date.now(),
          timeframe, // ✅ 현재 선택된 봉 포함
        },
      ];

      processUTBotSignals(newSignals);
    }, 6000);

    return () => clearInterval(interval);
  }, [timeframe]);

  return (
    <div>
      <h1>UT Bot Alerts</h1>

      {/* ✅ 봉 선택 UI */}
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="timeframe">봉 선택: </label>
        <select
          id="timeframe"
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
        >
          <option value="1m">1분봉</option>
          <option value="5m">5분봉</option>
          <option value="15m">15분봉</option>
          <option value="1h">1시간봉</option>
          <option value="4h">4시간봉</option>
          <option value="1d">일봉</option>
        </select>
      </div>

      <ToastContainer />
    </div>
  );
};

export default DualOverlayChart;