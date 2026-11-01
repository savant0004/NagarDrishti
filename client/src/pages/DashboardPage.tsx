import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { DigitalTwin2DMap } from '../components/DigitalTwin2DMap';
import { HeroCity3DScene } from '../components/HeroCity3D';
import { IssueDetailModal } from '../components/IssueDetailModal';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { IIssue, IStreet, ICitizenReport, IssueStatus } from '../types';
import {
  Layers,
  Box,
  Filter,
  ShieldAlert,
  AlertTriangle,
  Activity,
  CheckCircle2,
  ListFilter,
  RefreshCw,
  Search,
  Compass,
  Gauge,
  Truck,
  Zap,
  Users,
  Send,
  Sparkles,
} from 'lucide-react';

export function DashboardPage() {
  const [issues, setIssues] = useState<IIssue[]>([]);
  const [streets, setStreets] = useState<IStreet[]>([]);
  const [reports, setReports] = useState<ICitizenReport[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<IIssue | null>(null);
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [iss, str] = await Promise.all([api.getIssues(), api.getStreets()]);
      setIssues(iss); setStreets(str); setReports([]);
    } catch (error) { setErrorMsg(error instanceof Error ? error.message : 'Unable to load dashboard data.'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchData();

    // Listen to real-time events via Socket.IO
    const socket = getSocket();
    const onIssueCreated = (newIssue: IIssue) => {
      setIssues((prev) => [newIssue, ...prev.filter((i) => i.id !== newIssue.id)]);
    };

    const onIssueUpdated = (updated: IIssue) => {
      setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setSelectedIssue((previous) => previous?.id === updated.id ? updated : previous);
    };

    const onIssueDeleted = ({ id }: { id: string }) => {
      setIssues((prev) => prev.filter((issue) => issue.id !== id));
      setSelectedIssue((previous) => previous?.id === id ? null : previous);
    };
    const onReseeded = () => { void fetchData(); };
    const upsertReport = (report: ICitizenReport) => setReports((previous) => [report, ...previous.filter((item) => item.reportId !== report.reportId)]);
    socket.on('issue:created', onIssueCreated);
    socket.on('issue:updated', onIssueUpdated);
    socket.on('issue:deleted', onIssueDeleted);
    socket.on('data:reseeded', onReseeded);
    socket.on('report:created', upsertReport);
    socket.on('report:updated', upsertReport);

    return () => {
      socket.off('issue:created', onIssueCreated);
      socket.off('issue:updated', onIssueUpdated);
      socket.off('issue:deleted', onIssueDeleted);
      socket.off('data:reseeded', onReseeded);
      socket.off('report:created', upsertReport);
      socket.off('report:updated', upsertReport);
    };
  }, []);

  const handleUpdateStatus = async (id: string, status: IssueStatus, team?: string, workflow?: { assignedUserId?: string; resolutionNotes?: string }) => {
    try {
      const updated = await api.updateIssueStatus(id, status, team, workflow);
      if (updated) {
      setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setSelectedIssue(updated);
      }
    } catch (error) { setErrorMsg(error instanceof Error ? error.message : 'Issue status update failed.'); }
  };

  const handleReseed = async () => {
    await api.reseedData();
    await fetchData();
  };

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    if (filterSeverity !== 'ALL' && issue.severity !== filterSeverity) return false;
    if (filterCategory !== 'ALL' && issue.type !== filterCategory) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        issue.title.toLowerCase().includes(q) ||
        issue.id.toLowerCase().includes(q) ||
        issue.streetName.toLowerCase().includes(q) ||
        issue.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const criticalCount = issues.filter((i) => i.status !== 'RESOLVED' && i.riskLevel === 'CRITICAL').length;
  const highCount = issues.filter((i) => i.status !== 'RESOLVED' && i.riskLevel === 'HIGH').length;

  return (
    <div className="flex h-screen w-screen bg-[#060a12] text-slate-100 overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header onSearch={(q) => setSearchQuery(q)} onReseed={handleReseed} />
        {errorMsg && <div role="alert" className="mx-6 mt-3 p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-lg text-xs">{errorMsg}</div>}

        {/* Operations Overview Sub-Header */}
        <div className="h-11 bg-[#091122] border-b border-slate-800/80 px-6 flex items-center justify-between text-xs overflow-x-auto gap-4">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span>City Operations Status: <strong className="text-white">Active</strong></span>
            </span>
            <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
              <span>Active Issues: <strong className="text-cyan-400">{filteredIssues.length}</strong></span>
              {issues.some((issue) => issue.isDemo) && <span className="font-bold text-amber-400">DEMO SAMPLE RECORDS</span>}
              <span>Service fleet telemetry: <strong className="text-slate-400">Not connected</strong></span>
              <span>Dispatch SLA: <strong className="text-slate-400">Not tracked</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-bold uppercase tracking-wider">
              Easy Command Mode
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex relative overflow-hidden">
          {/* Central Map & Twin Viewport */}
          <div className="flex-1 flex flex-col h-full relative">
            {/* Viewport Control Bar */}
            <div className="h-12 border-b border-slate-800 bg-[#0b1326]/90 backdrop-blur-md px-6 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                {/* 2D / 3D Mode Toggle */}
                <div className="flex items-center bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-semibold">
                  <button
                    onClick={() => setViewMode('2D')}
                    className={`flex items-center gap-1.5 px-3.5 py-1 rounded-xl transition ${
                      viewMode === '2D' ? 'bg-cyan-500 text-black font-bold shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" /> 2D GIS Map
                  </button>
                  <button
                    onClick={() => setViewMode('3D')}
                    className={`flex items-center gap-1.5 px-3.5 py-1 rounded-xl transition ${
                      viewMode === '3D' ? 'bg-cyan-500 text-black font-bold shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" /> 3D Digital Twin View
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                  <span>Interactive Map Viewport</span>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Filter className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Severity Filter:</span>
                </div>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">All Severities</option>
                  <option value="Critical">🔴 Critical Hazards</option>
                  <option value="High">🟠 High Urgency</option>
                  <option value="Medium">🟡 Medium Urgency</option>
                  <option value="Low">🟢 Low Priority</option>
                </select>
              </div>
            </div>

            {/* Map / 3D Canvas Container */}
            <div className="flex-1 relative w-full h-full bg-[#060a12]">
              {viewMode === '2D' ? (
                <DigitalTwin2DMap
                  issues={filteredIssues}
                  streets={streets}
                  selectedIssue={selectedIssue}
                  onSelectIssue={(iss) => setSelectedIssue(iss)}
                  reports={reports}
                />
              ) : (
                <HeroCity3DScene
                  issues={filteredIssues}
                  selectedIssue={selectedIssue}
                  onSelectIssue={(iss) => setSelectedIssue(iss)}
                  showHUD={true}
                  reports={reports}
                />
              )}

              {/* 3D Compass Indicator */}
              <div className="absolute top-4 right-4 z-10 w-16 h-16 rounded-full bg-slate-950/90 border-2 border-slate-700 shadow-2xl flex flex-col items-center justify-center text-center pointer-events-none">
                <Compass className="w-6 h-6 text-cyan-400 animate-pulse" />
                <span className="text-[9px] font-mono font-extrabold text-white">NW</span>
              </div>

              {/* Plain-English Quick Status Banner (Top Left) */}
              <div className="absolute top-4 left-4 z-10 glass-panel-glow p-3.5 rounded-2xl max-w-sm text-xs space-y-1.5 pointer-events-auto border border-cyan-500/30 shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-400" /> Hazard Overview
                  </span>
                  <span className="text-[10px] font-bold text-red-400 bg-red-950 px-2 py-0.5 rounded-full border border-red-800">
                    {criticalCount} Critical Action Required
                  </span>
                </div>
                <p className="text-slate-300 leading-snug">
                  Click any pin on the map to inspect location, urgency score, and dispatch emergency repair crews in 1-click.
                </p>
              </div>

              {/* TODAY'S TOP PRIORITIES Card (Feature 9) */}
              <div className="absolute bottom-14 left-4 z-10 glass-panel-glow p-4 rounded-3xl w-80 text-xs space-y-3 pointer-events-auto border border-cyan-500/30 shadow-2xl hidden md:block">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400" /> TODAY'S TOP PRIORITIES
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">RANKED BY RISK</span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {issues
                    .slice()
                    .sort((a, b) => b.priorityScore - a.priorityScore)
                    .slice(0, 3)
                    .map((iss, idx) => (
                      <div
                        key={iss.id}
                        onClick={() => setSelectedIssue(iss)}
                        className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-extrabold text-cyan-400 text-xs">#{String(idx + 1).padStart(2, '0')}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              iss.riskLevel === 'CRITICAL'
                                ? 'bg-red-950 text-red-400 border border-red-800'
                                : 'bg-amber-950 text-amber-400 border border-amber-800'
                            }`}
                          >
                            Priority {iss.priorityScore}/100
                          </span>
                        </div>
                        <p className="font-bold text-slate-100 text-xs leading-snug line-clamp-1">{iss.title}</p>
                        <p className="text-[10px] text-slate-400">{iss.streetName} • Impact: {typeof iss.estimatedPopulationImpact !== 'number' ? 'not estimated' : `${iss.estimatedPopulationImpact.toLocaleString()} people`}</p>
                        <p className="text-[10px] text-cyan-300 font-semibold italic line-clamp-1">"{iss.recommendedAction}"</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Bottom Live Incident Ticker */}
            <div className="h-10 border-t border-slate-800 bg-[#070d1a] px-6 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-4 overflow-hidden">
                <span className="font-bold font-mono text-cyan-400 uppercase tracking-widest text-[10px] flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" /> INCIDENTS TICKER:
                </span>
                <div className="flex items-center gap-6 animate-marquee whitespace-nowrap text-xs text-slate-300">
                  {issues.slice(0, 4).map((iss) => (
                    <button
                      key={iss.id}
                      onClick={() => setSelectedIssue(iss)}
                      className="hover:text-cyan-400 transition flex items-center gap-2"
                    >
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                        {iss.id}
                      </span>
                      <span>{iss.title}</span>
                      <span className="text-cyan-400 font-mono font-bold">({iss.priorityScore}/100)</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="hidden lg:flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1 text-red-400">
                  <ShieldAlert className="w-3.5 h-3.5" /> {criticalCount} Critical
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" /> {highCount} High
                </span>
              </div>
            </div>
          </div>

          {/* Right Issue Detail Drawer */}
          {selectedIssue && (
            <IssueDetailModal
              issue={selectedIssue}
              onClose={() => setSelectedIssue(null)}
              onUpdateStatus={handleUpdateStatus}
            />
          )}
        </div>
      </div>
    </div>
  );
}
