import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTicketById, getTicketMessages } from '../services/ticket.service';
import styles from './TicketDetails.module.css';

/**
 * Ticket Details page component.
 * Displays real ticket details on the left and real conversation message history on the right.
 * Strictly read-only; no message sending or composer.
 */
export default function TicketDetails() {
  const { ticketId } = useParams();

  // Ticket Details state
  const [ticket, setTicket] = useState(null);
  const [loadingTicket, setLoadingTicket] = useState(true);
  const [ticketError, setTicketError] = useState('');

  // Ticket Messages state
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [messagesError, setMessagesError] = useState('');

  // Fetch ticket details
  useEffect(() => {
    let isMounted = true;

    async function fetchTicket() {
      if (!ticketId) {
        if (isMounted) {
          setTicketError('No ticket ID provided.');
          setLoadingTicket(false);
        }
        return;
      }

      try {
        setLoadingTicket(true);
        setTicketError('');
        const response = await getTicketById(ticketId);

        if (isMounted && response?.data?.ticket) {
          setTicket(response.data.ticket);
        } else if (isMounted) {
          setTicketError('Ticket not found.');
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to fetch ticket details:', err);
          setTicketError(
            err.message || 'Unable to load ticket details. The ticket may not exist or you do not have permission to view it.'
          );
        }
      } finally {
        if (isMounted) {
          setLoadingTicket(false);
        }
      }
    }

    fetchTicket();

    return () => {
      isMounted = false;
    };
  }, [ticketId]);

  // Fetch ticket messages
  useEffect(() => {
    let isMounted = true;

    async function fetchMessages() {
      if (!ticketId) {
        if (isMounted) {
          setLoadingMessages(false);
        }
        return;
      }

      try {
        setLoadingMessages(true);
        setMessagesError('');
        const response = await getTicketMessages(ticketId);

        if (isMounted && response?.data) {
          setMessages(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to fetch ticket messages:', err);
          setMessagesError(err.message || 'Unable to load conversation.');
        }
      } finally {
        if (isMounted) {
          setLoadingMessages(false);
        }
      }
    }

    fetchMessages();

    return () => {
      isMounted = false;
    };
  }, [ticketId]);

  const handleRetryMessages = async () => {
    try {
      setLoadingMessages(true);
      setMessagesError('');
      const response = await getTicketMessages(ticketId);
      if (response?.data) {
        setMessages(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err) {
      setMessagesError(err.message || 'Unable to load conversation.');
    } finally {
      setLoadingMessages(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'OPEN':
        return styles.statusInfo;
      case 'IN_PROGRESS':
        return styles.statusWarning;
      case 'RESOLVED':
        return styles.statusSuccess;
      case 'CLOSED':
      default:
        return styles.statusMuted;
    }
  };

  const getSenderInitials = (msg) => {
    if (msg.sender?.name) {
      return msg.sender.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
    }
    const role = (msg.senderRole || '').toLowerCase();
    if (role === 'customer') return 'CU';
    if (role === 'agent') return 'SA';
    if (role === 'admin') return 'AD';
    return 'U';
  };

  const getSenderDisplayName = (msg) => {
    if (msg.sender?.name) return msg.sender.name;
    const role = (msg.senderRole || '').toLowerCase();
    if (role === 'customer') return 'Customer';
    if (role === 'agent') return 'Support Agent';
    if (role === 'admin') return 'Administrator';
    return 'User';
  };

  const getRoleLabel = (senderRole) => {
    const role = (senderRole || '').toLowerCase();
    if (role === 'agent') return 'Support Agent';
    if (role === 'admin') return 'Admin';
    return 'Customer';
  };

  const getRoleBadgeClass = (senderRole) => {
    const role = (senderRole || '').toLowerCase();
    if (role === 'agent') return styles.agentTag;
    if (role === 'admin') return styles.adminTag;
    return styles.customerTag;
  };

  const getMessageItemClass = (senderRole) => {
    const role = (senderRole || '').toLowerCase();
    if (role === 'agent') return `${styles.messageItem} ${styles.agentMsg}`;
    if (role === 'admin') return `${styles.messageItem} ${styles.adminMsg}`;
    return `${styles.messageItem} ${styles.customerMsg}`;
  };

  if (loadingTicket) {
    return (
      <div className={styles.page}>
        <Link to="/customer/tickets" className={styles.backLink}>
          ← Back to My Tickets
        </Link>
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
          background: 'rgba(16, 17, 22, 0.78)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <p>Loading ticket details...</p>
        </div>
      </div>
    );
  }

  if (ticketError || !ticket) {
    return (
      <div className={styles.page}>
        <Link to="/customer/tickets" className={styles.backLink}>
          ← Back to My Tickets
        </Link>
        <div style={{
          padding: '32px 24px',
          borderRadius: '8px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          fontSize: '0.95rem',
          fontWeight: 500,
        }}>
          <h3>Unable to display ticket</h3>
          <p style={{ marginTop: '8px' }}>{ticketError || 'Ticket not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Back Link */}
      <Link to="/customer/tickets" className={styles.backLink}>
        ← Back to My Tickets
      </Link>

      {/* Ticket Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.idRow}>
            <span className={styles.ticketId}>{ticket.ticketNumber}</span>
            <span className={`${styles.statusPill} ${getStatusClass(ticket.status)}`}>
              {ticket.status}
            </span>
            <span className={styles.priorityPill} style={{ color: '#0A84FF' }}>
              {ticket.priority} Priority
            </span>
          </div>
          <h1 className={styles.subjectTitle}>{ticket.subject}</h1>
        </div>
      </div>

      {/* Main Two-Column Structure: Left (Ticket Information) | Right (Conversation) */}
      <div className={styles.grid}>
        {/* Left Column: Ticket Information & Metadata */}
        <div className={styles.leftCol}>
          {/* Ticket Description Card */}
          <div className={styles.infoCard}>
            <h3 className={styles.infoTitle}>Ticket Description</h3>
            <div style={{
              padding: '16px 18px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              color: 'var(--color-text-primary)',
              lineHeight: '1.6',
              fontSize: '0.9rem',
              whiteSpace: 'pre-wrap',
            }}>
              {ticket.description}
            </div>
          </div>

          {/* Ticket Details / Additional Information Card */}
          <div className={styles.infoCard}>
            <h3 className={styles.infoTitle}>Ticket Information</h3>

            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Ticket Number</span>
                <span className={styles.infoValue} style={{ fontFamily: 'monospace' }}>
                  {ticket.ticketNumber}
                </span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Status</span>
                <span className={`${styles.statusPill} ${getStatusClass(ticket.status)}`}>
                  {ticket.status}
                </span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Priority</span>
                <span className={styles.infoValue} style={{ fontWeight: 600 }}>
                  {ticket.priority}
                </span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Category</span>
                <span className={styles.infoValue}>
                  {ticket.category?.name || 'General Support'}
                </span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Created</span>
                <span className={styles.infoValue}>{formatDate(ticket.createdAt)}</span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Last Updated</span>
                <span className={styles.infoValue}>{formatDate(ticket.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Conversation Message History (Read-Only) */}
        <div className={styles.rightCol}>
          <div className={styles.conversationCard}>
            <div className={styles.conversationHeader}>
              <h3 className={styles.conversationTitle}>Conversation</h3>
              <span className={styles.messageCountBadge}>
                {loadingMessages
                  ? 'Loading...'
                  : `${messages.length} ${messages.length === 1 ? 'message' : 'messages'}`}
              </span>
            </div>

            {/* Conversation Content Area */}
            <div className={styles.conversationBody}>
              {loadingMessages ? (
                <div className={styles.messagesLoadingState}>
                  <div className={styles.spinner} />
                  <span>Loading conversation...</span>
                </div>
              ) : messagesError ? (
                <div className={styles.messagesErrorState}>
                  <p>{messagesError}</p>
                  <button
                    type="button"
                    className={styles.retryBtn}
                    onClick={handleRetryMessages}
                  >
                    Retry
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <div className={styles.messagesEmptyState}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.emptyIcon}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <h4>No messages yet</h4>
                  <p>There are no messages on this ticket yet.</p>
                </div>
              ) : (
                <div className={styles.messageList}>
                  {messages.map((msg) => (
                    <div key={msg.id || msg._id} className={getMessageItemClass(msg.senderRole)}>
                      <div className={styles.avatar}>
                        {getSenderInitials(msg)}
                      </div>
                      <div className={styles.msgBody}>
                        <div className={styles.msgMeta}>
                          <span className={styles.senderName}>
                            {getSenderDisplayName(msg)}
                          </span>
                          <span className={getRoleBadgeClass(msg.senderRole)}>
                            {getRoleLabel(msg.senderRole)}
                          </span>
                          <span className={styles.timestamp}>
                            {formatDate(msg.createdAt)}
                          </span>
                        </div>
                        <div className={styles.msgBubble}>
                          <div className={styles.msgText}>{msg.body}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
