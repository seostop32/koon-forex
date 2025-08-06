import React from 'react';
import MobileToastTest from './components/MobileToastTest';
import DualOverlayChart from './components/DualOverlayChart'; // 예전 차트

function App() {
  const isMobile = true; // ← 이거만 남겨!
  console.log('isMobile:', isMobile, navigator.userAgent);

  return (
    <>
      {isMobile ? <MobileToastTest /> : <DualOverlayChart />}
    </>
  );
}

export default App;