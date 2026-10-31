import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Search, RefreshCw, Radio, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, IServiceReadiness } from '../services/api';

interface HeaderProps { onSearch?: (query: string) => void; onReseed?: () => void; }

export function Header({ onSearch, onReseed }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [timeStr, setTimeStr] = useState('');
  const [searchVal, setSearchVal] = useState('');
  const [readiness, setReadiness] = useState<IServiceReadiness | null>(null);

  useEffect(() => {
    const updateTime = () => setTimeStr(new Date().toLocaleTimeString('en-US', { hour12: false }) + ' IST');
    updateTime();
    const clock = setInterval(updateTime, 1000);
    const fetchReadiness = () => api.getReadiness().then(setReadiness).catch(() => setReadiness(null));
    fetchReadiness();
    const health = setInterval(fetchReadiness, 15000);
    return () => { clearInterval(clock); clearInterval(health); };
  }, []);

  const readinessLabel = !readiness ? 'BACKEND UNREACHABLE'
    : readiness.status === 'healthy' ? 'LIVE SYSTEM READY'
      : readiness.status === 'degraded' ? 'DEMO MODE'
        : readiness.status === 'connecting' ? 'DATABASE CONNECTING' : 'DATABASE UNAVAILABLE';
  const readinessClass = readiness?.status === 'healthy' ? 'text-emerald-400 bg-emerald-950/50 border-emerald-800'
    : readiness?.status === 'degraded' ? 'text-amber-300 bg-amber-950/50 border-amber-800'
      : 'text-red-300 bg-red-950/50 border-red-800';

  return (
    <header className="h-16 border-b border-slate-800 bg-[#070d1a]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4 w-1/3">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Search street, issue ID, or neighborhood..." value={searchVal} onChange={(event) => { setSearchVal(event.target.value); onSearch?.(event.target.value); }} className="w-full bg-slate-900/80 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-cyan-500 transition placeholder:text-slate-500" />
        </div>
      </div>
      <div className="hidden md:flex items-center gap-3">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${readinessClass}`}>
          <Radio className="w-3.5 h-3.5 animate-pulse" /><span>{readinessLabel}</span>
        </div>
        <span className="text-xs font-mono text-slate-400 px-2.5 py-1 bg-slate-900 rounded-md border border-slate-800">{timeStr}</span>
      </div>
      <div className="flex items-center gap-3">
        {onReseed && user?.role === 'admin' && <button onClick={onReseed} title="Reseed Demo Data" className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 text-xs"><RefreshCw className="w-4 h-4" /><span className="hidden sm:inline">Reset Demo</span></button>}
        <Link to="/report" className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl transition shadow-lg shadow-cyan-500/20"><Sparkles className="w-3.5 h-3.5 fill-black" /> Report Problem</Link>
        {user ? <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="hidden sm:block text-right"><div className="text-xs font-semibold text-slate-200">{user.name}</div><div className="text-[10px] text-slate-400">{user.role.replace('_', ' ')}</div></div>
          <button aria-label="Sign out" onClick={() => { logout(); navigate('/login'); }} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"><LogOut className="w-4 h-4" /></button>
        </div> : <Link to="/login" className="text-xs font-semibold text-cyan-300 hover:text-cyan-100">Sign in</Link>}
      </div>
    </header>
  );
}
