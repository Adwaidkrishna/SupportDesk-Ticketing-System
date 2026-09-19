import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import socket from '../../../socket/socket.js';
import {
  getAgentTicketById,
  claimTicket,
  getAgentTicketMessages,
  sendAgentTicketMessage,
} from '../services/agentTicket.service';
import styles from './AgentTicketDetails.module.css';
import CallConfirmationModal from '../../video-call/components/CallConfirmationModal';

/**
 * Agent Ticket Details Page.
 * Uses the exact same clean two-column layout as the Customer Ticket Details:
 * Left column: Ticket Description & Ticket Information.
 * Right column: Conversation History & Reply Composer.
 * Supports claiming OPEN unassigned tickets and replying when assigned.
 */
export default function AgentTicketDetails() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Ticket Details state
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);

  // Claim action state
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Conversation state
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendError, setSendError] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 5000);
  };

  // Fetch ticket details on mount or ID change
  useEffect(() => {
    let isMounted = true;

    async function fetchTicket() {
      if (!ticketId) {
        if (isMounted) {
          setError({ status: 400, message: 'Ticket ID is required.' });
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await getAgentTicketById(ticketId);

        if (isMounted) {
          const ticketData = response?.data?.ticket || response?.data;
          if (ticketData) {
            setTicket(ticketData);
          } else {
            setError({ status: 404, message: 'Ticket not found.' });
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load agent ticket details:', err);
          const status = err.status || err.statusCode || 500;
          let message = err.message || 'Failed to load ticket details.';

          if (status === 401) {
            message = 'Authentication required. Please log in again.';
          } else if (status === 403) {
            message = 'Access denied. You are not authorized to view this ticket.';
          } else if (status === 404) {
            message = 'Ticket not found. The requested ticket does not exist.';
          }

          setError({ status, message });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchTicket();

    return () => {
      isMounted = false;
    };
  }, [ticketId]);

  const canClaim = ticket?.status === 'OPEN' && !ticket?.assignedTo;

  const currentUserId = user?.id || user?._id;
  const assignedAgentId =
    ticket?.assignedTo?.id ||
    ticket?.assignedTo?._id ||
    (typeof ticket?.assignedTo === 'string' ? ticket.assignedTo : null);
  const isAssignedToMe = Boolean(
    currentUserId && assignedAgentId && String(currentUserId) === String(assignedAgentId)
  );

  // 1. Socket.IO: Join and leave ticket room when assigned to current agent (Socket lifecycle managed in AuthContext)
  useEffect(() => {
    if (!ticketId || !isAssignedToMe) return;

    const joinRoom = () => {
      socket.emit('join-ticket', { ticketId }, (response) => {
        if (!response?.success) {
          console.error('❌ Failed to join ticket room:', response?.message);
          return;
        }
        console.log('🟢 Agent joined ticket room:', response.room);
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
        console.log('🔵 Agent left ticket room:', ticketId);
      });
    };
  }, [ticketId, isAssignedToMe]);

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

  // Fetch ticket messages when assigned to current agent
  useEffect(() => {
    let isMounted = true;

    async function fetchMessages() {
      if (!ticketId || !isAssignedToMe) {
        if (isMounted) {
          setMessages([]);
          setLoadingMessages(false);
        }
        return;
      }

      try {
        setLoadingMessages(true);
        setMessagesError('');
        const response = await getAgentTicketMessages(ticketId);
        if (isMounted && response?.data) {
          setMessages(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to fetch agent ticket messages:', err);
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
  }, [ticketId, isAssignedToMe]);

  const handleRetryMessages = async () => {
    if (!ticketId || !isAssignedToMe) return;
    try {
      setLoadingMessages(true);
      setMessagesError('');
      const response = await getAgentTicketMessages(ticketId);
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
    if (!trimmed || sendingMessage || !isAssignedToMe) return;

    try {
      setSendingMessage(true);
      setSendError('');
      const response = await sendAgentTicketMessage(ticketId, trimmed);
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
      console.error('Failed to send agent message:', err);
      setSendError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleClaimTicket = async () => {
    if (!ticketId || claiming) return;

    try {
      setClaiming(true);
      setClaimError('');
      const response = await claimTicket(ticketId);

      const updatedData = response?.data?.ticket || response?.data;
      if (updatedData) {
        setTicket(updatedData);
        showToast('Ticket claimed successfully! Status updated to IN_PROGRESS.');
      }
    } catch (err) {
      console.error('Failed to claim ticket:', err);
      const msg = err?.message || 'Failed to claim ticket. Please try again.';
      setClaimError(msg);
      setTimeout(() => setClaimError(''), 6000);
    } finally {
      setClaiming(false);
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
    switch (status?.toUpperCase()) {
      case 'OPEN':
        return styles.statusInfo;
      case 'IN_PROGRESS':
      case 'IN PROGRESS':
        return styles.statusWarning;
      case 'WAITING_FOR_CUSTOMER':
      case 'WAITING FOR CUSTOMER':
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

  const handleStartCallClick = () => {
    setShowCallModal(true);
  };

  const handleConfirmStartCall = () => {
    setShowCallModal(false);
    const cleanId = (ticket?.ticketNumber || ticketId).replace('#', '');
    navigate(`/ticket/${cleanId}/call`);
  };

  // Loading State
  if (loading) {
    return (
      <div className={styles.page}>
        <button
          type="button"
          className={styles.backLink}
          onClick={() => navigate('/agent/queue')}
        >
          ← Back to My Queue
        </button>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Loading ticket details...</p>
        </div>
      </div>
    );
  }

  // Error / 404 State
  if (error || !ticket) {
    return (
      <div className={styles.page}>
        <button
          type="button"
          className={styles.backLink}
          onClick={() => navigate('/agent/queue')}
        >
          ← Back to My Queue
        </button>
        <div className={styles.errorContainer}>
          <h3 className={styles.errorTitle}>
            {error?.status === 404 ? 'Ticket Not Found' : 'Unable to display ticket'}
          </h3>
          <p className={styles.errorMessage}>
            {error?.message || 'Ticket not found or unavailable.'}
          </p>
          <button
            type="button"
            className={styles.retryBtn}
            onClick={() => navigate('/agent/queue')}
          >
            ← Return to My Queue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Back Link */}
      <button
        type="button"
        className={styles.backLink}
        onClick={() => navigate('/agent/queue')}
      >
        ← Back to My Queue
      </button>

      {/* Success & Error Toasts */}
      {toastMessage && (
        <div className={styles.toastSuccess} role="status">
          <span>✓</span> {toastMessage}
        </div>
      )}
      {claimError && (
        <div className={styles.toastError} role="alert">
          <span>⚠️</span> {claimError}
        </div>
      )}

      {/* Ticket Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.idRow}>
            <span className={styles.ticketId}>
              {ticket.ticketNumber || ticket.id}
            </span>
            <span className={`${styles.statusPill} ${getStatusClass(ticket.status)}`}>
              {ticket.status}
            </span>
            <span className={`${styles.priorityPill} ${getPriorityClass(ticket.priority)}`}>
              {ticket.priority} Priority
            </span>
          </div>
          <h1 className={styles.subjectTitle}>{ticket.subject}</h1>
        </div>

        <div className={styles.headerActions}>
          {canClaim && (
            <button
              type="button"
              className={styles.claimBtn}
              onClick={handleClaimTicket}
              disabled={claiming}
            >
              {claiming ? 'Claiming Ticket...' : '⚡ Claim Ticket'}
            </button>
          )}

          <button
            type="button"
            className={styles.videoCallBtn}
            onClick={handleStartCallClick}
          >
            📹 Start Video Call
          </button>
        </div>
      </div>

      {showCallModal && (
        <CallConfirmationModal
          ticket={{
            id: ticket.ticketNumber || ticket.id,
            subject: ticket.subject,
            customerName: ticket.customer?.name || 'Customer User',
          }}
          onConfirm={handleConfirmStartCall}
          onCancel={() => setShowCallModal(false)}
        />
      )}

      {/* Main Two-Column Structure: Left (Ticket Information) | Right (Conversation) */}
      <div className={styles.grid}>
        {/* Left Column: Ticket Information & Metadata */}
        <div className={styles.leftCol}>
          {/* Ticket Description Card */}
          <div className={styles.infoCard}>
            <h3 className={styles.infoTitle}>Ticket Description</h3>
            <div className={styles.descriptionBox}>
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
                <span className={styles.infoLabel}>Customer</span>
                <span className={styles.infoValue}>
                  {ticket.customer?.name || 'Customer User'}
                </span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Customer Email</span>
                <span className={styles.infoValue}>
                  {ticket.customer?.email || 'N/A'}
                </span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Assigned Agent</span>
                <span className={styles.infoValue}>
                  {ticket.assignedTo?.name || 'Unassigned'}
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

        {/* Right Column: Conversation Card */}
        <div className={styles.rightCol}>
          <div className={styles.conversationCard}>
            <div className={styles.conversationHeader}>
              <h3 className={styles.conversationTitle}>Conversation</h3>
              <span className={styles.messageCountBadge}>
                {!isAssignedToMe
                  ? 'Unassigned'
                  : loadingMessages
                  ? 'Loading...'
                  : `${messages.length} ${messages.length === 1 ? 'message' : 'messages'}`}
              </span>
            </div>

            <div className={styles.conversationBody}>
              {!isAssignedToMe ? (
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
                  <h4>
                    {!ticket.assignedTo
                      ? 'Ticket is Unassigned'
                      : 'Assigned to Another Agent'}
                  </h4>
                  <p>
                    {!ticket.assignedTo
                      ? 'Claim this ticket above to view conversation and start replying.'
                      : 'Only the assigned agent can view and reply to this ticket.'}
                  </p>
                </div>
              ) : loadingMessages ? (
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
                  <p>There are no messages on this ticket yet. Send a reply below.</p>
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

            {/* Message Composer (Only when assigned to current agent) */}
            {isAssignedToMe && (
              <div className={styles.composerCard}>
                {sendError && (
                  <div className={styles.composerError} role="alert">
                    <span>⚠️</span> {sendError}
                  </div>
                )}
                <form onSubmit={handleSendMessage} className={styles.composerForm}>
                  <textarea
                    className={styles.composerTextarea}
                    placeholder="Type your reply to the customer..."
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={sendingMessage}
                  />
                  <div className={styles.composerActions}>
                    <button
                      type="submit"
                      className={styles.sendBtn}
                      disabled={sendingMessage || !replyText.trim()}
                    >
                      {sendingMessage ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
