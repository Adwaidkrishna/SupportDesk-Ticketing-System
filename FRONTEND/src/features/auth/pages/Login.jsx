import { useNavigate } from 'react-router-dom';
import AuthHeader from '../components/AuthHeader';
import LoginForm from '../components/LoginForm';
import useAuthForm from '../hooks/useAuthForm';
import { validateLoginForm } from '../auth.validation';
import { mockLogin } from '../services/authMockApi';
import styles from './Login.module.css';

/**
 * Login page.
 * Handles sign-in with email + password via mock API.
 */
export default function Login() {
  const navigate = useNavigate();

  const formState = useAuthForm(
    { email: '', password: '', rememberMe: false },
    validateLoginForm,
  );

  const onSubmit = formState.handleSubmit(async (values) => {
    const result = await mockLogin(values.email, values.password);

    if (result.success) {
      // In a real app, store token and redirect to dashboard
      navigate('/customer/dashboard');
    }

    return result;
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
