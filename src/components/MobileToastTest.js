import React, { useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MobileToastTest = () => {
  useEffect(() => {
    toast.info('모바일 토스트 테스트 알림!', {
      position: 'bottom-center',
      autoClose: 3000,
    });
  }, []);

  return <ToastContainer />;
};

export default MobileToastTest;