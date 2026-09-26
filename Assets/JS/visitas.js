(() => {
  'use strict';

  // No cuenta el panel privado del administrador.
  if (location.pathname.startsWith('/admin/')) return;

  const storageKey = 'vitra_visitor_id';
  let visitorId = localStorage.getItem(storageKey);

  if (!visitorId) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      visitorId = window.crypto.randomUUID();
    } else {
      visitorId = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    }
    localStorage.setItem(storageKey, visitorId);
  }

  fetch('/api/registrar_visita.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitor_id: visitorId,
      pagina: location.pathname
    }),
    keepalive: true,
    credentials: 'same-origin'
  }).catch(() => {
    // El contador nunca debe impedir que la web funcione.
  });
})();
