// TestSignalButton.js
import React from 'react';
import { sendSignal } from './SignalSender';

const TestSignalButton = () => {
  const handleClick = () => {
    sendSignal('buy', 1.2345);
  };

  return (
    <button onClick={handleClick} style={{ position: 'fixed', top: 10, right: 10, zIndex: 1000 }}>
      테스트 신호 보내기
    </button>
  );
};

export default TestSignalButton;