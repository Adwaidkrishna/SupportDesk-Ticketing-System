import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import styles from './CreateTicket.module.css';

/**
 * Create Ticket page component.
 * Allows customers to submit a new support request with attachments,
 * validation, loading, and success confirmation state.
 */
export default function CreateTicket() {
  const navigate = useNavigate();

  const [formValues, setFormValues] = useState({
    subject: '',
    category: '',
    priority: 'Medium',
    description: '',
  });

  const [attachments, setAttachments] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);

  const categories = [
    { value: '', label: 'Select category' },
    { value: 'Technical', label: 'Technical' },
    { value: 'Account', label: 'Account' },
    { value: 'Billing', label: 'Billing' },
    { value: 'Feature Request', label: 'Feature Request' },
    { value: 'Other', label: 'Other' },
  ];

  const priorities = [
    { value: 'Low', label: 'Low — Minor inconvenience' },
    { value: 'Medium', label: 'Medium — Normal issue' },
    { value: 'High', label: 'High — Significant impact' },
    { value: 'Urgent', label: 'Urgent — System down / Critical' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const newFiles = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      type: file.type,
    }));

    setAttachments((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveAttachment = (id) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const validate = () => {
    const newErrors = {};
    if (!formValues.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }
    if (!formValues.category) {
      newErrors.category = 'Please select a category';
    }
    if (!formValues.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formValues.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters long';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    // Simulate mock submission delay
    setTimeout(() => {
      setIsSubmitting(false);
      const newTicketId = `#1025`;
      setCreatedTicket({
        id: newTicketId,
        subject: formValues.subject,
        category: formValues.category,
        priority: formValues.priority,
        created: 'Just now',
      });
    }, 1000);
  };

  // Success Confirmation View
  if (createdTicket) {
    return (
      <div className={styles.successContainer}>
        <div className={styles.successCard}>
          <div className={styles.successIconBox}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className={styles.successTitle}>Ticket Created Successfully!</h2>
          <p className={styles.successDesc}>
            Your support request has been logged under ID{' '}
            <strong className={styles.ticketIdBadge}>{createdTicket.id}</strong>.
            Our team will review it shortly.
          </p>

          <div className={styles.ticketSummaryBox}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Subject:</span>
              <span className={styles.summaryVal}>{createdTicket.subject}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Category:</span>
              <span className={styles.summaryVal}>{createdTicket.category}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Priority:</span>
              <span className={styles.summaryVal}>{createdTicket.priority}</span>
            </div>
          </div>

          <div className={styles.successActions}>
            <Button
              variant="primary"
              fullWidth
              large
              onClick={() => navigate('/customer/tickets/1025')}
            >
              View Ticket →
            </Button>
            <Link to="/customer/dashboard" className={styles.backLink}>
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link to="/customer/dashboard" className={styles.backButton}>
          ← Back to Dashboard
        </Link>
        <h1 className={styles.title}>Create New Ticket</h1>
        <p className={styles.subtitle}>
          Tell us what you need help with and our support team will assist you.
        </p>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
        {/* Subject */}
        <Input
          id="ticket-subject"
          name="subject"
          label="Subject"
          placeholder="e.g. Unable to access billing dashboard"
          value={formValues.subject}
          onChange={handleChange}
          error={errors.subject}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="9" x2="20" y2="9" />
              <line x1="4" y1="15" x2="20" y2="15" />
              <line x1="10" y1="3" x2="8" y2="21" />
              <line x1="16" y1="3" x2="14" y2="21" />
            </svg>
          }
        />

        {/* Row for Category & Priority */}
        <div className={styles.rowTwoCol}>
          {/* Category */}
          <div className={styles.fieldGroup}>
            <label htmlFor="ticket-category" className={styles.label}>
              Category <span className={styles.required}>*</span>
            </label>
            <div className={styles.selectWrapper}>
              <select
                id="ticket-category"
                name="category"
                value={formValues.category}
                onChange={handleChange}
                className={`${styles.select} ${errors.category ? styles.hasError : ''}`}
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <svg className={styles.selectChevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            {errors.category && <span className={styles.errorMessage}>{errors.category}</span>}
          </div>

          {/* Priority */}
          <div className={styles.fieldGroup}>
            <label htmlFor="ticket-priority" className={styles.label}>
              Priority
            </label>
            <div className={styles.selectWrapper}>
              <select
                id="ticket-priority"
                name="priority"
                value={formValues.priority}
                onChange={handleChange}
                className={styles.select}
              >
                {priorities.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <svg className={styles.selectChevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </div>

        {/* Description Textarea */}
        <div className={styles.fieldGroup}>
          <label htmlFor="ticket-description" className={styles.label}>
            Description <span className={styles.required}>*</span>
          </label>
          <textarea
            id="ticket-description"
            name="description"
            rows="6"
            placeholder="Describe your issue in detail. Include any relevant steps to reproduce..."
            value={formValues.description}
            onChange={handleChange}
            className={`${styles.textarea} ${errors.description ? styles.hasError : ''}`}
          />
          {errors.description && <span className={styles.errorMessage}>{errors.description}</span>}
        </div>

        {/* Attachments Section */}
        <div className={styles.attachmentsSection}>
          <label className={styles.label}>Attachments</label>
          <p className={styles.attachHelp}>
            Upload screenshots or relevant logs (PNG, JPG, PDF up to 10MB).
          </p>

          <div className={styles.uploadArea}>
            <input
              type="file"
              id="file-upload"
              multiple
              onChange={handleFileUpload}
              className={styles.fileInput}
            />
            <label htmlFor="file-upload" className={styles.uploadButton}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>+ Add files</span>
            </label>
          </div>

          {/* Uploaded File List */}
          {attachments.length > 0 && (
            <div className={styles.fileList}>
              {attachments.map((file) => (
                <div key={file.id} className={styles.fileChip}>
                  <svg className={styles.fileIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className={styles.fileName}>{file.name}</span>
                  <span className={styles.fileSize}>({file.size})</span>
                  <button
                    type="button"
                    className={styles.removeFileBtn}
                    onClick={() => handleRemoveAttachment(file.id)}
                    title="Remove file"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={styles.formActions}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/customer/dashboard')}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
          >
            Create Ticket →
          </Button>
        </div>
      </form>
    </div>
  );
}
