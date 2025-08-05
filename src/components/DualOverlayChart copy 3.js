import React, { useEffect, useRef, useState } from 'react';
import { RSI, MACD, SMA } from 'technicalindicators';

// — Fake 캔들 생성 (1분봉 50개)
const generateFakeCandles = () => {
  const now = Math.floor(Date.now() / 1000);
  return Array.from({ length: 50 }, (_, i) => ({
    time: now - (49 - i) * 60,
    open: 1.1 + Math.random() * 0.01,
    high: 1.11 + Math.random() * 0.01,
    low: 1.09 + Math.random() * 0.01,
    close: 1.1 + Math.random() * 0.01,
    volume: 1000 + Math.floor(Math.random() * 500),
  }));
};

// — 신호 생성 (fake signal)
const generateSignals = candles => {
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
  for (let i = 26; i < closes.length; i++) {
    const rsiVal = rsi[i - 12];
    const macdVal = macd[i - 26];
    const avgVol = volumeMA[i - 10];
    const volume = volumes[i];
    const time = candles[i].time * 1000;

    if (!macdVal || rsiVal === undefined || !avgVol) continue;
    if (macdVal.MACD > macdVal.signal && rsiVal < 60 && volume > avgVol * 0.8) {
      signals.push({ type: 'buy', time });
    } else if (macdVal.MACD < macdVal.signal && rsiVal > 40 && volume < avgVol * 1.2) {
      signals.push({ type: 'sell', time });
    }
  }
  return signals;
};

const DualOverlayChart = () => {
  const containerRef = useRef(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: window.innerHeight });
  const [candles] = useState(generateFakeCandles());
  const [signals, setSignals] = useState([]);
  const [visibleRange, setVisibleRange] = useState(null);

  // 신호 생성
  useEffect(() => {
    setSignals(generateSignals(candles));
  }, [candles]);

  // tv.js 위젯 로드
  useEffect(() => {
    const s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/tv.js';
    s.async = true;
    document.head.appendChild(s);
    return () => {
      document.head.removeChild(s);
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  // TradingView 위젯 생성 및 height autosize 조정
  useEffect(() => {
    if (!containerRef.current || !window.TradingView) return;

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
      container_id: containerRef.current.id,
      width: containerRef.current.clientWidth,
      height: window.innerHeight,
      autosize: true,
    });

    setTimeout(() => {
      const { clientWidth, clientHeight } = containerRef.current;
      setChartSize({ width: clientWidth, height: clientHeight });
    }, 100);

    return () => w.remove?.();
  }, []);

  // ResizeObserver로 크기 감지
  useEffect(() => {
    if (!containerRef.current) return;

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height || window.innerHeight;
        setChartSize({ width, height });
      }
    });

    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // visibleRange 업데이트
  useEffect(() => {
    if (!window.TradingView?.on && !window.TradingView?.onChartReady) return;

    const chart = window.TradingView?.activeChart?.() ?? window.TradingView?.chart?.();
    if (!chart?.timeScale) return;

    const onRangeChanged = () => {
      const range = chart.timeScale().getVisibleRange();
      if (range && range.from !== range.to) {
        setVisibleRange(range);
      }
    };

    onRangeChanged();
    chart.timeScale().subscribeVisibleTimeRangeChange(onRangeChanged);

    return () => chart.timeScale().unsubscribeVisibleTimeRangeChange(onRangeChanged);
  }, []);

  // 시간(ms) → x 좌표 계산
  const timeToX = time => {
    if (!visibleRange || chartSize.width === 0) return -1000;
    const { from, to } = visibleRange;
    const t = time / 1000;
    if (from === to) return -1000;
    return ((t - from) / (to - from)) * chartSize.width;
  };

  return (
    <div
      ref={containerRef}
      id="tradingview_chart"
      style={{ position: 'relative', width: '100%', height: '100vh' }}
    >
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
        {visibleRange &&
          chartSize.width > 0 &&
          signals.map((sig, i) => {
            const x = timeToX(sig.time);
            if (x < 0 || x > chartSize.width) return null;
            return (
              <div
                key={i}
                title={`${sig.type.toUpperCase()} Signal at ${new Date(sig.time).toLocaleTimeString()}`}
                style={{
                  position: 'absolute',
                  left: x - 12,
                  top: chartSize.height * 0.1,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: sig.type === 'buy' ? 'green' : 'red',
                  color: 'white',
                  textAlign: 'center',
                  lineHeight: '24px',
                  fontWeight: 'bold',
                  border: '2px solid yellow',
                  userSelect: 'none',
                }}
              >
                {sig.type === 'buy' ? 'B' : 'S'}
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default DualOverlayChart;