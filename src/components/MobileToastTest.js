// src/components/MobileToastTest.js
import React, { useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MobileToastTest = () => {
  useEffect(() => {
    toast.info('📱 모바일 테스트 알림!');
  }, []);

  return (
    <div>
      <h2>📱 MobileToastTest 컴포넌트</h2>
      <ToastContainer />
    </div>
  );
};

export default MobileToastTest;