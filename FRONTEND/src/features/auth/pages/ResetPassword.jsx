import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthHeader from '../components/AuthHeader';
import Button from '../../../components/common/Button';
import PasswordInput from '../components/PasswordInput';
import PasswordStrength from '../components/PasswordStrength';
import useAuthForm from '../hooks/useAuthForm';
import { validateResetPasswordForm } from '../auth.validation';
import { mockResetPassword } from '../services/authMockApi';
import styles from './ResetPassword.module.css';

/**
 * Reset Password page.
 * User sets a new password after receiving the reset link.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [isReset, setIsReset] = useState(false);

  const formState = useAuthForm(
    { password: '', confirmPassword: '' },
    validateResetPasswordForm,
  );

  const onSubmit = formState.handleSubmit(async (values) => {
    // In a real app, the token would come from URL params
    const result = await mockResetPassword('mock-token', values.password);

    if (result.success) {
      setIsReset(true);
    }

    return result;
  });

  // Success state
  if (isReset) {
    return (
      <div className={styles.page}>
        <AuthHeader
          title="Password reset"
          subtitle="Your password has been successfully changed"
        />
        <div className={styles.successMessage}>
          <div className={styles.successIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className={styles.successTitle}>All set!</p>
          <p className={styles.successText}>
            Your password has been reset successfully. You can now sign in with
            your new password.
          </p>
          <Button
            variant="primary"
            fullWidth
            large
            onClick={() => navigate('/login')}
          >
            Continue to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <AuthHeader
        title="Set new password"
        subtitle="Create a strong password for your account"
      />

      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {/* Server error */}
        {formState.serverError && (
          <div className={styles.serverError} role="alert">
            {formState.serverError}
          </div>
        )}

        {/* New password with strength */}
        <div className={styles.passwordGroup}>
          <PasswordInput
            id="reset-password"
            name="password"
            label="New password"
            placeholder="Create a strong password"
            autoComplete="new-password"
            value={formState.values.password}
            onChange={formState.handleChange}
            onBlur={formState.handleBlur}
            error={formState.touched.password ? formState.errors.password : ''}
          />
          <PasswordStrength password={formState.values.password} />
        </div>

        {/* Confirm password */}
        <PasswordInput
          id="reset-confirm-password"
          name="confirmPassword"
          label="Confirm new password"
          placeholder="Repeat your password"
          autoComplete="new-password"
          value={formState.values.confirmPassword}
          onChange={formState.handleChange}
          onBlur={formState.handleBlur}
          error={
            formState.touched.confirmPassword
              ? formState.errors.confirmPassword
              : ''
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
          Reset password →
        </Button>

        {/* Back link */}
        <Link to="/login" className={styles.backLink}>
          ← Back to sign in
        </Link>
      </form>
    </div>
  );
}
