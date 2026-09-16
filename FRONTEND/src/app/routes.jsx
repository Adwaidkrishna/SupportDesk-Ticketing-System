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

/**
 * Application route definitions.
 * Auth routes share AuthLayout; Customer routes share CustomerLayout.
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
      </Route>
    </Routes>
  );
}
