// DualOverlayChart.js
import React, { useEffect, useRef, useState } from 'react';
import { RSI, MACD, SMA } from 'technicalindicators';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// 📈 가짜 캔들 생성 함수
const generateFakeCandles = (count = 50, startPrice = 1.1) => {
  const now = Math.floor(Date.now() / 1000);
  return Array.from({ length: count }, (_, i) => {
    const cp = startPrice + Math.random() * 0.01;
    return {
      time: now - (count - 1 - i) * 60,
      open: cp,
      high: cp + Math.random() * 0.005,
      low: cp - Math.random() * 0.005,
      close: cp,
      volume: 1000 + Math.floor(Math.random() * 500),
    };
  });
};

// 🚨 신호 생성 함수
const generateSignals = (candles) => {
  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);
  const rsiArr = RSI.calculate({ values: closes, period: 14 });
  const macdArr = MACD.calculate({ values: closes, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 });
  const volMA = SMA.calculate({ values: volumes, period: 10 });

  const signals = [];
  let currentState = 'flat';
  let entryPrice = null;
  const tickSize = 0.0001;
  const minProfit = tickSize * 5;

  for (let i = 26; i < candles.length; i++) {
    const sigTime = candles[i].time * 1000;
    const price = candles[i].close;
    const rsi = rsiArr[i - 12];
    const macd = macdArr[i - 26];
    const avgVol = volMA[i - 10];
    const vol = volumes[i];
    if (!macd || rsi == null || !avgVol) continue;

    if (currentState === 'flat') {
      if (macd.MACD > macd.signal && rsi < 60 && vol > avgVol * 0.8) {
        currentState = 'long';
        entryPrice = price;
        signals.push({ type: 'buy', entry: true, time: sigTime, price });
      } else if (macd.MACD < macd.signal && rsi > 40 && vol < avgVol * 1.2) {
        currentState = 'short';
        entryPrice = price;
        signals.push({ type: 'sell', entry: true, time: sigTime, price });
      }
    } else if (currentState === 'long') {
      if (price >= entryPrice + minProfit) {
        currentState = 'flat';
        signals.push({ type: 'buy', entry: false, time: sigTime, price });
        entryPrice = null;
      }
    } else if (currentState === 'short') {
      if (price <= entryPrice - minProfit) {
        currentState = 'flat';
        signals.push({ type: 'sell', entry: false, time: sigTime, price });
        entryPrice = null;
      }
    }
  }

  return signals;
};

const DualOverlayChart = () => {
  const containerRef = useRef(null);
  const [widgetReady, setWidgetReady] = useState(false);
  const [chartSize, setChartSize] = useState({ width: 0, height: window.innerHeight });
  const [candles, setCandles] = useState(generateFakeCandles());
  const [signals, setSignals] = useState([]);
  const [visibleRange, setVisibleRange] = useState(null);
  const alertedSignals = useRef(new Set());

  // TradingView Widget Load
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.TradingView && containerRef.current) {
        new window.TradingView.widget({
          symbol: 'FX:EURUSD',
          interval: '1',
          container_id: 'tradingview_chart',
          width: containerRef.current.clientWidth,
          height: window.innerHeight,
          theme: 'light',
          locale: 'en',
          autosize: false,
          hide_top_toolbar: true,
          timezone: 'Asia/Seoul',
          style: '1',
        });

        setWidgetReady(true);
        toast.info("차트가 준비되었습니다!", {
          position: 'bottom-center',
          autoClose: 3000,
          theme: 'colored',
        });
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight || window.innerHeight;
      setChartSize({ width, height });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 🔔 신호 감지 및 알림
  useEffect(() => {
    const interval = setInterval(() => {
      setCandles(prev => {
        const last = prev[prev.length - 1].close;
        const newCandle = generateFakeCandles(1, last)[0];
        const updated = [...prev.slice(1), newCandle];
        const newSignals = generateSignals(updated);

        newSignals.forEach(sig => {
          const key = `${sig.type}-${sig.entry}-${sig.time}`;
          if (!alertedSignals.current.has(key)) {
            toast.info(
              `${sig.type === 'buy' ? '매수' : '매도'} ${sig.entry ? '진입' : '청산'}\n가격: ${sig.price.toFixed(5)}\n시간: ${new Date(sig.time).toLocaleTimeString()}`,
              {
                position: 'bottom-center',
                autoClose: 4000,
                theme: 'colored',
              }
            );
            alertedSignals.current.add(key);
          }
        });

        setSignals(newSignals);
        return updated;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const timeToX = (time) => {
    if (!visibleRange || chartSize.width === 0) return -999;
    const { from, to } = visibleRange;
    return ((time / 1000 - from) / (to - from)) * chartSize.width;
  };

  return (
    <>
      <ToastContainer />
      <div ref={containerRef} id="tradingview_chart" style={{ position: 'relative', width: '100%', height: '100vh' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: chartSize.width, height: chartSize.height, pointerEvents: 'none', userSelect: 'none', zIndex: 9999 }}>
          {visibleRange && chartSize.width > 0 && signals.map((sig, i) => {
            const x = timeToX(sig.time);
            if (x < 0 || x > chartSize.width) return null;
            return (
              <div
                key={i}
                title={`${sig.type.toUpperCase()} ${sig.entry ? '진입' : '청산'} - ${new Date(sig.time).toLocaleTimeString()}`}
                style={{
                  position: 'absolute',
                  top: 10 + i * 20,
                  left: x,
                  color: sig.type === 'buy' ? 'green' : 'red',
                  fontSize: 14,
                  fontWeight: 'bold',
                }}
              >
                {sig.type === 'buy' ? '🔼' : '🔽'}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default DualOverlayChart;