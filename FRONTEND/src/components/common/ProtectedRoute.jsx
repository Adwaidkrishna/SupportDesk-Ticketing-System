import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';

/**
 * Route wrapper that requires authentication and optionally verifies role authorization.
 *
 * @param {string[]} [allowedRoles] - Optional list of allowed roles (e.g. ['admin'])
 */
export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

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

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Role-based redirect fallback to appropriate dashboard
    const redirectMap = {
      customer: '/customer/dashboard',
      agent: '/agent/dashboard',
      admin: '/admin/dashboard',
    };
    const destination = redirectMap[role] || '/login';
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}
