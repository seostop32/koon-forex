import React, { useEffect, useRef } from 'react';

const DualOverlayChart = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    // TradingView 위젯 스크립트 동적 삽입
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;

    script.onload = () => {
      if (window.TradingView) {
        new window.TradingView.widget({
          autosize: true,
          symbol: 'FX:EURUSD',
          interval: '1',
          timezone: 'Etc/UTC',
          theme: 'light',
          style: '1',
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          hide_top_toolbar: true,
          container_id: 'tradingview_chart',
          studies: [], // 여기에 원하는 지표 추가 가능
        });
      }
    };

    containerRef.current.appendChild(script);

    return () => {
      // cleanup
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="tradingview_chart"
      style={{ width: '100%', height: '500px' }}
    ></div>
  );
};

export default DualOverlayChart;