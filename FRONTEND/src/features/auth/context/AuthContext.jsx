import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '../services/auth.service';
//It stores the logged-in user in memory and automatically restores their session when they refresh the browser.
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem('token');
    return t && t !== 'null' && t !== 'undefined' ? t : null;
  });
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from token on mount
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const storedToken = localStorage.getItem('token');
      if (!storedToken || storedToken === 'null' || storedToken === 'undefined') {
        localStorage.removeItem('token');
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await getCurrentUser();
        if (isMounted && response?.success && response?.user) {
          setUser(response.user);
          setToken(storedToken);
        } else {
          // Response was not successful
          localStorage.removeItem('token');
          if (isMounted) {
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        // Token expired or invalid
        console.warn('Session restoration failed:', err.message);
        localStorage.removeItem('token');
        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Handle user login.
   * Stores the JWT token and user profile in application state.
   */
  const handleLogin = useCallback((newToken, newUser) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  /**
   * Handle user logout.
   * Clears state and localStorage.
   */
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  /**
   * Update user details in context state.
   */
  const handleUpdateUser = useCallback((updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : prev));
  }, []);

  const value = {
    user,
    token,
    role: user?.role || null,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login: handleLogin,
    logout: handleLogout,
    updateUser: handleUpdateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to consume the AuthContext.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
