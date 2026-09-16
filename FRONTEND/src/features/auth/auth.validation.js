/**
 * Auth Validation Rules
 *
 * Pure functions that validate form fields.
 * Each returns an error string or empty string (no error).
 */

export function validateEmail(email) {
  if (!email || !email.trim()) {
    return 'Email is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return 'Enter a valid email address';
  }
  return '';
}

export function validatePassword(password) {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  return '';
}

export function validateName(name) {
  if (!name || !name.trim()) {
    return 'Full name is required';
  }
  if (name.trim().length < 2) {
    return 'Name must be at least 2 characters';
  }
  return '';
}

export function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword) {
    return 'Please confirm your password';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return '';
}

export function validateOtp(otp) {
  if (!otp || otp.length !== 6) {
    return 'Enter the 6-digit code';
  }
  if (!/^\d{6}$/.test(otp)) {
    return 'Code must be 6 digits';
  }
  return '';
}

/**
 * Combined form validators.
 * Each returns an object of { fieldName: errorMessage }.
 */

export function validateLoginForm({ email, password }) {
  return {
    email: validateEmail(email),
    password: validatePassword(password),
  };
}

export function validateRegisterForm({ name, email, password, confirmPassword }) {
  return {
    name: validateName(name),
    email: validateEmail(email),
    password: validatePassword(password),
    confirmPassword: validateConfirmPassword(password, confirmPassword),
  };
}

export function validateForgotPasswordForm({ email }) {
  return {
    email: validateEmail(email),
  };
}

export function validateResetPasswordForm({ password, confirmPassword }) {
  return {
    password: validatePassword(password),
    confirmPassword: validateConfirmPassword(password, confirmPassword),
  };
}

/**
 * Password strength calculator.
 * Returns { score: 0-4, label: string, color: string }
 */
export function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' };

  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Cap at 4
  score = Math.min(score, 4);

  const levels = [
    { label: '', color: '' },
    { label: 'Weak', color: 'var(--color-error)' },
    { label: 'Fair', color: 'var(--color-warning)' },
    { label: 'Good', color: 'var(--color-accent)' },
    { label: 'Strong', color: 'var(--color-success)' },
  ];

  return { score, ...levels[score] };
}
