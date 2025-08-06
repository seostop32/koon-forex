import React from 'react';
import DualOverlayChart from './components/DualOverlayChart'; // 경로는 네 파일 위치에 맞게 수정해줘
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  React.useEffect(() => {
    toast.info('앱 시작 테스트 알림!', { position: 'bottom-center' });
  }, []);

  return (
    <>
      <DualOverlayChart />

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
        style={{ zIndex: 99999 }}
      />
    </>
  );
}

export default App;