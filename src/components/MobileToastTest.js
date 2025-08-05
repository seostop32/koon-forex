import React, { useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MobileToastTest = () => {
  useEffect(() => {
    toast.info('모바일 테스트 얼러트! 🎉', {
      position: 'top-center',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnFocusLoss: false,
      pauseOnHover: false,
      draggable: true,
      theme: 'colored',
      style: { fontSize: '18px', fontWeight: 'bold' },
    });
  }, []);

  return (
    <>
      <div style={{ padding: 20 }}>
        <h1>React Toastify 모바일 테스트</h1>
        <p>페이지 로드 시 토스트가 자동으로 뜹니다.</p>
      </div>
      <ToastContainer />
    </>
  );
};

export default MobileToastTest;