import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getAdminTicketById,
  assignTicketAgent,
  updateTicketStatus,
  updateTicketPriority,
  getAdminTicketMessages,
  sendAdminTicketMessage,
} from '../services/adminTicket.service';
import { getAdminAgents } from '../services/adminAgent.service';
import Select from '../../../components/common/Select';
import styles from './AdminTicketDetails.module.css';

export default function AdminTicketDetails() {
  const { ticketId } = useParams();
  const navigate = useNavigate();

  // State
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [agentsList, setAgentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tab & Composer State
  const [activeTab, setActiveTab] = useState('reply'); // 'reply' | 'note'
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [internalNotes, setInternalNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Fetch ticket details and messages
  const loadTicketData = useCallback(async () => {
    if (!ticketId) return;

    setLoading(true);
    setError(null);
    try {
      const [ticketRes, messagesRes, agentsRes] = await Promise.all([
        getAdminTicketById(ticketId),
        getAdminTicketMessages(ticketId).catch(() => ({ data: { messages: [] } })),
        getAdminAgents().catch(() => ({ data: { agents: [] } })),
      ]);

      const ticketData = ticketRes?.data?.ticket;
      if (!ticketData) {
        throw new Error('Ticket not found.');
      }

      setTicket(ticketData);
      setMessages(messagesRes?.data?.messages || []);
      if (agentsRes?.data?.agents) {
        setAgentsList(agentsRes.data.agents);
      }
    } catch (err) {
      console.error('Failed to load admin ticket details:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load ticket details.');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicketData();
  }, [loadTicketData]);

  // Handle Official Admin Reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || sendingReply) return;

    setSendingReply(true);
    try {
      const res = await sendAdminTicketMessage(ticketId, replyText.trim());
      const newMsg = res?.data?.message;

      if (newMsg) {
        setMessages((prev) => [...prev, newMsg]);
      }
      setReplyText('');
      showToast('Official admin response sent to customer.');
    } catch (err) {
      console.error('Failed to send admin reply:', err);
      showToast(err?.response?.data?.message || err?.message || 'Failed to send reply.');
    } finally {
      setSendingReply(false);
    }
  };

  // Handle Internal Private Note
  const handleAddInternalNote = (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    const newNote = {
      id: `note_${Date.now()}`,
      author: 'Administrator',
      time: 'Just now',
      text: noteText.trim(),
    };

    setInternalNotes((prev) => [...prev, newNote]);
    setNoteText('');
    showToast('Internal confidential note saved.');
  };

  // Control Actions
  const handleStatusChange = async (newStatus) => {
    try {
      const res = await updateTicketStatus(ticketId, newStatus);
      const updatedTicket = res?.data?.ticket;
      setTicket((prev) => ({ ...prev, ...updatedTicket }));
      showToast(`Status updated to ${newStatus}.`);
    } catch (err) {
      console.error('Failed to update status:', err);
      showToast(err?.response?.data?.message || err?.message || 'Failed to update status.');
    }
  };

  const handlePriorityChange = async (newPriority) => {
    try {
      const res = await updateTicketPriority(ticketId, newPriority);
      const updatedTicket = res?.data?.ticket;
      setTicket((prev) => ({ ...prev, ...updatedTicket }));
      showToast(`Priority updated to ${newPriority}.`);
    } catch (err) {
      console.error('Failed to update priority:', err);
      showToast(err?.response?.data?.message || err?.message || 'Failed to update priority.');
    }
  };

  const handleAgentReassign = async (newAgentId) => {
    try {
      const agentTarget = newAgentId === 'unassigned' || !newAgentId ? null : newAgentId;
      const res = await assignTicketAgent(ticketId, agentTarget);
      const updatedTicket = res?.data?.ticket;
      setTicket((prev) => ({ ...prev, ...updatedTicket }));
      showToast(agentTarget ? 'Ticket reassigned to agent.' : 'Ticket unassigned.');
    } catch (err) {
      console.error('Failed to reassign agent:', err);
      showToast(err?.response?.data?.message || err?.message || 'Failed to reassign agent.');
    }
  };

  const handleEscalate = () => {
    handlePriorityChange('URGENT');
  };

  const formatDateTime = (val) => {
    if (!val) return 'N/A';
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Loading ticket details and conversation...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className={styles.page}>
        <div className={styles.topNavRow}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate('/admin/tickets')}
          >
            ← Back to All Tickets
          </button>
        </div>
        <div className={styles.errorBanner}>
          <span>{error || 'Ticket not found.'}</span>
          <button type="button" className={styles.retryBtn} onClick={loadTicketData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const ticketNumberStr = ticket.ticketNumber || ticket.id || ticket._id;
  const priorityLower = (ticket.priority || 'medium').toLowerCase();
  const currentAssignedAgentId = ticket.assignedTo?._id || ticket.assignedTo?.id || 'unassigned';

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
            <span className={styles.ticketIdPill}>#{ticketNumberStr}</span>
            <h1 className={styles.bannerSubject}>{ticket.subject}</h1>
          </div>

          <div className={styles.bannerBadges}>
            <span className={`${styles.priorityBadge} ${styles[priorityLower] || ''}`}>
              {ticket.priority} Priority
            </span>
            <span className={styles.statusPill}>{ticket.status}</span>
          </div>
        </div>
      </div>

      {/* 2-Column Workspace Grid */}
      <div className={styles.workspaceGrid}>
        {/* Left Column: Description, Conversation, Notes, Composer */}
        <div className={styles.leftCol}>
          {/* Ticket Description Box */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Issue Description</h3>
              <span className={styles.countTag}>Opened {formatDateTime(ticket.createdAt)}</span>
            </div>
            <p className={styles.cardDesc} style={{ whiteSpace: 'pre-wrap', color: '#e5e7eb', marginTop: '0.5rem' }}>
              {ticket.description}
            </p>
          </div>

          {/* Conversation Thread */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Customer & Agent Messages</h3>
              <span className={styles.countTag}>{messages.length} Messages</span>
            </div>

            <div className={styles.messagesList}>
              {messages.length === 0 ? (
                <p style={{ color: '#9ca3af', padding: '1rem 0' }}>No messages posted yet on this ticket.</p>
              ) : (
                messages.map((msg) => {
                  const isCustomer = msg.senderRole === 'customer';
                  const isAdmin = msg.senderRole === 'admin';
                  const bubbleStyle = isCustomer
                    ? styles.customerBubble
                    : isAdmin
                    ? styles.adminBubble
                    : styles.agentBubble;

                  return (
                    <div
                      key={msg.id || msg._id}
                      className={`${styles.msgBubble} ${bubbleStyle}`}
                    >
                      <div className={styles.msgHeader}>
                        <strong className={styles.msgSender}>
                          {msg.senderName || msg.sender?.name || (isAdmin ? 'Administrator' : 'User')}
                        </strong>
                        <span className={styles.msgTime}>{formatDateTime(msg.createdAt)}</span>
                      </div>

                      <p className={styles.msgText}>{msg.text || msg.body}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Confidential Internal Notes Container */}
          <div className={styles.internalNotesContainer}>
            <div className={styles.internalNotesHeader}>
              <h3 className={styles.internalNotesTitle}>🔒 Confidential Internal Team Notes</h3>
              <span className={styles.internalBadge}>Visible to Agents & Admins only</span>
            </div>

            {internalNotes.length === 0 ? (
              <p className={styles.noNotesText}>No internal notes logged for this session yet.</p>
            ) : (
              <div className={styles.notesList}>
                {internalNotes.map((note) => (
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
                  placeholder="Write an official customer-facing response as Administrator..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={sendingReply}
                />
                <div className={styles.composerFooter}>
                  <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                    Reply will be dispatched to the customer in real-time.
                  </span>
                  <button
                    type="submit"
                    className={styles.sendReplyBtn}
                    disabled={sendingReply || !replyText.trim()}
                  >
                    {sendingReply ? 'Sending...' : 'Send Official Reply'}
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
                  <button type="submit" className={styles.saveNoteBtn} disabled={!noteText.trim()}>
                    Add Internal Note
                  </button>
                </div>
              </form>
            )}
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
                    { value: 'OPEN', label: 'OPEN', subtitle: 'New unhandled ticket', badge: 'Open', badgeColor: '#0A84FF' },
                    { value: 'IN_PROGRESS', label: 'IN_PROGRESS', subtitle: 'Under investigation', badge: 'Active', badgeColor: '#FFD60A' },
                    { value: 'RESOLVED', label: 'RESOLVED', subtitle: 'Resolved ticket', badge: 'Resolved', badgeColor: '#30D158' },
                    { value: 'CLOSED', label: 'CLOSED', subtitle: 'Closed ticket', badge: 'Closed', badgeColor: '#64748B' },
                  ]}
                  value={ticket.status || 'OPEN'}
                  onChange={handleStatusChange}
                />
              </div>

              {/* Priority Control */}
              <div className={styles.controlGroup}>
                <Select
                  label="Change Priority"
                  options={[
                    { value: 'URGENT', label: 'URGENT', subtitle: 'Blocker / Outage', badge: 'P1', badgeColor: '#FF453A' },
                    { value: 'HIGH', label: 'HIGH', subtitle: 'High severity impact', badge: 'P2', badgeColor: '#FF9F0A' },
                    { value: 'MEDIUM', label: 'MEDIUM', subtitle: 'Standard ticket', badge: 'P3', badgeColor: '#64D2FF' },
                    { value: 'LOW', label: 'LOW', subtitle: 'Low priority task', badge: 'P4', badgeColor: '#94A3B8' },
                  ]}
                  value={ticket.priority || 'MEDIUM'}
                  onChange={handlePriorityChange}
                />
              </div>

              {/* Agent Reassignment Control */}
              <div className={styles.controlGroup}>
                <Select
                  label="Assign Agent"
                  options={[
                    { value: 'unassigned', label: 'Unassigned', subtitle: 'No agent assigned', initials: 'UN' },
                    ...agentsList.map((a) => ({
                      value: a.id || a._id,
                      label: a.name,
                      subtitle: a.department || 'General',
                      initials: a.name ? a.name.split(' ').map((n) => n[0]).join('') : 'AG',
                    })),
                  ]}
                  value={currentAssignedAgentId}
                  onChange={handleAgentReassign}
                />
              </div>

              <div className={styles.actionBtnsRow}>
                <button
                  type="button"
                  className={styles.escalateBtn}
                  onClick={handleEscalate}
                >
                  ⚡ Escalate to Urgent
                </button>
                <button
                  type="button"
                  className={styles.resolveBtn}
                  onClick={() => handleStatusChange('RESOLVED')}
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
                <span className={styles.metaVal}>{ticket.category?.name || 'General'}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Created Date</span>
                <span className={styles.metaVal}>{formatDateTime(ticket.createdAt)}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Last Updated</span>
                <span className={styles.metaVal}>{formatDateTime(ticket.updatedAt)}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Assigned Agent</span>
                <span className={styles.metaVal}>{ticket.assignedTo?.name || 'Unassigned'}</span>
              </div>
            </div>
          </div>

          {/* Customer Information Panel */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Customer Information</h3>
            <div className={styles.customerBox}>
              <div className={styles.customerAvatar}>
                {ticket.customer?.name
                  ? ticket.customer.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                  : 'CU'}
              </div>
              <div>
                <strong className={styles.customerName}>{ticket.customer?.name || 'Customer'}</strong>
                <span className={styles.customerEmail}>{ticket.customer?.email || 'N/A'}</span>
                <span className={styles.customerCompany}>{ticket.customer?.phone || ticket.customer?.company || ''}</span>
              </div>
            </div>

            <div className={styles.metaGrid} style={{ marginTop: '0.75rem' }}>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Total Customer Tickets</span>
                <span className={styles.metaVal}>{ticket.customer?.totalTickets || 1} Tickets</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Open Tickets</span>
                <span className={styles.metaVal}>{ticket.customer?.openTickets || 0} Open</span>
              </div>
            </div>
          </div>

          {/* Related Customer Tickets */}
          {ticket.relatedTickets && ticket.relatedTickets.length > 0 && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Related Tickets</h3>
              <div className={styles.relatedList}>
                {ticket.relatedTickets.map((rel) => (
                  <div
                    key={rel.id || rel.ticketNumber}
                    className={styles.relatedItem}
                    onClick={() => navigate(`/admin/tickets/${rel.ticketNumber || rel.id}`)}
                  >
                    <span className={styles.relatedId}>#{rel.ticketNumber}</span>
                    <span className={styles.relatedSub}>{rel.subject}</span>
                    <span className={styles.relatedStatus}>{rel.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
