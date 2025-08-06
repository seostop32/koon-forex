import React from 'react';
import MobileToastTest from './components/MobileToastTest';
import DualOverlayChart from './components/DualOverlayChart';

function App() {
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  console.log('📱 isMobile:', isMobile, navigator.userAgent);

  return (
    <>
      {isMobile ? <MobileToastTest /> : <DualOverlayChart />}
    </>
  );
}

export default App;