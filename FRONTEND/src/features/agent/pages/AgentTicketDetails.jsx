import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAgentTicketById, claimTicket } from '../services/agentTicket.service';
import styles from './AgentTicketDetails.module.css';
import CallConfirmationModal from '../../video-call/components/CallConfirmationModal';

/**
 * Agent Ticket Details Page.
 * Uses the exact same clean two-column layout as the Customer Ticket Details:
 * Left column: Ticket Description & Ticket Information.
 * Right column: Conversation History / Stage Placeholder.
 * Supports claiming OPEN unassigned tickets.
 */
export default function AgentTicketDetails() {
  const { ticketId } = useParams();
  const navigate = useNavigate();

  // Ticket Details state
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);

  // Claim action state
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

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

        {/* Right Column: Conversation Card (Stage Placeholder) */}
        <div className={styles.rightCol}>
          <div className={styles.conversationCard}>
            <div className={styles.conversationHeader}>
              <h3 className={styles.conversationTitle}>Conversation</h3>
              <span className={styles.messageCountBadge}>
                Stage 1: Read-Only
              </span>
            </div>

            <div className={styles.conversationBody}>
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
                <p>Messaging will be available in the next stage.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
