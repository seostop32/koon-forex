// TradeAlert.js
import React, { useEffect, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function TradeAlert({ signals }) {
  const shown = useRef(new Set());

  useEffect(() => {
    signals.forEach(sig => {
      const key = `${sig.type}-${sig.entry}-${sig.time}`;
      if (shown.current.has(key)) return;
      shown.current.add(key);

      const label =
        sig.type === 'buy'
          ? sig.entry ? '매수진입' : '매수청산'
          : sig.entry ? '매도진입' : '매도청산';

      const msg = `${label} @ ${new Date(sig.time).toLocaleTimeString()}`;
      const fn = sig.type === 'buy' ? toast.success : toast.error;

      fn(msg, {
        position: 'top-center',  // toast.POSITION → string
        autoClose: 2000,
        hideProgressBar: true,
        pauseOnHover: true,
      });
    });
  }, [signals]);

  return <ToastContainer limit={1} />;
}