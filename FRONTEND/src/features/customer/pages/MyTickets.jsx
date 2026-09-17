import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { recentTicketsList } from '../customerMockData';
import Button from '../../../components/common/Button';
import Select from '../../../components/common/Select';
import styles from './MyTickets.module.css';

/**
 * Extended mock dataset for My Tickets page
 */
const initialTickets = [
  ...recentTicketsList,
  {
    id: '#1019',
    subject: 'Request for API key access',
    category: 'Technical',
    categoryColor: '#0A84FF',
    status: 'Resolved',
    statusVariant: 'success',
    created: '6 days ago',
  },
  {
    id: '#1018',
    subject: 'Invoice copy required for August',
    category: 'Billing',
    categoryColor: '#BF5AF2',
    status: 'Closed',
    statusVariant: 'muted',
    created: '1 week ago',
  },
  {
    id: '#1017',
    subject: 'SSO Integration inquiry',
    category: 'Feature Request',
    categoryColor: '#FF9F0A',
    status: 'Resolved',
    statusVariant: 'success',
    created: '2 weeks ago',
  },
];

/**
 * My Tickets page component.
 * Features search, status tabs, category/sort filters, responsive desktop table / mobile cards,
 * and navigation to ticket details.
 */
export default function MyTickets() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeStatus, setActiveStatus] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  const statusTabs = [
    { label: 'All', value: 'All' },
    { label: 'In Progress', value: 'In Progress' },
    { label: 'Waiting for You', value: 'Waiting for You' },
    { label: 'Resolved', value: 'Resolved' },
    { label: 'Closed', value: 'Closed' },
  ];

  const categories = [
    'All',
    'Technical',
    'Account',
    'Billing',
    'Feature Request',
    'Other',
  ];

  const filteredTickets = useMemo(() => {
    return initialTickets.filter((ticket) => {
      // Search filter
      const matchesSearch =
        ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.category.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus =
        activeStatus === 'All' || ticket.status === activeStatus;

      // Category filter
      const matchesCategory =
        selectedCategory === 'All' || ticket.category === selectedCategory;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [searchTerm, activeStatus, selectedCategory]);

  const getStatusClass = (variant) => {
    switch (variant) {
      case 'info':
        return styles.statusInfo;
      case 'warning':
        return styles.statusWarning;
      case 'success':
        return styles.statusSuccess;
      case 'muted':
      default:
        return styles.statusMuted;
    }
  };

  const handleRowClick = (id) => {
    const rawId = id.replace('#', '');
    navigate(`/customer/tickets/${rawId}`);
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
              onClick={() => setActiveStatus(tab.value)}
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
        {filteredTickets.length === 0 ? (
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
                    <th>#</th>
                    <th>Subject</th>
                    <th>Category</th>
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
                      <td className={styles.idCell}>{t.id}</td>
                      <td className={styles.subjectCell}>{t.subject}</td>
                      <td>
                        <span className={styles.categoryBadge}>
                          <span className={styles.catDot} style={{ backgroundColor: t.categoryColor }} />
                          {t.category}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.statusPill} ${getStatusClass(t.statusVariant)}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className={styles.createdCell}>{t.created}</td>
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
                    <span className={styles.idCell}>{t.id}</span>
                    <span className={`${styles.statusPill} ${getStatusClass(t.statusVariant)}`}>
                      {t.status}
                    </span>
                  </div>
                  <h4 className={styles.mobileSubject}>{t.subject}</h4>
                  <div className={styles.mobileCardFooter}>
                    <span className={styles.categoryBadge}>
                      <span className={styles.catDot} style={{ backgroundColor: t.categoryColor }} />
                      {t.category}
                    </span>
                    <span className={styles.viewLink}>View ticket →</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
