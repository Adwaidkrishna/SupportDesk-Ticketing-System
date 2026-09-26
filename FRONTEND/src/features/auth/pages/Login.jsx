import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthHeader from '../components/AuthHeader';
import LoginForm from '../components/LoginForm';
import useAuthForm from '../hooks/useAuthForm';
import { validateLoginForm } from '../auth.validation';
import { login as loginService } from '../services/auth.service';
import { useAuth } from '../context/AuthContext';
import { getDevTestUser } from '../../../config/devTestUsers';
import styles from './Login.module.css';

/**
 * Login page.
 * Authenticates user, updates auth context, and routes to role-specific dashboard.
 * Supports standard form login and development-only Quick Developer Login.
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: setAuthSession } = useAuth();

  const [quickLoading, setQuickLoading] = useState(false);

  const formState = useAuthForm(
    { email: '', password: '', rememberMe: false },
    validateLoginForm,
  );

  /**
   * Unified authentication execution routine.
   * Shared by both normal form submission and Quick Developer Login.
   */
  const executeAuthentication = async ({ email, password }) => {
    try {
      const result = await loginService({
        email,
        password,
      });

      if (result.success && result.token && result.user) {
        setAuthSession(result.token, result.user);

        // Check if there was a redirected location in state
        const from = location.state?.from?.pathname;

        const role = result.user.role;
        const roleRedirectMap = {
          customer: '/customer/dashboard',
          agent: '/agent/dashboard',
          admin: '/admin/dashboard',
        };

        const target = from || roleRedirectMap[role] || '/customer/dashboard';
        navigate(target, { replace: true });
      }

      return result;
    } catch (err) {
      if (err.requiresOtp) {
        // Unverified account: redirect to OTP verification with the email
        navigate('/verify-otp', {
          state: {
            email,
            message: 'Please verify your OTP to activate your account.',
          },
        });
        return;
      }
      throw err;
    }
  };

  /**
   * Normal login form submit handler.
   */
  const onSubmit = formState.handleSubmit(async (values) => {
    return executeAuthentication({
      email: values.email,
      password: values.password,
    });
  });

  /**
   * Quick Developer Login handler for dev/testing only.
   * Reads credentials from VITE_DEV_* environment variables and runs through legitimate login.
   */
  const handleQuickLogin = async (role) => {
    const devUser = getDevTestUser(role);

    if (!devUser?.email || !devUser?.password) {
      formState.setServerError(
        `Development credentials for "${role}" are not configured in FRONTEND/.env (VITE_DEV_${role.toUpperCase()}_EMAIL / PASSWORD)`
      );
      return;
    }

    try {
      setQuickLoading(true);
      formState.setServerError('');
      await executeAuthentication({
        email: devUser.email,
        password: devUser.password,
      });
    } catch (err) {
      const msg = err?.message || `Failed to log in as ${role}`;
      formState.setServerError(msg);
    } finally {
      setQuickLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <AuthHeader
        title="Welcome back"
        subtitle="Sign in to your SupportDesk account"
      />

      <LoginForm
        formState={formState}
        onSubmit={onSubmit}
        onQuickLogin={handleQuickLogin}
        quickLoading={quickLoading}
      />
    </div>
  );
}
