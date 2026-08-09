import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { api } from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Clock,
  Users,
  Calendar,
  Filter,
  ShieldAlert,
  Layers,
} from 'lucide-react';

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [dateRange, setDateRange] = useState<'Today' | '7D' | '30D' | '90D'>('30D');

  useEffect(() => {
    async function load() {
      const data = await api.getAnalytics();
      setAnalytics(data);
    }
    load();
  }, []);

  const COLORS = ['#ef4444', '#f59e0b', '#eab308', '#10b981'];
  const BAR_COLORS = ['#0284c7', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

  // Time trend data
  const timeTrendData = [
    { day: 'Mon', active: 12, resolved: 8 },
    { day: 'Tue', active: 15, resolved: 10 },
    { day: 'Wed', active: 18, resolved: 14 },
    { day: 'Thu', active: 14, resolved: 12 },
    { day: 'Fri', active: 22, resolved: 16 },
    { day: 'Sat', active: 19, resolved: 15 },
    { day: 'Sun', active: 16, resolved: 18 },
  ];

  return (
    <div className="flex h-screen w-screen bg-[#060a12] text-slate-100 overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <Header />

        <main className="p-6 lg:p-10 space-y-8 max-w-7xl mx-auto w-full">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-400 text-xs font-semibold mb-2">
                <BarChart3 className="w-3.5 h-3.5" /> Urban Infrastructure Intelligence
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">Urban Analytics Command</h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Real-time incident classification, risk distribution trends, and resolution velocity metrics.
              </p>
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs">
              {(['Today', '7D', '30D', '90D'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3.5 py-1.5 rounded-xl transition font-bold ${
                    dateRange === range ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            <div className="glass-panel p-5 rounded-3xl space-y-3 border border-slate-800 hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300">
              <div className="flex justify-between items-center text-slate-400 text-xs">
                <span className="font-semibold">Total Active Issues</span>
                <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-extrabold font-mono text-cyan-400">{analytics?.totalActiveIssues || 8}</p>
                <p className="text-[11px] text-slate-400 mt-1">Monitored across 8 city streets</p>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-3xl space-y-3 border border-slate-800 hover:border-red-500/40 hover:shadow-xl hover:shadow-red-500/10 transition-all duration-300">
              <div className="flex justify-between items-center text-slate-400 text-xs">
                <span className="font-semibold">Critical Hazards</span>
                <div className="w-8 h-8 rounded-xl bg-red-950 border border-red-800 flex items-center justify-center text-red-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-extrabold font-mono text-red-400">{analytics?.criticalIssuesCount || 2}</p>
                <p className="text-[11px] text-red-400 font-semibold mt-1">High risk to infrastructure & schools</p>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-3xl space-y-3 border border-slate-800 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300">
              <div className="flex justify-between items-center text-slate-400 text-xs">
                <span className="font-semibold">Avg Resolution Time</span>
                <div className="w-8 h-8 rounded-xl bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-extrabold font-mono text-amber-400">{analytics?.avgResolutionHours || 26.8} hrs</p>
                <p className="text-[11px] text-green-400 font-semibold mt-1">▲ 12.5% faster than last month</p>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-3xl space-y-3 border border-slate-800 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300">
              <div className="flex justify-between items-center text-slate-400 text-xs">
                <span className="font-semibold">Est. Citizens Impacted</span>
                <div className="w-8 h-8 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-extrabold font-mono text-slate-100">
                  {(analytics?.totalPopulationImpacted || 41840).toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Commuters, residents & students</p>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-3xl space-y-3 border border-slate-800 hover:border-green-500/40 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300">
              <div className="flex justify-between items-center text-slate-400 text-xs">
                <span className="font-semibold">Total Resolved</span>
                <div className="w-8 h-8 rounded-xl bg-green-950 border border-green-800 flex items-center justify-center text-green-400">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-extrabold font-mono text-green-400">{analytics?.resolvedCount || 140}</p>
                <p className="text-[11px] text-slate-400 mt-1">This month across all streets</p>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Chart 1: Issues by Category */}
            <div className="glass-panel p-6 rounded-3xl space-y-4 border border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" /> Issues by Category
                </h3>
                <span className="text-[10px] font-mono text-slate-400">COUNT BREAKDOWN</span>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.categoryDistribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} interval={0} height={40} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#0b1326', borderColor: '#00f2fe', borderRadius: '12px', color: '#fff', fontSize: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {(analytics?.categoryDistribution || []).map((entry: any, index: number) => (
                        <Cell key={`bar-cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Risk Level Distribution */}
            <div className="glass-panel p-6 rounded-3xl space-y-4 border border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" /> Risk Level Distribution
                </h3>
                <span className="text-[10px] font-mono text-slate-400">SEVERITY RATIO</span>
              </div>
              <div className="h-64 flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics?.riskDistribution || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {(analytics?.riskDistribution || []).map((entry: any, index: number) => (
                        <Cell key={`pie-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#0b1326', borderColor: '#00f2fe', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Badge Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-2xl font-extrabold font-mono text-white">8</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">HAZARDS</span>
                </div>
              </div>

              <div className="flex justify-center gap-6 text-xs text-slate-300 pt-2 border-t border-slate-800">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-3 rounded-full bg-[#ef4444]"></span> Critical
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span> High
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-3 rounded-full bg-[#eab308]"></span> Medium
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-3 rounded-full bg-[#10b981]"></span> Low
                </span>
              </div>
            </div>

            {/* Chart 3: Weekly Active vs Resolved Trend */}
            <div className="glass-panel p-6 rounded-3xl space-y-4 lg:col-span-2 border border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" /> Incident Velocity: Created vs. Resolved
                </h3>
                <span className="text-[10px] font-mono text-slate-400">WEEKLY PACE</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeTrendData} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ background: '#0b1326', borderColor: '#00f2fe', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Line type="monotone" name="Active Hazards" dataKey="active" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" name="Resolved Issues" dataKey="resolved" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
