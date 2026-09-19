import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const socket = io(SOCKET_URL, {
  autoConnect: false,
});

export const connectSocket = () => {
  const token = localStorage.getItem('token');
  if (!token || token === 'null' || token === 'undefined') {
    return;
  }

  // Idempotency guard: prevent duplicate socket connections
  if (socket.connected || socket.active) {
    return;
  }

  socket.auth = {
    token,
  };

  socket.connect();
};

export const disconnectSocket = () => {
  if (socket.connected || socket.active) {
    socket.disconnect();
  }
};

export default socket;

