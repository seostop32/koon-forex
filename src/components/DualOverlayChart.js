import React, { useEffect, useRef, useState } from 'react';
import { RSI, MACD, SMA } from 'technicalindicators';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// 1분봉 가짜 캔들 생성 함수 (50개)
const generateFakeCandles = (count = 50, startPrice = 1.1) => {
  const now = Math.floor(Date.now() / 1000);
  return Array.from({ length: count }, (_, i) => {
    const base = startPrice;
    const cp = base + Math.random() * 0.01;
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

// 신호 생성 함수 (진입/청산 분리, 5틱 이상 수익 기준)
const generateSignals = (candles) => {
  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);

  const rsi = RSI.calculate({ values: closes, period: 14 });
  const macd = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const volumeMA = SMA.calculate({ values: volumes, period: 10 });

  const signals = [];

  let currentState = 'flat'; // flat | long | short
  let entryPrice = null;
  const tickSize = 0.0001;
  const minProfit = tickSize * 5;

  for (let i = 26; i < candles.length; i++) {
    const time = candles[i].time * 1000; // ms 단위
    const price = candles[i].close;
    const rsiVal = rsi[i - 12];
    const macdVal = macd[i - 26];
    const avgVol = volumeMA[i - 10];
    const vol = volumes[i];

    if (!macdVal || rsiVal == null || !avgVol) continue;

    // 진입 신호
    if (currentState === 'flat') {
      if (macdVal.MACD > macdVal.signal && rsiVal < 60 && vol > avgVol * 0.8) {
        currentState = 'long';
        entryPrice = price;
        signals.push({ type: 'buy', entry: true, time, price });
      } else if (macdVal.MACD < macdVal.signal && rsiVal > 40 && vol < avgVol * 1.2) {
        currentState = 'short';
        entryPrice = price;
        signals.push({ type: 'sell', entry: true, time, price });
      }
    }
    // 청산 신호 (5틱 이상 벌었을 때)
    else if (currentState === 'long') {
      if (price >= entryPrice + minProfit) {
        currentState = 'flat';
        signals.push({ type: 'buy', entry: false, time, price });
        entryPrice = null;
      }
    } else if (currentState === 'short') {
      if (price <= entryPrice - minProfit) {
        currentState = 'flat';
        signals.push({ type: 'sell', entry: false, time, price });
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

  // 중복 얼러트 방지용 Set
  const alertedSignalsRef = useRef(new Set());

  // TradingView 위젯 로드 및 생성
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
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
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
                const range = chart.timeScale().getVisibleRange();
                if (range) setVisibleRange(range);
              } catch {}
            }, 1000);
          }
        });
      }
    };

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
      document.head.removeChild(script);
    };
  }, []);

  // ResizeObserver로 차트 크기 감지
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height || 500;
        setChartSize({ width, height });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // visibleRange 감지 및 업데이트
  useEffect(() => {
    if (!widget) return;
    let chart;
    try {
      chart = widget.chart();
    } catch {
      return;
    }
    if (!chart) return;

    const onRangeChanged = () => {
      const range = chart.timeScale().getVisibleRange();
      if (range && range.from !== range.to) {
        setVisibleRange(range);
      }
    };

    onRangeChanged();

    chart.timeScale().subscribeVisibleTimeRangeChange(onRangeChanged);

    return () => {
      chart.timeScale().unsubscribeVisibleTimeRangeChange(onRangeChanged);
    };
  }, [widget]);

  // 10초마다 새로운 캔들 생성 및 시그널 업데이트, 얼러트 발생
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCandles(prevCandles => {
        const lastPrice = prevCandles[prevCandles.length - 1].close;
        const newCandle = generateFakeCandles(1, lastPrice)[0];
        const newCandles = [...prevCandles.slice(1), newCandle];

        // 신호 생성
        const newSignals = generateSignals(newCandles);

        // 새로 생긴 신호 중 아직 얼러트 안 띄운 거만 띄우기 + 현재시간 지나면 스킵
        const now = Date.now();
        newSignals.forEach(sig => {
          if (!alertedSignalsRef.current.has(sig.time)) {
            showAlert(sig);
            alertedSignalsRef.current.add(sig.time);
          }          
          // if (
          //   !alertedSignalsRef.current.has(sig.time) && 
          //   sig.time >= now // 현재시간 지나면 스킵
          // ) {
          //   showAlert(sig);
          //   alertedSignalsRef.current.add(sig.time);
          // }
        });

        setSignals(newSignals);
        return newCandles;
      });
    }, 10000);

    return () => clearInterval(intervalId);
  }, [signals]);

  // 얼러트 함수
  const showAlert = (signal) => {
    const action = signal.entry ? '진입' : '청산';
    const type = signal.type === 'buy' ? '매수' : '매도';
    toast.info(
      `[${type}] ${action} 신호\n가격: ${signal.price.toFixed(5)}\n시간: ${new Date(signal.time).toLocaleTimeString()}`, 
      {
        position: 'top-center',
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: 'colored',
      }
    );
  };

  // 시간(ms) -> x 좌표 변환
  const timeToX = (time) => {
    if (!visibleRange || chartSize.width === 0) return -1000;
    const { from, to } = visibleRange;
    if (from === to) return -1000;
    return ((time / 1000 - from) / (to - from)) * chartSize.width;
  };

  return (
    <>
    <div
      ref={containerRef}
      id="tradingview_chart"
      style={{ position: 'relative', width: '100%', height: '100vh' }}
    >
      {/* 신호 오버레이 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: chartSize.width,
          height: chartSize.height,
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 9999,
        }}
      >
        {visibleRange && chartSize.width > 0 && signals.map((sig, i) => {
          const x = timeToX(sig.time);
          if (x < 0 || x > chartSize.width) return null;
          return (
            <div
              key={i}
              title={`${sig.type.toUpperCase()} ${sig.entry ? '진입' : '청산'} 신호 (${new Date(sig.time).toLocaleTimeString()})`}
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
    <ToastContainer limit={1} /> {/* <-- 요거 꼭 있어야 함! */}
    </>
  );
};

export default DualOverlayChart;