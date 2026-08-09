import React, { useState, useEffect } from 'react';
import { Search, Bell, Shield, User, RefreshCw, Radio, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onSearch?: (query: string) => void;
  onReseed?: () => void;
}

export function Header({ onSearch, onReseed }: HeaderProps) {
  const [timeStr, setTimeStr] = useState('');
  const [searchVal, setSearchVal] = useState('');
  const [userRole, setUserRole] = useState<'Authority' | 'Citizen'>('Authority');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false }) + ' IST');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-slate-800 bg-[#070d1a]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left Search Bar */}
      <div className="flex items-center gap-4 w-1/3">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search street, issue ID (e.g. ISSUE-001), or neighborhood..."
            value={searchVal}
            onChange={(e) => {
              setSearchVal(e.target.value);
              onSearch?.(e.target.value);
            }}
            className="w-full bg-slate-900/80 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-cyan-500 transition placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Middle System Live Status */}
      <div className="hidden md:flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-800/80 text-cyan-400 text-xs font-semibold">
          <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
          <span>LIVE SYSTEM CONNECTED</span>
        </div>
        <span className="text-xs font-mono text-slate-400 px-2.5 py-1 bg-slate-900 rounded-md border border-slate-800">
          {timeStr}
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {onReseed && (
          <button
            onClick={onReseed}
            title="Reseed Demo Data"
            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset Demo</span>
          </button>
        )}

        {/* Quick Report Button */}
        <Link
          to="/report"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl transition shadow-lg shadow-cyan-500/20"
        >
          <Sparkles className="w-3.5 h-3.5 fill-black" /> Report Problem
        </Link>

        {/* User Role Switcher */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setUserRole('Authority')}
            className={`px-2.5 py-1 rounded-lg transition font-medium ${
              userRole === 'Authority' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Authority
          </button>
          <button
            onClick={() => setUserRole('Citizen')}
            className={`px-2.5 py-1 rounded-lg transition font-medium ${
              userRole === 'Citizen' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Citizen
          </button>
        </div>

        {/* Profile Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-black font-bold text-xs shadow-md">
            ND
          </div>
        </div>
      </div>
    </header>
  );
}
