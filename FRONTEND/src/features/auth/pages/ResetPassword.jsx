import { useState } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import AuthHeader from '../components/AuthHeader';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import PasswordInput from '../components/PasswordInput';
import PasswordStrength from '../components/PasswordStrength';
import useAuthForm from '../hooks/useAuthForm';
import { validateResetPasswordForm } from '../auth.validation';
import { resetPassword as resetPasswordService } from '../services/auth.service';
import styles from './ResetPassword.module.css';

/**
 * Reset Password page.
 * User enters their email, the reset token from their email, and sets a new password.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isReset, setIsReset] = useState(false);

  const initialEmail =
    location.state?.email || searchParams.get('email') || '';
  const initialToken = searchParams.get('token') || '';

  const formState = useAuthForm(
    {
      email: initialEmail,
      token: initialToken,
      password: '',
      confirmPassword: '',
    },
    validateResetPasswordForm,
  );

  const onSubmit = formState.handleSubmit(async (values) => {
    const result = await resetPasswordService({
      email: values.email,
      token: values.token,
      newPassword: values.password,
    });

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
        subtitle="Enter the reset token sent to your email and your new password"
      />

      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {/* Server error */}
        {formState.serverError && (
          <div className={styles.serverError} role="alert">
            {formState.serverError}
          </div>
        )}

        {/* Account Email */}
        <Input
          id="reset-email"
          name="email"
          type="email"
          label="Account Email"
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

        {/* Reset Token Input */}
        <Input
          id="reset-token"
          name="token"
          type="text"
          label="Reset Token"
          placeholder="Paste the reset token from your email"
          autoComplete="off"
          value={formState.values.token}
          onChange={formState.handleChange}
          onBlur={formState.handleBlur}
          error={formState.touched.token ? formState.errors.token : ''}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          }
        />

        {/* New password with strength */}
        <div className={styles.passwordGroup}>
          <PasswordInput
            id="reset-password"
            name="password"
            label="New password"
            placeholder="Create a strong password (min 8 chars)"
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
