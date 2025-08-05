import React, { useEffect, useRef, useState } from 'react';

const signals = [
  { type: 'buy', time: Date.now() - 5 * 60 * 1000 },  // 5분 전
  { type: 'sell', time: Date.now() - 2 * 60 * 1000 }, // 2분 전
  { type: 'buy', time: Date.now() },                   // 현재 시간
];

const DualOverlayChart = () => {
  const containerRef = useRef(null);
  const [widget, setWidget] = useState(null);
  const [chartWidth, setChartWidth] = useState(0);
  const [chartHeight, setChartHeight] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ from: 0, to: 0 });

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;

    script.onload = () => {
      if (window.TradingView && containerRef.current) {
        const widgetInstance = new window.TradingView.widget({
          symbol: 'FX:EURUSD',
          interval: '1', // 1분 차트
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
        });

        setWidget(widgetInstance);
      }
    };

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setChartWidth(entry.contentRect.width);
        setChartHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (widget) {
      const intervalId = setInterval(() => {
        try {
          // TradingView에서 visibleRange를 가져와서 업데이트
          const newVisibleRange = widget.chart().visibleRange();
          setVisibleRange(newVisibleRange);
        } catch (e) {
          console.error("Error fetching visible range:", e);
        }
      }, 1000);

      return () => clearInterval(intervalId);
    }
  }, [widget]);

  // 시간 -> x 픽셀 변환
  const timeToX = (time) => {
    if (visibleRange.to === visibleRange.from) return 0;
    const px = ((time - visibleRange.from) / (visibleRange.to - visibleRange.from)) * chartWidth;
    return Math.min(Math.max(px, 0), chartWidth);
  };

  // 시그널 시간이 차트의 visibleRange에 포함되는지 체크
  const visibleSignals = signals.filter((sig) => {
    return sig.time >= visibleRange.from && sig.time <= visibleRange.to;
  });

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }} ref={containerRef} id="tradingview_chart">
      {/* 신호 레이어 */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: chartWidth, height: chartHeight, pointerEvents: 'none' }}>
        {visibleSignals.map((sig, idx) => {
          const x = timeToX(sig.time);
          if (x < 0 || x > chartWidth) return null;

          return (
          <div key={idx} style={{ position: 'absolute', left: x, top: 0 }}>
            <div
              style={{
                position: 'absolute',
                left: -15, // 마커가 부모 div 중앙에 오도록 조정
                top: 30,
                width: 30,
                height: 30,
                backgroundColor: sig.type === 'buy' ? 'green' : 'red',
                color: 'white',
                borderRadius: '50%',
                textAlign: 'center',
                lineHeight: '30px',
                fontWeight: 'bold',
                zIndex: 9999,
              }}
            >
              {sig.type === 'buy' ? 'B' : 'S'}
            </div>

            <button
              onClick={() => alert(`${sig.type} clicked!`)}
              style={{
                position: 'absolute',
                left: -25,
                top: 70,
                zIndex: 10,
                padding: '4px 8px',
                fontSize: '12px',
              }}
            >
              액션
            </button>
          </div>
        );
        })}
      </div>
    </div>
  );
};

export default DualOverlayChart;