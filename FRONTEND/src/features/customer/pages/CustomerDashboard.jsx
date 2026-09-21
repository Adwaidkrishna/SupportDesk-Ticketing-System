import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { getCustomerDashboard } from '../services/customerDashboard.service';
import DashboardHeader from '../components/DashboardHeader';
import StatCard from '../components/StatCard';
import RecentTickets from '../components/RecentTickets';
import RecentNotifications from '../components/RecentNotifications';
import QuickActions from '../components/QuickActions';
import styles from './CustomerDashboard.module.css';

/**
 * Customer Dashboard page connected to real backend API:
 * GET /api/v1/dashboard/customer
 */
export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getCustomerDashboard();
      if (response?.success && response?.data) {
        setDashboardData(response.data);
      } else {
        setError('Received an unexpected response from the server.');
      }
    } catch (err) {
      console.error('Failed to load customer dashboard:', err);
      setError(
        err.message || 'Unable to connect to the server. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch dashboard data on mount and whenever authenticated user identity changes (prevents session leak)
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setError('');
        const response = await getCustomerDashboard();
        if (isMounted) {
          if (response?.success && response?.data) {
            setDashboardData(response.data);
          } else {
            setError('Received an unexpected response from the server.');
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load customer dashboard:', err);
          setError(
            err.message || 'Unable to connect to the server. Please check your connection and try again.'
          );
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user?.id, user?._id]);

  const handleCreateTicket = () => {
    navigate('/customer/create-ticket');
  };

  const displayName = user?.name ? user.name.split(' ')[0] : 'there';
  const stats = dashboardData?.stats || {
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
  };

  const statCards = [
    {
      id: 'stat-total',
      label: 'Total Tickets',
      value: stats.total,
      icon: 'document',
      statusColor: '#0A84FF',
      bgColor: 'rgba(10, 132, 255, 0.15)',
    },
    {
      id: 'stat-open',
      label: 'Open',
      value: stats.open,
      icon: 'clock',
      statusColor: '#FF9F0A',
      bgColor: 'rgba(255, 159, 10, 0.15)',
    },
    {
      id: 'stat-in-progress',
      label: 'In Progress',
      value: stats.inProgress,
      icon: 'hourglass',
      statusColor: '#5E5CE6',
      bgColor: 'rgba(94, 92, 230, 0.15)',
    },
    {
      id: 'stat-resolved',
      label: 'Resolved',
      value: stats.resolved,
      icon: 'check',
      statusColor: '#30D158',
      bgColor: 'rgba(48, 209, 88, 0.15)',
    },
    {
      id: 'stat-closed',
      label: 'Closed',
      value: stats.closed,
      icon: 'closed',
      statusColor: '#8E8E93',
      bgColor: 'rgba(142, 142, 147, 0.15)',
    },
  ];

  const quickActionsList = [
    {
      id: 'qa-create',
      title: 'Create Ticket',
      description: 'Report a new incident or ask for support',
      icon: 'plus-circle',
      route: '/customer/create-ticket',
      color: '#0A84FF',
    },
    {
      id: 'qa-tickets',
      title: 'View My Tickets',
      description: 'Track ongoing requests and conversations',
      icon: 'layers',
      route: '/customer/my-tickets',
      color: '#BF5AF2',
    },
    {
      id: 'qa-notifs',
      title: 'Notifications',
      description: 'Check ticket alerts and real-time updates',
      icon: 'bell',
      route: '/customer/notifications',
      color: '#FF9F0A',
    },
  ];

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <DashboardHeader name={displayName} onCreateTicket={handleCreateTicket} />

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Loading your dashboard metrics...</p>
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 className={styles.errorTitle}>Failed to load dashboard</h3>
          <p className={styles.errorDesc}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={fetchDashboard}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span>Try Again</span>
          </button>
        </div>
      ) : (
        <>
          {/* Metric Stat Cards Grid */}
          <div className={styles.statsGrid}>
            {statCards.map((stat) => (
              <StatCard key={stat.id} stat={stat} />
            ))}
          </div>

          {/* Main Content Layout */}
          <div className={styles.contentGrid}>
            {/* Left Column — Recent Tickets */}
            <div className={styles.leftCol}>
              <RecentTickets
                tickets={dashboardData?.recentTickets || []}
                onViewAll={() => navigate('/customer/my-tickets')}
                onCreateTicket={handleCreateTicket}
              />
            </div>

            {/* Right Column — Quick Actions & Recent Notifications */}
            <div className={styles.rightCol}>
              <QuickActions actions={quickActionsList} />

              <RecentNotifications
                notifications={dashboardData?.notifications?.recent || []}
                unreadCount={dashboardData?.notifications?.unreadCount || 0}
                onViewAll={() => navigate('/customer/notifications')}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
