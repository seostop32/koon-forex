import React, { useEffect, useRef, useState } from 'react';
import { RSI, MACD, SMA } from 'technicalindicators';

// Fake 캔들 생성 (1분봉 50개)
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

// 신호 생성 (fake signal)
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

  for (let i = 26; i < closes.length; i++) {
    const rsiVal = rsi[i - 12];
    const macdVal = macd[i - 26];
    const avgVol = volumeMA[i - 10];
    const volume = volumes[i];
    const time = candles[i].time * 1000; // ms 단위

    if (!macdVal || rsiVal === undefined || !avgVol) continue;

    if (macdVal.MACD > macdVal.signal && rsiVal < 60 && volume > avgVol * 0.8) {
      signals.push({ type: 'buy', time });
    }
    if (macdVal.MACD < macdVal.signal && rsiVal > 40 && volume < avgVol * 1.2) {
      signals.push({ type: 'sell', time });
    }
  }
  return signals;
};

const DualOverlayChart = () => {
  const containerRef = useRef(null);
  const [widget, setWidget] = useState(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 500 });
  const [candles] = useState(generateFakeCandles());
  const [signals, setSignals] = useState([]);
  const [visibleRange, setVisibleRange] = useState(null);

  // 신호 생성 및 설정
  useEffect(() => {
    const newSignals = generateSignals(candles);
    setSignals(newSignals);
    // console.log('⚡ signals generated:', newSignals.length);
  }, [candles]);

  // TradingView 위젯 생성
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
          height: 500,
          autosize: false,
          onChartReady: () => {
            setWidget(w);
            setTimeout(() => {
              try {
                const chart = w.chart();
                const range = chart.timeScale().getVisibleRange();
                if (range) setVisibleRange(range);
              } catch {
                // console.warn('Chart not ready at onChartReady');
              }
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

  // ResizeObserver로 크기 감지
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

    // 최초 호출
    onRangeChanged();

    // 구독 시작
    chart.timeScale().subscribeVisibleTimeRangeChange(onRangeChanged);

    return () => {
      chart.timeScale().unsubscribeVisibleTimeRangeChange(onRangeChanged);
    };
  }, [widget]);

  // 시간(ms) -> x 좌표 변환
  const timeToX = (time) => {
    if (!visibleRange || chartSize.width === 0) {
      return -1000;
    }
    const { from, to } = visibleRange;
    if (from === to) return -1000;
    const x = ((time / 1000 - from) / (to - from)) * chartSize.width;
    return x;
  };

  return (
    <div
      ref={containerRef}
      id="tradingview_chart"
      style={{ position: 'relative', width: '100%', height: 500 }}
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
          console.log(`Signal ${sig.type} at x=${x}`);
          if (x < 0 || x > chartSize.width) return null;
          return (
            <div
              key={i}
              title={`${sig.type.toUpperCase()} Signal at ${new Date(sig.time).toLocaleTimeString()}`}
              style={{
                position: 'absolute',
                left: x - 15,
                top: 100, // 좀 더 밑으로 내려봤어
                width: 30,
                height: 30,
                borderRadius: '50%',
                backgroundColor: sig.type === 'buy' ? 'green' : 'red',
                color: 'white',
                fontWeight: 'bold',
                textAlign: 'center',
                lineHeight: '30px',
                border: '2px solid yellow',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              {sig.type === 'buy' ? 'B' : 'S'}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DualOverlayChart;