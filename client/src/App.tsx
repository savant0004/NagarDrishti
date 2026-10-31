import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { CitizenReportPage } from './pages/CitizenReportPage';
import { ReportTrackerPage } from './pages/ReportTrackerPage';
import { ReportsListPage } from './pages/ReportsListPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { StreetHealthPage } from './pages/StreetHealthPage';
import { LoginPage } from './pages/LoginPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserRole } from './types';
import { useLocation } from 'react-router-dom';

function RequireRole({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen bg-[#060a12] text-cyan-300 flex items-center justify-center text-sm">Checking session…</div>;
  if (!user) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (!roles.includes(user.role)) return <Navigate to={user.role === 'citizen' ? '/report' : '/dashboard'} replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<RequireRole roles={['municipal_staff', 'admin']}><DashboardPage /></RequireRole>} />
        <Route path="/digital-twin" element={<RequireRole roles={['municipal_staff', 'admin']}><DashboardPage /></RequireRole>} />
        <Route path="/simulator" element={<RequireRole roles={['municipal_staff', 'admin']}><SimulatorPage /></RequireRole>} />
        <Route path="/report" element={<RequireRole roles={['citizen', 'municipal_staff', 'admin']}><CitizenReportPage /></RequireRole>} />
        <Route path="/tracker" element={<RequireRole roles={['citizen', 'municipal_staff', 'admin']}><ReportTrackerPage /></RequireRole>} />
        <Route path="/reports-list" element={<RequireRole roles={['municipal_staff', 'admin']}><ReportsListPage /></RequireRole>} />
        <Route path="/analytics" element={<RequireRole roles={['municipal_staff', 'admin']}><AnalyticsPage /></RequireRole>} />
        <Route path="/street-health" element={<StreetHealthPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
