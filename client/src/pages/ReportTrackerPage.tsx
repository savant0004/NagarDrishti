import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { ICitizenReport } from '../types';
import { Search, CheckCircle2, Clock, ShieldCheck, Sparkles, MapPin, AlertCircle } from 'lucide-react';

export function ReportTrackerPage() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get('id') || 'ST-2026-00482';

  const [inputReportId, setInputReportId] = useState(initialId);
  const [report, setReport] = useState<ICitizenReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchReport = async (id: string) => {
    setIsLoading(true);
    setErrorMsg('');
    const res = await api.getReportById(id);
    if (res) {
      setReport(res);
    } else {
      setErrorMsg(`Report ID "${id}" not found.`);
      setReport(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (initialId) {
      fetchReport(initialId);
    }
  }, [initialId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputReportId.trim()) {
      fetchReport(inputReportId.trim());
    }
  };

  const steps = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved'];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'Submitted':
        return 0;
      case 'Under Review':
        return 1;
      case 'Assigned':
        return 2;
      case 'In Progress':
        return 3;
      case 'Resolved':
        return 4;
      default:
        return 0;
    }
  };

  const currentStepIdx = report ? getStepIndex(report.status) : 0;

  return (
    <div className="flex h-screen w-screen bg-[#060a12] text-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <Header />

        <main className="max-w-4xl mx-auto w-full p-6 lg:p-10 space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">Citizen Report Tracking</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Track the real-time status of your urban report across municipal inspection and repair stages.
            </p>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={inputReportId}
                onChange={(e) => setInputReportId(e.target.value)}
                placeholder="Enter Report ID (e.g. ST-2026-00482)..."
                className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:border-cyan-500 font-mono font-bold"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl transition shadow-lg shadow-cyan-500/20"
            >
              Track Status
            </button>
          </form>

          {errorMsg && (
            <div className="p-4 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {report && (
            <div className="space-y-6">
              {/* Report Header Box */}
              <div className="glass-panel p-6 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono text-cyan-400 bg-cyan-950 px-2.5 py-1 rounded border border-cyan-800 font-bold">
                    {report.reportId}
                  </span>
                  <h2 className="text-lg font-bold text-slate-100 mt-2">{report.issueType}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{report.streetName}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block mb-1">Current Status:</span>
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-cyan-500 text-black shadow-md">
                    {report.status}
                  </span>
                </div>
              </div>

              {/* Visual Step Tracker Progress Bar */}
              <div className="glass-panel-glow p-6 rounded-2xl space-y-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">Resolution Progress Timeline</h3>
                <div className="relative flex items-center justify-between">
                  {/* Background Progress Bar Line */}
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -translate-y-1/2 z-0" />
                  <div
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 -translate-y-1/2 z-0 transition-all duration-500"
                    style={{ width: `${(currentStepIdx / (steps.length - 1)) * 100}%` }}
                  />

                  {steps.map((st, idx) => {
                    const isDone = idx <= currentStepIdx;
                    const isCurrent = idx === currentStepIdx;
                    return (
                      <div key={st} className="relative z-10 flex flex-col items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            isDone
                              ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/30'
                              : 'bg-slate-900 border border-slate-800 text-slate-500'
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                        </div>
                        <span
                          className={`text-[11px] font-semibold ${
                            isCurrent ? 'text-cyan-400 font-bold' : isDone ? 'text-slate-200' : 'text-slate-500'
                          }`}
                        >
                          {st}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Details Box */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-2xl space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Report Summary</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{report.description}</p>
                  <div className="pt-2 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Submitted on: {new Date(report.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {report.aiAnalysis && (
                  <div className="glass-panel p-6 rounded-2xl space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> AI Computer Vision Verdict
                    </h3>
                    <div className="text-xs space-y-1">
                      <p className="text-slate-300">
                        Detected: <strong className="text-slate-100">{report.aiAnalysis.detectedIssue}</strong>
                      </p>
                      <p className="text-slate-300">
                        Confidence: <strong className="text-cyan-400 font-mono">{report.aiAnalysis.confidence}%</strong>
                      </p>
                      <p className="text-slate-300">
                        Suggested Severity: <strong className="text-amber-400">{report.aiAnalysis.suggestedSeverity}</strong>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
