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
import { Login } from './pages/Login';
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

// Guard component verifying token authenticity
const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <Loading />;
  }
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <Router>
              <Routes>
                {/* Public Gateways */}
                <Route path="/login" element={<Login />} />

                {/* Protected Workspace Views */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
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
