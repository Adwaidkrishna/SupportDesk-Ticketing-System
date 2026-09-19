import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthHeader from '../components/AuthHeader';
import LoginForm from '../components/LoginForm';
import useAuthForm from '../hooks/useAuthForm';
import { validateLoginForm } from '../auth.validation';
import { login as loginService } from '../services/auth.service';
import { useAuth } from '../context/AuthContext';
import devTestUsers from '../../../config/devTestUsers';
import styles from './Login.module.css';

/**
 * Login page.
 * Authenticates user, updates auth context, and routes to role-specific dashboard.
 * Includes a development-only Quick Login dropdown for test convenience.
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: setAuthSession } = useAuth();

  const [selectedAccount, setSelectedAccount] = useState('');

  const formState = useAuthForm(
    { email: '', password: '', rememberMe: false },
    validateLoginForm,
  );

  const isDev = Boolean(import.meta.env.DEV);

  const handleQuickLoginChange = (e) => {
    const selectedEmail = e.target.value;
    setSelectedAccount(selectedEmail);

    if (!selectedEmail) {
      formState.setValue('email', '');
      formState.setValue('password', '');
      return;
    }

    const found = devTestUsers.find((u) => u.email === selectedEmail);
    if (found) {
      formState.setValue('email', found.email);
      formState.setValue('password', found.password);
    }
  };

  const onSubmit = formState.handleSubmit(async (values) => {
    try {
      const result = await loginService({
        email: values.email,
        password: values.password,
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
            email: values.email,
            message: 'Please verify your OTP to activate your account.',
          },
        });
        return;
      }
      throw err;
    }
  });

  return (
    <div className={styles.page}>
      <AuthHeader
        title="Welcome back"
        subtitle="Sign in to your SupportDesk account"
      />

      {/* Quick Login (Development Testing Only) */}
      {isDev && (
        <div className={styles.quickLoginBox}>
          <div className={styles.quickLoginHeader}>
            <span className={styles.quickLoginLabel}>⚡ Quick Login (Development)</span>
            <span className={styles.quickLoginBadge}>DEV ONLY</span>
          </div>
          <p className={styles.quickLoginHelper}>
            Testing convenience — development only
          </p>
          <select
            id="quick-login-select"
            className={styles.quickLoginSelect}
            value={selectedAccount}
            onChange={handleQuickLoginChange}
            aria-label="Quick Login test account selector"
          >
            <option value="">Select test account</option>
            {devTestUsers.map((user) => (
              <option key={user.email} value={user.email}>
                {user.label} ({user.role})
              </option>
            ))}
          </select>
        </div>
      )}

      <LoginForm formState={formState} onSubmit={onSubmit} />
    </div>
  );
}
