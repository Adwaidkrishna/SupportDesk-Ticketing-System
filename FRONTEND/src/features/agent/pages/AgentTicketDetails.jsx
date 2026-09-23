import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import socket from '../../../socket/socket.js';
import {
  getAgentTicketById,
  claimTicket,
  getAgentTicketMessages,
  sendAgentTicketMessage,
  updateAgentTicketStatus,
  reopenTicket,
} from '../services/agentTicket.service';
import styles from './AgentTicketDetails.module.css';
import CallConfirmationModal from '../../video-call/components/CallConfirmationModal';

/**
 * Agent Ticket Details Page.
 * Uses the exact same clean two-column layout as the Customer Ticket Details:
 * Left column: Ticket Description & Ticket Information.
 * Right column: Conversation History & Reply Composer.
 * Supports claiming OPEN unassigned tickets, resolving, closing, and reopening when assigned.
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

  // Status Action state
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

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

  const messagesContainerRef = useRef(null);

  // Auto-scroll messages container to bottom without scrolling window
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, loadingMessages]);

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

  // 3. Socket.IO: Listen for real-time status updates (RESOLVED, CLOSED, IN_PROGRESS)
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

  const handleResolveTicket = async () => {
    if (!ticketId || statusUpdating || !isAssignedToMe) return;

    try {
      setStatusUpdating(true);
      const response = await updateAgentTicketStatus(ticketId, 'RESOLVED');
      const updatedData = response?.data?.ticket || response?.data;
      if (updatedData) {
        setTicket(updatedData);
        showToast('Ticket marked as RESOLVED.');
      }
    } catch (err) {
      console.error('Failed to resolve ticket:', err);
      showToast(err?.response?.data?.message || err.message || 'Failed to resolve ticket.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleConfirmClose = async () => {
    if (!ticketId || statusUpdating || !isAssignedToMe) return;

    try {
      setStatusUpdating(true);
      const response = await updateAgentTicketStatus(ticketId, 'CLOSED');
      const updatedData = response?.data?.ticket || response?.data;
      if (updatedData) {
        setTicket(updatedData);
        showToast('Ticket has been CLOSED.');
        setShowCloseModal(false);
      }
    } catch (err) {
      console.error('Failed to close ticket:', err);
      showToast(err?.response?.data?.message || err.message || 'Failed to close ticket.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleReopenTicket = async () => {
    if (!ticketId || statusUpdating) return;

    try {
      setStatusUpdating(true);
      const response = await reopenTicket(ticketId);
      const updatedData = response?.data?.ticket || response?.data;
      if (updatedData) {
        setTicket(updatedData);
        showToast('Ticket successfully reopened and returned to IN_PROGRESS.');
      }
    } catch (err) {
      console.error('Failed to reopen ticket:', err);
      showToast(err?.response?.data?.message || err.message || 'Failed to reopen ticket.');
    } finally {
      setStatusUpdating(false);
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
      <div className={styles.topSection}>
        {/* Ticket Header (One Horizontal Row) */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              className={styles.backLink}
              onClick={() => navigate('/agent/queue')}
            >
              ← Back to My Queue
            </button>

            <span className={styles.headerDivider} aria-hidden="true" />

            <h1 className={styles.subjectTitle} title={ticket.subject}>
              {ticket.subject}
            </h1>

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

            {isAssignedToMe && ticket.status === 'IN_PROGRESS' && (
              <>
                <button
                  type="button"
                  className={styles.resolveBtn}
                  onClick={handleResolveTicket}
                  disabled={statusUpdating}
                >
                  {statusUpdating ? 'Updating...' : '✓ Resolve'}
                </button>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={() => setShowCloseModal(true)}
                  disabled={statusUpdating}
                >
                  ✕ Close
                </button>
              </>
            )}

            {isAssignedToMe && ticket.status === 'RESOLVED' && (
              <button
                type="button"
                className={styles.reopenBtn}
                onClick={handleReopenTicket}
                disabled={statusUpdating}
              >
                {statusUpdating ? 'Reopening...' : '↺ Reopen'}
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

      {showCloseModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowCloseModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Close Ticket</h3>
            <p className={styles.modalDesc}>
              Are you sure you want to close ticket <strong>{ticket.ticketNumber || ticket.id}</strong>?
              This action closes the ticket as invalid, duplicate, spam, or unserviceable.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setShowCloseModal(false)}
                disabled={statusUpdating}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalConfirmCloseBtn}
                onClick={handleConfirmClose}
                disabled={statusUpdating}
              >
                {statusUpdating ? 'Closing...' : 'Confirm Close'}
              </button>
            </div>
          </div>
        </div>
      )}

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

          {/* Card: SLA Target & Performance */}
          {ticket.sla && (
            <div className={styles.infoCard}>
              <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className={styles.cardTitle} style={{ margin: 0 }}>
                  <span className={styles.cardIcon}>⏱️</span>
                  SLA Target & Timers
                </h3>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '12px',
                    background:
                      ticket.slaEvaluation?.overallStatus === 'BREACHED'
                        ? 'rgba(255, 69, 58, 0.15)'
                        : ticket.slaEvaluation?.overallStatus === 'WARNING'
                        ? 'rgba(255, 159, 10, 0.15)'
                        : 'rgba(48, 209, 88, 0.15)',
                    color:
                      ticket.slaEvaluation?.overallStatus === 'BREACHED'
                        ? '#FF453A'
                        : ticket.slaEvaluation?.overallStatus === 'WARNING'
                        ? '#FF9F0A'
                        : '#30D158',
                  }}
                >
                  {ticket.slaEvaluation?.overallStatus === 'BREACHED'
                    ? '🔴 Breached'
                    : ticket.slaEvaluation?.overallStatus === 'WARNING'
                    ? '⚠️ Warning'
                    : '✓ Within SLA'}
                </span>
              </div>
              <div className={styles.metaGrid}>
                <div className={styles.metaTile}>
                  <span className={styles.metaLabel}>Policy</span>
                  <span className={styles.metaValue}>{ticket.sla.policyName || `${ticket.priority} SLA`}</span>
                </div>
                <div className={styles.metaTile}>
                  <span className={styles.metaLabel}>Response Target</span>
                  <span className={styles.metaValue}>
                    {ticket.sla.responseDeadline ? formatDate(ticket.sla.responseDeadline) : 'N/A'}
                  </span>
                </div>
                <div className={styles.metaTile}>
                  <span className={styles.metaLabel}>Response Status</span>
                  <span
                    className={styles.metaValue}
                    style={{
                      fontWeight: 600,
                      color:
                        ticket.slaEvaluation?.responseStatus === 'BREACHED'
                          ? '#FF453A'
                          : ticket.slaEvaluation?.responseStatus === 'WARNING'
                          ? '#FF9F0A'
                          : '#30D158',
                    }}
                  >
                    {ticket.slaEvaluation?.responseStatus === 'BREACHED'
                      ? '🔴 Breached'
                      : ticket.slaEvaluation?.responseStatus === 'WARNING'
                      ? '⚠️ Warning'
                      : ticket.sla?.firstResponseAt
                      ? '✓ Satisfied'
                      : '✓ Within SLA'}
                  </span>
                </div>
                <div className={styles.metaTile}>
                  <span className={styles.metaLabel}>Resolution Target</span>
                  <span className={styles.metaValue}>
                    {ticket.sla.resolutionDeadline ? formatDate(ticket.sla.resolutionDeadline) : 'N/A'}
                  </span>
                </div>
                <div className={styles.metaTile}>
                  <span className={styles.metaLabel}>Resolution Status</span>
                  <span
                    className={styles.metaValue}
                    style={{
                      fontWeight: 600,
                      color:
                        ticket.slaEvaluation?.resolutionStatus === 'BREACHED'
                          ? '#FF453A'
                          : ticket.slaEvaluation?.resolutionStatus === 'WARNING'
                          ? '#FF9F0A'
                          : '#30D158',
                    }}
                  >
                    {ticket.slaEvaluation?.resolutionStatus === 'BREACHED'
                      ? '🔴 Breached'
                      : ticket.slaEvaluation?.resolutionStatus === 'WARNING'
                      ? '⚠️ Warning'
                      : ticket.sla?.resolvedAt
                      ? '✓ Resolved in SLA'
                      : '✓ Within SLA'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Card 3: Customer Information */}
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                <span className={styles.cardIcon}>👤</span>
                Customer Information
              </h3>
            </div>
            <div className={styles.personRow}>
              <div className={styles.personAvatar}>
                {ticket.customer?.name
                  ? ticket.customer.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()
                  : 'CU'}
              </div>
              <div className={styles.personInfo}>
                <span className={styles.personName}>
                  {ticket.customer?.name || 'Customer User'}
                </span>
                <span className={styles.personEmail}>
                  {ticket.customer?.email || 'N/A'}
                </span>
                <span className={`${styles.roleChip} ${styles.customerRoleChip}`}>Customer</span>
              </div>
            </div>
          </div>

          {/* Card 4: Assignment Details */}
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                <span className={styles.cardIcon}>🛡️</span>
                Assignment Details
              </h3>
            </div>
            <div className={styles.personRow}>
              <div className={`${styles.personAvatar} ${styles.agentAvatar}`}>
                {ticket.assignedTo?.name
                  ? ticket.assignedTo.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()
                  : 'SA'}
              </div>
              <div className={styles.personInfo}>
                <span className={styles.personName}>
                  {ticket.assignedTo?.name || (ticket.assignedTo ? 'Assigned Agent' : 'Unassigned')}
                </span>
                <span className={styles.personEmail}>
                  {ticket.assignedTo?.email || (ticket.assignedTo ? '' : 'Ticket is waiting for an agent')}
                </span>
                {isAssignedToMe ? (
                  <span className={`${styles.roleChip} ${styles.agentRoleChip}`}>Assigned to you</span>
                ) : ticket.assignedTo ? (
                  <span className={`${styles.roleChip} ${styles.agentRoleChip}`}>Assigned Support Specialist</span>
                ) : (
                  <span className={`${styles.roleChip} ${styles.customerRoleChip}`}>Unassigned Queue</span>
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
                {!isAssignedToMe
                  ? 'Unassigned'
                  : loadingMessages
                  ? 'Loading...'
                  : `${messages.length} ${messages.length === 1 ? 'message' : 'messages'}`}
              </span>
            </div>

            <div className={styles.conversationBody} ref={messagesContainerRef}>
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

            {/* Message Composer (Only when assigned to current agent and IN_PROGRESS) */}
            {isAssignedToMe && ticket.status === 'IN_PROGRESS' && (
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
                      placeholder="Type your reply to the customer..."
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
                      title="Send reply"
                      aria-label="Send reply"
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
            {isAssignedToMe && ticket.status === 'RESOLVED' && (
              <div className={`${styles.statusNoticeCard} ${styles.resolvedNotice}`}>
                <h4 className={styles.statusNoticeTitle}>✓ Ticket is Marked as Resolved</h4>
                <p className={styles.statusNoticeDesc}>
                  This issue was resolved. To send further replies to the customer, please reopen the ticket first.
                </p>
                <button
                  type="button"
                  className={styles.reopenBtn}
                  onClick={handleReopenTicket}
                  disabled={statusUpdating}
                >
                  {statusUpdating ? 'Reopening...' : '↺ Reopen Ticket'}
                </button>
              </div>
            )}

            {/* Closed Status Notice */}
            {isAssignedToMe && ticket.status === 'CLOSED' && (
              <div className={`${styles.statusNoticeCard} ${styles.closedNotice}`}>
                <h4 className={styles.statusNoticeTitle}>✕ Ticket Closed</h4>
                <p className={styles.statusNoticeDesc}>
                  This ticket has been permanently closed. The conversation history remains preserved for reference.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
