import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';

/**
 * Route wrapper that prevents authenticated users from viewing guest/auth pages.
 * Redirects authenticated users to their corresponding dashboard based on their role.
 */
export default function GuestRoute() {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-bg-primary, #090d16)',
          color: 'var(--color-text-secondary, #94a3b8)',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            border: '3px solid rgba(255, 255, 255, 0.1)',
            borderTopColor: 'var(--color-accent, #3b82f6)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }}
        />
        <span style={{ fontSize: '0.875rem', letterSpacing: '0.02em' }}>
          Loading SupportDesk...
        </span>
      </div>
    );
  }

  if (isAuthenticated) {
    const redirectMap = {
      customer: '/customer/dashboard',
      agent: '/agent/dashboard',
      admin: '/admin/dashboard',
    };
    return <Navigate to={redirectMap[role] || '/customer/dashboard'} replace />;
  }

  return <Outlet />;
}
