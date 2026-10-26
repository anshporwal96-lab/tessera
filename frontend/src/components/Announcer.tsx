import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { subscribeAnnouncements } from '../services/announcer';

/**
 * Visually hidden live region. Rendered into <body> (outside #root) so it keeps
 * announcing while a dialog makes the rest of the app inert.
 */
export function Announcer() {
  const [message, setMessage] = useState('');
  useEffect(
    () =>
      subscribeAnnouncements((m) => {
        // Clear first so repeating the same text is announced again.
        setMessage('');
        window.setTimeout(() => setMessage(m), 50);
      }),
    [],
  );
  return createPortal(
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>,
    document.body,
  );
}
