// DualOverlayChart.js
import React, { useEffect, useRef, useState } from 'react';
import { RSI, MACD, SMA, IchimokuCloud } from 'technicalindicators';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// EUR/USD 가짜 캔들 생성 함수
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

// 달러인덱스(DXY) 가짜 데이터 생성 (USD 강세로 EUR/USD 반대 움직임 시뮬)
const generateFakeDXY = (count = 50, startPrice = 105) => {
  const now = Math.floor(Date.now() / 1000);
  return Array.from({ length: count }, (_, i) => {
    // DXY와 EUR/USD 반대 움직임 반영 (랜덤에서 반대 방향 조정)
    const cp = startPrice + (Math.random() - 0.5) * 0.05;
    return {
      time: now - (count - 1 - i) * 60,
      open: cp,
      high: cp + Math.random() * 0.02,
      low: cp - Math.random() * 0.02,
      close: cp,
      volume: 2000 + Math.floor(Math.random() * 1000),
    };
  });
};

// 신호 생성 함수: EUR/USD와 DXY 신호 합성
const generateSignals = (eurCandles, dxyCandles) => {
  const eurCloses = eurCandles.map(c => c.close);
  const dxyCloses = dxyCandles.map(c => c.close);

  const eurVolumes = eurCandles.map(c => c.volume);
  const dxyVolumes = dxyCandles.map(c => c.volume);

  // 지표 계산
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

  // i는 26부터 (MACD slowPeriod 인덱스 보정)
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
    // EUR/USD 매수 신호면 DXY 매도 신호가 맞아야 함 (달러 인덱스와 반대 방향)
    const combinedBuy = eurBuySignal && dxySellSignal;
    const combinedSell = eurSellSignal && dxyBuySignal;

    if (currentState === 'flat') {
      if (combinedSell) {
        currentState = 'short';
        entryPrice = price;
        signals.push({ type: 'sell', entry: true, time, price });
      } else if (combinedBuy) {
        currentState = 'long';
        entryPrice = price;
        signals.push({ type: 'buy', entry: true, time, price });
      }
    } else if (currentState === 'long') {
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

    // 골든/데드 크로스 신호 (EUR/USD 10/20 SMA)
    // 골든크로스: 10 SMA가 20 SMA를 아래서 위로 교차
    // 데드크로스: 10 SMA가 20 SMA를 위에서 아래로 교차
  }

  // SMA 계산 후 골든/데드 크로스 시그널 추가
  const closePrices = eurCloses;
  const sma10 = SMA.calculate({ values: closePrices, period: 10 });
  const sma20 = SMA.calculate({ values: closePrices, period: 20 });

  for (let i = 1; i < sma10.length; i++) {
    const prev10 = sma10[i - 1];
    const prev20 = sma20[i - 1];
    const curr10 = sma10[i];
    const curr20 = sma20[i];

    if (prev10 < prev20 && curr10 >= curr20) {
      // 골든 크로스 발생
      const crossTime = eurCandles[i + 10].time * 1000; // sma10 index offset 보정
      signals.push({ type: 'golden', entry: null, time: crossTime, price: closePrices[i + 10] });
    } else if (prev10 > prev20 && curr10 <= curr20) {
      // 데드 크로스 발생
      const crossTime = eurCandles[i + 10].time * 1000;
      signals.push({ type: 'dead', entry: null, time: crossTime, price: closePrices[i + 10] });
    }
  }

  // signals 시간 순 정렬
  signals.sort((a, b) => a.time - b.time);

  return signals;
};

const DualOverlayChart = () => {
  const containerRef = useRef(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: window.innerHeight });
  const [eurCandles, setEurCandles] = useState(generateFakeCandles(80));
  const [dxyCandles, setDxyCandles] = useState(generateFakeDXY(80));
  const [signals, setSignals] = useState([]);
  const [ichimokuData, setIchimokuData] = useState([]);
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

  const calculateIchimoku = (candles) => {
    return IchimokuCloud.calculate({
      high: candles.map(c => c.high),
      low: candles.map(c => c.low),
      conversionPeriod: 9,
      basePeriod: 26,
      spanPeriod: 52,
      displacement: 26,
    });
  };

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      setChartSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight || window.innerHeight,
      });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

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
          autosize: true,  // true로 바꿔보기
          hide_top_toolbar: true,
          timezone: 'Asia/Seoul',
          style: 1,
        });

        widget.onChartReady(() => {
          const chart = widget.chart();
          chart.createStudy("Ichimoku Cloud", false, true);
          chart.createStudy('Moving Average', false, true, [10], {});
          chart.createStudy('Moving Average', false, true, [20], {});
          chart.createStudy('Moving Average', false, true, [60], {});
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

  // 실시간 데이터 업데이트 (가짜)
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
          const ichimoku = calculateIchimoku(updated);
          setIchimokuData(ichimoku);

          const lastTime = updated[updated.length - 1].time * 1000;
          newSignals.forEach(sig => {
            const key = `${sig.type}-${sig.entry}-${sig.time}`;
            const isRecent = sig.time >= lastTime - 15000 && sig.time <= lastTime;
            if (!alertedSignals.current.has(key) && isRecent) {
              playSound();
              toast.info(
                `${sig.type === 'buy' ? '매수' : sig.type === 'sell' ? '매도' : sig.type === 'golden' ? '골든크로스' : '데드크로스'} 신호 발생!`,
                { position: 'bottom-center', theme: 'colored' }
              );
              alertedSignals.current.add(key);
            }
          });

          setSignals(newSignals);
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