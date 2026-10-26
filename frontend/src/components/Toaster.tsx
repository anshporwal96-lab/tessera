import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { subscribeToasts, type ToastMessage } from '../services/toast';

/** Rendered into <body> so toasts stay visible and announced while a dialog makes #root inert. */
export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  useEffect(() => subscribeToasts(setToasts), []);
  return createPortal(
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          {t.text}
        </div>
      ))}
    </div>,
    document.body,
  );
}
