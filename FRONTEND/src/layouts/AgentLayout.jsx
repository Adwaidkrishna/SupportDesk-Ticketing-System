import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import { currentAgent } from '../features/agent/agentMockData';
import Select from '../components/common/Select';
import styles from './AgentLayout.module.css';

/**
 * Agent Layout Shell Component.
 * Desktop: Fixed left sidebar + topbar + main workspace.
 * Mobile (<768px): Top header + bottom navigation + More drawer modal.
 */
export default function AgentLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);
  const [availability, setAvailability] = useState(currentAgent.availability);

  const activePath = location.pathname;

  const displayName = user?.name || currentAgent.name;
  const displayRole = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : currentAgent.role;
  const displayInitials =
    displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'AG';

  const handleLogout = () => {
    setMoreDrawerOpen(false);
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/agent/dashboard', icon: 'grid' },
    { label: 'Available Tickets', path: '/agent/queue', icon: 'inbox' },
    { label: 'My Assigned Tickets', path: '/agent/my-tickets', icon: 'assigned' },
    { label: 'All Tickets', path: '/agent/tickets', icon: 'layers' },
    { label: 'Escalated', path: '/agent/escalated', icon: 'alert' },
    { label: 'Knowledge Base', path: '/agent/knowledge-base', icon: 'book' },
    {
      label: 'Notifications',
      path: '/agent/notifications',
      icon: 'bell',
      badge: currentAgent.unreadNotificationsCount,
    },
  ];


  const secondaryNavItems = [
    { label: 'Profile', path: '/agent/profile', icon: 'user' },
    { label: 'Settings', path: '/agent/settings', icon: 'settings' },
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
      case 'inbox':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
          </svg>
        );
      case 'assigned':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
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
      case 'alert':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
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
            <span className={styles.roleTag}>AGENT PORTAL</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          <ul className={styles.navList}>
            {navItems.map((item) => {
              const isActive = activePath === item.path;
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

        {/* Status & Portal Switcher Card */}
        <div className={styles.agentStatusCard}>
            <Select
              options={[
                { value: 'Available', label: 'Available', subtitle: 'Ready for tickets', badge: 'Online', badgeColor: '#30D158' },
                { value: 'Busy', label: 'Busy', subtitle: 'In active call/triage', badge: 'Busy', badgeColor: '#FF453A' },
                { value: 'Away', label: 'Away', subtitle: 'On break', badge: 'Away', badgeColor: '#FFD60A' },
                { value: 'Offline', label: 'Offline', subtitle: 'Not accepting tickets', badge: 'Offline', badgeColor: '#64748B' },
              ]}
              value={availability}
              onChange={setAvailability}
            />
          <button
            type="button"
            className={styles.portalSwitchBtn}
            onClick={() => navigate('/customer/dashboard')}
          >
            Switch to Customer View →
          </button>
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
              placeholder="Search assigned tickets, SLA, customers, or KB..."
              className={styles.searchInput}
            />
            <span className={styles.shortcutBadge}>Ctrl K</span>
          </div>

          {/* Topbar Right */}
          <div className={styles.topbarRight}>
            <button
              type="button"
              className={styles.iconButton}
              title="Agent Notifications"
              onClick={() => navigate('/agent/notifications')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className={styles.notifBadge}>{currentAgent.unreadNotificationsCount}</span>
            </button>

            <div
              className={styles.profileBadge}
              onClick={() => navigate('/agent/profile')}
            >
              <div className={styles.badgeAvatar}>{currentAgent.initials}</div>
              <div className={styles.badgeInfo}>
                <span className={styles.badgeName}>{currentAgent.name}</span>
                <span className={styles.badgeRole}>{currentAgent.role}</span>
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
            onClick={() => navigate('/agent/dashboard')}
          >
            <div className={styles.mobileBrandIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
              </svg>
            </div>
            <div className={styles.mobileBrandText}>
              <span className={styles.mobileBrandTitle}>SupportDesk</span>
              <span className={styles.mobileBrandBadge}>AGENT</span>
            </div>
          </div>

          <div className={styles.mobileHeaderRight}>
            <button
              type="button"
              className={styles.mobileIconButton}
              onClick={() => navigate('/agent/notifications')}
              title="Notifications"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {currentAgent.unreadNotificationsCount > 0 && (
                <span className={styles.mobileNotifBadge}>
                  {currentAgent.unreadNotificationsCount}
                </span>
              )}
            </button>

            <div
              className={styles.mobileUserAvatar}
              onClick={() => navigate('/agent/profile')}
              title="Profile"
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
          to="/agent/dashboard"
          className={`${styles.mobileNavItem} ${activePath === '/agent/dashboard' ? styles.active : ''}`}
        >
          {renderIcon('grid')}
          <span>Dashboard</span>
        </Link>

        <Link
          to="/agent/queue"
          className={`${styles.mobileNavItem} ${activePath === '/agent/queue' ? styles.active : ''}`}
        >
          {renderIcon('inbox')}
          <span>Available</span>
        </Link>

        <Link
          to="/agent/my-tickets"
          className={`${styles.mobileNavItem} ${activePath === '/agent/my-tickets' ? styles.active : ''}`}
        >
          {renderIcon('assigned')}
          <span>Assigned</span>
        </Link>

        <Link
          to="/agent/tickets"
          className={`${styles.mobileNavItem} ${activePath === '/agent/tickets' ? styles.active : ''}`}
        >
          {renderIcon('layers')}
          <span>All Tickets</span>
        </Link>

        <Link
          to="/agent/escalated"
          className={`${styles.mobileNavItem} ${activePath === '/agent/escalated' ? styles.active : ''}`}
        >
          {renderIcon('alert')}
          <span>Escalated</span>
        </Link>

        <button
          type="button"
          className={`${styles.mobileNavItem} ${
            moreDrawerOpen || activePath === '/agent/profile' || activePath === '/agent/settings'
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
                <div className={styles.moreAvatar}>{displayInitials}</div>
                <div>
                  <h4 className={styles.moreName}>{displayName}</h4>
                  <p className={styles.moreEmail}>{displayRole}</p>
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
                  navigate('/agent/notifications');
                }}
              >
                <span className={styles.moreIcon}>{renderIcon('bell')}</span>
                <span>Notifications ({currentAgent.unreadNotificationsCount})</span>
              </button>

              <button
                type="button"
                className={styles.moreDrawerItem}
                onClick={() => {
                  setMoreDrawerOpen(false);
                  navigate('/agent/knowledge-base');
                }}
              >
                <span className={styles.moreIcon}>{renderIcon('book')}</span>
                <span>Knowledge Base</span>
              </button>

              <button
                type="button"
                className={styles.moreDrawerItem}
                onClick={() => {
                  setMoreDrawerOpen(false);
                  navigate('/agent/profile');
                }}
              >
                <span className={styles.moreIcon}>{renderIcon('user')}</span>
                <span>Agent Profile Settings</span>
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
