import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sampleTicketDetails, adminAgentsList } from '../adminMockData';
import Select from '../../../components/common/Select';
import styles from './AdminTicketDetails.module.css';

export default function AdminTicketDetails() {
  const { ticketId } = useParams();
  const navigate = useNavigate();

  // Local ticket state initialized with sample data
  const [ticket, setTicket] = useState({
    ...sampleTicketDetails,
    id: ticketId ? `#${ticketId}` : sampleTicketDetails.id,
  });

  const [activeTab, setActiveTab] = useState('reply'); // 'reply' | 'note'
  const [replyText, setReplyText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const newMsg = {
      id: `msg_${Date.now()}`,
      sender: 'admin',
      senderName: 'Alex Rivera (System Administrator)',
      time: 'Just now',
      text: replyText,
      attachments: [],
    };

    setTicket((prev) => ({
      ...prev,
      conversation: [...prev.conversation, newMsg],
      timeline: [
        ...prev.timeline,
        { event: 'Admin Alex Rivera posted official response', time: 'Just now' },
      ],
      updated: 'Just now',
    }));

    setReplyText('');
    showToast('Admin response sent to customer.');
  };

  const handleAddInternalNote = (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    const newNote = {
      id: `note_${Date.now()}`,
      author: 'Alex Rivera (Admin)',
      time: 'Just now',
      text: noteText,
    };

    setTicket((prev) => ({
      ...prev,
      internalNotes: [...prev.internalNotes, newNote],
      timeline: [
        ...prev.timeline,
        { event: 'Admin added an internal system note', time: 'Just now' },
      ],
      updated: 'Just now',
    }));

    setNoteText('');
    showToast('Internal note saved.');
  };

  const handleStatusChange = (newStatus) => {
    setTicket((prev) => ({
      ...prev,
      status: newStatus,
      timeline: [
        ...prev.timeline,
        { event: `Status updated to ${newStatus} by Admin`, time: 'Just now' },
      ],
      updated: 'Just now',
    }));
    showToast(`Status changed to ${newStatus}`);
  };

  const handlePriorityChange = (newPriority) => {
    setTicket((prev) => ({
      ...prev,
      priority: newPriority,
      timeline: [
        ...prev.timeline,
        { event: `Priority updated to ${newPriority} by Admin`, time: 'Just now' },
      ],
      updated: 'Just now',
    }));
    showToast(`Priority updated to ${newPriority}`);
  };

  const handleAgentReassign = (newAgent) => {
    setTicket((prev) => ({
      ...prev,
      assignedAgent: newAgent,
      timeline: [
        ...prev.timeline,
        { event: `Reassigned to ${newAgent} by Admin`, time: 'Just now' },
      ],
      updated: 'Just now',
    }));
    showToast(`Ticket reassigned to ${newAgent}`);
  };

  const handleEscalate = () => {
    setTicket((prev) => ({
      ...prev,
      priority: 'Critical',
      timeline: [
        ...prev.timeline,
        { event: 'Escalated to Tier 3 Executive Admin', time: 'Just now' },
      ],
      updated: 'Just now',
    }));
    showToast('Ticket escalated to Critical priority!');
  };

  return (
    <div className={styles.page}>
      {/* Feedback Toast */}
      {toastMsg && (
        <div className={styles.toast}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Navigation Breadcrumb */}
      <div className={styles.topNavRow}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate('/admin/tickets')}
        >
          ← Back to All Tickets
        </button>
        <span className={styles.routeTag}>ADMIN TICKET CONTROL CONSOLE</span>
      </div>

      {/* Main Ticket Banner */}
      <div className={styles.banner}>
        <div className={styles.bannerHeader}>
          <div className={styles.bannerTitleGroup}>
            <span className={styles.ticketIdPill}>{ticket.id}</span>
            <h1 className={styles.bannerSubject}>{ticket.subject}</h1>
          </div>

          <div className={styles.bannerBadges}>
            <span className={`${styles.priorityBadge} ${styles[ticket.priority.toLowerCase()]}`}>
              {ticket.priority} Priority
            </span>
            <span className={styles.statusPill}>{ticket.status}</span>
            <span className={styles.slaBadge}>⏰ {ticket.slaTimeRemaining}</span>
          </div>
        </div>
      </div>

      {/* 2-Column Workspace Grid */}
      <div className={styles.workspaceGrid}>
        {/* Left Column: Conversation, Notes, Composer */}
        <div className={styles.leftCol}>
          {/* Conversation Thread */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Customer & Agent Messages</h3>
              <span className={styles.countTag}>{ticket.conversation.length} Messages</span>
            </div>

            <div className={styles.messagesList}>
              {ticket.conversation.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.msgBubble} ${
                    msg.sender === 'customer'
                      ? styles.customerBubble
                      : msg.sender === 'admin'
                      ? styles.adminBubble
                      : styles.agentBubble
                  }`}
                >
                  <div className={styles.msgHeader}>
                    <strong className={styles.msgSender}>{msg.senderName}</strong>
                    <span className={styles.msgTime}>{msg.time}</span>
                  </div>

                  <p className={styles.msgText}>{msg.text}</p>

                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className={styles.attachmentsRow}>
                      {msg.attachments.map((att) => (
                        <div key={att.name} className={styles.attachmentChip}>
                          <span>📎 {att.name}</span>
                          <small>({att.size})</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Internal Notes Container (Visually Isolated Amber Box) */}
          <div className={styles.internalNotesContainer}>
            <div className={styles.internalNotesHeader}>
              <h3 className={styles.internalNotesTitle}>🔒 Confidential Internal Team Notes</h3>
              <span className={styles.internalBadge}>Visible to Agents & Admins only</span>
            </div>

            {ticket.internalNotes.length === 0 ? (
              <p className={styles.noNotesText}>No internal notes logged for this ticket yet.</p>
            ) : (
              <div className={styles.notesList}>
                {ticket.internalNotes.map((note) => (
                  <div key={note.id} className={styles.noteItem}>
                    <div className={styles.noteMeta}>
                      <strong>{note.author}</strong>
                      <span>{note.time}</span>
                    </div>
                    <p className={styles.noteContent}>{note.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dual-Tab Composer: Official Reply vs Internal Note */}
          <div className={styles.composerCard}>
            <div className={styles.composerTabs}>
              <button
                type="button"
                className={`${styles.composerTab} ${activeTab === 'reply' ? styles.activeComposerTab : ''}`}
                onClick={() => setActiveTab('reply')}
              >
                ✉️ Send Official Reply
              </button>
              <button
                type="button"
                className={`${styles.composerTab} ${activeTab === 'note' ? styles.activeComposerTab : ''}`}
                onClick={() => setActiveTab('note')}
              >
                🔒 Add Internal Note
              </button>
            </div>

            {activeTab === 'reply' ? (
              <form onSubmit={handleSendReply} className={styles.composerForm}>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  placeholder="Write an official customer-facing response..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <div className={styles.composerFooter}>
                  <button type="button" className={styles.attachBtn} onClick={() => showToast('File attachment mock triggered.')}>
                    📎 Attach file
                  </button>
                  <button type="submit" className={styles.sendReplyBtn}>
                    Send Reply
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddInternalNote} className={styles.composerForm}>
                <textarea
                  className={`${styles.textarea} ${styles.internalTextarea}`}
                  rows={4}
                  placeholder="Write a private internal note for agents and management..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
                <div className={styles.composerFooter}>
                  <span className={styles.confidentialInfo}>Notes are never shared with customers.</span>
                  <button type="submit" className={styles.saveNoteBtn}>
                    Add Internal Note
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Activity Timeline */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Ticket Audit Timeline</h3>
            <div className={styles.timeline}>
              {ticket.timeline.map((item, i) => (
                <div key={i} className={styles.timelineItem}>
                  <span className={styles.timelineDot} />
                  <span className={styles.timelineEvent}>{item.event}</span>
                  <span className={styles.timelineTime}>{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Ticket Metadata & Admin Control Panel */}
        <div className={styles.rightCol}>
          {/* Quick Admin Actions Box */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Admin Control Panel</h3>
            <p className={styles.cardDesc}>Override ticket parameters directly.</p>

            <div className={styles.controlsForm}>
              {/* Status Control */}
              <div className={styles.controlGroup}>
                <Select
                  label="Change Status"
                  options={[
                    { value: 'Open', label: 'Open', subtitle: 'New unhandled ticket', badge: 'Open', badgeColor: '#0A84FF' },
                    { value: 'In Progress', label: 'In Progress', subtitle: 'Under investigation', badge: 'Active', badgeColor: '#FFD60A' },
                    { value: 'Waiting for Customer', label: 'Waiting for Customer', subtitle: 'Awaiting customer input', badge: 'Waiting', badgeColor: '#FF9F0A' },
                    { value: 'Resolved', label: 'Resolved', subtitle: 'Resolved ticket', badge: 'Resolved', badgeColor: '#30D158' },
                    { value: 'Closed', label: 'Closed', subtitle: 'Closed ticket', badge: 'Closed', badgeColor: '#64748B' },
                  ]}
                  value={ticket.status}
                  onChange={handleStatusChange}
                />
              </div>

              {/* Priority Control */}
              <div className={styles.controlGroup}>
                <Select
                  label="Change Priority"
                  options={[
                    { value: 'Critical', label: 'Critical', subtitle: 'System outage / Blocker', badge: 'P1', badgeColor: '#FF453A' },
                    { value: 'High', label: 'High', subtitle: 'High severity impact', badge: 'P2', badgeColor: '#FF9F0A' },
                    { value: 'Medium', label: 'Medium', subtitle: 'Standard ticket', badge: 'P3', badgeColor: '#64D2FF' },
                    { value: 'Low', label: 'Low', subtitle: 'Low priority task', badge: 'P4', badgeColor: '#94A3B8' },
                  ]}
                  value={ticket.priority}
                  onChange={handlePriorityChange}
                />
              </div>

              {/* Agent Reassignment Control */}
              <div className={styles.controlGroup}>
                <Select
                  label="Assign Agent"
                  options={[
                    { value: 'Unassigned', label: 'Unassigned', subtitle: 'No agent assigned', initials: 'UN' },
                    ...adminAgentsList.map((a) => ({
                      value: a.name,
                      label: a.name,
                      subtitle: a.department,
                      initials: a.initials || a.name.split(' ').map((n) => n[0]).join(''),
                      badge: a.role,
                    })),
                  ]}
                  value={ticket.assignedAgent}
                  onChange={handleAgentReassign}
                />
              </div>

              <div className={styles.actionBtnsRow}>
                <button
                  type="button"
                  className={styles.escalateBtn}
                  onClick={handleEscalate}
                >
                  ⚡ Escalate to Critical
                </button>
                <button
                  type="button"
                  className={styles.resolveBtn}
                  onClick={() => handleStatusChange('Resolved')}
                >
                  ✓ Mark as Resolved
                </button>
              </div>
            </div>
          </div>

          {/* Ticket Information Panel */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Ticket Information</h3>
            <div className={styles.metaGrid}>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Category</span>
                <span className={styles.metaVal}>{ticket.category}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Created Date</span>
                <span className={styles.metaVal}>{ticket.created}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Last Updated</span>
                <span className={styles.metaVal}>{ticket.updated}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Assigned Agent</span>
                <span className={styles.metaVal}>{ticket.assignedAgent}</span>
              </div>
            </div>
          </div>

          {/* Customer Information Panel */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Customer Information</h3>
            <div className={styles.customerBox}>
              <div className={styles.customerAvatar}>{ticket.customer.avatar}</div>
              <div>
                <strong className={styles.customerName}>{ticket.customer.name}</strong>
                <span className={styles.customerEmail}>{ticket.customer.email}</span>
                <span className={styles.customerCompany}>{ticket.customer.company}</span>
              </div>
            </div>

            <div className={styles.metaGrid} style={{ marginTop: '0.75rem' }}>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Total Customer Tickets</span>
                <span className={styles.metaVal}>12 Tickets</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Open Tickets</span>
                <span className={styles.metaVal}>2 Open</span>
              </div>
            </div>
          </div>

          {/* Related Customer Tickets */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Related Tickets</h3>
            <div className={styles.relatedList}>
              <div
                className={styles.relatedItem}
                onClick={() => navigate('/admin/tickets/1015')}
              >
                <span className={styles.relatedId}>#1015</span>
                <span className={styles.relatedSub}>Password reset issue</span>
                <span className={styles.relatedStatus}>Resolved</span>
              </div>
              <div
                className={styles.relatedItem}
                onClick={() => navigate('/admin/tickets/1004')}
              >
                <span className={styles.relatedId}>#1004</span>
                <span className={styles.relatedSub}>Production login failure</span>
                <span className={styles.relatedStatus}>In Progress</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
