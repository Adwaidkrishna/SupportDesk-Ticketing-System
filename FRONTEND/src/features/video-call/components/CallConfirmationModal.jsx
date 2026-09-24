import styles from './VideoCall.module.css';

export default function CallConfirmationModal({
  customerName,
  ticketId,
  ticketSubject,
  ticket,
  isCalling = false,
  onCancel,
  onConfirm,
}) {
  const displayName = customerName || ticket?.customerName || 'Customer';
  const displayId = ticketId || ticket?.id || '#1018';
  const displaySubject = ticketSubject || ticket?.subject || 'Support Ticket';

  return (
    <div className={styles.modalBackdrop} onClick={onCancel}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalIconBox}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </div>

        <h3 className={styles.modalTitle}>
          {isCalling ? 'Calling Customer...' : 'Start Support Video Call?'}
        </h3>

        <p className={styles.modalText}>
          {isCalling ? (
            <>
              Ringing <strong>{displayName}</strong> for ticket{' '}
              <strong>{displayId}</strong>. Waiting for the customer to accept the video call invitation...
            </>
          ) : (
            <>
              You are about to invite <strong>{displayName}</strong> to a video call regarding ticket{' '}
              <strong>{displayId}</strong> (<em>{displaySubject}</em>).
            </>
          )}
        </p>

        <div className={styles.modalActions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel}>
            {isCalling ? 'Cancel Call' : 'Cancel'}
          </button>
          {!isCalling && (
            <button type="button" className={styles.startCallBtn} onClick={onConfirm}>
              Start Video Call →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

