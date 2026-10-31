import React, { useState } from 'react';
import { IIssue, IssueStatus } from '../types';
import {
  X,
  AlertTriangle,
  Users,
  School,
  Hospital,
  Bus,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Play,
  RotateCcw,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface IssueDetailModalProps {
  issue: IIssue | null;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: IssueStatus, team?: string) => void;
}

export function IssueDetailModal({ issue, onClose, onUpdateStatus }: IssueDetailModalProps) {
  const [selectedTeam, setSelectedTeam] = useState(issue?.assignedTeam || 'Rapid Utility Response Squad');
  const [isUpdating, setIsUpdating] = useState(false);

  if (!issue) return null;

  const handleStatusChange = async (status: IssueStatus) => {
    setIsUpdating(true);
    await onUpdateStatus(issue.id || issue._id || '', status, selectedTeam);
    setIsUpdating(false);
  };

  const bd = issue.priorityBreakdown || {
    severity: 16,
    traffic: 17,
    population: 18,
    infrastructure: 15,
    reports: 10,
    duration: 5,
    weatherRisk: 2,
  };

  return (
    <div className="w-full lg:w-[460px] bg-[#0b1326]/95 border-l border-cyan-900/40 p-6 flex flex-col h-full overflow-y-auto backdrop-blur-xl z-30 shadow-2xl transition-all font-sans">
      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">
              {issue.id}
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded font-bold uppercase ${
                issue.riskLevel === 'CRITICAL'
                  ? 'bg-red-950 text-red-400 border border-red-800 animate-pulse'
                  : issue.riskLevel === 'HIGH'
                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                  : 'bg-yellow-950 text-yellow-400 border border-yellow-800'
              }`}
            >
              {issue.riskLevel} RISK
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-100 leading-snug">{issue.title}</h2>
          <p className="text-xs text-slate-400 mt-1">{issue.streetName}</p>
        </div>
        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="py-4 space-y-5 flex-1">
        {/* Status Badge */}
        <div className="glass-panel p-3.5 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-400">Current Status:</span>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              issue.status === 'RESOLVED'
                ? 'bg-green-950 text-green-400 border border-green-800'
                : issue.status === 'IN PROGRESS'
                ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                : 'bg-amber-950 text-amber-400 border border-amber-800'
            }`}
          >
            {issue.status}
          </span>
        </div>

        {/* Explainable Urban Risk Engine (Feature 6) */}
        <div className="glass-panel-glow p-4 rounded-2xl space-y-4 border border-cyan-500/30">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">Explainable Urban Risk Engine</h3>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold font-mono text-cyan-400">{issue.priorityScore}</span>
              <span className="text-xs text-slate-400">/100</span>
            </div>
          </div>

          {/* Transparent Scoring Breakdown */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Issue Severity</span>
              <span className="font-mono text-cyan-400">{bd.severity}/20</span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full" style={{ width: `${(bd.severity / 20) * 100}%` }}></div>
            </div>

            <div className="flex justify-between text-slate-300">
              <span>Traffic Impact</span>
              <span className="font-mono text-cyan-400">{bd.traffic}/20</span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full" style={{ width: `${(bd.traffic / 20) * 100}%` }}></div>
            </div>

            <div className="flex justify-between text-slate-300">
              <span>Population Impact</span>
              <span className="font-mono text-cyan-400">{bd.population}/20</span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full" style={{ width: `${(bd.population / 20) * 100}%` }}></div>
            </div>

            <div className="flex justify-between text-slate-300">
              <span>Infrastructure Proximity</span>
              <span className="font-mono text-cyan-400">{bd.infrastructure}/15</span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full" style={{ width: `${(bd.infrastructure / 15) * 100}%` }}></div>
            </div>

            <div className="flex justify-between text-slate-300">
              <span>Citizen Reports Density</span>
              <span className="font-mono text-cyan-400">{bd.reports}/10</span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full" style={{ width: `${(bd.reports / 10) * 100}%` }}></div>
            </div>
          </div>
        </div>

        {/* WHY THIS MATTERS & RECOMMENDED ACTION (Feature 10) */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
          <div>
            <div className="flex items-center gap-1.5 text-cyan-400 text-[11px] font-bold uppercase tracking-wider mb-1">
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>WHY THIS MATTERS</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">{issue.reason}</p>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-bold uppercase tracking-wider mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>RECOMMENDED ACTION</span>
            </div>
            <p className="text-xs font-bold text-amber-300">{issue.recommendedAction}</p>
          </div>

          {/* Issue Clustering Note (Feature 3) */}
          {issue.reportsCount > 1 && (
            <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-800/80 text-[11px] text-cyan-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>Multiple reports ({issue.reportsCount} citizen submissions) from nearby locations were grouped into this single infrastructure issue.</span>
            </div>
          )}
        </div>

        {/* Impact & Nearby Infrastructure */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-panel p-3.5 rounded-2xl flex items-center gap-3">
            <Users className="w-5 h-5 text-cyan-400" />
            <div>
              <p className="text-[11px] text-slate-400">Impacted Citizens</p>
              <p className="text-sm font-bold font-mono text-slate-100">{typeof issue.estimatedPopulationImpact !== 'number' ? 'Not estimated' : issue.estimatedPopulationImpact.toLocaleString()}</p>
            </div>
          </div>

          <div className="glass-panel p-3.5 rounded-2xl flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-[11px] text-slate-400">Citizen Reports</p>
              <p className="text-sm font-bold font-mono text-slate-100">{issue.reportsCount} verified</p>
            </div>
          </div>
        </div>

        {/* Nearby Facilities */}
        <div className="glass-panel p-3.5 rounded-2xl space-y-2">
          <p className="text-xs font-semibold text-slate-400">Nearby Critical Infrastructure</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-200">
              <School className="w-3.5 h-3.5 text-blue-400" /> {issue.nearbyInfrastructure?.schools || 1} School
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-200">
              <Hospital className="w-3.5 h-3.5 text-red-400" /> {issue.nearbyInfrastructure?.hospitals || 1} Hospital
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-200">
              <Bus className="w-3.5 h-3.5 text-amber-400" /> {issue.nearbyInfrastructure?.busStops || 2} Bus Stops
            </span>
          </div>
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div className="pt-4 border-t border-slate-800 space-y-2">
        <label className="text-xs text-slate-400 block mb-1">Assign Response Team:</label>
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
        >
          <option value="Rapid Utility Response Squad">Rapid Utility Response Squad</option>
          <option value="Road Maintenance Unit Alpha">Road Maintenance Unit Alpha</option>
          <option value="Water & Sewage Response Team Delta">Water & Sewage Response Team Delta</option>
          <option value="Municipal Sanitation Squad 4">Municipal Sanitation Squad 4</option>
        </select>

        <div className="grid grid-cols-3 gap-2 pt-2">
          <button
            onClick={() => handleStatusChange('ASSIGNED')}
            disabled={isUpdating}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition border border-slate-700"
          >
            <UserCheck className="w-3.5 h-3.5" /> Assign
          </button>
          <button
            onClick={() => handleStatusChange('IN PROGRESS')}
            disabled={isUpdating}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs rounded-xl transition"
          >
            <Play className="w-3.5 h-3.5 fill-black" /> Work
          </button>
          <button
            onClick={() => handleStatusChange('RESOLVED')}
            disabled={isUpdating}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-xl transition"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
          </button>
        </div>
      </div>
    </div>
  );
}
