import React, { useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MobileToastTest = () => {
  useEffect(() => {
    toast.info('✅ 모바일 알림 테스트!', {
      position: 'bottom-center',
      autoClose: 3000,
      pauseOnHover: false,
      closeOnClick: true,
      draggable: true,
      theme: 'colored',
    });
    console.log('✅ MobileToastTest 렌더됨');
  }, []);

  return (
    <div style={{ padding: 20, background: '#fffae6', minHeight: '100vh' }}>
      <h1>📱 Mobile 컴포넌트</h1>
      <ToastContainer
        position="bottom-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        style={{ zIndex: 99999, position: 'fixed' }} // 포지션도 fixed로 바꿔보기
      />
    </div>
  );
};

export default MobileToastTest;