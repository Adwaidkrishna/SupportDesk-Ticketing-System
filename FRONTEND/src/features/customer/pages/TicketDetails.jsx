import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import socket from '../../../socket/socket.js';
import {
  getTicketById,
  getTicketMessages,
  sendTicketMessage,
  reopenTicket,
} from '../services/ticket.service';
import styles from './TicketDetails.module.css';

/**
 * Ticket Details page component.
 * Displays real ticket details on the left and real conversation message history on the right.
 * Allows customer to send messages on their own ticket.
 * Connects to Socket.IO for real-time conversation updates.
 */
export default function TicketDetails() {
  const { ticketId } = useParams();

  // Ticket Details state
  const [ticket, setTicket] = useState(null);
  const [loadingTicket, setLoadingTicket] = useState(true);
  const [ticketError, setTicketError] = useState('');

  // Reopen and Toast state
  const [reopening, setReopening] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Ticket Messages state
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [messagesError, setMessagesError] = useState('');

  // Message Composer state
  const [replyText, setReplyText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendError, setSendError] = useState('');

  const messagesContainerRef = useRef(null);

  // Auto-scroll messages container to bottom without scrolling window
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, loadingMessages]);

  // 1. Socket.IO: Join and leave ticket room (Socket lifecycle managed in AuthContext)
  useEffect(() => {
    if (!ticketId) return;

    const joinRoom = () => {
      socket.emit('join-ticket', { ticketId }, (response) => {
        if (!response?.success) {
          console.error('❌ Failed to join ticket room:', response?.message);
          return;
        }
        console.log('🟢 Joined ticket room:', response.room);
      });
    };

    const handleConnect = () => {
      joinRoom();
    };

    socket.on('connect', handleConnect);

    if (socket.connected) {
      joinRoom();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.emit('leave-ticket', { ticketId }, () => {
        console.log('🔵 Left ticket room:', ticketId);
      });
    };
  }, [ticketId]);

  // 2. Socket.IO: Listen for real-time incoming messages with deduplication
  useEffect(() => {
    const handleNewMessage = (newMessage) => {
      setMessages((prev) => {
        const messageId = String(newMessage.id || newMessage._id);
        const alreadyExists = prev.some(
          (msg) => String(msg.id || msg._id) === messageId
        );
        if (alreadyExists) {
          return prev;
        }
        return [...prev, newMessage];
      });
    };

    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, []);

  // 3. Socket.IO: Listen for live status changes (RESOLVED, CLOSED, IN_PROGRESS)
  useEffect(() => {
    const handleStatusUpdate = (statusData) => {
      const currentTargetId = ticket?.id || ticket?._id;
      if (
        statusData?.ticketNumber === ticket?.ticketNumber ||
        String(statusData?.ticketId) === String(currentTargetId)
      ) {
        setTicket((prev) => (prev ? { ...prev, status: statusData.status } : prev));
      }
    };

    socket.on('ticket:status', handleStatusUpdate);

    return () => {
      socket.off('ticket:status', handleStatusUpdate);
    };
  }, [ticket?.ticketNumber, ticket?.id, ticket?._id]);

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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const trimmed = replyText.trim();
    if (!trimmed || sendingMessage) return;

    try {
      setSendingMessage(true);
      setSendError('');
      const response = await sendTicketMessage(ticketId, trimmed);
      const createdMessage = response?.data;
      if (createdMessage) {
        setMessages((prev) => {
          const messageId = String(createdMessage.id || createdMessage._id);
          const alreadyExists = prev.some(
            (msg) => String(msg.id || msg._id) === messageId
          );
          if (alreadyExists) {
            return prev;
          }
          return [...prev, createdMessage];
        });
        setReplyText('');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setSendError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleReopenTicket = async () => {
    if (!ticketId || reopening) return;

    try {
      setReopening(true);
      const response = await reopenTicket(ticketId);
      const updatedData = response?.data?.ticket || response?.data;
      if (updatedData) {
        setTicket(updatedData);
        setToastMessage('Ticket reopened successfully! You can now send messages to support.');
        setTimeout(() => setToastMessage(''), 5000);
      }
    } catch (err) {
      console.error('Failed to reopen ticket:', err);
      setSendError(err?.response?.data?.message || err.message || 'Failed to reopen ticket.');
    } finally {
      setReopening(false);
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

  const getPriorityClass = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL':
      case 'URGENT':
        return styles.priorityCritical;
      case 'HIGH':
        return styles.priorityHigh;
      case 'MEDIUM':
        return styles.priorityMedium;
      case 'LOW':
      default:
        return styles.priorityLow;
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
      <div className={styles.topSection}>
        {/* Ticket Header (One Horizontal Row) */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Link to="/customer/tickets" className={styles.backLink}>
              ← Back to My Tickets
            </Link>

            <span className={styles.headerDivider} aria-hidden="true" />

            <h1 className={styles.subjectTitle} title={ticket.subject}>
              {ticket.subject}
            </h1>

            <span className={styles.ticketId}>{ticket.ticketNumber}</span>

            <span className={`${styles.statusPill} ${getStatusClass(ticket.status)}`}>
              {ticket.status}
            </span>

            <span className={`${styles.priorityPill} ${getPriorityClass(ticket.priority)}`}>
              {ticket.priority} Priority
            </span>
          </div>

          {/* Customer header actions: Reopen when RESOLVED */}
          <div className={styles.headerActions}>
            {ticket.status === 'RESOLVED' && (
              <button
                type="button"
                className={styles.reopenBtn}
                onClick={handleReopenTicket}
                disabled={reopening}
              >
                {reopening ? 'Reopening...' : '↺ Reopen Ticket'}
              </button>
            )}
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className={styles.toastSuccess} role="status">
            <span>✓</span> {toastMessage}
          </div>
        )}

        {/* Ticket Status Banners */}
        {ticket.status === 'RESOLVED' && (
          <div className={styles.resolvedBanner}>
            <div className={styles.bannerTextGroup}>
              <h4 className={styles.bannerTitle}>✓ This ticket has been marked as resolved</h4>
              <p className={styles.bannerSubtitle}>
                If your issue is not fully resolved, use the Reopen button to continue chatting with support.
              </p>
            </div>
          </div>
        )}

        {ticket.status === 'CLOSED' && (
          <div className={styles.closedBanner}>
            <div className={styles.bannerTextGroup}>
              <h4 className={styles.bannerTitle}>✕ This ticket has been closed</h4>
              <p className={styles.bannerSubtitle}>
                This ticket was closed as invalid, duplicate, spam, or unserviceable.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Two-Column Structure: Left (~65% Ticket Details) | Right (~35% Controlled Height Conversation) */}
      <div className={styles.grid}>
        {/* Left Column: Structured Information Cards */}
        <div className={styles.leftCol}>
          {/* Card 1: Ticket Description */}
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                <span className={styles.cardIcon}>📝</span>
                Ticket Description
              </h3>
            </div>
            <div className={styles.descriptionBox}>
              {ticket.description}
            </div>
          </div>

          {/* Card 2: Ticket Overview & Metadata Grid */}
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                <span className={styles.cardIcon}>ℹ️</span>
                Ticket Overview
              </h3>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaTile}>
                <span className={styles.metaLabel}>Ticket Number</span>
                <span className={styles.metaValue} style={{ fontFamily: 'monospace' }}>
                  {ticket.ticketNumber}
                </span>
              </div>
              <div className={styles.metaTile}>
                <span className={styles.metaLabel}>Status</span>
                <div className={styles.metaValue}>
                  <span className={`${styles.statusPill} ${getStatusClass(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </div>
              </div>
              <div className={styles.metaTile}>
                <span className={styles.metaLabel}>Priority</span>
                <div className={styles.metaValue}>
                  <span className={`${styles.priorityPill} ${getPriorityClass(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                </div>
              </div>
              <div className={styles.metaTile}>
                <span className={styles.metaLabel}>Category</span>
                <span className={styles.metaValue}>
                  {ticket.category?.name || 'General Support'}
                </span>
              </div>
              <div className={styles.metaTile}>
                <span className={styles.metaLabel}>Created</span>
                <span className={styles.metaValue}>{formatDate(ticket.createdAt)}</span>
              </div>
              <div className={styles.metaTile}>
                <span className={styles.metaLabel}>Last Updated</span>
                <span className={styles.metaValue}>{formatDate(ticket.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Support Specialist / Assignment */}
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                <span className={styles.cardIcon}>🛡️</span>
                Support Specialist
              </h3>
            </div>
            <div className={styles.personRow}>
              <div className={styles.personAvatar}>
                {ticket.assignedTo?.name
                  ? ticket.assignedTo.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()
                  : 'SD'}
              </div>
              <div className={styles.personInfo}>
                <span className={styles.personName}>
                  {ticket.assignedTo?.name || 'Support Queue'}
                </span>
                <span className={styles.personEmail}>
                  {ticket.assignedTo?.email || 'Awaiting agent assignment'}
                </span>
                {ticket.assignedTo ? (
                  <span className={styles.roleChip}>Dedicated Specialist</span>
                ) : (
                  <span className={`${styles.roleChip} ${styles.unassignedChip}`}>Awaiting Agent</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Conversation Card (STABLE CONTROLLED HEIGHT) */}
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

            {/* Scrollable Message Area */}
            <div className={styles.conversationBody} ref={messagesContainerRef}>
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
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className={styles.emptyIcon}
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <h4>No messages yet</h4>
                  <p>There are no messages on this ticket yet. Send a message below to start chatting.</p>
                </div>
              ) : (
                <div className={styles.messageList}>
                  {messages.map((msg) => (
                    <div key={msg.id || msg._id} className={getMessageItemClass(msg.senderRole)}>
                      <div className={styles.msgMeta}>
                        <div className={styles.avatar}>
                          {getSenderInitials(msg)}
                        </div>
                        <div className={styles.metaInfo}>
                          <div className={styles.metaTop}>
                            <span className={styles.senderName}>
                              {getSenderDisplayName(msg)}
                            </span>
                            <span className={getRoleBadgeClass(msg.senderRole)}>
                              {getRoleLabel(msg.senderRole)}
                            </span>
                          </div>
                          <span className={styles.timestamp}>
                            {formatDate(msg.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className={styles.msgBubble}>
                        <div className={styles.msgText}>{msg.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message Composer — shown when customer can reply (OPEN or IN_PROGRESS) */}
            {(ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS') && (
              <div className={styles.composerCard}>
                {sendError && (
                  <div className={styles.composerError} role="alert">
                    <span>⚠️</span> {sendError}
                  </div>
                )}
                <form onSubmit={handleSendMessage} className={styles.composerForm}>
                  <div className={styles.composerBox}>
                    <textarea
                      className={styles.composerTextarea}
                      placeholder="Type your message..."
                      rows={1}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      disabled={sendingMessage}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (replyText.trim() && !sendingMessage) {
                            handleSendMessage(e);
                          }
                        }
                      }}
                    />
                    <button
                      type="submit"
                      className={styles.sendIconBtn}
                      disabled={sendingMessage || !replyText.trim()}
                      title="Send message"
                      aria-label="Send message"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={styles.sendIcon}
                      >
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Resolved Status Notice */}
            {ticket.status === 'RESOLVED' && (
              <div className={`${styles.statusNoticeCard} ${styles.resolvedNotice}`}>
                <h4 className={styles.statusNoticeTitle}>✓ Ticket is Marked as Resolved</h4>
                <p className={styles.statusNoticeDesc}>
                  This issue has been resolved. If your problem persists, use the Reopen button at the top to continue chatting with support.
                </p>
              </div>
            )}

            {/* Closed Status Notice */}
            {ticket.status === 'CLOSED' && (
              <div className={`${styles.statusNoticeCard} ${styles.closedNotice}`}>
                <h4 className={styles.statusNoticeTitle}>✕ Ticket Closed</h4>
                <p className={styles.statusNoticeDesc}>
                  This ticket is closed. No further replies can be sent. Please open a new ticket if you need further assistance.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
