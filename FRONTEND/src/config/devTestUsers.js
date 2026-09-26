/**
 * Development test accounts loaded strictly from environment variables.
 * No hardcoded credentials or fallback passwords exist in source code.
 * Only accessible during development (import.meta.env.DEV).
 */

export const getDevTestUser = (role) => {
  const normalized = role?.toLowerCase();
  if (normalized === 'agent') {
    return {
      role: 'agent',
      email: import.meta.env.VITE_DEV_AGENT_EMAIL || '',
      password: import.meta.env.VITE_DEV_AGENT_PASSWORD || '',
    };
  }
  if (normalized === 'admin') {
    return {
      role: 'admin',
      email: import.meta.env.VITE_DEV_ADMIN_EMAIL || '',
      password: import.meta.env.VITE_DEV_ADMIN_PASSWORD || '',
    };
  }
  if (normalized === 'customer') {
    return {
      role: 'customer',
      email: import.meta.env.VITE_DEV_CUSTOMER_EMAIL || '',
      password: import.meta.env.VITE_DEV_CUSTOMER_PASSWORD || '',
    };
  }
  return null;
};

export const DEV_ROLES = ['Agent', 'Admin', 'Customer'];
