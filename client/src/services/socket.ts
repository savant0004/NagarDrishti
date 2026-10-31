import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL;
    let socketOrigin = window.location.origin;
    if (configuredSocketUrl) {
      try { socketOrigin = new URL(configuredSocketUrl, window.location.origin).origin; }
      catch { socketOrigin = window.location.origin; }
    }
    socket = io(socketOrigin, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 5,
      auth: { token: sessionStorage.getItem('nagardrishti_session') },
    });

    socket.on('connect', () => {
      console.log('⚡ Socket.IO Connected to NagarDrishti Hub');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket.IO Disconnected from Hub');
    });
    socket.on('connect_error', () => {
      console.warn('Socket.IO connection failed. Sign in again or check backend availability.');
    });
  }
  return socket;
}

export function resetSocket(): void {
  socket?.disconnect();
  socket = null;
}
