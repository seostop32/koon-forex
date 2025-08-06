import React, { useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MobileToastTest = () => {
  useEffect(() => {
    toast.info('✅ 모바일 알림 테스트!');
    console.log('✅ MobileToastTest 렌더됨');
  }, []);

  return (
    <div style={{ padding: 20, background: '#fffae6' }}>
      <h1>📱 Mobile 컴포넌트</h1>
      <ToastContainer />
    </div>
  );
};

export default MobileToastTest;