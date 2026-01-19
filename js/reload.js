(() => {
  'use strict';
  try {
    if (typeof io === 'undefined') {
      console.warn('Live-reload: socket.io no disponible — reload desactivado.');
      return;
    }

    const socket = io();

    socket.on('connect', () => {
      console.log('Live-reload: conectado al servidor de sockets.');
    });

    socket.on('reload', (data) => {
      console.log('🔁 Live-reload: señal recibida. Recargando página...', data);
      location.reload();
    });

    socket.on('disconnect', (reason) => {
      console.log('Live-reload: desconectado', reason);
    });

    socket.on('error', (err) => {
      console.warn('Live-reload socket error', err);
    });
  } catch (e) {
    console.warn('Live-reload error capturado', e);
  }
})();
