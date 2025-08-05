import React, { useEffect, useRef, useState } from 'react';
import { RSI, MACD, SMA } from 'technicalindicators';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// 가짜 캔들 생성 함수
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

// 신호 생성 함수
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
  const [widget, setWidget] = useState(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: window.innerHeight });
  const [candles, setCandles] = useState(generateFakeCandles());
  const [signals, setSignals] = useState([]);
  const [visibleRange, setVisibleRange] = useState(null);

  const alertedSignals = useRef(new Set());

  // TradingView 위젯 로드
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    document.head.appendChild(script);
    script.onload = () => {
      if (window.TradingView && containerRef.current) {
        const w = new window.TradingView.widget({
          symbol: 'FX:EURUSD',
          interval: '1',
          timezone: 'Asia/Seoul',
          theme: 'light',
          style: '1',
          locale: 'en',
          hide_top_toolbar: true,
          container_id: 'tradingview_chart',
          width: containerRef.current.clientWidth,
          height: window.innerHeight,
          autosize: false,
          onChartReady: () => {
            setWidget(w);
            setTimeout(() => {
              try {
                const chart = w.chart();
                const rng = chart.timeScale().getVisibleRange();
                if (rng) setVisibleRange(rng);
              } catch {}
            }, 1000);
          },
        });
      }
    };
    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
      document.head.removeChild(script);
    };
  }, []);

  // 차트 크기 업데이트 (윈도우 리사이즈 이벤트로 대체)
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight || window.innerHeight;
      console.log('📐 container size:', width, height);
      setChartSize({ width, height });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // visibleRange 업데이트
  useEffect(() => {
    if (!widget) return;
    let chart;
    try { chart = widget.chart(); } catch { return; }
    const onRangeChange = () => {
      const rng = chart.timeScale().getVisibleRange();
      if (rng && rng.from !== rng.to) setVisibleRange(rng);
    };
    onRangeChange();
    chart.timeScale().subscribeVisibleTimeRangeChange(onRangeChange);
    return () => chart.timeScale().unsubscribeVisibleTimeRangeChange(onRangeChange);
  }, [widget]);

  // 10초마다 새 캔들, 신호 생성, 얼러트 띄우기
  useEffect(() => {
    const interval = setInterval(() => {
      setCandles(prev => {
        const last = prev[prev.length - 1].close;
        const newC = generateFakeCandles(1, last)[0];
        const updated = [...prev.slice(1), newC];
        const newSigs = generateSignals(updated);
        const now = Date.now();

        newSigs.forEach(sig => {
          const key = `${sig.type}-${sig.entry}-${sig.time}`;
          if (!alertedSignals.current.has(key) && sig.time >= now - 3000) {
            toast.info(
              `${sig.type === 'buy' ? '매수' : '매도'} ${sig.entry ? '진입' : '청산'} 신호\n가격: ${sig.price.toFixed(5)}\n시간: ${new Date(sig.time).toLocaleTimeString()}`,
              { position: 'bottom-center', autoClose: 3000, hideProgressBar: true, theme: 'colored' }
            );
            alertedSignals.current.add(key);
          }
        });

        setSignals(newSigs);
        return updated;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // 시간 -> x 좌표 변환
  const timeToX = (time) => {
    if (!visibleRange || chartSize.width === 0) return -999;
    const { from, to } = visibleRange;
    return ((time / 1000 - from) / (to - from)) * chartSize.width;
  };

  return (
    <>
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
                  left: x - 15,
                  top: 100,
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  backgroundColor: sig.type === 'buy' ? (sig.entry ? 'green' : '#00aa00') : (sig.entry ? 'red' : '#aa0000'),
                  color: 'white',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  lineHeight: '30px',
                  border: '2px solid yellow',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              >
                {sig.type === 'buy' ? (sig.entry ? 'B' : 'b') : (sig.entry ? 'S' : 's')}
              </div>
            );
          })}
        </div>
      </div>
      <ToastContainer
        position="bottom-center"
        autoClose={3000}
        hideProgressBar={true}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        style={{ position: 'fixed', zIndex: 99999, bottom: 0 }}
      />
    </>
  );
};

export default DualOverlayChart;