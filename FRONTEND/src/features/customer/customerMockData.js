/**
 * SupportDesk Customer Feature — Isolated Mock Data
 */

export const currentUser = {
  id: 'usr_101',
  name: 'John Doe',
  email: 'john.doe@company.com',
  role: 'Customer',
  initials: 'JD',
  unreadNotificationsCount: 3,
};

export const dashboardStats = [
  {
    id: 'total',
    label: 'Total Tickets',
    value: 12,
    change: '+20%',
    trend: 'up',
    statusColor: 'var(--color-accent)',
    bgColor: 'rgba(10, 132, 255, 0.12)',
    icon: 'document',
    sparkline: [4, 6, 5, 8, 10, 12],
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    value: 3,
    change: '+2%',
    trend: 'up',
    statusColor: '#0A84FF',
    bgColor: 'rgba(10, 132, 255, 0.12)',
    icon: 'clock',
    sparkline: [1, 2, 2, 3, 2, 3],
  },
  {
    id: 'resolved',
    label: 'Resolved',
    value: 8,
    change: '+33%',
    trend: 'up',
    statusColor: '#30D158',
    bgColor: 'rgba(48, 209, 88, 0.12)',
    icon: 'check',
    sparkline: [2, 4, 5, 6, 7, 8],
  },
  {
    id: 'waiting',
    label: 'Waiting for You',
    value: 1,
    change: '-50%',
    trend: 'down',
    statusColor: '#FFD60A',
    bgColor: 'rgba(255, 214, 10, 0.12)',
    icon: 'hourglass',
    sparkline: [4, 3, 3, 2, 2, 1],
  },
];

export const ticketActivityData = {
  timeframe: 'Last 30 days',
  labels: ['Aug 17', 'Aug 24', 'Aug 31', 'Sep 7', 'Sep 14'],
  points: [
    { label: 'Aug 17', value: 4 },
    { label: 'Aug 24', value: 3 },
    { label: 'Aug 31', value: 6 },
    { label: 'Sep 7', value: 12, highlight: true, tooltipText: '12 tickets\nSep 7, 2026' },
    { label: 'Sep 14', value: 7 },
  ],
};

export const ticketCategoriesData = {
  total: 12,
  categories: [
    { name: 'Technical', count: 5, color: '#0A84FF' },
    { name: 'Account', count: 3, color: '#30D158' },
    { name: 'Billing', count: 2, color: '#BF5AF2' },
    { name: 'Feature Request', count: 1, color: '#FF9F0A' },
    { name: 'Other', count: 1, color: '#8E8E93' },
  ],
};

export const quickActionsList = [
  {
    id: 'create-ticket',
    title: 'Create Ticket',
    description: 'Get help with a new issue',
    icon: 'plus-circle',
    route: '/customer/create-ticket',
    color: '#0A84FF',
  },
  {
    id: 'browse-kb',
    title: 'Browse Articles',
    description: 'Find solutions instantly',
    icon: 'book-open',
    route: '/customer/knowledge-base',
    color: '#BF5AF2',
  },
  {
    id: 'contact-support',
    title: 'Contact Support',
    description: 'Chat with our team',
    icon: 'message-square',
    route: '/customer/support-chat',
    color: '#30D158',
  },
];

export const recentTicketsList = [
  {
    id: '#1024',
    subject: 'Login issue on web app',
    category: 'Technical',
    categoryColor: '#0A84FF',
    status: 'In Progress',
    statusVariant: 'info',
    created: '2 hours ago',
  },
  {
    id: '#1023',
    subject: 'Unable to reset password',
    category: 'Account',
    categoryColor: '#30D158',
    status: 'Waiting for You',
    statusVariant: 'warning',
    created: '1 day ago',
  },
  {
    id: '#1022',
    subject: 'Feature request - Dark mode',
    category: 'Feature Request',
    categoryColor: '#FF9F0A',
    status: 'Resolved',
    statusVariant: 'success',
    created: '2 days ago',
  },
  {
    id: '#1021',
    subject: 'Billing inquiry',
    category: 'Billing',
    categoryColor: '#BF5AF2',
    status: 'Closed',
    statusVariant: 'muted',
    created: '3 days ago',
  },
  {
    id: '#1020',
    subject: 'Account verification issue',
    category: 'Account',
    categoryColor: '#30D158',
    status: 'Resolved',
    statusVariant: 'success',
    created: '5 days ago',
  },
];

export const knowledgeBaseArticlesList = [
  {
    id: 'kb_1',
    title: 'Getting Started',
    description: 'Learn the basics of SupportDesk',
  },
  {
    id: 'kb_2',
    title: 'Managing Your Account',
    description: 'Update your profile and settings',
  },
  {
    id: 'kb_3',
    title: 'Troubleshooting Login Issues',
    description: 'Common solutions and fixes',
  },
  {
    id: 'kb_4',
    title: 'Billing & Payments',
    description: 'Information about pricing and billing',
  },
];
