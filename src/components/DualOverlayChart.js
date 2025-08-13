import React, { useEffect, useRef, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// EMA 계산 함수 (기간 1)
function calculateEMA(values, period = 1) {
  const k = 2 / (period + 1);
  let emaArray = [];
  values.forEach((val, i) => {
    if (i === 0) emaArray.push(val);
    else emaArray.push(val * k + emaArray[i - 1] * (1 - k));
  });
  return emaArray;
}

// UT Bot 신호 계산 함수 (파인스크립트 로직 반영)
function utBotSignals(candles, keyValue = 1, atrPeriod = 10) {
  if (candles.length < atrPeriod + 2) return [];

  // ATR 계산
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trs.push(tr);
  }

  const atrs = [];
  for (let i = 0; i < trs.length; i++) {
    if (i < atrPeriod - 1) atrs.push(null);
    else {
      const slice = trs.slice(i - atrPeriod + 1, i + 1);
      const sum = slice.reduce((a, b) => a + b, 0);
      atrs.push(sum / atrPeriod);
    }
  }

  // src: close 가격 배열
  const closes = candles.map(c => c.close);

  // EMA(1) 계산 (사실은 close랑 동일하지만 파인스크립트에서 사용하니까 맞춤)
  const ema = calculateEMA(closes, 1);

  let trailingStop = Array(candles.length).fill(0);
  trailingStop[0] = closes[0];

  for (let i = 1; i < candles.length; i++) {
    if (atrs[i - 1] === null) {
      trailingStop[i] = trailingStop[i - 1];
      continue;
    }

    const nLoss = keyValue * atrs[i - 1];
    const src = closes[i];
    const prevTS = trailingStop[i - 1];
    const prevSrc = closes[i - 1];

    if (src > prevTS && prevSrc > prevTS) {
      trailingStop[i] = Math.max(prevTS, src - nLoss);
    } else if (src < prevTS && prevSrc < prevTS) {
      trailingStop[i] = Math.min(prevTS, src + nLoss);
    } else if (src > prevTS) {
      trailingStop[i] = src - nLoss;
    } else {
      trailingStop[i] = src + nLoss;
    }
  }

  const signals = [];
  for (let i = 1; i < candles.length; i++) {
    const buy = closes[i] > trailingStop[i] && ema[i - 1] <= trailingStop[i - 1] && ema[i] > trailingStop[i];
    const sell = closes[i] < trailingStop[i] && ema[i - 1] >= trailingStop[i - 1] && ema[i] < trailingStop[i];

    if (buy) signals.push({ time: candles[i].time, type: 'buy', price: closes[i] });
    if (sell) signals.push({ time: candles[i].time, type: 'sell', price: closes[i] });
  }

  return signals;
}

const DualOverlayChart = () => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const [bars, setBars] = useState([]);
  const alerted = useRef(new Set());

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.TradingView && containerRef.current) {
        chartRef.current = new window.TradingView.widget({
          symbol: 'FX:EURUSD',
          interval: '1',
          container_id: 'tradingview_chart',
          autosize: true,
          theme: 'light',
          locale: 'en',
          timezone: 'Asia/Seoul',
          allow_symbol_change: true,
        });

        chartRef.current.onReady(() => {
          const chart = chartRef.current.chart();

          chart.getBars({ symbol: 'FX:EURUSD', resolution: '1', count: 100 })
            .then(initialBars => {
              setBars(initialBars);
            });

          chart.onRealtimeUpdate(bar => {
            setBars(prev => {
              const newBars = [...prev];
              if (newBars.length && newBars[newBars.length - 1].time === bar.time) {
                newBars[newBars.length - 1] = bar;
              } else {
                newBars.push(bar);
                if (newBars.length > 200) newBars.shift();
              }
              return newBars;
            });
          });
        });
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (bars.length < 20) return;

    const signals = utBotSignals(bars);

    const newSignals = signals.filter(sig => !alerted.current.has(sig.time));
    if (newSignals.length > 0) {
      newSignals.forEach(sig => {
        toast.info(
          sig.type === 'buy' ? `📈 UT BOT 매수 신호 발생! (${new Date(sig.time).toLocaleTimeString()})`
                             : `📉 UT BOT 매도 신호 발생! (${new Date(sig.time).toLocaleTimeString()})`,
          {
            position: 'bottom-center',
            autoClose: 5000,
            pauseOnHover: false,
            closeOnClick: true,
            theme: 'colored',
          }
        );
        alerted.current.add(sig.time);
      });
    }
  }, [bars]);

  return (
    <>
      <div ref={containerRef} id="tradingview_chart" style={{ width: '100%', height: '100vh' }} />
      <ToastContainer />
    </>
  );
};

export default DualOverlayChart;