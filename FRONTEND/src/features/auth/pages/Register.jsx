import { useNavigate } from 'react-router-dom';
import AuthHeader from '../components/AuthHeader';
import RegisterForm from '../components/RegisterForm';
import useAuthForm from '../hooks/useAuthForm';
import { validateRegisterForm } from '../auth.validation';
import { mockRegister } from '../services/authMockApi';
import styles from './Register.module.css';

/**
 * Register page.
 * Handles account creation and navigates to OTP on success.
 */
export default function Register() {
  const navigate = useNavigate();

  const formState = useAuthForm(
    { name: '', email: '', password: '', confirmPassword: '' },
    validateRegisterForm,
  );

  const onSubmit = formState.handleSubmit(async (values) => {
    const result = await mockRegister({
      name: values.name,
      email: values.email,
      password: values.password,
    });

    if (result.success) {
      // Navigate to OTP verification with the email
      navigate('/verify-otp', { state: { email: values.email } });
    }

    return result;
  });

  return (
    <div className={styles.page}>
      <AuthHeader
        title="Create account"
        subtitle="Get started with SupportDesk"
      />
      <RegisterForm formState={formState} onSubmit={onSubmit} />
    </div>
  );
}
