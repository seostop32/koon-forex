// DualOverlayChart.js
import React, { useEffect, useRef, useState } from 'react';
import { RSI, MACD, SMA, IchimokuCloud } from 'technicalindicators';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// EUR/USD 가짜 캔들 생성 함수
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

// 달러인덱스(DXY) 가짜 데이터 생성 (USD 강세로 EUR/USD 반대 움직임 시뮬)
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

// 신호 생성 함수: EUR/USD와 DXY 신호 합성 (개선 버전)
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

    // EUR/USD 신호
    const eurBuySignal = eMACD.MACD < eMACD.signal && eRSI > 40 && eVol < eVolMA * 1.2;
    const eurSellSignal = eMACD.MACD > eMACD.signal && eRSI < 60 && eVol > eVolMA * 0.8;

    // DXY 신호 (달러 강세면 매수 신호, 반대면 매도 신호)
    const dxyBuySignal = dMACD.MACD > dMACD.signal && dRSI < 60 && dVol > dVolMA * 0.8;
    const dxySellSignal = dMACD.MACD < dMACD.signal && dRSI > 40 && dVol < dVolMA * 1.2;

    // 복합 신호 판단 (EUR/USD 신호와 DXY 신호 반대인지 확인)
    const combinedBuy = eurBuySignal && dxySellSignal;
    const combinedSell = eurSellSignal && dxyBuySignal;

    // 쿨다운 체크
    if (currentState === 'flat' && (time - lastEntryTime < cooldownMs)) {
      // 쿨다운 중이므로 진입 신호 무시
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
      // 수익 실현 or 손절 조건 추가
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

  // SMA 골든/데드 크로스 추가 (기존과 동일)
  const closePrices = eurCloses;
  const sma10 = SMA.calculate({ values: closePrices, period: 10 });
  const sma20 = SMA.calculate({ values: closePrices, period: 20 });

  for (let i = 1; i < sma10.length; i++) {
    const prev10 = sma10[i - 1];
    const prev20 = sma20[i - 1];
    const curr10 = sma10[i];
    const curr20 = sma20[i];

    if (prev10 < prev20 && curr10 >= curr20) {
      const crossTime = eurCandles[i + 10].time * 1000;
      signals.push({ type: 'golden', entry: null, time: crossTime, price: closePrices[i + 10] });
    } else if (prev10 > prev20 && curr10 <= curr20) {
      const crossTime = eurCandles[i + 10].time * 1000;
      signals.push({ type: 'dead', entry: null, time: crossTime, price: closePrices[i + 10] });
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
    const enableAudio = () => {
      const audio = new Audio('/notify.mp3');
      audio.play().catch(() => {});
      window.removeEventListener('click', enableAudio);
    };
    window.addEventListener('click', enableAudio);
  }, []);

  // TradingView 차트 로드 & 10/20/60 이동평균선 + 이치모쿠 추가
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.TradingView && containerRef.current) {
        const widget = new window.TradingView.widget({
          symbol: 'FX:EURUSD',
          interval: '1',
          container_id: 'tradingview_chart',
          width: containerRef.current.clientWidth,
          height: window.innerHeight,
          theme: 'light',
          locale: 'en',
          autosize: false,
          hide_top_toolbar: true,
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

  // 실시간 데이터 업데이트 시뮬레이션 및 신호 생성
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

          // 최근 신호 알림 및 사운드 재생
          const lastTime = updated[updated.length - 1].time * 1000;
          newSignals.forEach(sig => {
            const key = `${sig.type}-${sig.entry}-${sig.time}`;
            const isRecent = sig.time >= lastTime - 15000 && sig.time <= lastTime;
            if (!alertedSignals.current.has(key) && isRecent) {
              playSound();
              if (sig.type === 'buy' || sig.type === 'golden') {
                toast.error(
                  `${sig.type === 'buy' ? '매수' : '골든크로스'} 신호 발생! 가격: ${sig.price.toFixed(5)} 시간: ${new Date(sig.time).toLocaleTimeString()}`,
                  { position: 'bottom-center', theme: 'colored' }
                );
              } else if (sig.type === 'sell' || sig.type === 'dead') {
                toast.info(
                  `${sig.type === 'sell' ? '매도' : '데드크로스'} 신호 발생! 가격: ${sig.price.toFixed(5)} 시간: ${new Date(sig.time).toLocaleTimeString()}`,
                  { position: 'bottom-center', theme: 'colored' }
                );
              } else if ((sig.type === 'buy' && sig.entry === false) || (sig.type === 'sell' && sig.entry === false)) {
                toast.success(
                  `${sig.type === 'buy' ? '매수 청산' : '매도 청산'} 신호 발생! 가격: ${sig.price.toFixed(5)} 시간: ${new Date(sig.time).toLocaleTimeString()}`,
                  { position: 'bottom-center', theme: 'colored' }
                );
              }
              alertedSignals.current.add(key);
            }
          });

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
      <ToastContainer position="bottom-center" />
    </>
  );
};

export default DualOverlayChart;