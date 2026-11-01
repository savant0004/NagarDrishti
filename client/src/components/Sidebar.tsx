import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBackendHealth } from '../contexts/BackendHealthContext';
import {
  LayoutDashboard,
  Layers,
  Sliders,
  FileText,
  BarChart3,
  Activity,
  ShieldCheck,
  Zap,
  Search,
  Bot,
} from 'lucide-react';

export function Sidebar() {
  const { user } = useAuth();
  const { readiness, loading, error } = useBackendHealth();
  const modeLabel = loading ? 'Checking database status…'
    : error || !readiness ? 'Database unavailable'
      : readiness.applicationMode === 'demo' ? 'Demo Mode · Sample records'
      : readiness.dataSource === 'demo' ? readiness.database.status === 'connected' ? 'Demo Database · MongoDB CONNECTED'
        : readiness.database.status === 'connecting' ? 'Demo Database · CONNECTING'
          : 'Demo Database · DATABASE UNAVAILABLE'
      : readiness.applicationMode === 'live' ? readiness.database.status === 'connected' ? 'Live Mode · DATABASE CONNECTED'
        : readiness.database.status === 'connecting' ? 'Live Mode · CONNECTING'
          : 'Live Mode · DATABASE UNAVAILABLE'
        : 'Application mode unavailable';
  const modeDetail = loading ? 'Checking the backend health endpoint.'
    : error || !readiness ? 'Backend health could not be confirmed; database state is unavailable.'
    : readiness.applicationMode === 'demo' ? 'Sample Bengaluru records are in memory and reset when the backend restarts.'
      : readiness.dataSource === 'demo' ? 'Seeded Bengaluru sample records are stored in the isolated nagardrishti_demo database.'
      : readiness.applicationMode === 'live' ? readiness.database.status === 'connected' ? 'Connected to live MongoDB records.' : readiness.database.status === 'connecting' ? 'MongoDB connection is being established or retried.' : 'Live database is unavailable; demo data is not being substituted.'
        : 'API data is currently unavailable.';
  const modeClass = !loading && !error && readiness?.database.status === 'connected' && readiness.applicationMode !== 'demo' ? 'text-emerald-400'
    : loading || readiness?.applicationMode === 'demo' || readiness?.database.status === 'connecting' ? 'text-amber-300'
      : 'text-red-300';
  const navItems = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/digital-twin', label: 'Digital Twin', icon: Layers },
    { to: '/simulator', label: 'Scenario Simulator', icon: Sliders, badge: 'What If?' },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/street-health', label: 'Street Health', icon: Activity },
    ...(user && ['admin', 'municipal_staff'].includes(user.role) ? [{ to: '/reports-list', label: 'Citizen Reports', icon: FileText }] : []),
    { to: '/tracker', label: 'Track My Report', icon: Search },
    { to: '/assistant', label: 'AI Assistant', icon: Bot },
    ...(user?.role === 'admin' ? [{ to: '/staff', label: 'Staff Management', icon: ShieldCheck }] : []),
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-[#070d1a] flex flex-col h-full z-20 select-none">
      {/* Brand Logo */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Zap className="w-5 h-5 text-black font-bold fill-black" />
        </div>
        <div>
          <h1 className="font-extrabold text-sm text-slate-100 tracking-wider font-mono">NAGARDRISHTI</h1>
          <p className="text-[10px] text-cyan-400 font-semibold tracking-tight">Urban Intelligence Twin</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="p-4 space-y-1 flex-1 overflow-y-auto">
        <div className="pt-4 pb-2 px-3 text-[10px] uppercase font-bold tracking-widest text-slate-500">
          Command Dashboard
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  isActive
                    ? 'bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500 text-black">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Hackathon Demo Notice Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60 m-3 rounded-xl">
        <div className={`flex items-center gap-2 ${modeClass} text-xs font-bold mb-1`}>
          <ShieldCheck className="w-4 h-4" />
          <span>{modeLabel}</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight">
          {modeDetail}
        </p>
      </div>
    </aside>
  );
}
