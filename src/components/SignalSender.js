// src/components/SignalSender.js
export const sendSignal = async (signalType, price) => {
  try {
    const response = await fetch('http://localhost:5000/api/signal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ signalType, price }),
    });
    const data = await response.json();
    console.log('서버 응답:', data);
    // alert(`서버 응답: ${data.status} (${data.signal})`); // 클릭 성공 알림
  } catch (error) {
    console.error('신호 전송 실패:', error);
  }
};