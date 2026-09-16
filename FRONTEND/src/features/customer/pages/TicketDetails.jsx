import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { currentUser } from '../customerMockData';
import Button from '../../../components/common/Button';
import styles from './TicketDetails.module.css';

/**
 * Mock details database for specific ticket IDs
 */
const mockTicketDetails = {
  '1024': {
    id: '#1024',
    subject: 'Login issue on web app',
    category: 'Technical',
    categoryColor: '#0A84FF',
    status: 'In Progress',
    statusVariant: 'info',
    priority: 'High',
    priorityColor: '#FF9F0A',
    created: 'Sep 16, 2026 at 12:30 PM',
    lastUpdated: '2 hours ago',
    assignedAgent: {
      name: 'Alex Smith',
      role: 'Senior Support Engineer',
      initials: 'AS',
    },
    sla: 'SLA On Track (Target: 4h response)',
    messages: [
      {
        id: 'msg_1',
        sender: 'customer',
        senderName: 'John Doe',
        initials: 'JD',
        timestamp: 'Sep 16, 2026 at 12:30 PM',
        text: 'Hello, I am getting an "Invalid Token" error whenever I try to log into the web app using my corporate email address. This started happening after the latest maintenance update today.',
        attachments: [
          { name: 'login_error_screenshot.png', size: '240 KB' },
        ],
      },
      {
        id: 'msg_2',
        sender: 'agent',
        senderName: 'Alex Smith',
        senderRole: 'Support Engineer',
        initials: 'AS',
        timestamp: 'Sep 16, 2026 at 1:15 PM',
        text: 'Hi John, thank you for reaching out! I have cleared the active session cache for your account on our auth server. Could you please clear your browser cookies or try logging in using an Incognito window to confirm if the error persists?',
        attachments: [],
      },
      {
        id: 'msg_3',
        sender: 'customer',
        senderName: 'John Doe',
        initials: 'JD',
        timestamp: 'Sep 16, 2026 at 2:00 PM',
        text: 'Thanks Alex. Incognito mode worked, but regular mode still gives the error. Should I manually delete local storage for the domain?',
        attachments: [],
      },
    ],
    timeline: [
      { label: 'Ticket created', timestamp: '12:30 PM' },
      { label: 'Assigned to Alex Smith', timestamp: '12:45 PM' },
      { label: 'Agent replied', timestamp: '1:15 PM' },
      { label: 'Status changed to In Progress', timestamp: '1:15 PM' },
    ],
  },
};

// Fallback details for any unspecified ticket ID
const fallbackTicket = {
  id: '#1025',
  subject: 'Support Request',
  category: 'Technical',
  categoryColor: '#0A84FF',
  status: 'In Progress',
  statusVariant: 'info',
  priority: 'Medium',
  priorityColor: '#0A84FF',
  created: 'Just now',
  lastUpdated: 'Just now',
  assignedAgent: {
    name: 'Alex Smith',
    role: 'Support Engineer',
    initials: 'AS',
  },
  sla: 'SLA On Track',
  messages: [
    {
      id: 'msg_1',
      sender: 'customer',
      senderName: 'John Doe',
      initials: 'JD',
      timestamp: 'Just now',
      text: 'Support request details are logged and queued for review.',
      attachments: [],
    },
  ],
  timeline: [{ label: 'Ticket created', timestamp: 'Just now' }],
};

/**
 * Ticket Details page component.
 * Implements conversation thread, agent replies, activity timeline,
 * sidebar metadata, and reply composer with attachments.
 */
export default function TicketDetails() {
  const { ticketId } = useParams();
  const navigate = useNavigate();

  const ticketData = mockTicketDetails[ticketId] || {
    ...fallbackTicket,
    id: `#${ticketId || '1025'}`,
  };

  const [ticketStatus, setTicketStatus] = useState(ticketData.status);
  const [messages, setMessages] = useState(ticketData.messages);
  const [replyText, setReplyText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const newFiles = files.map((f) => ({
      name: f.name,
      size: (f.size / 1024).toFixed(1) + ' KB',
    }));
    setAttachments((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim() && attachments.length === 0) {
      setError('Please enter a message or attach a file');
      return;
    }

    setIsSending(true);
    setError('');

    setTimeout(() => {
      const newMsg = {
        id: `msg_${Date.now()}`,
        sender: 'customer',
        senderName: currentUser.name,
        initials: currentUser.initials,
        timestamp: 'Just now',
        text: replyText,
        attachments: [...attachments],
      };

      setMessages((prev) => [...prev, newMsg]);
      setReplyText('');
      setAttachments([]);
      setIsSending(false);
    }, 600);
  };

  const handleToggleClose = () => {
    if (ticketStatus === 'Closed') {
      setTicketStatus('In Progress');
    } else {
      setTicketStatus('Closed');
    }
  };

  return (
    <div className={styles.page}>
      {/* Back Link */}
      <Link to="/customer/tickets" className={styles.backLink}>
        ← Back to My Tickets
      </Link>

      {/* Ticket Title Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.idRow}>
            <span className={styles.ticketId}>{ticketData.id}</span>
            <span className={`${styles.statusPill} ${ticketStatus === 'Closed' ? styles.statusMuted : styles.statusInfo}`}>
              {ticketStatus}
            </span>
            <span className={styles.priorityPill} style={{ color: ticketData.priorityColor }}>
              {ticketData.priority} Priority
            </span>
          </div>
          <h1 className={styles.subjectTitle}>{ticketData.subject}</h1>
        </div>

        <Button
          variant={ticketStatus === 'Closed' ? 'secondary' : 'ghost'}
          onClick={handleToggleClose}
        >
          {ticketStatus === 'Closed' ? 'Reopen Ticket' : 'Close Ticket'}
        </Button>
      </div>

      {/* Main Split Grid */}
      <div className={styles.grid}>
        {/* Left Column: Conversation & Reply */}
        <div className={styles.leftCol}>
          {/* Conversation Thread */}
          <div className={styles.conversationCard}>
            <h3 className={styles.cardHeaderTitle}>Conversation Thread</h3>

            <div className={styles.messageList}>
              {messages.map((msg) => {
                const isCustomer = msg.sender === 'customer';
                return (
                  <div
                    key={msg.id}
                    className={`${styles.messageItem} ${isCustomer ? styles.customerMsg : styles.agentMsg}`}
                  >
                    <div className={styles.avatar}>
                      {isCustomer ? currentUser.initials : msg.initials}
                    </div>

                    <div className={styles.msgBody}>
                      <div className={styles.msgMeta}>
                        <span className={styles.senderName}>{msg.senderName}</span>
                        {!isCustomer && <span className={styles.agentTag}>{msg.senderRole || 'Support Agent'}</span>}
                        <span className={styles.timestamp}>{msg.timestamp}</span>
                      </div>

                      <div className={styles.msgBubble}>
                        <p className={styles.msgText}>{msg.text}</p>

                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className={styles.msgAttachments}>
                            {msg.attachments.map((att, i) => (
                              <div key={i} className={styles.attChip}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                </svg>
                                <span className={styles.attName}>{att.name}</span>
                                <span className={styles.attSize}>({att.size})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className={styles.timelineCard}>
            <h4 className={styles.timelineTitle}>Activity History</h4>
            <div className={styles.timelineSteps}>
              {ticketData.timeline.map((step, idx) => (
                <div key={idx} className={styles.timelineStep}>
                  <div className={styles.stepDot} />
                  <span className={styles.stepLabel}>{step.label}</span>
                  <span className={styles.stepTime}>{step.timestamp}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reply Composer */}
          <div className={styles.composerCard}>
            <h3 className={styles.composerTitle}>Leave a Reply</h3>

            {ticketStatus === 'Closed' ? (
              <div className={styles.closedBanner}>
                This ticket is marked as <strong>Closed</strong>. You can reopen it if you need further help.
              </div>
            ) : (
              <form onSubmit={handleSendReply}>
                <textarea
                  rows="4"
                  placeholder="Write your response here..."
                  value={replyText}
                  onChange={(e) => {
                    setReplyText(e.target.value);
                    if (error) setError('');
                  }}
                  className={`${styles.textarea} ${error ? styles.hasError : ''}`}
                />
                {error && <span className={styles.errorText}>{error}</span>}

                {/* Attachments Area */}
                {attachments.length > 0 && (
                  <div className={styles.composerFiles}>
                    {attachments.map((att, idx) => (
                      <div key={idx} className={styles.composerChip}>
                        <span>{att.name}</span>
                        <button type="button" onClick={() => handleRemoveAttachment(idx)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.composerFooter}>
                  <label className={styles.attachBtn}>
                    <input type="file" multiple onChange={handleFileUpload} hidden />
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                    <span>Attach file</span>
                  </label>

                  <Button type="submit" variant="primary" loading={isSending}>
                    Send Reply →
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Ticket Info Sidebar */}
        <div className={styles.rightCol}>
          <div className={styles.infoCard}>
            <h3 className={styles.infoTitle}>Ticket Details</h3>

            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Status</span>
                <span className={`${styles.statusPill} ${ticketStatus === 'Closed' ? styles.statusMuted : styles.statusInfo}`}>
                  {ticketStatus}
                </span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Priority</span>
                <span className={styles.infoValue} style={{ color: ticketData.priorityColor }}>
                  {ticketData.priority}
                </span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Category</span>
                <span className={styles.infoValue}>{ticketData.category}</span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Assigned Agent</span>
                <div className={styles.agentInfo}>
                  <div className={styles.agentAvatar}>{ticketData.assignedAgent.initials}</div>
                  <div>
                    <div className={styles.agentName}>{ticketData.assignedAgent.name}</div>
                    <div className={styles.agentRole}>{ticketData.assignedAgent.role}</div>
                  </div>
                </div>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Created</span>
                <span className={styles.infoValue}>{ticketData.created}</span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Last Updated</span>
                <span className={styles.infoValue}>{ticketData.lastUpdated}</span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>SLA Status</span>
                <span className={styles.slaBadge}>{ticketData.sla}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
