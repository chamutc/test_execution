import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    console.log('🔌 Initializing Socket.IO connection...');
    setConnecting(true);

    const socketUrl = process.env.REACT_APP_SOCKET_URL || (
      process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:3000'
    );

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to server');
      setConnected(true);
      setConnecting(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      setConnected(false);
      setConnecting(false);
    });

    newSocket.on('connect_error', (error) => {
      console.warn('🔥 Socket connection error (this is normal if Socket.IO is not configured):', error.message);
      setConnected(false);
      setConnecting(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected to server after', attemptNumber, 'attempts');
      setConnected(true);
      setConnecting(false);
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Attempting to reconnect...', attemptNumber);
      setConnecting(true);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up socket connection');
      newSocket.close();
    };
  }, []);

  // Helper function to emit events
  const emit = useCallback((event, data) => {
    if (socket && connected) {
      socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  }, [socket, connected]);

  // Helper function to listen to events
  const on = useCallback((event, handler) => {
    if (socket) {
      socket.on(event, handler);
      return () => socket.off(event, handler);
    }
    return () => {};
  }, [socket]);

  const value = {
    socket,
    connected,
    connecting,
    emit,
    on,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
