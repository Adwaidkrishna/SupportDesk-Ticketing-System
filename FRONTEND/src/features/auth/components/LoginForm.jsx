import { Link } from 'react-router-dom';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import PasswordInput from './PasswordInput';
import styles from './LoginForm.module.css';

/**
 * Login form component.
 * Renders email, password (with toggle), remember me, and submit.
 *
 * @param {Object} formState - From useAuthForm
 * @param {Function} onSubmit - Form submit handler
 */
export default function LoginForm({ formState, onSubmit }) {
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
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          {serverError}
        </div>
      )}

      {/* Email */}
      <Input
        id="login-email"
        name="email"
        type="email"
        label="Email"
        placeholder="admin@supportdesk.com"
        autoComplete="email"
        value={values.email}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.email ? errors.email : ''}
      />

      {/* Password */}
      <PasswordInput
        id="login-password"
        name="password"
        label="Password"
        placeholder="Enter your password"
        autoComplete="current-password"
        value={values.password}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.password ? errors.password : ''}
      />

      {/* Options row */}
      <div className={styles.options}>
        <label className={styles.remember}>
          <input
            type="checkbox"
            name="rememberMe"
            checked={values.rememberMe}
            onChange={handleChange}
          />
          Remember me
        </label>
        <Link to="/forgot-password" className={styles.forgotLink}>
          Forgot password?
        </Link>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        fullWidth
        large
        loading={isSubmitting}
      >
        Sign in
      </Button>

      {/* Divider */}
      <div className={styles.divider}>or</div>

      {/* Register link */}
      <p className={styles.footer}>
        Don&apos;t have an account?{' '}
        <Link to="/register">Create account</Link>
      </p>
    </form>
  );
}
