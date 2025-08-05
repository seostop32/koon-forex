// src/components/signalUtils.js
import { RSI, MACD, SMA } from 'technicalindicators';

export function generateFakeCandles(count = 50, basePrice = 1.1) {
  const now = Math.floor(Date.now() / 1000);
  return Array.from({ length: count }, (_, i) => {
    const cp = basePrice + Math.random() * 0.01;
    return {
      time: now - (count - 1 - i) * 60,
      open: cp,
      high: cp + Math.random() * 0.005,
      low: cp - Math.random() * 0.005,
      close: cp,
      volume: 1000 + Math.floor(Math.random() * 500),
    };
  });
}

// 기존 generateSignals 로직 유지
export function generateSignals(candles) {
  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);
  const rsiArr = RSI.calculate({ values: closes, period: 14 });
  const macdArr = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const volMA = SMA.calculate({ values: volumes, period: 10 });

  const signals = [];
  let currentState = 'flat'; // 'flat' | 'long' | 'short'

  for (let i = 26; i < candles.length; i++) {
    const t = candles[i].time * 1000;
    const rsi = rsiArr[i - 12];
    const mac = macdArr[i - 26];
    const avgVol = volMA[i - 10];
    const vol = volumes[i];
    if (!mac || rsi == null || !avgVol) continue;

    // — 이전: Buy Entry
    if (currentState === 'flat' && mac.MACD > mac.signal && rsi < 60 && vol > avgVol * 0.8) {
      currentState = 'long';
      signals.push({ type: 'buy', entry: true, time: t });
    }
    // — 개선: Buy Exit
    else if (currentState === 'long' && (mac.MACD < mac.signal || rsi > 50)) {
      currentState = 'flat';
      signals.push({ type: 'buy', entry: false, time: t });
    }
    // — 예시: Sell Entry
    else if (currentState === 'flat' && mac.MACD < mac.signal && rsi > 40 && vol < avgVol * 1.2) {
      currentState = 'short';
      signals.push({ type: 'sell', entry: true, time: t });
    }
    // — 개선: Sell Exit
    else if (currentState === 'short' && (mac.MACD > mac.signal || rsi < 50)) {
      currentState = 'flat';
      signals.push({ type: 'sell', entry: false, time: t });
    }
  }

  return signals;
}