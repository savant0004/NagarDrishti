import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  Sliders,
  FileText,
  BarChart3,
  Activity,
  Home,
  ShieldCheck,
  Zap,
  Search,
} from 'lucide-react';

export function Sidebar() {
  const navItems = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/digital-twin', label: 'Digital Twin', icon: Layers },
    { to: '/simulator', label: 'Scenario Simulator', icon: Sliders, badge: 'What If?' },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/street-health', label: 'Street Health', icon: Activity },
    { to: '/reports-list', label: 'Citizen Reports', icon: FileText },
    { to: '/tracker', label: 'Track My Report', icon: Search },
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
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              isActive
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`
          }
        >
          <Home className="w-4 h-4" />
          <span>Landing Page</span>
        </NavLink>

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
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>Hackathon Demo Mode</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight">
          Data shown is simulated unless otherwise connected to live municipal sensors.
        </p>
      </div>
    </aside>
  );
}
