import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Select from '../../../components/common/Select';
import { getCategories, createTicket } from '../services/ticket.service';
import styles from './CreateTicket.module.css';

/**
 * Create Ticket page component.
 * Allows authenticated customers to submit a new support request to backend POST /api/v1/tickets.
 */
export default function CreateTicket() {
  const navigate = useNavigate();

  const [formValues, setFormValues] = useState({
    subject: '',
    categoryId: '',
    priority: 'MEDIUM',
    description: '',
  });

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);

  // Fetch support categories from backend API on mount
  useEffect(() => {
    let isMounted = true;
    const fetchCategoryList = async () => {
      try {
        setLoadingCategories(true);
        const response = await getCategories();
        if (isMounted && response?.data?.categories) {
          const categoryOptions = response.data.categories.map((cat) => ({
            value: cat.id || cat._id,
            label: cat.name,
            subtitle: cat.description || '',
          }));
          setCategories(categoryOptions);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load support categories:', err);
          setServerError('Unable to load support categories. Please refresh or try again.');
        }
      } finally {
        if (isMounted) setLoadingCategories(false);
      }
    };

    fetchCategoryList();
    return () => {
      isMounted = false;
    };
  }, []);

  const priorityOptions = [
    { value: 'LOW', label: 'Low', subtitle: 'Minor inconvenience', badge: 'Low', badgeColor: '#64748B' },
    { value: 'MEDIUM', label: 'Medium', subtitle: 'Normal issue', badge: 'Medium', badgeColor: '#0A84FF' },
    { value: 'HIGH', label: 'High', subtitle: 'Significant impact', badge: 'High', badgeColor: '#FF9F0A' },
    { value: 'URGENT', label: 'Urgent', subtitle: 'System down / Critical', badge: 'Urgent', badgeColor: '#FF453A' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) setServerError('');
  };

  const validate = () => {
    const newErrors = {};

    if (!formValues.subject.trim()) {
      newErrors.subject = 'Subject is required.';
    } else if (formValues.subject.trim().length < 5) {
      newErrors.subject = 'Subject must be at least 5 characters long.';
    }

    if (!formValues.categoryId) {
      newErrors.categoryId = 'Please select a category.';
    }

    if (!formValues.description.trim()) {
      newErrors.description = 'Description is required.';
    } else if (formValues.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters long.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError('');

    try {
      const response = await createTicket({
        subject: formValues.subject.trim(),
        description: formValues.description.trim(),
        categoryId: formValues.categoryId,
        priority: formValues.priority,
      });

      if (response?.data?.ticket) {
        setCreatedTicket(response.data.ticket);
      }
    } catch (err) {
      setServerError(err.message || 'Failed to create ticket. Please check your inputs and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success Confirmation View
  if (createdTicket) {
    const selectedCatObj = categories.find((c) => String(c.value) === String(createdTicket.categoryId));
    const categoryName = selectedCatObj ? selectedCatObj.label : 'Support Category';

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
            Your support request has been logged under Ticket Number{' '}
            <strong className={styles.ticketIdBadge}>{createdTicket.ticketNumber}</strong>.
          </p>

          <div className={styles.ticketSummaryBox}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Ticket Number:</span>
              <span className={styles.summaryVal}>{createdTicket.ticketNumber}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Subject:</span>
              <span className={styles.summaryVal}>{createdTicket.subject}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Category:</span>
              <span className={styles.summaryVal}>{categoryName}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Priority:</span>
              <span className={styles.summaryVal}>{createdTicket.priority}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Initial Status:</span>
              <span className={styles.summaryVal}>{createdTicket.status}</span>
            </div>
          </div>

          <div className={styles.successActions}>
            <Button
              variant="primary"
              fullWidth
              large
              onClick={() => navigate('/customer/dashboard')}
            >
              Return to Dashboard →
            </Button>
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

      {serverError && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '20px',
          borderRadius: '8px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          fontSize: '0.9rem',
          fontWeight: 500,
        }}>
          {serverError}
        </div>
      )}

      <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
        {/* Subject */}
        <Input
          id="ticket-subject"
          name="subject"
          label="Subject *"
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
          <Select
            label="Category *"
            options={categories}
            value={formValues.categoryId}
            onChange={(val) => {
              setFormValues((prev) => ({ ...prev, categoryId: val }));
              if (errors.categoryId) setErrors((prev) => ({ ...prev, categoryId: '' }));
              if (serverError) setServerError('');
            }}
            placeholder={loadingCategories ? 'Loading categories...' : 'Select category...'}
            disabled={loadingCategories || isSubmitting}
            error={errors.categoryId}
          />

          {/* Priority */}
          <Select
            label="Priority"
            options={priorityOptions}
            value={formValues.priority}
            onChange={(val) => {
              setFormValues((prev) => ({ ...prev, priority: val }));
              if (serverError) setServerError('');
            }}
            disabled={isSubmitting}
            placeholder="Select priority..."
          />
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
            disabled={isSubmitting}
            className={`${styles.textarea} ${errors.description ? styles.hasError : ''}`}
          />
          {errors.description && <span className={styles.errorMessage}>{errors.description}</span>}
        </div>

        {/* Action Buttons */}
        <div className={styles.formActions}>
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => navigate('/customer/dashboard')}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting || loadingCategories}
          >
            Create Ticket →
          </Button>
        </div>
      </form>
    </div>
  );
}
