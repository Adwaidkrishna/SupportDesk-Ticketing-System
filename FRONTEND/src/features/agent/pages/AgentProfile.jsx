import { useState } from 'react';
import { currentAgent } from '../agentMockData';
import styles from './AgentProfile.module.css';

export default function AgentProfile() {
  // Form State
  const [profile, setProfile] = useState({
    firstName: 'Alex',
    lastName: 'Johnson',
    email: currentAgent.email,
    phone: '+1 (555) 234-5678',
    department: currentAgent.department,
    team: currentAgent.team,
    role: currentAgent.role,
    availability: currentAgent.availability,
    categories: [...currentAgent.categories],
  });

  // Password State
  const [passwords, setPasswords] = useState({
    current: '',
    newPass: '',
    confirmPass: '',
  });

  // Notifications State
  const [notifSettings, setNotifSettings] = useState({
    assignment: true,
    customerReply: true,
    slaWarning: true,
    slaBreach: true,
    escalation: true,
    dailySummary: false,
  });

  // Active Tab State
  const [activeTab, setActiveTab] = useState('general');

  // Feedback Toast State
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    showToast('Agent profile updated successfully!');
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!passwords.current || !passwords.newPass || !passwords.confirmPass) {
      showToast('Please complete all password fields.');
      return;
    }
    if (passwords.newPass !== passwords.confirmPass) {
      showToast('New passwords do not match.');
      return;
    }
    showToast('Password changed successfully!');
    setPasswords({ current: '', newPass: '', confirmPass: '' });
  };

  const handleCategoryToggle = (category) => {
    setProfile((prev) => {
      const exists = prev.categories.includes(category);
      if (exists) {
        return {
          ...prev,
          categories: prev.categories.filter((c) => c !== category),
        };
      } else {
        return {
          ...prev,
          categories: [...prev.categories, category],
        };
      }
    });
  };

  const handleNotifToggle = (key) => {
    setNotifSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    showToast('Notification preferences saved.');
  };

  const allCategories = ['Technical', 'Account', 'Billing', 'Integrations', 'Security', 'General'];

  return (
    <div className={styles.page}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className={styles.toast}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.avatarBlock}>
          <div className={styles.avatar}>{currentAgent.initials}</div>
          <div className={styles.headerDetails}>
            <div className={styles.nameRow}>
              <h1 className={styles.name}>{profile.firstName} {profile.lastName}</h1>
              <span className={`${styles.statusBadge} ${styles[profile.availability.toLowerCase()]}`}>
                ● {profile.availability}
              </span>
            </div>
            <p className={styles.roleTitle}>{profile.role} • {profile.department}</p>
            <p className={styles.emailText}>{profile.email}</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className={styles.tabsRow}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'general' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General & Agent Info
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'availability' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('availability')}
        >
          Availability & Specialties
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'notifications' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          Notifications
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'security' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Security & Password
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.contentCard}>
        {/* Tab 1: General Info */}
        {activeTab === 'general' && (
          <form onSubmit={handleProfileSubmit} className={styles.formSection}>
            <h3 className={styles.sectionTitle}>General Information</h3>
            <p className={styles.sectionDesc}>Update your contact details and support identity.</p>

            <div className={styles.grid2}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>First Name</label>
                <input
                  type="text"
                  className={styles.input}
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Last Name</label>
                <input
                  type="text"
                  className={styles.input}
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Email Address</label>
                <input
                  type="email"
                  className={styles.input}
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Phone Number</label>
                <input
                  type="text"
                  className={styles.input}
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Department</label>
                <input
                  type="text"
                  className={styles.input}
                  value={profile.department}
                  onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Support Team</label>
                <input
                  type="text"
                  className={styles.input}
                  value={profile.team}
                  onChange={(e) => setProfile({ ...profile, team: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.saveBtn}>Save General Info</button>
            </div>
          </form>
        )}

        {/* Tab 2: Availability & Specialties */}
        {activeTab === 'availability' && (
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Agent Availability & Skillsets</h3>
            <p className={styles.sectionDesc}>Set your active status and assign technical ticket categories.</p>

            <div className={styles.inputGroup} style={{ maxWidth: '400px' }}>
              <label className={styles.label}>Current Availability Status</label>
              <select
                className={styles.select}
                value={profile.availability}
                onChange={(e) => {
                  setProfile({ ...profile, availability: e.target.value });
                  showToast(`Status updated to ${e.target.value}`);
                }}
              >
                <option value="Available">🟢 Available (Online)</option>
                <option value="Busy">🟡 Busy (In Ticket Call)</option>
                <option value="Away">🟠 Away (On Break)</option>
                <option value="Offline">🔴 Offline</option>
              </select>
            </div>

            <div className={styles.divider} />

            <div className={styles.inputGroup}>
              <label className={styles.label}>Assigned Ticket Categories</label>
              <p className={styles.subtext}>Select categories of tickets automatically routed to your queue.</p>
              
              <div className={styles.categoriesGrid}>
                {allCategories.map((cat) => {
                  const isAssigned = profile.categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      className={`${styles.categoryChip} ${isAssigned ? styles.assignedChip : ''}`}
                      onClick={() => handleCategoryToggle(cat)}
                    >
                      {isAssigned ? '✓ ' : '+ '} {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.saveBtn} onClick={() => showToast('Availability & specialties updated.')}>
                Save Availability Preferences
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Notifications */}
        {activeTab === 'notifications' && (
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Agent Notification Settings</h3>
            <p className={styles.sectionDesc}>Choose when and how you want to be alerted regarding SLA and tickets.</p>

            <div className={styles.notifList}>
              <div className={styles.notifRow}>
                <div className={styles.notifText}>
                  <h4>Ticket Assignment</h4>
                  <p>Send an immediate alert when a new ticket is assigned to your queue.</p>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={notifSettings.assignment}
                    onChange={() => handleNotifToggle('assignment')}
                  />
                  <span className={styles.slider} />
                </label>
              </div>

              <div className={styles.notifRow}>
                <div className={styles.notifText}>
                  <h4>Customer Reply</h4>
                  <p>Alert when a customer posts a reply on any of your active tickets.</p>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={notifSettings.customerReply}
                    onChange={() => handleNotifToggle('customerReply')}
                  />
                  <span className={styles.slider} />
                </label>
              </div>

              <div className={styles.notifRow}>
                <div className={styles.notifText}>
                  <h4>SLA Warning Alert</h4>
                  <p>Trigger high-priority alert 30 minutes prior to SLA breach.</p>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={notifSettings.slaWarning}
                    onChange={() => handleNotifToggle('slaWarning')}
                  />
                  <span className={styles.slider} />
                </label>
              </div>

              <div className={styles.notifRow}>
                <div className={styles.notifText}>
                  <h4>SLA Breach Alert</h4>
                  <p>Notify instantly when a ticket breaches response/resolution SLA.</p>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={notifSettings.slaBreach}
                    onChange={() => handleNotifToggle('slaBreach')}
                  />
                  <span className={styles.slider} />
                </label>
              </div>

              <div className={styles.notifRow}>
                <div className={styles.notifText}>
                  <h4>Ticket Escalation</h4>
                  <p>Notify when a ticket is escalated to Tier 3 or Management.</p>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={notifSettings.escalation}
                    onChange={() => handleNotifToggle('escalation')}
                  />
                  <span className={styles.slider} />
                </label>
              </div>

              <div className={styles.notifRow}>
                <div className={styles.notifText}>
                  <h4>Daily Digest Summary</h4>
                  <p>Receive a morning email summary of daily stats and pending queue.</p>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={notifSettings.dailySummary}
                    onChange={() => handleNotifToggle('dailySummary')}
                  />
                  <span className={styles.slider} />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Security */}
        {activeTab === 'security' && (
          <form onSubmit={handlePasswordSubmit} className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Security & Password</h3>
            <p className={styles.sectionDesc}>Ensure your SupportDesk agent account remains secure.</p>

            <div className={styles.grid1}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Current Password</label>
                <input
                  type="password"
                  className={styles.input}
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>New Password</label>
                <input
                  type="password"
                  className={styles.input}
                  value={passwords.newPass}
                  onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Confirm New Password</label>
                <input
                  type="password"
                  className={styles.input}
                  value={passwords.confirmPass}
                  onChange={(e) => setPasswords({ ...passwords, confirmPass: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.saveBtn}>Update Password</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
