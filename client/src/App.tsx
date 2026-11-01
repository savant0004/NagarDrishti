import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { CitizenReportPage } from './pages/CitizenReportPage';
import { ReportTrackerPage } from './pages/ReportTrackerPage';
import { ReportsListPage } from './pages/ReportsListPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { StreetHealthPage } from './pages/StreetHealthPage';
import { AssistantPage } from './pages/AssistantPage';
import { StaffManagementPage } from './pages/StaffManagementPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserRole } from './types';
import { useLocation } from 'react-router-dom';
import { BackendHealthProvider } from './contexts/BackendHealthContext';

function RequireRole({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen bg-[#060a12] text-cyan-300 flex items-center justify-center text-sm">Checking session…</div>;
  if (!user) return <Navigate to="/dashboard" replace state={{ from: location.pathname }} />;
  if (!roles.includes(user.role)) return <Navigate to={user.role === 'citizen' ? '/report' : '/dashboard'} replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <BackendHealthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/staff" element={<RequireRole roles={['admin']}><StaffManagementPage /></RequireRole>} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/digital-twin" element={<DashboardPage />} />
        <Route path="/simulator" element={<SimulatorPage />} />
        <Route path="/report" element={<CitizenReportPage />} />
        <Route path="/tracker" element={<ReportTrackerPage />} />
        <Route path="/reports-list" element={<RequireRole roles={['municipal_staff', 'admin']}><ReportsListPage /></RequireRole>} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/street-health" element={<StreetHealthPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </BackendHealthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
