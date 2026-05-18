import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Send, Sparkles, FileText, Trash2, MessageSquare, BookOpen, Loader2, Pencil, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api, ChatMessage, ChatSession, Citation, DocumentItem } from '@/lib/api';

export default function ChatPage() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  /* ----- initial load ----- */
  useEffect(() => {
    (async () => {
      try {
        const [s, d] = await Promise.all([api.listSessions(), api.listDocuments()]);
        setSessions(s);
        setDocs(d);
        if (s.length) selectSession(s[0].id);
      } catch (e: any) {
        toast.error(e.message ?? 'Failed to load');
      }
    })();
  }, []);

  /* ----- auto scroll ----- */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  async function selectSession(id: string) {
    setActiveId(id);
    setLoadingSession(true);
    try {
      const { messages } = await api.getSession(id);
      setMessages(messages);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to load conversation');
    } finally {
      setLoadingSession(false);
    }
  }

  async function refreshSessions() {
    try { setSessions(await api.listSessions()); } catch { /* ignore */ }
  }

  async function handleCreate(documentIds: string[]) {
    try {
      const s = await api.createSession({ documentIds });
      setSessions(prev => [s, ...prev]);
      setActiveId(s.id);
      setMessages([]);
      setNewOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to create');
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Delete failed');
    }
  }

  async function handleRename(id: string) {
    const title = renameValue.trim();
    setRenameId(null);
    if (!title) return;
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title } : s));
    try { await api.renameSession(id, title); }
    catch (e: any) {
      toast.error(e.message ?? 'Rename failed');
      refreshSessions();
    }
  }

  async function handleSend() {
    const q = input.trim();
    if (!q || sending) return;

    let sessionId = activeId;
    // auto-create on first send
    if (!sessionId) {
      try {
        const s = await api.createSession({ documentIds: [] });
        setSessions(prev => [s, ...prev]);
        setActiveId(s.id);
        sessionId = s.id;
      } catch (e: any) {
        toast.error(e.message ?? 'Failed');
        return;
      }
    }

    // optimistic user message
    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`, sessionId, role: 'user', content: q,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setInput('');
    setSending(true);

    try {
      const { message } = await api.ask(sessionId, q);
      setMessages(prev => [...prev, message]);
      refreshSessions();
    } catch (e: any) {
      toast.error(e.message ?? 'Request failed');
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setInput(q);
    } finally {
      setSending(false);
    }
  }

  const activeSession = useMemo(
    () => sessions.find(s => s.id === activeId) ?? null,
    [sessions, activeId],
  );

  return (
    <AppShell>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr] h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)]">
        {/* Sessions sidebar */}
        <aside className="glass rounded-2xl p-3 flex flex-col min-h-0">
          <div className="flex items-center justify-between gap-2 px-1 pb-3">
            <h2 className="text-sm font-semibold text-foreground">{t('chat.history')}</h2>
            <Dialog open={newOpen} onOpenChange={setNewOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gradient-primary text-primary-foreground">
                  <Plus className="h-4 w-4" />
                  {t('chat.new')}
                </Button>
              </DialogTrigger>
              <NewChatDialog docs={docs} onCreate={handleCreate} />
            </Dialog>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1 pr-1">
              {sessions.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-4">{t('chat.no_sessions')}</p>
              )}
              {sessions.map(s => {
                const isRenaming = renameId === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => !isRenaming && selectSession(s.id)}
                    className={cn(
                      'group w-full text-left rounded-lg px-3 py-2 text-sm transition-smooth border cursor-pointer',
                      activeId === s.id
                        ? 'bg-primary/10 border-primary/30 text-foreground'
                        : 'border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 opacity-70" />
                      <div className="flex-1 min-w-0">
                        {isRenaming ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename(s.id);
                                if (e.key === 'Escape') setRenameId(null);
                              }}
                              className="flex-1 min-w-0 bg-background/60 border border-primary/30 rounded px-2 py-1 text-xs outline-none focus:border-primary"
                            />
                            <button onClick={() => handleRename(s.id)} className="text-primary hover:opacity-80" aria-label="Save">
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setRenameId(null)} className="text-muted-foreground hover:text-foreground" aria-label="Cancel">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="truncate font-medium">{s.title}</div>
                            {s.lastMessagePreview && (
                              <div className="truncate text-xs text-muted-foreground mt-0.5">
                                {s.lastMessagePreview}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      {!isRenaming && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
                          <button
                            onClick={(e) => { e.stopPropagation(); setRenameValue(s.title); setRenameId(s.id); }}
                            className="text-muted-foreground hover:text-primary"
                            aria-label="Rename"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        {/* Conversation area */}
        <section className="glass rounded-2xl flex flex-col min-h-0 overflow-hidden">
          <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border/50">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <h1 className="text-base font-semibold truncate">
                  {activeSession?.title ?? t('chat.title')}
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  {activeSession
                    ? activeSession.documentIds.length
                      ? t('chat.scoped', { count: activeSession.documentIds.length })
                      : t('chat.all_docs')
                    : t('chat.subtitle')}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px] hidden sm:inline-flex">
              RAG
            </Badge>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-6 py-6">
            {loadingSession ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <EmptyState docs={docs} onPick={(q) => setInput(q)} />
            ) : (
              <div className="space-y-6 max-w-3xl mx-auto">
                <AnimatePresence initial={false}>
                  {messages.map(m => <MessageBubble key={m.id} m={m} />)}
                </AnimatePresence>
                {sending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    {t('chat.thinking')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border/50 p-3 sm:p-4">
            <div className="max-w-3xl mx-auto flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={t('chat.placeholder')}
                rows={1}
                className="min-h-[48px] max-h-40 resize-none bg-background/60 backdrop-blur"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="h-12 w-12 shrink-0 gradient-primary text-primary-foreground glow-primary"
                size="icon"
                aria-label="Send"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              {t('chat.disclaimer')}
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

/* ---------------- subcomponents ---------------- */

function MessageBubble({ m }: { m: ChatMessage }) {
  const isUser = m.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className="h-8 w-8 shrink-0 rounded-lg gradient-primary grid place-items-center text-primary-foreground glow-primary">
          <Sparkles className="h-4 w-4" />
        </div>
      )}
      <div className={cn('max-w-[85%] space-y-2', isUser && 'items-end')}>
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-primary/15 border border-primary/30 text-foreground rounded-br-md'
            : 'glass rounded-bl-md',
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{m.content}</p>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-headings:mb-2 prose-ul:my-2">
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>
          )}
        </div>
        {!!m.citations?.length && <CitationStrip citations={m.citations} />}
      </div>
    </motion.div>
  );
}

function CitationStrip({ citations }: { citations: Citation[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {citations.map((c, i) => (
        <Dialog key={i}>
          <DialogTrigger asChild>
            <button className="group flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] text-primary hover:bg-primary/15 transition-smooth">
              <FileText className="h-3 w-3" />
              <span className="max-w-[140px] truncate">{c.filename}</span>
              {c.page != null && <span className="opacity-70">· p.{c.page}</span>}
            </button>
          </DialogTrigger>
          <DialogContent className="glass-strong">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                {c.filename}{c.page != null && <span className="text-muted-foreground font-normal">· page {c.page}</span>}
              </DialogTitle>
              {c.score != null && (
                <DialogDescription>Relevance score: {(c.score * 100).toFixed(0)}%</DialogDescription>
              )}
            </DialogHeader>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-foreground whitespace-pre-wrap">
              {c.snippet}
            </div>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}

function EmptyState({ docs, onPick }: { docs: DocumentItem[]; onPick: (q: string) => void }) {
  const { t } = useTranslation();
  const suggestions = [
    t('chat.suggestion_1'),
    t('chat.suggestion_2'),
    t('chat.suggestion_3'),
  ];
  return (
    <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto px-4">
      <div className="h-14 w-14 rounded-2xl gradient-primary grid place-items-center glow-primary mb-4">
        <Sparkles className="h-6 w-6 text-primary-foreground" />
      </div>
      <h2 className="text-2xl font-bold gradient-text mb-2">{t('chat.empty_title')}</h2>
      <p className="text-sm text-muted-foreground mb-6">{t('chat.empty_subtitle')}</p>

      {docs.length === 0 ? (
        <Button asChild variant="outline" className="border-primary/30">
          <Link to="/upload"><BookOpen className="h-4 w-4" />{t('chat.upload_cta')}</Link>
        </Button>
      ) : (
        <div className="grid gap-2 w-full">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onPick(s)}
              className="text-left rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 px-4 py-3 text-sm transition-smooth"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NewChatDialog({ docs, onCreate }: { docs: DocumentItem[]; onCreate: (ids: string[]) => void }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <DialogContent className="glass-strong max-w-md">
      <DialogHeader>
        <DialogTitle>{t('chat.new_title')}</DialogTitle>
        <DialogDescription>{t('chat.new_subtitle')}</DialogDescription>
      </DialogHeader>
      <div className="max-h-72 overflow-y-auto scrollbar-thin space-y-1 -mx-1 px-1">
        {docs.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">{t('chat.no_docs_hint')}</p>
        )}
        {docs.map(d => (
          <label
            key={d.id}
            className="flex items-center gap-3 rounded-lg border border-border/50 hover:bg-muted/40 px-3 py-2 cursor-pointer"
          >
            <Checkbox checked={selected.includes(d.id)} onCheckedChange={() => toggle(d.id)} />
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm truncate flex-1">{d.filename}</span>
          </label>
        ))}
      </div>
      <DialogFooter className="gap-2">
        <Button variant="ghost" onClick={() => onCreate([])}>{t('chat.use_all')}</Button>
        <Button
          className="gradient-primary text-primary-foreground"
          onClick={() => onCreate(selected)}
        >
          {t('chat.start')}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
