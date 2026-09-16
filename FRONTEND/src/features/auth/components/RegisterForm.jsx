import { Link } from 'react-router-dom';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import PasswordInput from './PasswordInput';
import PasswordStrength from './PasswordStrength';
import styles from './RegisterForm.module.css';

/**
 * Registration form component.
 * Full name, email, password (with strength), confirm password.
 *
 * @param {Object} formState - From useAuthForm
 * @param {Function} onSubmit - Form submit handler
 */
export default function RegisterForm({ formState, onSubmit }) {
  const {
    values,
    errors,
    touched,
    isSubmitting,
    serverError,
    handleChange,
    handleBlur,
  } = formState;

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {/* Server error banner */}
      {serverError && (
        <div className={styles.serverError} role="alert">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          {serverError}
        </div>
      )}

      {/* Full Name */}
      <Input
        id="register-name"
        name="name"
        type="text"
        label="Full name"
        placeholder="John Doe"
        autoComplete="name"
        value={values.name}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.name ? errors.name : ''}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        }
      />

      {/* Email */}
      <Input
        id="register-email"
        name="email"
        type="email"
        label="Email"
        placeholder="you@company.com"
        autoComplete="email"
        value={values.email}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.email ? errors.email : ''}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        }
      />

      {/* Password with strength indicator */}
      <div className={styles.passwordGroup}>
        <PasswordInput
          id="register-password"
          name="password"
          label="Password"
          placeholder="Create a strong password"
          autoComplete="new-password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.password ? errors.password : ''}
        />
        <PasswordStrength password={values.password} />
      </div>

      {/* Confirm Password */}
      <PasswordInput
        id="register-confirm-password"
        name="confirmPassword"
        label="Confirm password"
        placeholder="Repeat your password"
        autoComplete="new-password"
        value={values.confirmPassword}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.confirmPassword ? errors.confirmPassword : ''}
      />

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        fullWidth
        large
        loading={isSubmitting}
      >
        Create account →
      </Button>

      {/* Terms */}
      <p className={styles.terms}>
        By creating an account, you agree to our{' '}
        <a href="#terms">Terms of Service</a> and{' '}
        <a href="#privacy">Privacy Policy</a>
      </p>

      {/* Divider */}
      <div className={styles.divider}>
        <span>Or continue with</span>
      </div>

      {/* Google social sign in */}
      <button
        type="button"
        className={styles.googleButton}
        onClick={() => {}}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Google</span>
      </button>

      {/* Login link */}
      <p className={styles.footer}>
        Already have an account?{' '}
        <Link to="/login">Sign in</Link>
      </p>
    </form>
  );
}
