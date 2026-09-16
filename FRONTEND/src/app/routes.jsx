import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import CustomerLayout from '../layouts/CustomerLayout';
import Login from '../features/auth/pages/Login';
import Register from '../features/auth/pages/Register';
import VerifyOtp from '../features/auth/pages/VerifyOtp';
import ForgotPassword from '../features/auth/pages/ForgotPassword';
import ResetPassword from '../features/auth/pages/ResetPassword';
import CustomerDashboard from '../features/customer/pages/CustomerDashboard';
import CreateTicket from '../features/customer/pages/CreateTicket';
import MyTickets from '../features/customer/pages/MyTickets';
import TicketDetails from '../features/customer/pages/TicketDetails';

import CustomerNotifications from '../features/customer/pages/CustomerNotifications';
import KnowledgeBase from '../features/customer/pages/KnowledgeBase';
import ArticleDetails from '../features/customer/pages/ArticleDetails';
import CustomerProfile from '../features/customer/pages/CustomerProfile';
import AgentLayout from '../layouts/AgentLayout';
import AgentDashboard from '../features/agent/pages/AgentDashboard';
import MyQueue from '../features/agent/pages/MyQueue';
import AllTickets from '../features/agent/pages/AllTickets';
import EscalatedTickets from '../features/agent/pages/EscalatedTickets';

/**
 * Application route definitions.
 * Auth routes share AuthLayout; Customer routes share CustomerLayout; Agent routes share AgentLayout.
 */
export default function AppRoutes() {
  return (
    <Routes>
      {/* Redirect root to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Auth routes — wrapped in AuthLayout */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      {/* Customer routes — wrapped in CustomerLayout */}
      <Route element={<CustomerLayout />}>
        <Route path="/customer/dashboard" element={<CustomerDashboard />} />
        <Route path="/customer/create-ticket" element={<CreateTicket />} />
        <Route path="/customer/tickets" element={<MyTickets />} />
        <Route path="/customer/my-tickets" element={<MyTickets />} />
        <Route path="/customer/tickets/:ticketId" element={<TicketDetails />} />
        <Route path="/customer/notifications" element={<CustomerNotifications />} />
        <Route path="/customer/knowledge-base" element={<KnowledgeBase />} />
        <Route path="/customer/knowledge-base/:articleId" element={<ArticleDetails />} />
        <Route path="/customer/profile" element={<CustomerProfile />} />
        <Route path="/customer/settings" element={<CustomerProfile />} />
      </Route>

      {/* Agent routes — wrapped in AgentLayout */}
      <Route element={<AgentLayout />}>
        <Route path="/agent/dashboard" element={<AgentDashboard />} />
        <Route path="/agent/queue" element={<MyQueue />} />
        <Route path="/agent/tickets" element={<AllTickets />} />
        <Route path="/agent/escalated" element={<EscalatedTickets />} />
        <Route path="/agent/knowledge-base" element={<KnowledgeBase />} />
        <Route path="/agent/knowledge-base/:articleId" element={<ArticleDetails />} />
      </Route>
    </Routes>
  );
}
