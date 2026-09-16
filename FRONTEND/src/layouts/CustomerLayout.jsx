import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { currentUser } from '../features/customer/customerMockData';
import styles from './CustomerLayout.module.css';

/**
 * Customer Layout shell.
 * Desktop: Fixed left sidebar + topbar + main area.
 * Mobile (<768px): Mobile top header + bottom navigation + More drawer modal.
 */
export default function CustomerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);

  const activePath = location.pathname;

  const handleLogout = () => {
    setMoreDrawerOpen(false);
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/customer/dashboard', icon: 'grid' },
    { label: 'Create Ticket', path: '/customer/create-ticket', icon: 'plus' },
    { label: 'My Tickets', path: '/customer/my-tickets', icon: 'layers' },
    { label: 'Knowledge Base', path: '/customer/knowledge-base', icon: 'book' },
    {
      label: 'Notifications',
      path: '/customer/notifications',
      icon: 'bell',
      badge: currentUser.unreadNotificationsCount,
    },
  ];

  const secondaryNavItems = [
    { label: 'Profile', path: '/customer/profile', icon: 'user' },
    { label: 'Settings', path: '/customer/settings', icon: 'settings' },
  ];

  const renderIcon = (type) => {
    switch (type) {
      case 'grid':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
          </svg>
        );
      case 'plus':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        );
      case 'layers':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        );
      case 'book':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        );
      case 'bell':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        );
      case 'user':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        );
      case 'settings':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        );
      case 'more':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.layout}>
      {/* Background Overlays */}
      <div className={styles.bgOverlay} />
      <div className={styles.ambientGlow} />

      {/* Desktop Sidebar (hidden on mobile via CSS) */}
      <aside className={styles.sidebar}>
        {/* Brand */}
        <div className={styles.sidebarBrand}>
          <div className={styles.brandIcon}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
            </svg>
          </div>
          <span className={styles.brandTitle}>SupportDesk</span>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          <ul className={styles.navList}>
            {navItems.map((item) => {
              const isActive =
                activePath === item.path ||
                (item.path === '/customer/my-tickets' && activePath === '/customer/tickets');
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                  >
                    <span className={styles.navIcon}>{renderIcon(item.icon)}</span>
                    <span className={styles.navLabel}>{item.label}</span>
                    {item.badge && <span className={styles.badge}>{item.badge}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className={styles.navDivider} />

          <ul className={styles.navList}>
            {secondaryNavItems.map((item) => {
              const isActive = activePath === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                  >
                    <span className={styles.navIcon}>{renderIcon(item.icon)}</span>
                    <span className={styles.navLabel}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Support Card */}
        <div className={styles.supportCard}>
          <div className={styles.supportIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
          </div>
          <h4 className={styles.supportTitle}>Need help?</h4>
          <p className={styles.supportText}>
            Our support team is<br />here for you 24/7.
          </p>
          <button
            type="button"
            className={styles.supportButton}
            onClick={() => navigate('/customer/create-ticket')}
          >
            Contact Support →
          </button>
        </div>

        {/* User Footer Tile */}
        <div className={styles.userTile}>
          <div className={styles.userAvatar}>{currentUser.initials}</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{currentUser.name}</span>
            <span className={styles.userRole}>{currentUser.role}</span>
          </div>
          <button
            type="button"
            className={styles.logoutButton}
            onClick={handleLogout}
            title="Log out"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className={styles.mainWrapper}>
        {/* Desktop Topbar (hidden on mobile) */}
        <header className={styles.topbar}>
          {/* Search Bar */}
          <div className={styles.searchBar}>
            <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search tickets, articles, or anything..."
              className={styles.searchInput}
            />
            <span className={styles.shortcutBadge}>Ctrl K</span>
          </div>

          {/* Topbar Right */}
          <div className={styles.topbarRight}>
            <button
              type="button"
              className={styles.iconButton}
              title="Notifications"
              onClick={() => navigate('/customer/notifications')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className={styles.notifBadge}>{currentUser.unreadNotificationsCount}</span>
            </button>

            <div
              className={styles.profileBadge}
              onClick={() => navigate('/customer/profile')}
            >
              <div className={styles.badgeAvatar}>{currentUser.initials}</div>
              <div className={styles.badgeInfo}>
                <span className={styles.badgeName}>{currentUser.name}</span>
                <span className={styles.badgeRole}>{currentUser.role}</span>
              </div>
              <svg className={styles.chevronIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </header>

        {/* Mobile Dedicated Top Header (hidden on desktop) */}
        <header className={styles.mobileHeader}>
          <div
            className={styles.mobileBrand}
            onClick={() => navigate('/customer/dashboard')}
          >
            <div className={styles.mobileBrandIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
              </svg>
            </div>
            <span className={styles.mobileBrandTitle}>SupportDesk</span>
          </div>

          <div className={styles.mobileHeaderRight}>
            <button
              type="button"
              className={styles.mobileIconButton}
              onClick={() => navigate('/customer/notifications')}
              title="Notifications"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {currentUser.unreadNotificationsCount > 0 && (
                <span className={styles.mobileNotifBadge}>
                  {currentUser.unreadNotificationsCount}
                </span>
              )}
            </button>

            <div
              className={styles.mobileUserAvatar}
              onClick={() => navigate('/customer/profile')}
              title="Profile"
            >
              {currentUser.initials}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (<768px) */}
      <nav className={styles.mobileBottomNav}>
        <Link
          to="/customer/dashboard"
          className={`${styles.mobileNavItem} ${activePath === '/customer/dashboard' ? styles.active : ''}`}
        >
          {renderIcon('grid')}
          <span>Home</span>
        </Link>

        <Link
          to="/customer/my-tickets"
          className={`${styles.mobileNavItem} ${
            activePath === '/customer/my-tickets' || activePath === '/customer/tickets'
              ? styles.active
              : ''
          }`}
        >
          {renderIcon('layers')}
          <span>Tickets</span>
        </Link>

        <Link
          to="/customer/knowledge-base"
          className={`${styles.mobileNavItem} ${
            activePath.startsWith('/customer/knowledge-base') ? styles.active : ''
          }`}
        >
          {renderIcon('book')}
          <span>Knowledge</span>
        </Link>

        <Link
          to="/customer/notifications"
          className={`${styles.mobileNavItem} ${activePath === '/customer/notifications' ? styles.active : ''}`}
        >
          <div className={styles.bottomNavIconWrap}>
            {renderIcon('bell')}
            {currentUser.unreadNotificationsCount > 0 && (
              <span className={styles.bottomNavDot} />
            )}
          </div>
          <span>Alerts</span>
        </Link>

        <button
          type="button"
          className={`${styles.mobileNavItem} ${
            moreDrawerOpen || activePath === '/customer/profile' || activePath === '/customer/settings'
              ? styles.active
              : ''
          }`}
          onClick={() => setMoreDrawerOpen((prev) => !prev)}
        >
          {renderIcon('user')}
          <span>More</span>
        </button>
      </nav>

      {/* Slide-Up More Menu Sheet for Mobile */}
      {moreDrawerOpen && (
        <div className={styles.moreDrawerBackdrop} onClick={() => setMoreDrawerOpen(false)}>
          <div className={styles.moreDrawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.moreDrawerHeader}>
              <div className={styles.moreUserInfo}>
                <div className={styles.moreAvatar}>{currentUser.initials}</div>
                <div>
                  <h4 className={styles.moreName}>{currentUser.name}</h4>
                  <p className={styles.moreEmail}>{currentUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                className={styles.closeDrawerBtn}
                onClick={() => setMoreDrawerOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.moreDrawerBody}>
              <button
                type="button"
                className={styles.moreDrawerItem}
                onClick={() => {
                  setMoreDrawerOpen(false);
                  navigate('/customer/create-ticket');
                }}
              >
                <span className={styles.moreIcon}>{renderIcon('plus')}</span>
                <span>Create Support Ticket</span>
              </button>

              <button
                type="button"
                className={styles.moreDrawerItem}
                onClick={() => {
                  setMoreDrawerOpen(false);
                  navigate('/customer/profile');
                }}
              >
                <span className={styles.moreIcon}>{renderIcon('user')}</span>
                <span>Profile Settings</span>
              </button>

              <button
                type="button"
                className={styles.moreDrawerItem}
                onClick={() => {
                  setMoreDrawerOpen(false);
                  navigate('/customer/settings');
                }}
              >
                <span className={styles.moreIcon}>{renderIcon('settings')}</span>
                <span>Preferences</span>
              </button>

              <div className={styles.moreDivider} />

              <button
                type="button"
                className={`${styles.moreDrawerItem} ${styles.logoutItem}`}
                onClick={handleLogout}
              >
                <span className={styles.moreIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </span>
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
