import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={user.role === 'citizen' ? '/report' : '/dashboard'} replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (isRegistering) await register(name, email, password);
      else await login(email, password);
      const requested = params.get('returnTo');
      const safeTarget = requested?.startsWith('/') && !requested.startsWith('//') ? requested : undefined;
      navigate(safeTarget || (isRegistering ? '/report' : '/dashboard'), { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Authentication failed.');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md glass-panel-glow border border-cyan-500/30 rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 flex items-center justify-center"><ShieldCheck /></div>
          <h1 className="text-2xl font-extrabold">{isRegistering ? 'Create citizen account' : 'Sign in to NagarDrishti'}</h1>
          <p className="text-xs text-slate-400">Citizens can register. Municipal staff and administrators sign in with provisioned accounts.</p>
        </div>
        {error && <div role="alert" className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          {isRegistering && <label className="block text-xs text-slate-300">Name<input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm" /></label>}
          <label className="block text-xs text-slate-300">Email<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm" /></label>
          <label className="block text-xs text-slate-300">Password<input required type="password" autoComplete={isRegistering ? 'new-password' : 'current-password'} minLength={isRegistering ? 12 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm" />{isRegistering && <span className="text-[10px] text-slate-500">Use at least 12 characters.</span>}</label>
          <button disabled={busy} className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 rounded-xl text-black font-bold text-sm">{busy ? 'Please wait…' : isRegistering ? 'Create account' : 'Sign in'}</button>
        </form>
        <button type="button" onClick={() => { setIsRegistering((value) => !value); setError(''); }} className="w-full text-xs text-cyan-300 hover:text-cyan-200">{isRegistering ? 'Already registered? Sign in' : 'New citizen? Create an account'}</button>
        <Link to="/" className="block text-center text-xs text-slate-500 hover:text-slate-300">Back to NagarDrishti</Link>
      </div>
    </div>
  );
}
