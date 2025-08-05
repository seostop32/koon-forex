import React from 'react';
import MobileToastTest from './components/MobileToastTest';
import DualOverlayChart from './components/DualOverlayChart'; // 예전 차트

function App() {
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  return (
    <>
      {isMobile ? <MobileToastTest /> : <DualOverlayChart />}
    </>
  );
}

export default App;