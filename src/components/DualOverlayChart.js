import React, { useState, useEffect, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { sendSignal } from './SignalSender';

const alertedSignals = useRef(new Set());
const currentState = useRef('flat');

const DualOverlayChart = () => {
  const [signals, setSignals] = useState([]);
  const [timeframe, setTimeframe] = useState('1m');
  const [symbol, setSymbol] = useState('BTCUSDT'); // ✅ 종목 선택

  const playSound = () => {
    const audio = new Audio('/notify.mp3');
    audio.play();
  };

  const processUTBotSignals = (newSignals) => {
    newSignals.forEach((signal) => {
      const key = `${signal.type}-${signal.entry}-${signal.time}-${signal.timeframe}-${signal.symbol}`;

      if (!alertedSignals.current.has(key) && currentState.current === 'flat') {
        alertedSignals.current.add(key);

        if (signal.type === 'buy') {
          currentState.current = 'buy';
        } else if (signal.type === 'sell') {
          currentState.current = 'sell';
        }

        toast.info(
          `[${signal.symbol} / ${signal.timeframe}] ` +
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
      const newSignals = [
        {
          type: Math.random() > 0.5 ? 'buy' : 'sell',
          entry: true,
          time: Date.now(),
          timeframe,
          symbol,
        },
      ];

      processUTBotSignals(newSignals);
    }, 6000);

    return () => clearInterval(interval);
  }, [timeframe, symbol]);

  return (
    <div style={{ padding: '1rem', fontFamily: 'Arial' }}>
      <h1>📊 UT Bot Alerts</h1>

      {/* ✅ 종목 선택 */}
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="symbol" style={{ marginRight: '0.5rem' }}>종목 선택:</label>
        <select
          id="symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          style={{ padding: '0.5rem' }}
        >
          <option value="BTCUSDT">BTC/USDT</option>
          <option value="ETHUSDT">ETH/USDT</option>
          <option value="AAPL">AAPL</option>
          <option value="TSLA">TSLA</option>
          <option value="SPY">SPY</option>
        </select>
      </div>

      {/* ✅ 봉 선택 */}
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="timeframe" style={{ marginRight: '0.5rem' }}>봉 선택:</label>
        <select
          id="timeframe"
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          style={{ padding: '0.5rem' }}
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