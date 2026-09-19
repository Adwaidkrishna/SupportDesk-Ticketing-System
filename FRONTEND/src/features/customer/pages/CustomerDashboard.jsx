import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../../../socket/socket.js';
import {
  currentUser,
  dashboardStats,
  ticketActivityData,
  ticketCategoriesData,
  quickActionsList,
  recentTicketsList,
  knowledgeBaseArticlesList,
} from '../customerMockData';
import DashboardHeader from '../components/DashboardHeader';
import StatCard from '../components/StatCard';
import TicketActivityChart from '../components/TicketActivityChart';
import CategoryOverview from '../components/CategoryOverview';
import QuickActions from '../components/QuickActions';
import RecentTickets from '../components/RecentTickets';
import KnowledgeBasePreview from '../components/KnowledgeBasePreview';
import styles from './CustomerDashboard.module.css';

/**
 * Customer Dashboard orchestrator page.
 * Renders stats grid, ticket activity chart, category breakdown,
 * quick actions, recent tickets table, and knowledge base preview.
 */
export default function CustomerDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    socket.connect();

    const handleConnect = () => {
      console.log('🟢 Socket connected:', socket.id);
    };

    const handleDisconnect = (reason) => {
      console.log('🔴 Socket disconnected:', reason);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.disconnect();
    };
  }, []);

  const handleCreateTicket = () => {
    navigate('/customer/create-ticket');
  };

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <DashboardHeader
        name={currentUser.name.split(' ')[0]}
        onCreateTicket={handleCreateTicket}
      />

      {/* Metric Stat Cards Grid */}
      <div className={styles.statsGrid}>
        {dashboardStats.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </div>

      {/* Middle Row — Ticket Activity (large), Category Breakdown, Quick Actions */}
      <div className={styles.middleGrid}>
        <div className={styles.activityCol}>
          <TicketActivityChart data={ticketActivityData} />
        </div>
        <div className={styles.categoryCol}>
          <CategoryOverview data={ticketCategoriesData} />
        </div>
        <div className={styles.quickCol}>
          <QuickActions actions={quickActionsList} />
        </div>
      </div>

      {/* Bottom Row — Recent Tickets (wide) & Knowledge Base Preview */}
      <div className={styles.bottomGrid}>
        <div className={styles.ticketsCol}>
          <RecentTickets
            tickets={recentTicketsList}
            onViewAll={() => navigate('/customer/my-tickets')}
          />
        </div>
        <div className={styles.kbCol}>
          <KnowledgeBasePreview
            articles={knowledgeBaseArticlesList}
            onViewAll={() => navigate('/customer/knowledge-base')}
          />
        </div>
      </div>
    </div>
  );
}
