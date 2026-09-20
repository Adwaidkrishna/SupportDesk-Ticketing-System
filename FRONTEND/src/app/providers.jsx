import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../features/auth/context/AuthContext';
import { NotificationProvider } from '../features/notifications/context/NotificationContext';
import NotificationToast from '../features/notifications/components/NotificationToast';

/**
 * App-level providers wrapper.
 * Wraps with BrowserRouter, AuthProvider, and NotificationProvider.
 */
export default function Providers({ children }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          {children}
          <NotificationToast />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

