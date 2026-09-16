import { Outlet, Link, useLocation } from 'react-router-dom';
import styles from './AuthLayout.module.css';

/**
 * Shared layout wrapper for authentication pages.
 * Implements a split-screen composition with desktop messaging,
 * top-right navigation link, cinematic background, and floating glass card.
 */
export default function AuthLayout() {
  const location = useLocation();
  const path = location.pathname;

  let topNavLink = { label: 'New here?', text: 'Create account', to: '/register' };
  if (path === '/register' || path === '/verify-otp') {
    topNavLink = { label: 'Already have an account?', text: 'Sign in', to: '/login' };
  } else if (path === '/forgot-password' || path === '/reset-password') {
    topNavLink = { label: 'Remembered your password?', text: 'Sign in', to: '/login' };
  }

  return (
    <div className={styles.authLayout}>
      {/* Background visual layers */}
      <div className={styles.bgOverlay} />
      <div className={styles.ambientGlow} />
      <div className={styles.verticalPanel} />

      {/* Main Container */}
      <div className={styles.container}>
        {/* Top Navigation Bar */}
        <header className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
              </svg>
            </div>
            <span className={styles.brandTitle}>SupportDesk</span>
          </div>

          <div className={styles.topRightNav}>
            <span>{topNavLink.label} </span>
            <Link to={topNavLink.to} className={styles.topLink}>
              {topNavLink.text}
            </Link>
          </div>
        </header>

        {/* Content Body — Split Layout */}
        <div className={styles.body}>
          {/* Left Panel — Desktop Product Messaging */}
          <section className={styles.sidebar}>
            <div className={styles.heroBlock}>
              <div className={styles.taglineLabel}>SUPPORTDESK</div>
              <h1 className={styles.heroTitle}>
                Every<br />
                request<br />
                <span className={styles.accentText}>matters.</span>
              </h1>
              <p className={styles.heroSubtext}>
                Track. Manage. Resolve.<br />
                All in one place.
              </p>
            </div>

            {/* Feature Bullet Highlights */}
            <div className={styles.featureList}>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <line x1="8" y1="9" x2="16" y2="9" />
                    <line x1="8" y1="13" x2="14" y2="13" />
                  </svg>
                </div>
                <div>
                  <h4 className={styles.featureTitle}>Organized tickets</h4>
                  <p className={styles.featureDesc}>Keep everything in one place</p>
                </div>
              </div>

              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <div>
                  <h4 className={styles.featureTitle}>Faster resolution</h4>
                  <p className={styles.featureDesc}>Get help when you need it</p>
                </div>
              </div>

              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                </div>
                <div>
                  <h4 className={styles.featureTitle}>Real insights</h4>
                  <p className={styles.featureDesc}>Make data-driven decisions</p>
                </div>
              </div>
            </div>

            {/* Testimonial Quote */}
            <blockquote className={styles.quote}>
              “Great support builds stronger products.”
            </blockquote>

            <p className={styles.copyrightDesktop}>
              © 2026 SupportDesk. All rights reserved.
            </p>
          </section>

          {/* Right Panel / Center — Glass Card Container */}
          <main className={styles.cardArea}>
            {/* Mobile-only compact slogan */}
            <div className={styles.mobileSlogan}>
              <h2>Help people.<br />Solve problems.</h2>
            </div>

            <div className={styles.card}>
              <Outlet />
            </div>
          </main>
        </div>

        {/* Footer */}
        <footer className={styles.footer}>
          <div className={styles.footerLinks}>
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
            <a href="#contact">Contact</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
