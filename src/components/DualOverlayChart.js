// DualOverlayChart.js
import React, { useEffect, useRef, useState } from 'react';
import { RSI, MACD, SMA } from 'technicalindicators';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { sendSignal } from './SignalSender';
import TestSignalButton from './TestSignalButton';

// 가짜 캔들 생성 함수
const generateFakeCandles = (count = 80, startPrice = 1.1) => {
  const now = Math.floor(Date.now() / 1000);
  return Array.from({ length: count }, (_, i) => {
    const cp = startPrice + (Math.random() - 0.5) * 0.01;
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

// 달러인덱스(DXY) 가짜 데이터 생성
const generateFakeDXY = (count = 80, startPrice = 105) => {
  const now = Math.floor(Date.now() / 1000);
  return Array.from({ length: count }, (_, i) => {
    const cp = startPrice + (Math.random() - 0.5) * 0.03;
    return {
      time: now - (count - 1 - i) * 60,
      open: cp,
      high: cp + Math.random() * 0.01,
      low: cp - Math.random() * 0.01,
      close: cp,
      volume: 2000 + Math.floor(Math.random() * 1000),
    };
  });
};

// 신호 생성 함수
const generateSignals = (eurCandles, dxyCandles) => {
  const eurCloses = eurCandles.map(c => c.close);
  const dxyCloses = dxyCandles.map(c => c.close);
  const eurVolumes = eurCandles.map(c => c.volume);
  const dxyVolumes = dxyCandles.map(c => c.volume);

  const eurRSI = RSI.calculate({ values: eurCloses, period: 14 });
  const eurMACD = MACD.calculate({ values: eurCloses, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 });
  const eurVolMA = SMA.calculate({ values: eurVolumes, period: 10 });

  const dxyRSI = RSI.calculate({ values: dxyCloses, period: 14 });
  const dxyMACD = MACD.calculate({ values: dxyCloses, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 });
  const dxyVolMA = SMA.calculate({ values: dxyVolumes, period: 10 });

  const signals = [];
  let currentState = 'flat';
  let entryPrice = null;
  const tickSize = 0.0001;
  const minProfit = tickSize * 5;
  const maxLoss = tickSize * 3;
  let lastEntryTime = 0;
  const cooldownMs = 5 * 60 * 1000; // 5분 쿨다운

  for (let i = 26; i < eurCandles.length; i++) {
    const time = eurCandles[i].time * 1000;
    const price = eurCandles[i].close;

    const eRSI = eurRSI[i - 12];
    const eMACD = eurMACD[i - 26];
    const eVolMA = eurVolMA[i - 10];
    const eVol = eurVolumes[i];

    const dRSI = dxyRSI[i - 12];
    const dMACD = dxyMACD[i - 26];
    const dVolMA = dxyVolMA[i - 10];
    const dVol = dxyVolumes[i];

    if (!eMACD || eRSI == null || !eVolMA || !dMACD || dRSI == null || !dVolMA) continue;

    const eurBuySignal = eMACD.MACD < eMACD.signal && eRSI > 40 && eVol < eVolMA * 1.2;
    const eurSellSignal = eMACD.MACD > eMACD.signal && eRSI < 60 && eVol > eVolMA * 0.8;
    const dxyBuySignal = dMACD.MACD > dMACD.signal && dRSI < 60 && dVol > dVolMA * 0.8;
    const dxySellSignal = dMACD.MACD < dMACD.signal && dRSI > 40 && dVol < dVolMA * 1.2;

    const combinedBuy = eurBuySignal && dxySellSignal;
    const combinedSell = eurSellSignal && dxyBuySignal;

    if (currentState === 'flat' && (time - lastEntryTime < cooldownMs)) {
      continue;
    }

    if (currentState === 'flat') {
      if (combinedSell) {
        currentState = 'short';
        entryPrice = price;
        lastEntryTime = time;
        signals.push({ type: 'sell', entry: true, time, price });
      } else if (combinedBuy) {
        currentState = 'long';
        entryPrice = price;
        lastEntryTime = time;
        signals.push({ type: 'buy', entry: true, time, price });
      }
    } else if (currentState === 'long') {
      if (price >= entryPrice + minProfit) {
        currentState = 'flat';
        signals.push({ type: 'buy', entry: false, time, price });
        entryPrice = null;
        lastEntryTime = time;
      } else if (price <= entryPrice - maxLoss) {
        currentState = 'flat';
        signals.push({ type: 'stoploss_long', entry: false, time, price });
        entryPrice = null;
        lastEntryTime = time;
      }
    } else if (currentState === 'short') {
      if (price <= entryPrice - minProfit) {
        currentState = 'flat';
        signals.push({ type: 'sell', entry: false, time, price });
        entryPrice = null;
        lastEntryTime = time;
      } else if (price >= entryPrice + maxLoss) {
        currentState = 'flat';
        signals.push({ type: 'stoploss_short', entry: false, time, price });
        entryPrice = null;
        lastEntryTime = time;
      }
    }
  }

  signals.sort((a, b) => a.time - b.time);
  return signals;
};

const DualOverlayChart = () => {
  const containerRef = useRef(null);
  const [eurCandles, setEurCandles] = useState(generateFakeCandles(80));
  const [dxyCandles, setDxyCandles] = useState(generateFakeDXY(80));
  const [signals, setSignals] = useState([]);
  const alertedSignals = useRef(new Set());

  const playSound = () => {
    const audio = new Audio('/notify.mp3');
    audio.play();
  };

  useEffect(() => {
    // 유저가 클릭해야 사운드가 재생되는 브라우저 정책 우회
    const enableAudio = () => {
      const audio = new Audio('/notify.mp3');
      audio.play().catch(() => {});
      window.removeEventListener('click', enableAudio);
    };
    window.addEventListener('click', enableAudio);
  }, []);

  useEffect(() => {
    // 트레이딩뷰 차트 스크립트 로딩 및 세팅
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.TradingView && containerRef.current) {
        const widget = new window.TradingView.widget({
          symbol: 'FX:EURUSD',
          interval: '15',
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

        widget.onChartReady(() => {
          const chart = widget.chart();
          chart.createStudy("Ichimoku Cloud", false, false, null, {});
          chart.createStudy('Moving Average', false, false, [10], {});
          chart.createStudy('Moving Average', false, false, [20], {});
          chart.createStudy('Moving Average', false, false, [60], {});
        });

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
    const interval = setInterval(() => {
      setEurCandles(prev => {
        const last = prev[prev.length - 1].close;
        const newCandle = generateFakeCandles(1, last)[0];
        const updated = [...prev.slice(1), newCandle];

        setDxyCandles(prevDxy => {
          const lastDxy = prevDxy[prevDxy.length - 1].close;
          const newDxy = generateFakeDXY(1, lastDxy)[0];
          const updatedDxy = [...prevDxy.slice(1), newDxy];

          const newSignals = generateSignals(updated, updatedDxy);
          setSignals(newSignals);

          // 새로 발견된 신호 중 중복 아닌 것들만 필터링
          const newUniqueSignals = newSignals.filter(sig => {
            const key = `${sig.type}-${sig.entry}-${sig.time}`;
            return !alertedSignals.current.has(key);
          });

          if (newUniqueSignals.length > 0) {
            // 가장 최신 신호만 토스트 띄움
            const lastSignal = newUniqueSignals[newUniqueSignals.length - 1];
            const key = `${lastSignal.type}-${lastSignal.entry}-${lastSignal.time}`;

            // 이전 토스트 자동 닫기 (react-toastify 자동 처리되긴 하지만 확실히)
            toast.dismiss();

            // 토스트 띄우기 (포커스나 커서 건들지 않는 옵션)
            toast.info(
              `${lastSignal.type === 'buy' ? '📈 매수' :
                lastSignal.type === 'sell' ? '📉 매도' :
                lastSignal.type === 'stoploss_long' ? '🚫 롱 손절' :
                lastSignal.type === 'stoploss_short' ? '🚫 숏 손절' : '신호'} 발생!`,
              {
                position: 'bottom-center',
                autoClose: 4000,
                pauseOnFocusLoss: false,
                pauseOnHover: false,
                closeOnClick: false,
                draggable: false,
                theme: 'colored',
              }
            );

            // 사운드 재생
            playSound();

            // 신호 송신
            sendSignal(lastSignal.type, lastSignal.entry);

            // 중복 방지용 저장
            newUniqueSignals.forEach(sig => {
              const key = `${sig.type}-${sig.entry}-${sig.time}`;
              alertedSignals.current.add(key);
            });
          }

          return updatedDxy;
        });

        return updated;
      });
    }, 6000);

    return () => clearInterval(interval);
  }, []);  

  return (
    <>
      <div ref={containerRef} id="tradingview_chart" style={{ width: '100%', height: '100vh' }} />
      <ToastContainer />
      <TestSignalButton />
    </>
  );
};

export default DualOverlayChart;