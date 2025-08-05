// src/App.js
import React, { useState, useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import DualOverlayChart from './components/DualOverlayChart';
import TradeAlert from './components/TradeAlert';
import { generateFakeCandles, generateSignals } from './components/signalUtils';

function App() {
  const [signals, setSignals] = useState([]);

  useEffect(() => {
    const candles = generateFakeCandles();
    const sigs = generateSignals(candles);
    setSignals(sigs);
  }, []);

  return (
    <ErrorBoundary>
      <DualOverlayChart signals={signals} />
      <TradeAlert signals={signals} />
    </ErrorBoundary>
  );
}

export default App;