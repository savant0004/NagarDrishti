import React, { useCallback, useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { api } from '../services/api';
import { IAuthUser } from '../types';

type StaffItem = IAuthUser & { isActive: boolean };
export function StaffManagementPage() {
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { setStaff(await api.getStaffUsers()); setError(''); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load staff accounts.'); } }, []);
  useEffect(() => { void load(); }, [load]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await api.createStaff(name, email, password, 'municipal_staff', department); setName(''); setEmail(''); setPassword(''); setDepartment(''); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Staff account creation failed.'); }
    finally { setBusy(false); }
  };
  const toggle = async (item: StaffItem) => {
    setBusy(true); setError('');
    try { await api.updateStaffActive(item.id, !item.isActive); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Staff account update failed.'); }
    finally { setBusy(false); }
  };

  return <div className="flex h-screen w-screen overflow-hidden bg-[#060a12] text-slate-100"><Sidebar /><div className="flex-1 min-w-0 h-full overflow-y-auto"><Header /><main className="max-w-5xl mx-auto p-5 lg:p-8 space-y-6">
    <div><p className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold">Administration</p><h1 className="mt-1 text-2xl font-extrabold">Municipal Staff Management</h1><p className="mt-2 text-xs text-slate-400">Create department-scoped staff accounts and suspend or reactivate access.</p></div>
    {error && <div role="alert" className="rounded-xl border border-red-800 bg-red-950/50 p-3 text-xs text-red-200">{error}</div>}
    <form onSubmit={create} className="glass-panel rounded-2xl border border-slate-800 p-5 grid sm:grid-cols-2 gap-3">
      <h2 className="sm:col-span-2 text-sm font-bold text-slate-100">Create staff account</h2>
      <input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" className="rounded-lg bg-slate-950 border border-slate-800 p-3 text-xs text-slate-100" />
      <input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Work email" className="rounded-lg bg-slate-950 border border-slate-800 p-3 text-xs text-slate-100" />
      <input required type="password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Temporary password (12+ characters)" className="rounded-lg bg-slate-950 border border-slate-800 p-3 text-xs text-slate-100" />
      <input maxLength={100} value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Department (e.g. Roads, Drainage)" className="rounded-lg bg-slate-950 border border-slate-800 p-3 text-xs text-slate-100" />
      <button disabled={busy} className="sm:col-span-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-4 py-3 text-xs font-extrabold text-black disabled:opacity-50">{busy ? 'Working…' : 'Create municipal staff account'}</button>
    </form>
    <section className="glass-panel rounded-2xl border border-slate-800 overflow-hidden"><div className="p-4 border-b border-slate-800 flex items-center justify-between"><h2 className="text-sm font-bold">Staff accounts</h2><button type="button" onClick={() => void load()} className="text-xs text-cyan-300">Refresh</button></div><div className="divide-y divide-slate-800">{staff.length ? staff.map((item) => <div key={item.id} className="p-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold text-slate-100">{item.name} <span className="ml-2 text-[10px] text-slate-500">{item.role.replace('_', ' ')}</span></p><p className="mt-1 text-[11px] text-slate-400">{item.email} · {item.department || 'No department'}</p></div><div className="flex items-center gap-3"><span className={`text-[10px] font-bold ${item.isActive ? 'text-emerald-300' : 'text-slate-500'}`}>{item.isActive ? 'ACTIVE' : 'SUSPENDED'}</span>{item.role === 'municipal_staff' && <button disabled={busy} type="button" onClick={() => void toggle(item)} className="rounded-lg border border-slate-700 px-3 py-2 text-[10px] text-slate-200 disabled:opacity-50">{item.isActive ? 'Suspend' : 'Reactivate'}</button>}</div></div>) : <p className="p-5 text-xs text-slate-500">No staff accounts are available.</p>}</div></section>
  </main></div></div>;
}
