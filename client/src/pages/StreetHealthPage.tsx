import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { api } from '../services/api';
import { IStreet } from '../types';
import { Link } from 'react-router-dom';
import {
  Activity,
  Search,
  ArrowRight,
  Waves,
  Car,
  Lightbulb,
  Trash2,
  Droplets,
  AlertTriangle,
  TrendingUp,
  MapPin,
  ShieldAlert,
} from 'lucide-react';

function HealthBar({ value, color }: { value: number; color: string }) {
  const barColor =
    color === 'blue'
      ? 'from-blue-500 to-blue-400'
      : color === 'cyan'
      ? 'from-cyan-500 to-cyan-400'
      : color === 'amber'
      ? 'from-amber-500 to-amber-400'
      : color === 'green'
      ? 'from-green-500 to-green-400'
      : color === 'purple'
      ? 'from-purple-500 to-purple-400'
      : 'from-slate-500 to-slate-400';

  const valClamped = Math.max(0, Math.min(100, value));

  return (
    <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
        style={{ width: `${valClamped}%` }}
      />
    </div>
  );
}

function HealthRing({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 65 ? '#f59e0b' : '#ef4444';

  return (
    <svg width="72" height="72" className="rotate-[-90deg]">
      <circle cx="36" cy="36" r={radius} stroke="#1e293b" strokeWidth="6" fill="none" />
      <circle
        cx="36"
        cy="36"
        r={radius}
        stroke={color}
        strokeWidth="6"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  );
}

export function StreetHealthPage() {
  const [streets, setStreets] = useState<IStreet[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'health' | 'flood' | 'issues'>('health');

  useEffect(() => {
    async function load() {
      const data = await api.getStreets();
      setStreets(data);
    }
    load();
  }, []);

  const filtered = streets
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'health') return b.healthScore - a.healthScore;
      if (sortBy === 'flood') return b.floodRiskPercent - a.floodRiskPercent;
      if (sortBy === 'issues') return b.activeIssuesCount - a.activeIssuesCount;
      return 0;
    });

  const avgHealth = streets.length
    ? Math.round(streets.reduce((s, st) => s + st.healthScore, 0) / streets.length)
    : 0;
  const criticalStreets = streets.filter((s) => s.healthScore < 65).length;
  const highFloodRisk = streets.filter((s) => s.floodRiskPercent > 60).length;

  return (
    <div className="flex h-screen w-screen bg-[#060a12] text-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <Header />

        <main className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-400 text-xs font-semibold mb-1">
                <Activity className="w-3.5 h-3.5" /> Street Intelligence Engine
              </div>
              <h1 className="text-2xl font-extrabold text-slate-100">Street Health Index</h1>
              <p className="text-xs text-slate-400">
                Holistic urban condition scores combining road paving, drainage, lighting, sanitation &amp; traffic flow.
              </p>
            </div>
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search street name..."
                className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>

          {/* KPI Summary Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-2xl space-y-2 border border-slate-800 hover:border-cyan-500/40 transition">
              <p className="text-xs text-slate-400">Streets Monitored</p>
              <p className="text-2xl font-extrabold font-mono text-cyan-400">{streets.length}</p>
              <p className="text-[11px] text-slate-500">Active network zones</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl space-y-2 border border-slate-800 hover:border-green-500/40 transition">
              <p className="text-xs text-slate-400">City Avg. Health</p>
              <p className={`text-2xl font-extrabold font-mono ${avgHealth >= 80 ? 'text-green-400' : avgHealth >= 65 ? 'text-amber-400' : 'text-red-400'}`}>
                {avgHealth}/100
              </p>
              <p className="text-[11px] text-slate-500">Composite score</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl space-y-2 border border-slate-800 hover:border-red-500/40 transition">
              <p className="text-xs text-slate-400">Critical Streets</p>
              <p className="text-2xl font-extrabold font-mono text-red-400">{criticalStreets}</p>
              <p className="text-[11px] text-red-400/80">Score below 65 — urgent</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl space-y-2 border border-slate-800 hover:border-amber-500/40 transition">
              <p className="text-xs text-slate-400">High Flood Risk</p>
              <p className="text-2xl font-extrabold font-mono text-amber-400">{highFloodRisk}</p>
              <p className="text-[11px] text-slate-500">Flood risk &gt; 60%</p>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-semibold">Sort by:</span>
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              {(['health', 'flood', 'issues'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setSortBy(opt)}
                  className={`px-3 py-1.5 rounded-lg transition font-medium ${
                    sortBy === opt ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {opt === 'health' ? '🏥 Health Score' : opt === 'flood' ? '🌊 Flood Risk' : '⚠️ Active Issues'}
                </button>
              ))}
            </div>
          </div>

          {/* Streets Grid */}
          <div className="grid md:grid-cols-2 xl:grid-cols-2 gap-5">
            {filtered.map((st) => {
              let statusBadge = {
                label: '🟢 Healthy',
                color: 'text-green-400 bg-green-950 border-green-800',
              };
              if (st.healthScore < 65) {
                statusBadge = { label: '🔴 Critical', color: 'text-red-400 bg-red-950 border-red-800' };
              } else if (st.healthScore < 80) {
                statusBadge = { label: '🟡 Needs Attention', color: 'text-amber-400 bg-amber-950 border-amber-800' };
              }

              const floodColor =
                st.floodRiskPercent >= 70
                  ? 'text-red-400 bg-red-950 border-red-800'
                  : st.floodRiskPercent >= 40
                  ? 'text-amber-400 bg-amber-950 border-amber-800'
                  : 'text-green-400 bg-green-950 border-green-800';

              return (
                <div
                  key={st.name}
                  className="glass-panel p-5 rounded-2xl space-y-4 hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-300"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                        <h3 className="font-extrabold text-sm text-slate-100 leading-snug">{st.name}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${floodColor}`}>
                          <Droplets className="inline w-2.5 h-2.5 mr-0.5" />
                          Flood {st.floodRiskPercent}%
                        </span>
                        {st.activeIssuesCount > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border text-red-400 bg-red-950 border-red-800">
                            <AlertTriangle className="inline w-2.5 h-2.5 mr-0.5" />
                            {st.activeIssuesCount} Active Issues
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Health Ring */}
                    <div className="relative flex-shrink-0">
                      <HealthRing score={st.healthScore} />
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-base font-extrabold font-mono text-slate-100">{st.healthScore}</span>
                        <span className="text-[9px] text-slate-500 font-mono">/100</span>
                      </div>
                    </div>
                  </div>

                  {/* Sub-Score Breakdown with Progress Bars */}
                  <div className="space-y-2.5 pt-3 border-t border-slate-800/80">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                          <Activity className="w-3 h-3 text-blue-400" /> Road Paving
                        </span>
                        <span className="font-mono font-bold text-slate-100">{st.roadCondition}%</span>
                      </div>
                      <HealthBar value={st.roadCondition} color="blue" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                          <Waves className="w-3 h-3 text-cyan-400" /> Drainage System
                        </span>
                        <span className="font-mono font-bold text-slate-100">{st.drainageScore}%</span>
                      </div>
                      <HealthBar value={st.drainageScore} color="cyan" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                          <Lightbulb className="w-3 h-3 text-amber-400" /> Street Lighting
                        </span>
                        <span className="font-mono font-bold text-slate-100">{st.lightingScore}%</span>
                      </div>
                      <HealthBar value={st.lightingScore} color="amber" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                          <Trash2 className="w-3 h-3 text-green-400" /> Waste Sanitation
                        </span>
                        <span className="font-mono font-bold text-slate-100">{st.wasteScore}%</span>
                      </div>
                      <HealthBar value={st.wasteScore} color="green" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                          <Car className="w-3 h-3 text-purple-400" /> Traffic Flow
                        </span>
                        <span className="font-mono font-bold text-slate-100">{st.trafficScore}%</span>
                      </div>
                      <HealthBar value={st.trafficScore} color="purple" />
                    </div>
                  </div>

                  <Link
                    to="/dashboard"
                    className="w-full mt-2 py-2.5 bg-slate-900 hover:bg-cyan-500 hover:text-black text-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 border border-slate-800 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Inspect on Digital Twin</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-slate-500">
              <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-semibold">No streets match your search.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
