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

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/digital-twin" element={<DashboardPage />} />
        <Route path="/simulator" element={<SimulatorPage />} />
        <Route path="/report" element={<CitizenReportPage />} />
        <Route path="/tracker" element={<ReportTrackerPage />} />
        <Route path="/reports-list" element={<ReportsListPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/street-health" element={<StreetHealthPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
