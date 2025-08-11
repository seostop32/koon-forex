// App.js
import React from 'react';
import DualOverlayChart from './components/DualOverlayChart';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <>
      <DualOverlayChart />
      <ToastContainer />
    </>
  );
}

export default App;