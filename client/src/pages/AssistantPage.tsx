import React, { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Bot, LoaderCircle, MessageSquarePlus, Plus, RotateCcw, Send, Trash2, UserRound } from 'lucide-react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { api, IAssistantConversation, IAssistantMessage } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const suggestions = [
  'How do I report a pothole?',
  'How can I track my complaint?',
  'Which complaints need immediate attention?',
  'How does the 3D Digital Twin work?',
  'How do I use the flood simulator?',
  'How can I report waterlogging?',
];

type ConversationListItem = Pick<IAssistantConversation, 'id' | 'title' | 'createdAt' | 'updatedAt'>;

export function AssistantPage() {
  const { user, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [conversation, setConversation] = useState<IAssistantConversation | null>(null);
  const [publicMessages, setPublicMessages] = useState<IAssistantMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const refreshList = useCallback(async () => {
    const items = await api.getAssistantConversations();
    setConversations(items);
    return items;
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setConversations([]);
      setConversation(null);
      setLoadingHistory(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const items = await api.getAssistantConversations();
        if (!active) return;
        setConversations(items);
        if (items.length) {
          const latest = await api.getAssistantConversation(items[0].id);
          if (active) setConversation(latest);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load assistant conversations.');
      } finally { if (active) setLoadingHistory(false); }
    })();
    return () => { active = false; };
  }, [authLoading, user?.id]);

  const messages: IAssistantMessage[] = user ? conversation?.messages || [] : publicMessages;
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages.length, pendingMessage, loading]);

  const openConversation = async (id: string) => {
    if (loading) return;
    setLoadingHistory(true); setError(''); setPendingMessage(null);
    try { setConversation(await api.getAssistantConversation(id)); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load this conversation.'); }
    finally { setLoadingHistory(false); }
  };

  const startNewConversation = async () => {
    if (loading) return;
    if (!user) { setError(''); setPendingMessage(null); setPublicMessages([]); return; }
    setError(''); setPendingMessage(null); setLoadingHistory(true);
    try {
      const created = await api.createAssistantConversation();
      setConversation(created);
      await refreshList();
    } catch (createError) { setError(createError instanceof Error ? createError.message : 'Unable to start a conversation.'); }
    finally { setLoadingHistory(false); }
  };

  const sendMessage = async (text = draft) => {
    const content = text.trim();
    if (!content || loading || loadingHistory) return;
    if (content.length > 2000) { setError('Messages must be 2,000 characters or fewer.'); return; }
    setDraft(''); setError(''); setPendingMessage(content); setLoading(true);
    try {
      if (!user) {
        const result = await api.sendPublicAssistantMessage(content, publicMessages.map(({ role, content: message }) => ({ role, content: message })));
        setPublicMessages((old) => [...old, { role: 'user' as const, content, createdAt: new Date().toISOString() }, { role: 'assistant' as const, content: result.reply, createdAt: new Date().toISOString() }].slice(-40));
        setPendingMessage(null);
        return;
      }
      let activeConversation = conversation;
      if (!activeConversation) {
        activeConversation = await api.createAssistantConversation();
        setConversation(activeConversation);
      }
      const result = await api.sendAssistantMessage(activeConversation.id, content);
      setConversation(result.conversation);
      setPendingMessage(null);
      const updatedList = await api.getAssistantConversations();
      setConversations(updatedList);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'The assistant could not answer. Please retry.');
    } finally { setLoading(false); }
  };

  const retry = () => { if (pendingMessage) void sendMessage(pendingMessage); };

  const handleSubmit = (event: FormEvent) => { event.preventDefault(); void sendMessage(); };
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); }
  };

  const removeConversation = async () => {
    if (!user) { setPublicMessages([]); setError(''); setPendingMessage(null); return; }
    if (!conversation || loading || !window.confirm('Delete this conversation and its message history?')) return;
    setLoadingHistory(true); setError('');
    try {
      await api.deleteAssistantConversation(conversation.id);
      setConversation(null); setPendingMessage(null);
      const remaining = await refreshList();
      if (remaining.length) setConversation(await api.getAssistantConversation(remaining[0].id));
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this conversation.'); }
    finally { setLoadingHistory(false); }
  };

  return (
    <div className="flex h-screen w-screen bg-[#060a12] text-slate-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <Header />
        <main className="flex-1 min-h-0 p-4 lg:p-7 max-w-[1600px] w-full mx-auto">
          <div className="h-full min-h-0 grid grid-cols-1 md:grid-cols-[16rem_minmax(0,1fr)] gap-4">
            <aside className="glass-panel rounded-2xl border border-slate-800 flex flex-col min-h-0 max-h-48 md:max-h-none overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Workspace</p>
                  <h2 className="text-sm font-bold text-slate-100 mt-1">Conversations</h2>
                </div>
                {user && <button type="button" onClick={() => void startNewConversation()} disabled={loading || loadingHistory} aria-label="New conversation" title="New conversation" className="p-2 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400 disabled:opacity-50">
                  <MessageSquarePlus className="w-4 h-4" />
                </button>}
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
                {!user && <p className="px-3 py-4 text-xs text-slate-400">Public chat · conversation is temporary and is not saved.</p>}
                {user && conversations.length === 0 && <p className="px-3 py-4 text-xs text-slate-500">Your conversations will appear here.</p>}
                {user && conversations.map((item) => (
                  <button key={item.id} type="button" onClick={() => void openConversation(item.id)} disabled={loading} className={`w-full text-left p-3 rounded-xl transition ${conversation?.id === item.id ? 'bg-cyan-950/80 border border-cyan-900 text-cyan-200' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}>
                    <span className="block text-xs font-semibold truncate">{item.title || 'New conversation'}</span>
                    <span className="block mt-1 text-[10px] text-slate-500">{new Date(item.updatedAt).toLocaleString()}</span>
                  </button>
                ))}
              </div>
              <div className="hidden md:block p-3 border-t border-slate-800 text-[10px] text-slate-500 leading-relaxed">
                {user ? 'Read-only guidance. Complaint information follows your role permissions.' : 'Public, read-only guidance and aggregate demo statistics. Personal complaint details are restricted.'}
              </div>
            </aside>

            <section className="glass-panel rounded-2xl border border-slate-800 flex flex-col min-h-0 overflow-hidden">
              <div className="px-4 lg:px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-cyan-950 border border-cyan-900 flex items-center justify-center text-cyan-300"><Bot className="w-5 h-5" /></div>
                  <div className="min-w-0"><h1 className="text-sm lg:text-base font-extrabold text-slate-100 truncate">NagarDrishti AI Assistant</h1><p className="text-[10px] text-slate-500 mt-0.5">Groq-powered · English · Read-only</p></div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => void startNewConversation()} disabled={loading || loadingHistory} className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px] font-semibold text-slate-300 hover:bg-slate-900 disabled:opacity-50"><Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">New</span></button>
                  <button type="button" onClick={() => void removeConversation()} disabled={(user ? !conversation : !publicMessages.length) || loading || loadingHistory} aria-label={user ? 'Clear conversation' : 'Clear temporary chat'} title={user ? 'Clear conversation' : 'Clear temporary chat'} className="p-2 rounded-lg text-slate-500 hover:text-red-300 hover:bg-red-950/40 disabled:opacity-40"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {error && <div role="alert" className="mx-4 mt-4 p-3 rounded-xl border border-red-900 bg-red-950/50 text-xs text-red-200 flex items-start justify-between gap-3"><span>{error}</span>{pendingMessage && <button type="button" onClick={retry} disabled={loading} className="shrink-0 inline-flex items-center gap-1 text-red-100 font-bold hover:text-white disabled:opacity-50"><RotateCcw className="w-3.5 h-3.5" />Retry</button>}</div>}

              <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-7 space-y-5">
                {loadingHistory && <div className="h-full flex items-center justify-center text-cyan-300 text-xs gap-2"><LoaderCircle className="w-4 h-4 animate-spin" />Loading conversation…</div>}
                {!loadingHistory && messages.length === 0 && !pendingMessage && (
                  <div className="max-w-3xl mx-auto py-5 lg:py-10">
                    <div className="text-center mb-8">
                      <div className="mx-auto w-14 h-14 rounded-2xl bg-cyan-950 border border-cyan-900 text-cyan-300 flex items-center justify-center"><Bot className="w-7 h-7" /></div>
                      <h2 className="mt-4 text-xl font-extrabold text-slate-100">How can I help with your city today?</h2>
                      <p className="mt-2 text-xs text-slate-400">Ask about NagarDrishti, public complaint statistics, or how to track a report. Personal and staff-only details stay restricted.</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2.5">
                      {suggestions.map((question) => <button key={question} type="button" onClick={() => void sendMessage(question)} disabled={loading} className="text-left p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 hover:border-cyan-800 hover:bg-cyan-950/30 hover:text-cyan-100 transition disabled:opacity-50">{question}</button>)}
                    </div>
                  </div>
                )}
                {!loadingHistory && messages.map((message, index) => (
                  <article key={`${conversation?.id}-${index}`} className={`flex gap-3 max-w-4xl ${message.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${message.role === 'assistant' ? 'bg-cyan-950 text-cyan-300 border border-cyan-900' : 'bg-slate-800 text-slate-200'}`}>{message.role === 'assistant' ? <Bot className="w-4 h-4" /> : <UserRound className="w-4 h-4" />}</div>
                    <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs lg:text-sm leading-relaxed whitespace-pre-wrap ${message.role === 'assistant' ? 'bg-slate-950/70 border border-slate-800 text-slate-200 rounded-tl-md' : 'bg-cyan-950/70 border border-cyan-900/80 text-cyan-50 rounded-tr-md'}`}>{message.content}</div>
                  </article>
                ))}
                {!loadingHistory && pendingMessage && !loading && <article className="flex gap-3 max-w-4xl ml-auto flex-row-reverse"><div className="w-8 h-8 shrink-0 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center"><UserRound className="w-4 h-4" /></div><div className="max-w-[88%] rounded-2xl rounded-tr-md px-4 py-3 text-xs lg:text-sm leading-relaxed whitespace-pre-wrap bg-cyan-950/70 border border-cyan-900/80 text-cyan-50">{pendingMessage}</div></article>}
                {loading && <div className="flex items-center gap-2 text-xs text-slate-400"><div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-900 text-cyan-300 flex items-center justify-center"><Bot className="w-4 h-4" /></div><span className="flex items-center gap-1">Thinking<LoaderCircle className="w-3.5 h-3.5 animate-spin ml-1" /></span></div>}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={handleSubmit} className="p-3 lg:p-5 border-t border-slate-800 bg-slate-950/40">
                <div className="max-w-5xl mx-auto flex items-end gap-2 p-2 rounded-2xl bg-[#060a12] border border-slate-800 focus-within:border-cyan-800 transition">
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} maxLength={2000} rows={1} placeholder="Ask about NagarDrishti…" aria-label="Message the NagarDrishti AI Assistant" disabled={loading || loadingHistory} className="flex-1 resize-none max-h-32 min-h-10 px-3 py-2.5 bg-transparent outline-none text-xs lg:text-sm text-slate-100 placeholder:text-slate-600 disabled:opacity-50" />
                  <span className="text-[9px] text-slate-600 pb-3 hidden sm:block">{draft.length}/2000</span>
                  <button type="submit" disabled={!draft.trim() || loading || loadingHistory} aria-label="Send message" className="w-10 h-10 shrink-0 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"><Send className="w-4 h-4" /></button>
                </div>
                <p className="mt-2 text-center text-[9px] text-slate-600">The assistant can make mistakes. It does not submit complaints or change records.</p>
              </form>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
