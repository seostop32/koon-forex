import React, { useEffect, useRef, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function calculateATR(candles, period = 10) {
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
    if (i < period - 1) atrs.push(null);
    else {
      const slice = trs.slice(i - period + 1, i + 1);
      const sum = slice.reduce((a, b) => a + b, 0);
      atrs.push(sum / period);
    }
  }
  return atrs;
}

function utBotSignals(candles, keyValue = 1, atrPeriod = 10) {
  if (candles.length < atrPeriod + 2) return [];

  const closes = candles.map(c => c.close);
  const atrs = calculateATR(candles, atrPeriod);

  let trailingStop = Array(candles.length).fill(0);
  let pos = Array(candles.length).fill(0);

  trailingStop[0] = closes[0];
  pos[0] = 0;

  for (let i = 1; i < candles.length; i++) {
    if (atrs[i - 1] == null) {
      trailingStop[i] = trailingStop[i - 1];
      pos[i] = pos[i - 1];
      continue;
    }

    const nLoss = keyValue * atrs[i - 1];
    const src = closes[i];

    if (src > trailingStop[i - 1] && closes[i - 1] > trailingStop[i - 1]) {
      trailingStop[i] = Math.max(trailingStop[i - 1], src - nLoss);
    } else if (src < trailingStop[i - 1] && closes[i - 1] < trailingStop[i - 1]) {
      trailingStop[i] = Math.min(trailingStop[i - 1], src + nLoss);
    } else if (src > trailingStop[i - 1]) {
      trailingStop[i] = src - nLoss;
    } else {
      trailingStop[i] = src + nLoss;
    }

    if (closes[i - 1] < trailingStop[i - 1] && src > trailingStop[i]) {
      pos[i] = 1;
    } else if (closes[i - 1] > trailingStop[i - 1] && src < trailingStop[i]) {
      pos[i] = -1;
    } else {
      pos[i] = pos[i - 1];
    }
  }

  const signals = [];
  for (let i = 1; i < pos.length; i++) {
    if (pos[i] !== pos[i - 1]) {
      if (pos[i] === 1) signals.push({ time: candles[i].time, type: 'buy', price: closes[i] });
      else if (pos[i] === -1) signals.push({ time: candles[i].time, type: 'sell', price: closes[i] });
    }
  }

  return signals;
}

const DualOverlayChart = () => {
  const containerRef = useRef(null);
  const chartWidgetRef = useRef(null);
  const [bars, setBars] = useState([]);
  const alerted = useRef(new Set());

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.TradingView && containerRef.current) {
        chartWidgetRef.current = new window.TradingView.widget({
          symbol: 'FX:EURUSD',
          interval: '1',
          container_id: 'tradingview_chart',
          autosize: true,
          timezone: 'Asia/Seoul',
          theme: 'light',
          locale: 'en',
          allow_symbol_change: true,
        });

        // widget.ready() Promise가 생긴 걸로 알고 있음, 없으면 2초 딜레이 후 호출해봐도 됨
        // 여기서는 setTimeout으로 딜레이 후 접근하는 안전한 방법
        setTimeout(() => {
          const chart = chartWidgetRef.current.chart();

          chart.getBars({ symbol: 'FX:EURUSD', resolution: '1', count: 100 }).then((bars) => {
            setBars(bars);
          });

          // 바 변경 이벤트 구독
          chart.subscribeBars('FX:EURUSD', (bar) => {
            setBars((prev) => {
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
        }, 2000);
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (bars.length < 20) return;

    const signals = utBotSignals(bars);

    console.log('신호 갯수:', signals.length);
    signals.forEach(s => {
      console.log(`신호: ${s.type} 시간: ${new Date(s.time).toLocaleString()}`);
    });

    const newSignals = signals.filter(s => !alerted.current.has(s.time));

    newSignals.forEach(sig => {
      toast.info(sig.type === 'buy' ? '📈 UT BOT 매수 신호 발생!' : '📉 UT BOT 매도 신호 발생!', {
        position: 'bottom-center',
        autoClose: 5000,
        pauseOnHover: false,
        closeOnClick: true,
        theme: 'colored',
      });
      alerted.current.add(sig.time);
    });
  }, [bars]);

  return (
    <>
      <div id="tradingview_chart" ref={containerRef} style={{ width: '100%', height: '100vh' }} />
      <ToastContainer />
    </>
  );
};

export default DualOverlayChart;