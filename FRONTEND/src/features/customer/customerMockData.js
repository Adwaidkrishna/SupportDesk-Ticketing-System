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

export const knowledgeBaseCategories = [
  {
    id: 'cat_getting_started',
    title: 'Getting Started',
    icon: 'rocket',
    articleCount: 8,
    color: '#0A84FF',
    description: 'Essential guides for new users to get up and running smoothly.',
  },
  {
    id: 'cat_account',
    title: 'Account & Security',
    icon: 'shield',
    articleCount: 12,
    color: '#30D158',
    description: 'Password resets, 2FA, profile settings, and security controls.',
  },
  {
    id: 'cat_billing',
    title: 'Billing & Plans',
    icon: 'credit-card',
    articleCount: 6,
    color: '#BF5AF2',
    description: 'Invoices, payment methods, plan upgrades, and refund policies.',
  },
  {
    id: 'cat_troubleshooting',
    title: 'Troubleshooting',
    icon: 'tool',
    articleCount: 15,
    color: '#FF9F0A',
    description: 'Fix common errors, browser session issues, and connectivity.',
  },
  {
    id: 'cat_integrations',
    title: 'API & Integrations',
    icon: 'cpu',
    articleCount: 9,
    color: '#64D2FF',
    description: 'Connect SupportDesk with Slack, Webhooks, and custom APIs.',
  },
];

export const knowledgeBaseArticlesList = [
  {
    id: 'kb_1',
    title: 'How to set up Two-Factor Authentication (2FA)',
    category: 'Account & Security',
    categoryId: 'cat_account',
    readTime: '3 min read',
    views: '1.4k',
    helpfulRating: '98%',
    isPopular: true,
    lastUpdated: 'Sep 10, 2026',
    author: 'Security Operations',
    snippet: 'Learn how to protect your SupportDesk account using Google Authenticator, Authy, or hardware security keys.',
    sections: [
      {
        heading: '1. Navigate to Account Settings',
        content: 'Log in to your SupportDesk portal, click your user avatar in the top right corner, and select Profile & Settings. Select the Security tab.',
      },
      {
        heading: '2. Enable 2FA Authenticator',
        content: 'Click the Enable 2FA toggle button. A QR code will display on the screen alongside a secret backup code.',
      },
      {
        heading: '3. Scan QR Code & Confirm',
        content: 'Open your preferred authenticator app (e.g., Google Authenticator, 1Password, or Authy), scan the QR code, and enter the 6-digit verification code to finalize setup.',
      },
    ],
  },
  {
    id: 'kb_2',
    title: 'Resetting your forgotten password',
    category: 'Account & Security',
    categoryId: 'cat_account',
    readTime: '2 min read',
    views: '2.3k',
    helpfulRating: '95%',
    isPopular: true,
    lastUpdated: 'Sep 12, 2026',
    author: 'Customer Support',
    snippet: 'Step-by-step instructions on requesting a password reset email and updating your credentials securely.',
    sections: [
      {
        heading: '1. Request Password Reset',
        content: 'On the SupportDesk login page, click Forgot Password?. Enter your registered email address and hit Send Reset Link.',
      },
      {
        heading: '2. Check Your Inbox',
        content: 'Check your email inbox for a link from support@supportdesk.com (check your spam folder if it does not arrive within 2 minutes).',
      },
      {
        heading: '3. Create New Strong Password',
        content: 'Click the link, enter a new password with at least 8 characters including uppercase, numbers, and symbols, and confirm.',
      },
    ],
  },
  {
    id: 'kb_3',
    title: 'Troubleshooting Login & Session Errors',
    category: 'Troubleshooting',
    categoryId: 'cat_troubleshooting',
    readTime: '5 min read',
    views: '3.1k',
    helpfulRating: '92%',
    isPopular: true,
    lastUpdated: 'Aug 28, 2026',
    author: 'Technical Team',
    snippet: 'Clear browser cookies, resolve OAuth token timeouts, and fix session expiration issues easily.',
    sections: [
      {
        heading: '1. Clear Browser Cache and Cookies',
        content: 'Stale cookies can block authentication tokens. Clear site data for supportdesk.com or attempt logging in using an Incognito window.',
      },
      {
        heading: '2. Verify Network / VPN Settings',
        content: 'Strict enterprise firewalls or active VPN connections may block WebSocket and REST API endpoints.',
      },
    ],
  },
  {
    id: 'kb_4',
    title: 'Understanding Invoices & Payment Schedules',
    category: 'Billing & Plans',
    categoryId: 'cat_billing',
    readTime: '4 min read',
    views: '980',
    helpfulRating: '96%',
    isPopular: false,
    lastUpdated: 'Sep 01, 2026',
    author: 'Finance & Billing',
    snippet: 'Find out when monthly and annual invoices are issued and how to download PDF statements for accounting.',
    sections: [
      {
        heading: '1. Accessing PDF Invoices',
        content: 'Navigate to Billing under Settings to view your payment history and download itemized tax invoices.',
      },
    ],
  },
  {
    id: 'kb_5',
    title: 'Quickstart Guide for New SupportDesk Users',
    category: 'Getting Started',
    categoryId: 'cat_getting_started',
    readTime: '6 min read',
    views: '4.2k',
    helpfulRating: '99%',
    isPopular: true,
    lastUpdated: 'Sep 15, 2026',
    author: 'Customer Experience Team',
    snippet: 'Everything you need to know from opening your first ticket, attaching logs, to tracking agent responses.',
    sections: [
      {
        heading: '1. Dashboard Overview',
        content: 'Your dashboard provides real-time statistics on active tickets, notifications, and quick access to create support requests.',
      },
      {
        heading: '2. Submitting Your First Ticket',
        content: 'Click "+ Create Ticket", choose the appropriate category, priority, and provide a clear description with attachments.',
      },
    ],
  },
  {
    id: 'kb_6',
    title: 'Configuring Slack Integration & Webhooks',
    category: 'API & Integrations',
    categoryId: 'cat_integrations',
    readTime: '7 min read',
    views: '850',
    helpfulRating: '94%',
    isPopular: false,
    lastUpdated: 'Aug 15, 2026',
    author: 'DevOps & APIs',
    snippet: 'Receive instant real-time notification alerts directly in your Slack channels when tickets are updated.',
    sections: [
      {
        heading: '1. Connect Slack Workspace',
        content: 'Go to Settings > Integrations, click "Add to Slack", and authorize the SupportDesk bot.',
      },
    ],
  },
];

