import React, { useState, useEffect, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { sendSignal } from './SignalSender';

const alertedSignals = new Set();
const currentState = { current: 'flat' };

const DualOverlayChart = () => {
  const [timeframe, setTimeframe] = useState('1');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const chartContainerRef = useRef(null);

  const playSound = () => {
    const audio = new Audio('/notify.mp3');
    audio.play();
  };

  const processUTBotSignals = (newSignals) => {
    newSignals.forEach((signal) => {
      const key = `${signal.type}-${signal.entry}-${signal.time}-${signal.timeframe}-${signal.symbol}`;

      if (!alertedSignals.has(key) && currentState.current === 'flat') {
        alertedSignals.add(key);

        if (signal.type === 'buy') currentState.current = 'buy';
        if (signal.type === 'sell') currentState.current = 'sell';

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
    if (!chartContainerRef.current) return;
    chartContainerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      // eslint-disable-next-line no-undef
      new window.TradingView.widget({
        container_id: 'tradingview_chart',
        width: '100%',
        height: 600,
        symbol: symbol,
        interval: timeframe,
        timezone: 'Asia/Seoul',
        theme: 'light',
        style: '1',
        locale: 'kr',
        toolbar_bg: '#f1f3f6',
        enable_publishing: false,
        allow_symbol_change: true,   // ✅ 종목 검색 허용
        hide_top_toolbar: false,     // ✅ 툴바 보이기
        hide_side_toolbar: false,
        autosize: true,
      });
    };
    chartContainerRef.current.appendChild(script);

    const intervalId = setInterval(() => {
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

    return () => clearInterval(intervalId);
  }, [symbol, timeframe]);

  return (
    <div style={{ padding: '1rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>📊 UT Bot Alerts & Chart</h1>

      {/* 종목 선택 */}
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

      {/* 봉 선택 */}
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="timeframe" style={{ marginRight: '0.5rem' }}>봉 선택:</label>
        <select
          id="timeframe"
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          style={{ padding: '0.5rem' }}
        >
          <option value="1">1분봉</option>
          <option value="5">5분봉</option>
          <option value="15">15분봉</option>
          <option value="60">1시간봉</option>
          <option value="240">4시간봉</option>
          <option value="D">일봉</option>
        </select>
      </div>

      {/* 차트 */}
      <div
        id="tradingview_chart"
        ref={chartContainerRef}
        style={{
          width: '100%',
          height: '600px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      />

      <ToastContainer />
    </div>
  );
};

export default DualOverlayChart;