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
        Create account
      </Button>

      {/* Terms */}
      <p className={styles.terms}>
        By creating an account, you agree to our{' '}
        <a href="#terms">Terms of Service</a> and{' '}
        <a href="#privacy">Privacy Policy</a>
      </p>

      {/* Divider */}
      <div className={styles.divider}>or</div>

      {/* Login link */}
      <p className={styles.footer}>
        Already have an account?{' '}
        <Link to="/login">Sign in</Link>
      </p>
    </form>
  );
}
