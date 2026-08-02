import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { DashboardLayout } from './components/layouts/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { Domains } from './pages/Domains';
import { SmtpCredentials } from './pages/SmtpCredentials';
import { ApiKeys } from './pages/ApiKeys';
import { EmailLogs } from './pages/EmailLogs';
import { Templates } from './pages/Templates';
import { Webhooks } from './pages/Webhooks';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';
import { EmailComposer } from './pages/EmailComposer';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Landing } from './pages/Landing';
import { VerifyEmail } from './pages/VerifyEmail';
import { ForgotPassword } from './pages/ForgotPassword';
import { Loading } from './pages/Loading';
import { NotFound } from './pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

// Guest route wrapper (unauthenticated only)
const GuestRoute = () => {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) {
    return <Loading />;
  }
  if (isAuthenticated && user) {
    return user.emailVerified ? <Navigate to="/dashboard" replace /> : <Navigate to="/verify-email" replace />;
  }
  return <Outlet />;
};

// Email verification route wrapper (authenticated & unverified only)
const VerifyRoute = () => {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) {
    return <Loading />;
  }
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  if (user.emailVerified) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
};

// Guard component verifying token authenticity and verification status
const ProtectedRoute = () => {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) {
    return <Loading />;
  }
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  if (!user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }
  return <Outlet />;
};

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <Router>
              <Routes>
                {/* Guest Gateways */}
                <Route element={<GuestRoute />}>
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                </Route>

                {/* Email Verification Gateway */}
                <Route element={<VerifyRoute />}>
                  <Route path="/verify-email" element={<VerifyEmail />} />
                </Route>

                {/* Protected Workspace Views */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
                  <Route path="/send-email" element={<DashboardLayout><EmailComposer /></DashboardLayout>} />
                  <Route path="/domains" element={<DashboardLayout><Domains /></DashboardLayout>} />
                  <Route path="/smtp" element={<DashboardLayout><SmtpCredentials /></DashboardLayout>} />
                  <Route path="/api-keys" element={<DashboardLayout><ApiKeys /></DashboardLayout>} />
                  <Route path="/logs" element={<DashboardLayout><EmailLogs /></DashboardLayout>} />
                  <Route path="/templates" element={<DashboardLayout><Templates /></DashboardLayout>} />
                  <Route path="/webhooks" element={<DashboardLayout><Webhooks /></DashboardLayout>} />
                  <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
                  <Route path="/profile" element={<DashboardLayout><Profile /></DashboardLayout>} />
                </Route>

                {/* fallback catch routing */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Router>
          </WorkspaceProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
