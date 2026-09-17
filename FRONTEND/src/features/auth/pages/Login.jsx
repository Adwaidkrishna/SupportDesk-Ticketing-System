import { useNavigate, useLocation } from 'react-router-dom';
import AuthHeader from '../components/AuthHeader';
import LoginForm from '../components/LoginForm';
import useAuthForm from '../hooks/useAuthForm';
import { validateLoginForm } from '../auth.validation';
import { login as loginService } from '../services/auth.service';
import { useAuth } from '../context/AuthContext';
import styles from './Login.module.css';

/**
 * Login page.
 * Authenticates user, updates auth context, and routes to role-specific dashboard.
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: setAuthSession } = useAuth();

  const formState = useAuthForm(
    { email: '', password: '', rememberMe: false },
    validateLoginForm,
  );

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
      <LoginForm formState={formState} onSubmit={onSubmit} />
    </div>
  );
}
