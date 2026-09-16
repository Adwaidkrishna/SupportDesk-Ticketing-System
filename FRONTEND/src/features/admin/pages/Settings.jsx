import { useState } from 'react';
import { adminSettingsData } from '../adminMockData';
import styles from './Settings.module.css';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');

  // Local Form States
  const [general, setGeneral] = useState({ ...adminSettingsData.general });
  const [ticketSettings, setTicketSettings] = useState({ ...adminSettingsData.ticketSettings });
  const [notifications, setNotifications] = useState({ ...adminSettingsData.notifications });
  const [security, setSecurity] = useState({ ...adminSettingsData.security });
  const [appearance, setAppearance] = useState({ ...adminSettingsData.appearance });

  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleGeneralSubmit = (e) => {
    e.preventDefault();
    showToast('General platform settings updated.');
  };

  const handleTicketSettingsSubmit = (e) => {
    e.preventDefault();
    showToast('Ticket rules & auto-close defaults saved.');
  };

  const handleNotifToggle = (key) => {
    setNotifications((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      showToast('Notification preference saved.');
      return updated;
    });
  };

  const handleSecuritySubmit = (e) => {
    e.preventDefault();
    showToast('Security policy updated.');
  };

  const handleAppearanceSubmit = (e) => {
    e.preventDefault();
    showToast('Appearance settings saved.');
  };

  return (
    <div className={styles.page}>
      {/* Toast Feedback */}
      {toastMsg && (
        <div className={styles.toast}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titles}>
          <span className={styles.badgeLabel}>PLATFORM CONFIGURATION</span>
          <h1 className={styles.title}>System Settings</h1>
          <p className={styles.subtitle}>
            Manage global support defaults, ticket workflow policies, security rules, and alert channels.
          </p>
        </div>
      </div>

      {/* Settings Tab Navigation */}
      <div className={styles.tabsRow}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'general' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('general')}
        >
          ⚙️ General
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'tickets' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('tickets')}
        >
          🎫 Ticket Settings
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'notifications' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          🔔 Notifications
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'security' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('security')}
        >
          🔒 Security Policy
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'appearance' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('appearance')}
        >
          🎨 Appearance
        </button>
      </div>

      {/* Settings Tab Body */}
      <div className={styles.contentCard}>
        {/* Tab 1: General Settings */}
        {activeTab === 'general' && (
          <form onSubmit={handleGeneralSubmit} className={styles.formSection}>
            <h3 className={styles.sectionTitle}>General Platform Settings</h3>
            <p className={styles.sectionDesc}>Configure company identity and default timezone settings.</p>

            <div className={styles.grid2}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Company Name</label>
                <input
                  type="text"
                  className={styles.input}
                  value={general.companyName}
                  onChange={(e) => setGeneral({ ...general, companyName: e.target.value })}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Support Email Address</label>
                <input
                  type="email"
                  className={styles.input}
                  value={general.supportEmail}
                  onChange={(e) => setGeneral({ ...general, supportEmail: e.target.value })}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>System Timezone</label>
                <select
                  className={styles.select}
                  value={general.timezone}
                  onChange={(e) => setGeneral({ ...general, timezone: e.target.value })}
                >
                  <option value="UTC +05:30 (Asia/Kolkata)">UTC +05:30 (Asia/Kolkata)</option>
                  <option value="UTC +00:00 (London/GMT)">UTC +00:00 (London/GMT)</option>
                  <option value="UTC -05:00 (US Eastern)">UTC -05:00 (US Eastern)</option>
                  <option value="UTC -08:00 (US Pacific)">UTC -08:00 (US Pacific)</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Default Language</label>
                <select
                  className={styles.select}
                  value={general.defaultLanguage}
                  onChange={(e) => setGeneral({ ...general, defaultLanguage: e.target.value })}
                >
                  <option value="English (US)">English (US)</option>
                  <option value="English (UK)">English (UK)</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                </select>
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.saveBtn}>Save General Settings</button>
            </div>
          </form>
        )}

        {/* Tab 2: Ticket Settings */}
        {activeTab === 'tickets' && (
          <form onSubmit={handleTicketSettingsSubmit} className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Ticket Workflow & Rules</h3>
            <p className={styles.sectionDesc}>Define automation behavior and ticket submission rules.</p>

            <div className={styles.toggleList}>
              <div className={styles.toggleRow}>
                <div>
                  <h4>Allow Customer Ticket Reopen</h4>
                  <p>Permit customers to reopen resolved tickets within 7 days.</p>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={ticketSettings.allowCustomerReopen}
                    onChange={(e) => setTicketSettings({ ...ticketSettings, allowCustomerReopen: e.target.checked })}
                  />
                  <span className={styles.slider} />
                </label>
              </div>

              <div className={styles.toggleRow}>
                <div>
                  <h4>Require Category Selection</h4>
                  <p>Enforce mandatory category selection upon new ticket creation.</p>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={ticketSettings.requireCategory}
                    onChange={(e) => setTicketSettings({ ...ticketSettings, requireCategory: e.target.checked })}
                  />
                  <span className={styles.slider} />
                </label>
              </div>

              <div className={styles.toggleRow}>
                <div>
                  <h4>Allow File Attachments</h4>
                  <p>Enable customers and agents to attach logs and screenshots.</p>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={ticketSettings.allowAttachments}
                    onChange={(e) => setTicketSettings({ ...ticketSettings, allowAttachments: e.target.checked })}
                  />
                  <span className={styles.slider} />
                </label>
              </div>
            </div>

            <div className={styles.grid2} style={{ marginTop: '1rem' }}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Auto-Close Resolved Tickets</label>
                <select
                  className={styles.select}
                  value={ticketSettings.autoCloseResolvedDays}
                  onChange={(e) => setTicketSettings({ ...ticketSettings, autoCloseResolvedDays: Number(e.target.value) })}
                >
                  <option value={3}>After 3 Days of Inactivity</option>
                  <option value={5}>After 5 Days of Inactivity</option>
                  <option value={7}>After 7 Days of Inactivity</option>
                  <option value={0}>Disabled (Never Auto-Close)</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Default New Ticket Priority</label>
                <select
                  className={styles.select}
                  value={ticketSettings.defaultPriority}
                  onChange={(e) => setTicketSettings({ ...ticketSettings, defaultPriority: e.target.value })}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.saveBtn}>Save Ticket Rules</button>
            </div>
          </form>
        )}

        {/* Tab 3: Notification Settings */}
        {activeTab === 'notifications' && (
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>System Alert Channels</h3>
            <p className={styles.sectionDesc}>Select platform events that trigger email and dashboard alerts.</p>

            <div className={styles.toggleList}>
              <div className={styles.toggleRow}>
                <div>
                  <h4>New Ticket Submission Alert</h4>
                  <p>Alert admins when a new unassigned ticket is logged.</p>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={notifications.newTicketAlert}
                    onChange={() => handleNotifToggle('newTicketAlert')}
                  />
                  <span className={styles.slider} />
                </label>
              </div>

              <div className={styles.toggleRow}>
                <div>
                  <h4>Ticket Assignment Notification</h4>
                  <p>Notify agents when a ticket is assigned to their personal queue.</p>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={notifications.assignmentAlert}
                    onChange={() => handleNotifToggle('assignmentAlert')}
                  />
                  <span className={styles.slider} />
                </label>
              </div>

              <div className={styles.toggleRow}>
                <div>
                  <h4>SLA Warning & Breach Alerts</h4>
                  <p>Send urgent notification when SLA is approaching breach threshold.</p>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={notifications.slaWarningAlert}
                    onChange={() => handleNotifToggle('slaWarningAlert')}
                  />
                  <span className={styles.slider} />
                </label>
              </div>

              <div className={styles.toggleRow}>
                <div>
                  <h4>Ticket Escalation Alert</h4>
                  <p>Notify management when a ticket is escalated to Tier 3 support.</p>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={notifications.escalationAlert}
                    onChange={() => handleNotifToggle('escalationAlert')}
                  />
                  <span className={styles.slider} />
                </label>
              </div>

              <div className={styles.toggleRow}>
                <div>
                  <h4>Daily Executive Summary Email</h4>
                  <p>Send morning PDF summary report to system administrators.</p>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={notifications.dailyReportEmail}
                    onChange={() => handleNotifToggle('dailyReportEmail')}
                  />
                  <span className={styles.slider} />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Security Policy */}
        {activeTab === 'security' && (
          <form onSubmit={handleSecuritySubmit} className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Security Controls & Policies</h3>
            <p className={styles.sectionDesc}>Configure session timeout, password complexity, and 2FA settings.</p>

            <div className={styles.grid2}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Idle Session Timeout</label>
                <select
                  className={styles.select}
                  value={security.sessionTimeoutMins}
                  onChange={(e) => setSecurity({ ...security, sessionTimeoutMins: Number(e.target.value) })}
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Password Policy Standard</label>
                <select
                  className={styles.select}
                  value={security.passwordPolicy}
                  onChange={(e) => setSecurity({ ...security, passwordPolicy: e.target.value })}
                >
                  <option value="Strong (Min 8 chars, numbers, symbols)">Strong (Min 8 chars, numbers, symbols)</option>
                  <option value="Strict (Min 12 chars, special symbols)">Strict (Min 12 chars, special symbols)</option>
                  <option value="Standard">Standard</option>
                </select>
              </div>
            </div>

            <div className={styles.toggleList} style={{ marginTop: '1rem' }}>
              <div className={styles.toggleRow}>
                <div>
                  <h4>Two-Factor Authentication (2FA)</h4>
                  <p>Require 2FA verification for admin and support agent logins.</p>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={security.twoFactorAuth === 'Required' || security.twoFactorAuth === true}
                    onChange={(e) => setSecurity({ ...security, twoFactorAuth: e.target.checked ? 'Required' : 'Optional' })}
                  />
                  <span className={styles.slider} />
                </label>
              </div>

              <div className={styles.toggleRow}>
                <div>
                  <h4>Login Anomaly Alerts</h4>
                  <p>Send security email if account is accessed from unknown IP location.</p>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={security.loginAlerts}
                    onChange={(e) => setSecurity({ ...security, loginAlerts: e.target.checked })}
                  />
                  <span className={styles.slider} />
                </label>
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.saveBtn}>Save Security Policy</button>
            </div>
          </form>
        )}

        {/* Tab 5: Appearance */}
        {activeTab === 'appearance' && (
          <form onSubmit={handleAppearanceSubmit} className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Appearance & Theme Preferences</h3>
            <p className={styles.sectionDesc}>Customize application UI density and theme standards.</p>

            <div className={styles.grid2}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Visual Theme Standard</label>
                <select
                  className={styles.select}
                  value={appearance.theme}
                  onChange={(e) => setAppearance({ ...appearance, theme: e.target.value })}
                >
                  <option value="Dark Navy (Default)">Dark Navy (SupportDesk Default)</option>
                  <option value="Midnight Black">Midnight Black</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Sidebar Behavior</label>
                <select
                  className={styles.select}
                  value={appearance.sidebarBehavior}
                  onChange={(e) => setAppearance({ ...appearance, sidebarBehavior: e.target.value })}
                >
                  <option value="Expanded">Always Expanded</option>
                  <option value="Collapsed">Compact Icons Only</option>
                </select>
              </div>
            </div>

            <div className={styles.toggleList} style={{ marginTop: '1rem' }}>
              <div className={styles.toggleRow}>
                <div>
                  <h4>Compact Table Data Density</h4>
                  <p>Reduce padding in ticket and user tables to show more items per page.</p>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={appearance.compactMode}
                    onChange={(e) => setAppearance({ ...appearance, compactMode: e.target.checked })}
                  />
                  <span className={styles.slider} />
                </label>
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.saveBtn}>Save Appearance Settings</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
