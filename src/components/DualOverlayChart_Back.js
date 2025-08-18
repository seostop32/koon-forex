import React, { useState, useEffect, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// 사운드 재생 함수
const playSound = () => {
  const audio = new Audio('/notify.mp3');
  audio.play();
};

const DualOverlayChart = () => {
  const containerRef = useRef(null);
  const alertedSignals = useRef(new Set());
  const currentState = useRef('flat');
  const lastPrice = useRef(null);

  // 신호 처리 함수 (중복 방지, 상태 관리)
  const processSignals = (newSignals) => {
    newSignals.forEach(signal => {
      const key = `${signal.type}-${signal.time}`;

      if (!alertedSignals.current.has(key)) {
        alertedSignals.current.add(key);

        // stoploss_long, stoploss_short 신호 무시
        if (signal.type === 'buy') {
          currentState.current = 'buy';
          toast.info('📈 매수 발생!', {
            position: 'bottom-center',
            autoClose: 4000,
            pauseOnFocusLoss: false,
            pauseOnHover: false,
            closeOnClick: false,
            draggable: false,
            theme: 'colored',
          });
          playSound();
        } else if (signal.type === 'sell') {
          currentState.current = 'sell';
          toast.info('📉 매도 발생!', {
            position: 'bottom-center',
            autoClose: 4000,
            pauseOnFocusLoss: false,
            pauseOnHover: false,
            closeOnClick: false,
            draggable: false,
            theme: 'colored',
          });
          playSound();
        }
        // stoploss_long, stoploss_short 는 처리 안 함
      }
    });
  };

  // 트레이딩뷰 차트 로드
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.TradingView && containerRef.current) {
        new window.TradingView.widget({
          symbol: 'FX:EURUSD',
          interval: '5',
          container_id: 'tradingview_chart',
          width: containerRef.current.clientWidth,
          height: window.innerHeight,
          theme: 'light',
          locale: 'en',
          autosize: true,
          hide_top_toolbar: false,
          timezone: 'Asia/Seoul',
          style: '1',
        });
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // 실시간 환율 받아와서 간단 신호 감지
  useEffect(() => {
    const fetchPriceAndSignal = async () => {
      try {
        const accessKey = "f55e9916a4db401765069d2ab177027a";  // Fixer.io에서 받은 API 키 입력
        const url = `https://data.fixer.io/api/latest?access_key=${accessKey}&base=EUR&symbols=USD`;

        const res = await fetch(url);
        const data = await res.json();
        const price = data?.rates?.USD;

        if (!price) {
          console.warn("환율 정보가 없습니다.");
          return;
        }

        if (lastPrice.current !== null) {
          // 가격 상승 시 buy 신호, 하락 시 sell 신호로 간단하게 판단
          const signalType = price > lastPrice.current ? 'buy' : price < lastPrice.current ? 'sell' : 'flat';
          if (signalType !== 'flat') {
            processSignals([{ type: signalType, entry: true, time: Date.now() }]);
          }
        }

        lastPrice.current = price;
      } catch (error) {
        console.error('Error fetching price:', error);
      }
    };

    fetchPriceAndSignal(); // 첫 실행

    // const interval = setInterval(fetchPriceAndSignal, 60000); // 1분마다 갱신
    // const interval = setInterval(fetchPriceAndSignal, 60 * 60 * 1000); // 1시간마다
    const interval = setInterval(fetchPriceAndSignal, 5 * 60 * 1000); // 5분마다
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div ref={containerRef} id="tradingview_chart" style={{ width: '100%', height: '100vh' }} />
      <ToastContainer />
    </>
  );
};

export default DualOverlayChart;