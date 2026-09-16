import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthHeader from '../components/AuthHeader';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import useAuthForm from '../hooks/useAuthForm';
import { validateForgotPasswordForm } from '../auth.validation';
import { mockForgotPassword } from '../services/authMockApi';
import styles from './ForgotPassword.module.css';

/**
 * Forgot Password page.
 * User enters email to receive a password reset link.
 */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [emailSent, setEmailSent] = useState(false);

  const formState = useAuthForm(
    { email: '' },
    validateForgotPasswordForm,
  );

  const onSubmit = formState.handleSubmit(async (values) => {
    const result = await mockForgotPassword(values.email);

    if (result.success) {
      setEmailSent(true);
    }

    return result;
  });

  // Success state — email sent confirmation
  if (emailSent) {
    return (
      <div className={styles.page}>
        <AuthHeader
          title="Check your email"
          subtitle="We've sent password reset instructions"
        />
        <div className={styles.successMessage}>
          <div className={styles.successIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className={styles.successTitle}>Email sent</p>
          <p className={styles.successText}>
            We sent a password reset link to{' '}
            <strong>{formState.values.email}</strong>. Check your inbox and
            follow the instructions.
          </p>
          <Button
            variant="primary"
            fullWidth
            large
            onClick={() => navigate('/reset-password')}
          >
            Continue to reset password
          </Button>
          <Link to="/login" className={styles.backLink}>
            ← Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <AuthHeader
        title="Forgot password?"
        subtitle="Enter your email and we'll send you a reset link"
      />

      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {/* Server error */}
        {formState.serverError && (
          <div className={styles.serverError} role="alert">
            {formState.serverError}
          </div>
        )}

        {/* Email */}
        <Input
          id="forgot-email"
          name="email"
          type="email"
          label="Email"
          placeholder="you@company.com"
          autoComplete="email"
          value={formState.values.email}
          onChange={formState.handleChange}
          onBlur={formState.handleBlur}
          error={formState.touched.email ? formState.errors.email : ''}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          }
        />

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          fullWidth
          large
          loading={formState.isSubmitting}
        >
          Send reset link →
        </Button>

        {/* Back link */}
        <Link to="/login" className={styles.backLink}>
          ← Back to sign in
        </Link>
      </form>
    </div>
  );
}
