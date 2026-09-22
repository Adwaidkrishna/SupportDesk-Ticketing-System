import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import { useNotifications } from '../features/notifications/context/NotificationContext';
import NotificationDropdown from '../features/notifications/components/NotificationDropdown';
import { currentAdmin } from '../features/admin/adminMockData';
import styles from './AdminLayout.module.css';

/**
 * Admin Layout Shell Component.
 * Desktop: Fixed left sidebar (260px) + search topbar + main workspace.
 * Mobile (<768px): Top header + bottom navigation + More drawer modal.
 */
export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();

  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const activePath = location.pathname;

  const displayName = user?.name || currentAdmin.name;
  const displayRole = user?.role
    ? (user.role === 'admin' ? 'System Administrator' : user.role)
    : currentAdmin.role;
  const displayInitials = displayName
    ? displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'AD';

  const handleLogout = () => {
    setMoreDrawerOpen(false);
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: 'grid' },
    { label: 'Tickets', path: '/admin/tickets', icon: 'layers' },
    { label: 'Users', path: '/admin/users', icon: 'users' },
    { label: 'Agents', path: '/admin/agents', icon: 'user-check' },
    { label: 'Categories', path: '/admin/categories', icon: 'folder' },
    { label: 'Knowledge Base', path: '/admin/knowledge-base', icon: 'book' },
    { label: 'SLA Policies', path: '/admin/sla', icon: 'shield' },
    { label: 'Reports', path: '/admin/reports', icon: 'bar-chart' },
  ];

  const secondaryNavItems = [
    { label: 'Settings', path: '/admin/settings', icon: 'settings' },
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
      case 'layers':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        );
      case 'users':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        );
      case 'user-check':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <polyline points="17 11 19 13 23 9" />
          </svg>
        );
      case 'folder':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        );
      case 'shield':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        );
      case 'bar-chart':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
          </svg>
        );
      case 'settings':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        );
      case 'bell':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        );
      case 'book':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
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

      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <div className={styles.brandIcon}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
            </svg>
          </div>
          <div className={styles.brandTextGroup}>
            <span className={styles.brandTitle}>SupportDesk</span>
            <span className={styles.roleTag}>ADMIN CONSOLE</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          <ul className={styles.navList}>
            {navItems.map((item) => {
              const isActive = activePath === item.path || activePath.startsWith(`${item.path}/`);
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

        {/* Portal Switcher Card */}
        <div className={styles.adminStatusCard}>
          <span className={styles.portalTag}>Operational Role Switcher</span>
          <div className={styles.switchBtns}>
            <button
              type="button"
              className={styles.portalSwitchBtn}
              onClick={() => navigate('/agent/dashboard')}
            >
              Agent Workspace →
            </button>
            <button
              type="button"
              className={styles.portalSwitchBtnSecondary}
              onClick={() => navigate('/customer/dashboard')}
            >
              Customer View →
            </button>
          </div>
        </div>

        {/* User Footer Tile */}
        <div className={styles.userTile}>
          <div className={styles.userAvatar}>{displayInitials}</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{displayName}</span>
            <span className={styles.userRole}>{displayRole}</span>
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
        {/* Desktop Topbar */}
        <header className={styles.topbar}>
          {/* Search Bar */}
          <div className={styles.searchBar}>
            <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search system tickets, agents, users, SLA, or settings..."
              className={styles.searchInput}
            />
            <span className={styles.shortcutBadge}>Ctrl K</span>
          </div>

          {/* Topbar Right */}
          <div className={styles.topbarRight}>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className={styles.iconButton}
                title="Notifications"
                onClick={() => setNotifDropdownOpen((prev) => !prev)}
              >
                {renderIcon('bell')}
                {unreadCount > 0 && <span className={styles.notifBadge}>{unreadCount}</span>}
              </button>
              <NotificationDropdown
                isOpen={notifDropdownOpen}
                onClose={() => setNotifDropdownOpen(false)}
              />
            </div>

            <div
              className={styles.profileBadge}
              onClick={() => navigate('/admin/settings')}
            >
              <div className={styles.badgeAvatar}>{displayInitials}</div>
              <div className={styles.badgeInfo}>
                <span className={styles.badgeName}>{displayName}</span>
                <span className={styles.badgeRole}>{displayRole}</span>
              </div>
              <svg className={styles.chevronIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </header>

        {/* Mobile Header (<768px) */}
        <header className={styles.mobileHeader}>
          <div
            className={styles.mobileBrand}
            onClick={() => navigate('/admin/dashboard')}
          >
            <div className={styles.mobileBrandIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
              </svg>
            </div>
            <div className={styles.mobileBrandText}>
              <span className={styles.mobileBrandTitle}>SupportDesk</span>
              <span className={styles.mobileBrandBadge}>ADMIN</span>
            </div>
          </div>

          <div className={styles.mobileHeaderRight}>
            <div
              className={styles.mobileUserAvatar}
              onClick={() => navigate('/admin/settings')}
              title="Settings"
            >
              {displayInitials}
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
          to="/admin/dashboard"
          className={`${styles.mobileNavItem} ${activePath === '/admin/dashboard' ? styles.active : ''}`}
        >
          {renderIcon('grid')}
          <span>Dashboard</span>
        </Link>

        <Link
          to="/admin/tickets"
          className={`${styles.mobileNavItem} ${activePath.startsWith('/admin/tickets') ? styles.active : ''}`}
        >
          {renderIcon('layers')}
          <span>Tickets</span>
        </Link>

        <Link
          to="/admin/users"
          className={`${styles.mobileNavItem} ${activePath === '/admin/users' ? styles.active : ''}`}
        >
          {renderIcon('users')}
          <span>Users</span>
        </Link>

        <Link
          to="/admin/agents"
          className={`${styles.mobileNavItem} ${activePath === '/admin/agents' ? styles.active : ''}`}
        >
          {renderIcon('user-check')}
          <span>Agents</span>
        </Link>

        <button
          type="button"
          className={`${styles.mobileNavItem} ${
            moreDrawerOpen || ['/admin/categories', '/admin/sla', '/admin/reports', '/admin/settings'].includes(activePath)
              ? styles.active
              : ''
          }`}
          onClick={() => setMoreDrawerOpen((prev) => !prev)}
        >
          {renderIcon('settings')}
          <span>More</span>
        </button>
      </nav>

      {/* Slide-Up More Menu Sheet for Mobile */}
      {moreDrawerOpen && (
        <div className={styles.moreDrawerBackdrop} onClick={() => setMoreDrawerOpen(false)}>
          <div className={styles.moreDrawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.moreDrawerHeader}>
              <div className={styles.moreUserInfo}>
                <div className={styles.moreAvatar}>{currentAdmin.initials}</div>
                <div>
                  <h4 className={styles.moreName}>{currentAdmin.name}</h4>
                  <p className={styles.moreEmail}>{currentAdmin.role}</p>
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
                  navigate('/admin/categories');
                }}
              >
                <span className={styles.moreIcon}>{renderIcon('folder')}</span>
                <span>Categories</span>
              </button>

              <button
                type="button"
                className={styles.moreDrawerItem}
                onClick={() => {
                  setMoreDrawerOpen(false);
                  navigate('/admin/sla');
                }}
              >
                <span className={styles.moreIcon}>{renderIcon('shield')}</span>
                <span>SLA Management</span>
              </button>

              <button
                type="button"
                className={styles.moreDrawerItem}
                onClick={() => {
                  setMoreDrawerOpen(false);
                  navigate('/admin/reports');
                }}
              >
                <span className={styles.moreIcon}>{renderIcon('bar-chart')}</span>
                <span>Reports & Analytics</span>
              </button>

              <button
                type="button"
                className={styles.moreDrawerItem}
                onClick={() => {
                  setMoreDrawerOpen(false);
                  navigate('/admin/settings');
                }}
              >
                <span className={styles.moreIcon}>{renderIcon('settings')}</span>
                <span>System Settings</span>
              </button>

              <div className={styles.moreDivider} />

              <button
                type="button"
                className={styles.moreDrawerItem}
                onClick={() => {
                  setMoreDrawerOpen(false);
                  navigate('/agent/dashboard');
                }}
              >
                <span className={styles.moreIcon}>{renderIcon('user-check')}</span>
                <span>Switch to Agent Portal</span>
              </button>

              <button
                type="button"
                className={styles.moreDrawerItem}
                onClick={() => {
                  setMoreDrawerOpen(false);
                  navigate('/customer/dashboard');
                }}
              >
                <span className={styles.moreIcon}>{renderIcon('grid')}</span>
                <span>Switch to Customer Portal</span>
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
