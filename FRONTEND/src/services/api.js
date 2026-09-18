const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

/**
 * Custom API Error class preserving status code and backend error payload.
 */
export class ApiError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.requiresOtp = data.requiresOtp || false;
  }
}

/**
 * Core request helper for communicating with the backend REST API.
 * Automatically injects the JWT Bearer token if present in localStorage.
 *
 * @param {string} endpoint - API path relative to API_BASE_URL (e.g. '/auth/login')
 * @param {RequestInit} [options={}] - Fetch configuration options
 * @returns {Promise<any>} Parsed JSON response payload
 */
export async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const token = localStorage.getItem('token');
  const hasValidToken = Boolean(token && token !== 'null' && token !== 'undefined');

  const headers = {
    'Content-Type': 'application/json',
    ...(hasValidToken ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkErr) {
    throw new ApiError(
      'Unable to connect to the server. Please check your network connection.',
      0,
      { originalError: networkErr },
    );
  }

  // Handle empty responses (204 No Content, etc.)
  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const message =
      (data && data.message) ||
      `Request failed with status ${response.status} (${response.statusText})`;
    throw new ApiError(message, response.status, data || {});
  }

  return data;
}

export const api = {
  get: (endpoint, options = {}) =>
    request(endpoint, { ...options, method: 'GET' }),

  post: (endpoint, body, options = {}) =>
    request(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: (endpoint, body, options = {}) =>
    request(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: (endpoint, body, options = {}) =>
    request(endpoint, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: (endpoint, options = {}) =>
    request(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
