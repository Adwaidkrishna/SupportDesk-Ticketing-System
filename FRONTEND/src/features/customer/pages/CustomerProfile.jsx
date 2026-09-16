import { useState } from 'react';
import { currentUser } from '../customerMockData';
import styles from './CustomerProfile.module.css';

export default function CustomerProfile() {
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'security' | 'notifications'

  // Form states
  const [profileData, setProfileData] = useState({
    name: currentUser.name,
    email: currentUser.email,
    phone: '+1 (555) 234-5678',
    company: 'Acme Corp',
    department: 'Engineering',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notifications, setNotifications] = useState({
    emailReply: true,
    emailStatus: true,
    browserPush: true,
    weeklyDigest: false,
    marketing: false,
  });

  const [saveSuccess, setSaveSuccess] = useState('');

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    setSaveSuccess('Personal information updated successfully!');
    setTimeout(() => setSaveSuccess(''), 4000);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New password and confirm password do not match!');
      return;
    }
    setSaveSuccess('Password updated successfully!');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setTimeout(() => setSaveSuccess(''), 4000);
  };

  const handleToggleNotif = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Simple password strength calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { label: '', percent: 0, color: 'transparent' };
    if (pwd.length < 6) return { label: 'Weak', percent: 33, color: '#FF453A' };
    if (pwd.length < 10) return { label: 'Good', percent: 66, color: '#FFD60A' };
    return { label: 'Strong', percent: 100, color: '#30D158' };
  };

  const pwdStrength = getPasswordStrength(passwordData.newPassword);

  return (
    <div className={styles.page}>
      {/* Header Banner */}
      <div className={styles.profileHeader}>
        <div className={styles.avatarWrap}>
          <div className={styles.avatarBig}>{currentUser.initials}</div>
          <div className={styles.statusDot} title="Account Active" />
        </div>

        <div className={styles.userHeadInfo}>
          <h1 className={styles.userName}>{profileData.name}</h1>
          <p className={styles.userRole}>
            {currentUser.role} • {profileData.company}
          </p>
          <span className={styles.emailBadge}>{profileData.email}</span>
        </div>

        <div className={styles.accountBadge}>
          <span className={styles.verifiedCheck}>✓</span>
          <span>Verified Account</span>
        </div>
      </div>

      {saveSuccess && (
        <div className={styles.toastSuccess}>
          <span>✓</span> {saveSuccess}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className={styles.tabBar}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'general' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General Information
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'security' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Security & Password
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'notifications' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          Notification Preferences
        </button>
      </div>

      {/* Tab Contents */}
      <div className={styles.contentCard}>
        {/* Tab 1: General Information */}
        {activeTab === 'general' && (
          <form onSubmit={handleProfileSubmit} className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Full Name</label>
              <input
                type="text"
                className={styles.input}
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Email Address</label>
              <input
                type="email"
                className={styles.input}
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Phone Number</label>
              <input
                type="tel"
                className={styles.input}
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Company / Organization</label>
              <input
                type="text"
                className={styles.input}
                value={profileData.company}
                onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Department</label>
              <input
                type="text"
                className={styles.input}
                value={profileData.department}
                onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
              />
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.saveBtn}>
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Security & Password */}
        {activeTab === 'security' && (
          <form onSubmit={handlePasswordSubmit} className={styles.formGrid}>
            <div className={styles.formGroupFull}>
              <label className={styles.label}>Current Password</label>
              <input
                type="password"
                className={styles.input}
                placeholder="Enter current password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, currentPassword: e.target.value })
                }
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>New Password</label>
              <input
                type="password"
                className={styles.input}
                placeholder="Enter new password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, newPassword: e.target.value })
                }
                required
              />
              {passwordData.newPassword && (
                <div className={styles.strengthMeter}>
                  <div className={styles.meterBarTrack}>
                    <div
                      className={styles.meterBarFill}
                      style={{
                        width: `${pwdStrength.percent}%`,
                        backgroundColor: pwdStrength.color,
                      }}
                    />
                  </div>
                  <span className={styles.strengthText} style={{ color: pwdStrength.color }}>
                    {pwdStrength.label}
                  </span>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Confirm New Password</label>
              <input
                type="password"
                className={styles.input}
                placeholder="Re-enter new password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                }
                required
              />
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.saveBtn}>
                Update Password
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Notification Preferences */}
        {activeTab === 'notifications' && (
          <div className={styles.toggleList}>
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <h4 className={styles.toggleTitle}>Email Reply Alerts</h4>
                <p className={styles.toggleDesc}>
                  Receive email notifications when an agent replies to your tickets.
                </p>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={notifications.emailReply}
                  onChange={() => handleToggleNotif('emailReply')}
                />
                <span className={styles.slider} />
              </label>
            </div>

            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <h4 className={styles.toggleTitle}>Ticket Status Updates</h4>
                <p className={styles.toggleDesc}>
                  Get notified when ticket status changes (e.g. In Progress, Resolved).
                </p>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={notifications.emailStatus}
                  onChange={() => handleToggleNotif('emailStatus')}
                />
                <span className={styles.slider} />
              </label>
            </div>

            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <h4 className={styles.toggleTitle}>Browser Push Notifications</h4>
                <p className={styles.toggleDesc}>
                  Show desktop push alerts for urgent ticket updates in real time.
                </p>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={notifications.browserPush}
                  onChange={() => handleToggleNotif('browserPush')}
                />
                <span className={styles.slider} />
              </label>
            </div>

            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <h4 className={styles.toggleTitle}>Weekly Activity Digest</h4>
                <p className={styles.toggleDesc}>
                  Summary of your open, pending, and resolved tickets every Monday.
                </p>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={notifications.weeklyDigest}
                  onChange={() => handleToggleNotif('weeklyDigest')}
                />
                <span className={styles.slider} />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
