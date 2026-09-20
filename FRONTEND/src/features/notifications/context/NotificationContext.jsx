import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import socket from '../../../socket/socket.js';
import * as notifService from '../../../services/notification.service.js';

export const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [toastNotification, setToastNotification] = useState(null);
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
    }
  }, [isAuthenticated, refreshNotifications]);

  // Socket.IO event listeners for real-time notifications
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

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:count', handleCountUpdate);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:count', handleCountUpdate);
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [isAuthenticated, user, playChime]);

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
