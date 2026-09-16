import { Outlet } from 'react-router-dom';
import styles from './AuthLayout.module.css';

/**
 * Shared layout wrapper for all authentication pages.
 * Provides a centered card on a dark background.
 * Child routes render via <Outlet />.
 */
export default function AuthLayout() {
  return (
    <div className={styles.authLayout}>
      <div className={styles.card}>
        <Outlet />
      </div>
    </div>
  );
}
