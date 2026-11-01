import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Radio, Sparkles, Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, INotification } from '../services/api';
import { getSocket } from '../services/socket';
import { useBackendHealth } from '../contexts/BackendHealthContext';

interface HeaderProps { onSearch?: (query: string) => void; onReseed?: () => void; }

export function Header({ onSearch, onReseed }: HeaderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timeStr, setTimeStr] = useState('');
  const [searchVal, setSearchVal] = useState('');
  const { readiness, loading: healthLoading, error: healthError } = useBackendHealth();
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const updateTime = () => setTimeStr(new Date().toLocaleTimeString('en-US', { hour12: false }) + ' IST');
    updateTime();
    const clock = setInterval(updateTime, 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (!user) { setNotifications([]); setUnreadCount(0); return; }
    let mounted = true;
    api.getNotifications().then((result) => { if (mounted) { setNotifications(result.data); setUnreadCount(result.unreadCount); } }).catch(() => undefined);
    const socket = getSocket();
    const receive = (notification: INotification) => {
      setNotifications((old) => [notification, ...old.filter((item) => item.id !== notification.id)].slice(0, 100));
      setUnreadCount((count) => count + 1);
    };
    socket.on('notification:new', receive);
    return () => { mounted = false; socket.off('notification:new', receive); };
  }, [user?.id]);

  const markAllRead = async () => {
    try { await api.markAllNotificationsRead(); setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() }))); setUnreadCount(0); }
    catch { /* Keep the unread count until the backend confirms the change. */ }
  };

  const readinessLabel = healthLoading ? 'CHECKING DATABASE'
    : healthError || !readiness || readiness.database.status === 'unavailable' ? 'DATABASE UNAVAILABLE'
      : readiness.applicationMode === 'demo' ? 'DEMO MODE'
        : readiness.database.status === 'connected' ? 'DATABASE CONNECTED' : 'CONNECTING';
  const readinessClass = healthLoading || readiness?.applicationMode === 'demo' || readiness?.database.status === 'connecting' ? 'text-amber-300 bg-amber-950/50 border-amber-800'
    : readiness?.database.status === 'connected' ? 'text-emerald-400 bg-emerald-950/50 border-emerald-800'
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
        {user && <div className="relative">
          <button type="button" onClick={() => setShowNotifications((open) => !open)} aria-label={`Notifications, ${unreadCount} unread`} className="relative p-2 rounded-lg text-slate-300 hover:bg-slate-800"><Bell className="w-4 h-4" />{unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-cyan-400 text-black text-[9px] font-bold flex items-center justify-center">{unreadCount > 99 ? '99+' : unreadCount}</span>}</button>
          {showNotifications && <div className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto rounded-xl border border-slate-700 bg-[#0b1326] shadow-2xl">
            <div className="p-3 flex items-center justify-between border-b border-slate-800"><span className="text-xs font-bold text-slate-100">Notifications</span><button type="button" onClick={() => void markAllRead()} className="text-[10px] text-cyan-300 flex items-center gap-1"><CheckCheck className="w-3.5 h-3.5" />Mark all read</button></div>
            {notifications.length === 0 ? <p className="p-4 text-xs text-slate-400">No notifications yet.</p> : notifications.map((item) => <button key={item.id} type="button" onClick={async () => { if (!item.readAt) { try { await api.markNotificationRead(item.id); setNotifications((old) => old.map((value) => value.id === item.id ? { ...value, readAt: new Date().toISOString() } : value)); setUnreadCount((count) => Math.max(0, count - 1)); } catch { return; } } setShowNotifications(false); if (item.reportId) navigate(`/tracker?id=${encodeURIComponent(item.reportId)}`); }} className={`block w-full text-left p-3 border-b border-slate-800/80 hover:bg-slate-900 ${item.readAt ? '' : 'bg-cyan-950/20'}`}><span className="block text-xs font-semibold text-slate-100">{item.title}</span><span className="block mt-1 text-[11px] leading-relaxed text-slate-300">{item.message}</span><span className="block mt-1 text-[9px] text-slate-500">{new Date(item.createdAt).toLocaleString()}</span></button>)}
          </div>}
        </div>}
        {user && <div className="pl-2 border-l border-slate-800 hidden sm:block text-right"><div className="text-xs font-semibold text-slate-200">{user.name}</div><div className="text-[10px] text-slate-400">{user.role.replace('_', ' ')}</div></div>}
      </div>
    </header>
  );
}
