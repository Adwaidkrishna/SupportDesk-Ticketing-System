import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import socket from '../../../socket/socket.js';
import * as notifService from '../../../services/notification.service.js';
import { SIGNALING_EVENTS } from '../../video-call/constants/signalingEvents.js';

export const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [toastNotification, setToastNotification] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const toastTimeoutRef = useRef(null);

  // Play synthesized web audio chime on new notification
  const playChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio playback silently ignored if blocked by browser policy
    }
  }, []);

  // Fetch initial notifications and unread count
  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoading(true);
      const [notifData, count] = await Promise.all([
        notifService.getNotifications({ limit: 20 }),
        notifService.getUnreadCount(),
      ]);
      if (notifData?.notifications) {
        setNotifications(notifData.notifications);
      }
      setUnreadCount(typeof count === 'number' ? count : (notifData?.unreadCount ?? 0));
    } catch (err) {
      console.warn('[NotificationContext] Failed to load notifications:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Initial load on authentication
  useEffect(() => {
    if (isAuthenticated) {
      refreshNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setToastNotification(null);
      setIncomingCall(null);
    }
  }, [isAuthenticated, refreshNotifications]);

  // Socket.IO event listeners for real-time notifications and video calls
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const handleNewNotification = (newNotif) => {
      setNotifications((prev) => {
        // Prevent duplicate items
        const exists = prev.some((n) => (n.id || n._id) === (newNotif.id || newNotif._id));
        if (exists) return prev;
        return [newNotif, ...prev];
      });

      setUnreadCount((prev) => prev + 1);

      // Trigger floating toast
      setToastNotification(newNotif);
      playChime();

      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = setTimeout(() => {
        setToastNotification(null);
      }, 5000);
    };

    const handleCountUpdate = (data) => {
      if (typeof data?.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      }
    };

    // Global incoming video call handler for customers
    const handleIncomingCall = (callData) => {
      if (user?.role !== 'customer') return;

      console.log('[VIDEO DEBUG] Global NotificationContext received incoming call:', callData);
      setIncomingCall({
        ticketNumber: callData.ticketNumber,
        ticketId: callData.ticketId,
        ticketSubject: callData.ticketSubject,
        agentName: callData.callerName || 'Support Agent',
        callerId: callData.callerId,
      });

      playChime();
    };

    const handleCallEnded = (data) => {
      console.log('[VIDEO DEBUG] Global NotificationContext received call ended:', data);
      setIncomingCall((prev) => {
        if (!prev) return null;
        if (!data?.ticketNumber || data?.ticketNumber === prev.ticketNumber) {
          return null;
        }
        return prev;
      });
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:count', handleCountUpdate);
    socket.on(SIGNALING_EVENTS.CALL_INCOMING, handleIncomingCall);
    socket.on(SIGNALING_EVENTS.CALL_INITIATE, handleIncomingCall);
    socket.on(SIGNALING_EVENTS.CALL_ENDED, handleCallEnded);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:count', handleCountUpdate);
      socket.off(SIGNALING_EVENTS.CALL_INCOMING, handleIncomingCall);
      socket.off(SIGNALING_EVENTS.CALL_INITIATE, handleIncomingCall);
      socket.off(SIGNALING_EVENTS.CALL_ENDED, handleCallEnded);
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [isAuthenticated, user, playChime]);

  const acceptCall = useCallback(() => {
    if (!incomingCall) return null;

    const targetTicket = incomingCall.ticketNumber || incomingCall.ticketId;
    const targetId = incomingCall.ticketId || incomingCall.ticketNumber;

    socket.emit(
      SIGNALING_EVENTS.CALL_ACCEPTED,
      {
        ticketNumber: targetTicket,
        ticketId: targetId,
      },
      (res) => {
        if (res && res.success === false) {
          console.error('Call acceptance signaling failed:', res.error);
        }
      }
    );

    const callTarget = incomingCall;
    setIncomingCall(null);
    return String(callTarget.ticketNumber || callTarget.ticketId).replace('#', '');
  }, [incomingCall]);

  const declineCall = useCallback(() => {
    if (!incomingCall) return;

    const targetTicket = incomingCall.ticketNumber || incomingCall.ticketId;
    const targetId = incomingCall.ticketId || incomingCall.ticketNumber;

    socket.emit(
      SIGNALING_EVENTS.CALL_DECLINED,
      {
        ticketNumber: targetTicket,
        ticketId: targetId,
        reason: 'Customer declined call invitation',
      },
      (res) => {
        if (res && res.success === false) {
          console.error('Call decline signaling failed:', res.error);
        }
      }
    );

    setIncomingCall(null);
  }, [incomingCall]);

  const markAsRead = useCallback(async (id) => {
    try {
      await notifService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => ((n.id || n._id) === id ? { ...n, read: true, unread: false } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[NotificationContext] Failed to mark as read:', err.message);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notifService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, unread: false }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('[NotificationContext] Failed to mark all as read:', err.message);
    }
  }, []);

  const deleteNotification = useCallback(async (id) => {
    try {
      const target = notifications.find((n) => (n.id || n._id) === id);
      await notifService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => (n.id || n._id) !== id));
      if (target && !target.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('[NotificationContext] Failed to delete notification:', err.message);
    }
  }, [notifications]);

  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastNotification(null);
  }, []);

  const value = {
    notifications,
    unreadCount,
    isLoading,
    toastNotification,
    incomingCall,
    acceptCall,
    declineCall,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    dismissToast,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;
