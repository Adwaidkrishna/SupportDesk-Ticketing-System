/**
 * Auth Mock API
 *
 * Simulates backend responses with realistic delays.
 * No actual network requests — purely frontend simulation.
 *
 * Test credentials:
 *   Email:    admin@supportdesk.com
 *   Password: password123
 *   OTP:      123456
 */

const MOCK_DELAY = 1200; // ms

function delay(ms = MOCK_DELAY) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simulate login
 * ✓ admin@supportdesk.com / password123
 */
export async function mockLogin(email, password) {
  await delay();

  if (email === 'admin@supportdesk.com' && password === 'password123') {
    return {
      success: true,
      data: {
        user: {
          id: '1',
          name: 'Admin User',
          email: 'admin@supportdesk.com',
          role: 'admin',
        },
        token: 'mock-jwt-token-xyz',
      },
    };
  }

  return {
    success: false,
    error: 'Invalid email or password',
  };
}

/**
 * Simulate registration
 * ✗ admin@supportdesk.com → "Email already registered"
 * ✓ any other valid input → success
 */
export async function mockRegister({ name, email, password }) {
  await delay();

  if (email === 'admin@supportdesk.com') {
    return {
      success: false,
      error: 'Email already registered',
    };
  }

  return {
    success: true,
    data: {
      message: 'Registration successful. Please verify your email.',
      email,
    },
  };
}

/**
 * Simulate OTP verification
 * ✓ 123456 → success
 */
export async function mockVerifyOtp(email, otp) {
  await delay();

  if (otp === '123456') {
    return {
      success: true,
      data: {
        message: 'Email verified successfully',
      },
    };
  }

  return {
    success: false,
    error: 'Invalid verification code',
  };
}

/**
 * Simulate resending OTP
 * ✓ always succeeds
 */
export async function mockResendOtp(email) {
  await delay(800);

  return {
    success: true,
    data: {
      message: 'Verification code resent',
    },
  };
}

/**
 * Simulate forgot password request
 * ✓ admin@supportdesk.com → success
 * ✗ unknown email → error
 */
export async function mockForgotPassword(email) {
  await delay();

  if (email === 'admin@supportdesk.com') {
    return {
      success: true,
      data: {
        message: 'Password reset link sent to your email',
      },
    };
  }

  return {
    success: false,
    error: 'No account found with this email',
  };
}

/**
 * Simulate password reset
 * ✓ always succeeds with valid input
 */
export async function mockResetPassword(token, password) {
  await delay();

  return {
    success: true,
    data: {
      message: 'Password reset successfully',
    },
  };
}
