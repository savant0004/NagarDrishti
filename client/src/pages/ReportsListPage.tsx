import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { ICitizenReport } from '../types';
import { Link } from 'react-router-dom';
import { FileText, Search, Clock, ExternalLink, Plus, Filter, UploadCloud, Link2 } from 'lucide-react';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Submitted: 'bg-blue-950 text-blue-400 border-blue-800',
    'Under Review': 'bg-indigo-950 text-indigo-400 border-indigo-800',
    Assigned: 'bg-amber-950 text-amber-400 border-amber-800',
    'In Progress': 'bg-cyan-950 text-cyan-400 border-cyan-800',
    Resolved: 'bg-green-950 text-green-400 border-green-800',
  };
  const cls = map[status] || 'bg-slate-900 text-slate-300 border-slate-700';
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
      {status}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    Critical: 'bg-red-950 text-red-400 border-red-800',
    High: 'bg-amber-950 text-amber-400 border-amber-800',
    Medium: 'bg-yellow-950 text-yellow-400 border-yellow-800',
    Low: 'bg-green-950 text-green-400 border-green-800',
  };
  const cls = map[severity] || 'bg-slate-900 text-slate-400 border-slate-700';
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
      {severity}
    </span>
  );
}

export function ReportsListPage() {
  const [reports, setReports] = useState<ICitizenReport[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadingReportId, setUploadingReportId] = useState('');
  const [linkingReportId, setLinkingReportId] = useState('');

  useEffect(() => {
    async function load() {
      try { const data = await api.getReports(); setReports(data); }
      catch (error) { setErrorMsg(error instanceof Error ? error.message : 'Unable to load reports.'); }
    }
    load();
    const socket = getSocket();
    const upsert = (report: ICitizenReport) => setReports((previous) => [report, ...previous.filter((item) => item.reportId !== report.reportId)]);
    socket.on('report:created', upsert);
    socket.on('report:updated', upsert);
    return () => { socket.off('report:created', upsert); socket.off('report:updated', upsert); };
  }, []);

  const filtered = reports.filter((r) => {
    const matchSearch =
      r.reportId.toLowerCase().includes(search.toLowerCase()) ||
      r.issueType.toLowerCase().includes(search.toLowerCase()) ||
      r.streetName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statuses = ['ALL', 'Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved'];
  const uploadEvidence = async (reportId: string, file?: File) => {
    if (!file) return;
    setUploadingReportId(reportId); setErrorMsg('');
    try { const updated = await api.uploadResolutionEvidence(reportId, file); setReports((items) => items.map((item) => item.reportId === reportId ? updated : item)); }
    catch (error) { setErrorMsg(error instanceof Error ? error.message : 'Evidence upload failed.'); }
    finally { setUploadingReportId(''); }
  };
  const linkDuplicate = async (sourceReportId: string, targetReportId: string) => {
    const confirmed = window.confirm(`Confirm that ${sourceReportId} and ${targetReportId} are duplicate complaints? Both citizen reports will remain available; staff will manage them under one issue.`);
    if (!confirmed) return;
    setLinkingReportId(sourceReportId); setErrorMsg('');
    try {
      await api.linkDuplicateReports(sourceReportId, targetReportId);
      setReports(await api.getReports());
    } catch (error) { setErrorMsg(error instanceof Error ? error.message : 'Duplicate complaints could not be linked.'); }
    finally { setLinkingReportId(''); }
  };

  return (
    <div className="flex h-screen w-screen bg-[#060a12] text-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <Header />

        <main className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {errorMsg && <div role="alert" className="p-4 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs">{errorMsg}</div>}
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-400 text-xs font-semibold mb-1">
                <FileText className="w-3.5 h-3.5" /> Citizen Intelligence Feed
              </div>
              <h1 className="text-2xl font-extrabold text-slate-100">Citizen Reports Registry</h1>
              <p className="text-xs text-slate-400">
                Review all incoming public reports across streets. Click &quot;Track&quot; to follow any report through resolution stages.
              </p>
            </div>
            <Link
              to="/report"
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl transition shadow-lg shadow-cyan-500/20 flex-shrink-0"
            >
              <Plus className="w-4 h-4" /> Submit New Report
            </Link>
          </div>

          {/* KPI Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved'] as const).map((s) => {
              const count = reports.filter((r) => r.status === s).length;
              const colors: Record<string, string> = {
                Submitted: 'text-blue-400',
                'Under Review': 'text-indigo-400',
                Assigned: 'text-amber-400',
                'In Progress': 'text-cyan-400',
                Resolved: 'text-green-400',
              };
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(filterStatus === s ? 'ALL' : s)}
                  className={`glass-panel p-3 rounded-2xl text-left transition hover:border-cyan-500/40 ${filterStatus === s ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/10' : ''}`}
                >
                  <p className={`text-lg font-extrabold font-mono ${colors[s]}`}>{count}</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-tight">{s}</p>
                </button>
              );
            })}
          </div>

          {/* Search & Filter Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search report ID, category, street..."
                className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition border ${
                    filterStatus === s
                      ? 'bg-cyan-500 text-black border-cyan-400'
                      : 'text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-4">Report ID</th>
                  <th className="p-4">Category</th>
                  <th className="p-4 hidden sm:table-cell">Street / Area</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 hidden md:table-cell">Submitted</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filtered.slice(0, 30).map((r) => (
                  <tr key={r.reportId} className="hover:bg-slate-900/50 transition group">
                    <td className="p-4 font-mono font-bold text-cyan-400 text-[11px]">{r.reportId}{r.isDemo && <span className="ml-2 text-[9px] text-amber-400">SAMPLE</span>}</td>
                    <td className="p-4 font-semibold text-slate-100">{r.issueType}</td>
                    <td className="p-4 text-slate-400 hidden sm:table-cell">{r.streetName}</td>
                    <td className="p-4">
                      <SeverityBadge severity={r.severity} />
                    </td>
                    <td className="p-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="p-4 text-slate-500 hidden md:table-cell">
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        to={`/tracker?id=${r.reportId}`}
                        className="inline-flex items-center gap-1 font-bold text-cyan-400 hover:text-cyan-300 px-2.5 py-1 rounded-lg border border-transparent hover:border-cyan-800 hover:bg-cyan-950 transition"
                      >
                        Track <ExternalLink className="w-3 h-3" />
                      </Link>
                      <label className={`ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-700 text-[10px] text-slate-300 cursor-pointer hover:border-cyan-700 ${uploadingReportId === r.reportId ? 'opacity-50 pointer-events-none' : ''}`} title="Upload municipal resolution evidence"><UploadCloud className="w-3 h-3" />{uploadingReportId === r.reportId ? 'Uploading' : 'Evidence'}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={!!uploadingReportId} onChange={(event) => { void uploadEvidence(r.reportId, event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>
                      {r.possibleDuplicateReportIds?.filter((candidateId) => candidateId !== r.reportId && !r.duplicateLinkedReportIds?.includes(candidateId)).map((candidateId) => <button key={candidateId} type="button" disabled={!!linkingReportId} onClick={() => void linkDuplicate(r.reportId, candidateId)} className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-amber-800 text-[10px] text-amber-200 hover:bg-amber-950 disabled:opacity-50"><Link2 className="w-3 h-3" />{linkingReportId === r.reportId ? 'Linking' : 'Review link'}</button>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="py-16 text-center text-slate-500">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">No reports match your search.</p>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-slate-500 font-mono">
            {filtered.length} report{filtered.length !== 1 ? 's' : ''} shown · NagarDrishti Citizen Intelligence Registry
          </p>
        </main>
      </div>
    </div>
  );
}
