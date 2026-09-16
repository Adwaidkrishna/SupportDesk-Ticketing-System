import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sampleTicketDetails, currentAgent } from '../agentMockData';
import styles from './AgentTicketDetails.module.css';

import CallConfirmationModal from '../../video-call/components/CallConfirmationModal';

export default function AgentTicketDetails() {
  const { ticketId } = useParams();
  const navigate = useNavigate();

  // Active ticket state with local mutations for agent actions
  const [ticket, setTicket] = useState({
    ...sampleTicketDetails,
    id: ticketId ? `#${ticketId}` : sampleTicketDetails.id,
  });

  const [customerReplyText, setCustomerReplyText] = useState('');
  const [internalNoteText, setInternalNoteText] = useState('');
  const [activeTab, setActiveTab] = useState('reply'); // 'reply' | 'internal_note'
  const [toastMessage, setToastMessage] = useState('');
  const [showCallModal, setShowCallModal] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleStartCallClick = () => {
    setShowCallModal(true);
  };

  const handleConfirmStartCall = () => {
    setShowCallModal(false);
    const cleanId = (ticketId || '1018').replace('#', '');
    navigate(`/ticket/${cleanId}/call`);
  };

  const handleSendCustomerReply = (e) => {
    e.preventDefault();
    if (!customerReplyText.trim()) return;

    const newMsg = {
      id: `msg_${Date.now()}`,
      sender: 'agent',
      senderName: `${currentAgent.name} (Support Agent)`,
      time: 'Just now',
      text: customerReplyText,
      attachments: [],
    };

    setTicket((prev) => ({
      ...prev,
      conversation: [...prev.conversation, newMsg],
      timeline: [
        ...prev.timeline,
        { event: `Agent ${currentAgent.name} replied to customer`, time: 'Just now' },
      ],
      updated: 'Just now',
    }));

    setCustomerReplyText('');
    showToast('Reply sent to customer successfully!');
  };

  const handleAddInternalNote = (e) => {
    e.preventDefault();
    if (!internalNoteText.trim()) return;

    const newNote = {
      id: `note_${Date.now()}`,
      author: currentAgent.name,
      time: 'Just now',
      text: internalNoteText,
    };

    setTicket((prev) => ({
      ...prev,
      internalNotes: [...(prev.internalNotes || []), newNote],
      timeline: [
        ...prev.timeline,
        { event: `Internal note added by ${currentAgent.name}`, time: 'Just now' },
      ],
      updated: 'Just now',
    }));

    setInternalNoteText('');
    showToast('Internal note saved!');
  };

  const handleStatusChange = (newStatus) => {
    setTicket((prev) => ({
      ...prev,
      status: newStatus,
      timeline: [
        ...prev.timeline,
        { event: `Status updated to ${newStatus}`, time: 'Just now' },
      ],
    }));
    showToast(`Ticket status updated to "${newStatus}"`);
  };

  const handlePriorityChange = (newPriority) => {
    setTicket((prev) => ({
      ...prev,
      priority: newPriority,
      timeline: [
        ...prev.timeline,
        { event: `Priority changed to ${newPriority}`, time: 'Just now' },
      ],
    }));
    showToast(`Priority changed to "${newPriority}"`);
  };

  const handleEscalate = () => {
    setTicket((prev) => ({
      ...prev,
      priority: 'Critical',
      status: 'In Progress',
      timeline: [
        ...prev.timeline,
        { event: `Ticket escalated to Tier 3 Engineering`, time: 'Just now' },
      ],
    }));
    showToast('Ticket #1024 escalated to Tier 3 Engineering');
  };

  const handleResolve = () => {
    setTicket((prev) => ({
      ...prev,
      status: 'Resolved',
      timeline: [
        ...prev.timeline,
        { event: `Ticket marked as Resolved by ${currentAgent.name}`, time: 'Just now' },
      ],
    }));
    showToast('Ticket marked as Resolved!');
  };

  const getPriorityBadgeClass = (p) => {
    switch (p?.toLowerCase()) {
      case 'critical':
        return styles.priorityCritical;
      case 'high':
        return styles.priorityHigh;
      case 'medium':
        return styles.priorityMedium;
      case 'low':
      default:
        return styles.priorityLow;
    }
  };

  const getStatusBadgeClass = (s) => {
    switch (s?.toLowerCase()) {
      case 'in progress':
        return styles.statusInfo;
      case 'waiting for customer':
        return styles.statusWarning;
      case 'resolved':
        return styles.statusSuccess;
      default:
        return styles.statusOpen;
    }
  };

  return (
    <div className={styles.page}>
      {/* Top Action & Breadcrumb Bar */}
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate('/agent/queue')}
        >
          ← Back to My Queue
        </button>

        <div className={styles.topActions}>
          <button
            type="button"
            className={styles.videoCallBtn}
            onClick={handleStartCallClick}
          >
            📹 Start Video Call
          </button>
          <button
            type="button"
            className={styles.escalateBtn}
            onClick={handleEscalate}
          >
            🚨 Escalate Ticket
          </button>
          <button
            type="button"
            className={styles.resolveBtn}
            onClick={handleResolve}
          >
            ✓ Mark as Resolved
          </button>
        </div>
      </div>

      {showCallModal && (
        <CallConfirmationModal
          ticket={{
            id: ticket.id,
            subject: ticket.subject,
            customerName: ticket.customer?.name || 'Rahul Sharma',
          }}
          onConfirm={handleConfirmStartCall}
          onCancel={() => setShowCallModal(false)}
        />
      )}

      {toastMessage && (
        <div className={styles.toastSuccess}>
          <span>✓</span> {toastMessage}
        </div>
      )}

      {/* Ticket Header Card */}
      <div className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div className={styles.idGroup}>
            <span className={styles.ticketIdBadge}>{ticket.id}</span>
            <span className={`${styles.priorityBadge} ${getPriorityBadgeClass(ticket.priority)}`}>
              {ticket.priority} Priority
            </span>
            <span className={`${styles.statusBadge} ${getStatusBadgeClass(ticket.status)}`}>
              {ticket.status}
            </span>
          </div>

          <div className={styles.slaBadge}>
            ⏱ SLA: <strong>{ticket.slaTimeRemaining}</strong>
          </div>
        </div>

        <h1 className={styles.ticketSubject}>{ticket.subject}</h1>
      </div>

      {/* Main Workspace Layout (2-Column Grid) */}
      <div className={styles.workspaceGrid}>
        {/* Left Workspace Column: Conversation & Composers */}
        <div className={styles.leftCol}>
          {/* Conversation Thread Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Customer Conversation</h2>
              <span className={styles.countBadge}>
                {ticket.conversation.length} Messages
              </span>
            </div>

            <div className={styles.conversationList}>
              {ticket.conversation.map((msg) => {
                const isAgent = msg.sender === 'agent';
                return (
                  <div
                    key={msg.id}
                    className={`${styles.messageBubble} ${
                      isAgent ? styles.agentMsg : styles.customerMsg
                    }`}
                  >
                    <div className={styles.msgHeader}>
                      <div className={styles.msgSenderGroup}>
                        <div
                          className={`${styles.msgAvatar} ${
                            isAgent ? styles.agentAvatar : styles.customerAvatar
                          }`}
                        >
                          {isAgent ? 'AJ' : ticket.customer.avatar || 'CS'}
                        </div>
                        <span className={styles.msgAuthor}>{msg.senderName}</span>
                      </div>
                      <span className={styles.msgTime}>{msg.time}</span>
                    </div>

                    <p className={styles.msgBody}>{msg.text}</p>

                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className={styles.attachmentsList}>
                        {msg.attachments.map((att, idx) => (
                          <div key={idx} className={styles.attachmentChip}>
                            <span className={styles.attIcon}>📎</span>
                            <span className={styles.attName}>{att.name}</span>
                            <span className={styles.attSize}>({att.size})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Internal Notes Section (Visually Distinct Yellow/Amber Box) */}
          <div className={styles.internalNotesCard}>
            <div className={styles.notesHeader}>
              <div className={styles.notesTitleGroup}>
                <span className={styles.lockIcon}>🔒</span>
                <div>
                  <h3 className={styles.notesTitle}>Internal Agent Notes</h3>
                  <p className={styles.notesSub}>
                    Confidential audit trail — Visible ONLY to support agents and admin staff.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.notesList}>
              {ticket.internalNotes && ticket.internalNotes.length > 0 ? (
                ticket.internalNotes.map((note) => (
                  <div key={note.id} className={styles.noteItem}>
                    <div className={styles.noteTop}>
                      <span className={styles.noteAuthor}>✍️ {note.author}</span>
                      <span className={styles.noteTime}>{note.time}</span>
                    </div>
                    <p className={styles.noteText}>{note.text}</p>
                  </div>
                ))
              ) : (
                <p className={styles.noNotesText}>No internal notes added yet.</p>
              )}
            </div>
          </div>

          {/* Response & Internal Note Composer Tabs */}
          <div className={styles.composerCard}>
            <div className={styles.composerTabs}>
              <button
                type="button"
                className={`${styles.composerTab} ${
                  activeTab === 'reply' ? styles.activeComposerTab : ''
                }`}
                onClick={() => setActiveTab('reply')}
              >
                💬 Customer Reply
              </button>
              <button
                type="button"
                className={`${styles.composerTab} ${
                  activeTab === 'internal_note' ? styles.activeComposerTab : ''
                }`}
                onClick={() => setActiveTab('internal_note')}
              >
                🔒 Add Internal Note
              </button>
            </div>

            {activeTab === 'reply' ? (
              <form onSubmit={handleSendCustomerReply} className={styles.composerForm}>
                <textarea
                  className={styles.composerTextarea}
                  placeholder="Type your response to the customer..."
                  rows={4}
                  value={customerReplyText}
                  onChange={(e) => setCustomerReplyText(e.target.value)}
                  required
                />
                <div className={styles.composerFooter}>
                  <button type="button" className={styles.attachBtn}>
                    📎 Attach Files
                  </button>
                  <button type="submit" className={styles.sendBtn}>
                    Send Reply →
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddInternalNote} className={styles.composerForm}>
                <textarea
                  className={`${styles.composerTextarea} ${styles.internalTextarea}`}
                  placeholder="Type confidential internal investigation note for team members..."
                  rows={4}
                  value={internalNoteText}
                  onChange={(e) => setInternalNoteText(e.target.value)}
                  required
                />
                <div className={styles.composerFooter}>
                  <span className={styles.internalHint}>
                    🔒 Note will NOT be visible to customer
                  </span>
                  <button type="submit" className={styles.saveNoteBtn}>
                    Save Internal Note
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Sidebar Column: Ticket Metadata & Agent Controls */}
        <div className={styles.rightCol}>
          {/* Quick Controls Card */}
          <div className={styles.sideCard}>
            <h3 className={styles.sideTitle}>Agent Controls</h3>

            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>Ticket Status</label>
              <select
                className={styles.controlSelect}
                value={ticket.status}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Waiting for Customer">Waiting for Customer</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>Priority Level</label>
              <select
                className={styles.controlSelect}
                value={ticket.priority}
                onChange={(e) => handlePriorityChange(e.target.value)}
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>Assigned Agent</label>
              <select
                className={styles.controlSelect}
                value={ticket.assignedAgent}
                onChange={(e) => {
                  setTicket((prev) => ({ ...prev, assignedAgent: e.target.value }));
                  showToast(`Assigned agent changed to ${e.target.value}`);
                }}
              >
                <option value="Alex Johnson">Alex Johnson (Me)</option>
                <option value="Sarah Chen">Sarah Chen (Tier 2)</option>
                <option value="David Miller">David Miller (DevOps)</option>
                <option value="Unassigned">Unassigned</option>
              </select>
            </div>
          </div>

          {/* Customer Metadata Card */}
          <div className={styles.sideCard}>
            <h3 className={styles.sideTitle}>Customer Information</h3>
            <div className={styles.customerBox}>
              <div className={styles.custAvatarBig}>{ticket.customer.avatar || 'CS'}</div>
              <div className={styles.custDetails}>
                <h4 className={styles.custName}>{ticket.customer.name}</h4>
                <p className={styles.custEmail}>{ticket.customer.email}</p>
                <span className={styles.companyBadge}>{ticket.customer.company}</span>
              </div>
            </div>

            <div className={styles.metaList}>
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Category</span>
                <span className={styles.metaVal}>{ticket.category}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Created</span>
                <span className={styles.metaVal}>{ticket.created}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Last Updated</span>
                <span className={styles.metaVal}>{ticket.updated}</span>
              </div>
            </div>
          </div>

          {/* Activity Timeline Card */}
          <div className={styles.sideCard}>
            <h3 className={styles.sideTitle}>Activity History</h3>
            <div className={styles.timelineList}>
              {ticket.timeline.map((item, idx) => (
                <div key={idx} className={styles.timelineItem}>
                  <div className={styles.timelineDot} />
                  <div className={styles.timelineInfo}>
                    <p className={styles.timelineEvent}>{item.event}</p>
                    <span className={styles.timelineTime}>{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
