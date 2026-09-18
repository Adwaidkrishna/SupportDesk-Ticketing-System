import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTicketById } from '../services/ticket.service';
import styles from './TicketDetails.module.css';

/**
 * Ticket Details page component.
 * Displays real ticket details (read-only) for an authenticated customer.
 */
export default function TicketDetails() {
  const { ticketId } = useParams();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function fetchTicketDetails() {
      if (!ticketId) {
        if (isMounted) {
          setError('No ticket ID provided.');
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError('');
        const response = await getTicketById(ticketId);

        if (isMounted && response?.data?.ticket) {
          setTicket(response.data.ticket);
        } else if (isMounted) {
          setError('Ticket not found.');
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to fetch ticket details:', err);
          setError(err.message || 'Unable to load ticket details. The ticket may not exist or you do not have permission to view it.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchTicketDetails();

    return () => {
      isMounted = false;
    };
  }, [ticketId]);

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

  if (loading) {
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

  if (error || !ticket) {
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
          <p style={{ marginTop: '8px' }}>{error || 'Ticket not found.'}</p>
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

      {/* Main Split Grid */}
      <div className={styles.grid}>
        {/* Left Column: Ticket Description */}
        <div className={styles.leftCol}>
          <div className={styles.conversationCard}>
            <h3 className={styles.cardHeaderTitle}>Ticket Description</h3>
            <div style={{
              padding: '16px 20px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              color: 'var(--color-text-primary)',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
            }}>
              {ticket.description}
            </div>
          </div>
        </div>

        {/* Right Column: Ticket Info Sidebar */}
        <div className={styles.rightCol}>
          <div className={styles.infoCard}>
            <h3 className={styles.infoTitle}>Ticket Details</h3>

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
      </div>
    </div>
  );
}
