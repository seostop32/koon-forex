import { RSI, MACD, SMA } from 'technicalindicators';

// ====== 캔들 데이터 생성 ======
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

// ====== 시그널 상태 저장 변수 ======
let currentState = 'flat'; // flat | long | short
let entryPrice = null;
let lastSignalTime = 0;

// ====== 시그널 생성 함수 ======
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

  const tickSize = 0.0001;
  const minProfit = tickSize * 5;

  for (let i = 26; i < candles.length; i++) {
    const t = candles[i].time * 1000;
    if (t <= lastSignalTime) continue;

    const rsi = rsiArr[i - 12];
    const mac = macdArr[i - 26];
    const avgVol = volMA[i - 10];
    const vol = volumes[i];
    const price = candles[i].close;

    if (!mac || rsi == null || !avgVol) continue;

    // 📈 Buy Entry
    if (currentState === 'flat' && mac.MACD > mac.signal && rsi < 60 && vol > avgVol * 0.8) {
      currentState = 'long';
      entryPrice = price;
      lastSignalTime = t;
      signals.push({ type: 'buy', entry: true, time: t, price });
    }

    // 📉 Buy Exit (5틱 이상 수익)
    else if (currentState === 'long' && price >= entryPrice + minProfit) {
      currentState = 'flat';
      entryPrice = null;
      lastSignalTime = t;
      signals.push({ type: 'buy', entry: false, time: t, price });
    }

    // 📉 Sell Entry
    else if (currentState === 'flat' && mac.MACD < mac.signal && rsi > 40 && vol < avgVol * 1.2) {
      currentState = 'short';
      entryPrice = price;
      lastSignalTime = t;
      signals.push({ type: 'sell', entry: true, time: t, price });
    }

    // 📈 Sell Exit (5틱 이상 수익)
    else if (currentState === 'short' && price <= entryPrice - minProfit) {
      currentState = 'flat';
      entryPrice = null;
      lastSignalTime = t;
      signals.push({ type: 'sell', entry: false, time: t, price });
    }
  }

  return signals;
}

// ====== 실시간 시뮬레이션 예제 ======
let candles = generateFakeCandles(50);

function showAlert(signal, realTimePrice) {
  const action = signal.entry ? '진입' : '청산';
  const type = signal.type === 'buy' ? '매수' : '매도';
  alert(`[${type}] ${action} 신호 발생 - 시그널가격: ${signal.price.toFixed(5)}, 현재가: ${realTimePrice.toFixed(5)} (${new Date(signal.time).toLocaleTimeString()})`);
}

setInterval(() => {
  const lastPrice = candles[candles.length - 1].close;
  const newCandle = generateFakeCandles(1, lastPrice)[0];
  candles.push(newCandle);
  candles = candles.slice(-50);

  const newSignals = generateSignals(candles);
  newSignals.forEach(showAlert);
}, 10000);