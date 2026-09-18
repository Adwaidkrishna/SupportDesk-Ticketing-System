import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/common/Button';
import Select from '../../../components/common/Select';
import { getMyTickets } from '../services/ticket.service';
import styles from './MyTickets.module.css';

/**
 * My Tickets page component.
 * Features real API fetching for authenticated customer tickets, status tabs,
 * search/category/sort filters, empty/loading/error states, and server pagination.
 */
export default function MyTickets() {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [activeStatus, setActiveStatus] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  const statusTabs = [
    { label: 'All', value: 'All' },
    { label: 'Open', value: 'Open' },
  ];

  const categories = [
    'All',
    'Technical',
    'Account',
    'Billing',
    'Feature Request',
    'Other',
  ];

  // Fetch tickets from API when page or activeStatus changes
  useEffect(() => {
    let isMounted = true;

    const fetchCustomerTickets = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await getMyTickets({
          page,
          limit: 10,
          status: activeStatus,
        });

        if (isMounted && response?.data) {
          setTickets(response.data.tickets || []);
          if (response.data.pagination) {
            setPagination(response.data.pagination);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to fetch customer tickets:', err);
          setError(err.message || 'Failed to load support tickets. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCustomerTickets();

    return () => {
      isMounted = false;
    };
  }, [page, activeStatus]);

  // Reset page to 1 when status tab changes
  const handleTabChange = (statusValue) => {
    setActiveStatus(statusValue);
    setPage(1);
  };

  const filteredTickets = useMemo(() => {
    let result = [...tickets];

    // Client-side search filter on subject, ticketNumber, category name
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.subject.toLowerCase().includes(term) ||
          t.ticketNumber.toLowerCase().includes(term) ||
          (t.category?.name && t.category.name.toLowerCase().includes(term))
      );
    }

    // Client-side Category filter
    if (selectedCategory !== 'All') {
      result = result.filter(
        (t) => t.category?.name && t.category.name.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Client-side Sorting
    if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return result;
  }, [tickets, searchTerm, selectedCategory, sortBy]);

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

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleRowClick = (ticketId) => {
    navigate(`/customer/tickets/${ticketId}`);
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titles}>
          <h1 className={styles.title}>My Tickets</h1>
          <p className={styles.subtitle}>
            Track and manage all your support requests in one place.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => navigate('/customer/create-ticket')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 18, height: 18 }}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Create Ticket</span>
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          fontSize: '0.9rem',
          fontWeight: 500,
        }}>
          {error}
        </div>
      )}

      {/* Controls Bar — Search, Tabs & Filters */}
      <div className={styles.controlsCard}>
        {/* Search */}
        <div className={styles.searchBox}>
          <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search tickets by subject, ID, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* Status Filter Tabs */}
        <div className={styles.statusTabs}>
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`${styles.tabBtn} ${activeStatus === tab.value ? styles.activeTab : ''}`}
              onClick={() => handleTabChange(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Select Dropdowns: Category & Sort */}
        <div className={styles.filtersRow}>
          <Select
            label="Category"
            options={categories.map((cat) => ({
              value: cat,
              label: cat === 'All' ? 'All Categories' : cat,
            }))}
            value={selectedCategory}
            onChange={setSelectedCategory}
          />

          <Select
            label="Sort"
            options={[
              { value: 'newest', label: 'Newest first' },
              { value: 'oldest', label: 'Oldest first' },
            ]}
            value={sortBy}
            onChange={setSortBy}
          />
        </div>
      </div>

      {/* Tickets Content — Desktop Table & Mobile Cards */}
      <div className={styles.ticketsContainer}>
        {loading ? (
          <div className={styles.loadingState}>
            <p>Loading your support tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <h3 className={styles.emptyTitle}>No tickets found</h3>
            <p className={styles.emptyDesc}>
              No support requests matched your search criteria or selected status.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Ticket #</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th className={styles.actionCol}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((t) => (
                    <tr
                      key={t.id}
                      className={styles.tableRow}
                      onClick={() => handleRowClick(t.id)}
                    >
                      <td className={styles.idCell}>{t.ticketNumber}</td>
                      <td className={styles.subjectCell}>{t.subject}</td>
                      <td>
                        <span className={styles.categoryBadge}>
                          <span className={styles.catDot} style={{ backgroundColor: '#0A84FF' }} />
                          {t.category?.name || 'General'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          {t.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.statusPill} ${getStatusClass(t.status)}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className={styles.createdCell}>{formatDate(t.createdAt)}</td>
                      <td className={styles.actionCol}>
                        <span className={styles.viewLink}>View →</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className={styles.mobileList}>
              {filteredTickets.map((t) => (
                <div
                  key={t.id}
                  className={styles.mobileCard}
                  onClick={() => handleRowClick(t.id)}
                >
                  <div className={styles.mobileCardHeader}>
                    <span className={styles.idCell}>{t.ticketNumber}</span>
                    <span className={`${styles.statusPill} ${getStatusClass(t.status)}`}>
                      {t.status}
                    </span>
                  </div>
                  <h4 className={styles.mobileSubject}>{t.subject}</h4>
                  <div className={styles.mobileCardFooter}>
                    <span className={styles.categoryBadge}>
                      <span className={styles.catDot} style={{ backgroundColor: '#0A84FF' }} />
                      {t.category?.name || 'General'}
                    </span>
                    <span className={styles.viewLink}>View ticket →</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination && (pagination.totalPages > 1 || pagination.total > 0) && (
              <div className={styles.paginationFooter}>
                <span className={styles.paginationInfo}>
                  Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} total tickets)
                </span>
                <div className={styles.paginationControls}>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={!pagination.hasPreviousPage || loading}
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  >
                    ← Previous
                  </button>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={!pagination.hasNextPage || loading}
                    onClick={() => setPage((prev) => prev + 1)}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
