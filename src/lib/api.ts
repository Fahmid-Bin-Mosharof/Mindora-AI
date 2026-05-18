/**
 * Mindora API client — designed to plug into a FastAPI + MongoDB backend.
 *
 * Configure the backend URL via Vite env: VITE_API_URL (e.g. https://api.mindora.app)
 * If unset, a built-in MOCK adapter is used so the UI works end-to-end during development.
 *
 * Backend contract (FastAPI suggested routes):
 *   POST   /auth/signup           { name, email, password } -> { token, user }
 *   POST   /auth/login            { email, password }       -> { token, user }
 *   GET    /auth/me                                         -> { user }
 *   POST   /auth/google           { id_token }              -> { token, user }
 *   GET    /documents                                       -> Document[]
 *   POST   /documents/upload      multipart: file           -> Document
 *   DELETE /documents/{id}                                  -> { ok: true }
 *   PATCH  /users/me              { name, language }        -> { user }
 *
 *   --- Phase 2: RAG Doubt Solver ---
 *   GET    /chats                                           -> ChatSession[]
 *   POST   /chats                 { title?, documentIds? }  -> ChatSession
 *   GET    /chats/{id}                                      -> { session, messages }
 *   DELETE /chats/{id}                                      -> { ok: true }
 *   PATCH  /chats/{id}                  { title }            -> ChatSession
 *   POST   /chats/{id}/ask        { question, documentIds? } -> { message: ChatMessage }
 *      (Server should run RAG: embed -> vector search -> LLM with cited chunks)
 *
 * Token is a JWT stored in localStorage under MINDORA_TOKEN.
 */

export type User = {
  id: string;
  name: string;
  email: string;
  language?: 'en' | 'bn';
  avatarUrl?: string;
  createdAt: string;
};

export type DocumentItem = {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  pages?: number;
  createdAt: string;
  status: 'processing' | 'ready' | 'failed';
};

export type Citation = {
  documentId: string;
  filename: string;
  page?: number;
  snippet: string;
  score?: number;
};

export type ChatMessage = {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  createdAt: string;
};

export type ChatSession = {
  id: string;
  title: string;
  documentIds: string[];
  createdAt: string;
  updatedAt: string;
  lastMessagePreview?: string;
};

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];          // exactly 4
  correctIndex: number;       // 0..3
  explanation?: string;
  sourceDocumentId?: string;
  sourcePage?: number;
};

export type Quiz = {
  id: string;
  title: string;
  documentIds: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  questions: QuizQuestion[];
  createdAt: string;
};

export type QuizAttempt = {
  id: string;
  quizId: string;
  quizTitle: string;
  score: number;              // 0..100
  correct: number;
  total: number;
  answers: number[];          // index per question, -1 if skipped
  durationSec: number;
  createdAt: string;
};

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');
const TOKEN_KEY = 'MINDORA_TOKEN';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new Error('NO_API');
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token = tokenStore.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

/* ============================ MOCK ADAPTER ============================ */
const MOCK_KEY = 'MINDORA_MOCK_DB_V1';

type MockDbShape = {
  users: Array<[string, User & { password: string }]>;
  docs: Array<[string, DocumentItem[]]>;
  sessions: Array<[string, ChatSession[]]>;
  messages: Array<[string, ChatMessage[]]>;
  quizzes: Array<[string, Quiz[]]>;
  attempts: Array<[string, QuizAttempt[]]>;
};

function loadMockDb() {
  const empty = {
    users: new Map<string, User & { password: string }>(),
    docs: new Map<string, DocumentItem[]>(),
    sessions: new Map<string, ChatSession[]>(),
    messages: new Map<string, ChatMessage[]>(),
    quizzes: new Map<string, Quiz[]>(),
    attempts: new Map<string, QuizAttempt[]>(),
  };
  try {
    const raw = localStorage.getItem(MOCK_KEY);
    if (!raw) return empty;
    const data = JSON.parse(raw) as MockDbShape;
    return {
      users: new Map(data.users),
      docs: new Map(data.docs),
      sessions: new Map(data.sessions),
      messages: new Map(data.messages),
      quizzes: new Map(data.quizzes),
      attempts: new Map(data.attempts),
    };
  } catch { return empty; }
}

const mockDb = loadMockDb();

function persistMockDb() {
  try {
    const data: MockDbShape = {
      users: [...mockDb.users.entries()],
      docs: [...mockDb.docs.entries()],
      sessions: [...mockDb.sessions.entries()],
      messages: [...mockDb.messages.entries()],
      quizzes: [...mockDb.quizzes.entries()],
      attempts: [...mockDb.attempts.entries()],
    };
    localStorage.setItem(MOCK_KEY, JSON.stringify(data));
  } catch { /* quota or serialization issue — ignore */ }
}

function mockToken(userId: string) { return `mock.${userId}.${Date.now()}`; }
function userIdFromToken(t: string | null): string | null {
  if (!t || !t.startsWith('mock.')) return null;
  return t.split('.')[1] ?? null;
}
function delay(ms = 400) { return new Promise(r => setTimeout(r, ms)); }
function uid() { return Math.random().toString(36).slice(2, 10); }

function fakeAnswer(question: string, docs: DocumentItem[]): { content: string; citations: Citation[] } {
  const sample = docs.slice(0, Math.min(2, docs.length));
  const citations: Citation[] = sample.map((d, i) => ({
    documentId: d.id,
    filename: d.filename,
    page: i + 1,
    snippet: `…relevant excerpt from ${d.filename} that addresses "${question.slice(0, 40)}"…`,
    score: 0.92 - i * 0.08,
  }));
  const intro = docs.length
    ? `Based on your uploaded materials, here's what I found regarding **"${question}"**:`
    : `You haven't uploaded any documents yet. Once you upload notes, I'll answer **only from your materials** and cite the exact pages.`;
  const body = docs.length
    ? `\n\n- Key point one drawn from your notes.\n- Key point two with supporting context.\n- A short conclusion summarising the answer.\n\n*This is a mock answer — connect your FastAPI backend at \`VITE_API_URL\` to enable real RAG.*`
    : '';
  return { content: intro + body, citations };
}

const mock = {
  async signup(name: string, email: string, password: string) {
    await delay();
    if ([...mockDb.users.values()].some(u => u.email === email)) throw new Error('Email already registered');
    const id = uid();
    const user: User & { password: string } = { id, name, email, password, language: 'en', createdAt: new Date().toISOString() };
    mockDb.users.set(id, user);
    mockDb.docs.set(id, []);
    mockDb.sessions.set(id, []);
    const { password: _p, ...safe } = user;
    return { token: mockToken(id), user: safe as User };
  },
  async login(email: string, password: string) {
    await delay();
    const u = [...mockDb.users.values()].find(x => x.email === email && x.password === password);
    if (!u) throw new Error('Invalid email or password');
    const { password: _p, ...safe } = u;
    return { token: mockToken(u.id), user: safe as User };
  },
  async me() {
    const id = userIdFromToken(tokenStore.get());
    if (!id) throw new Error('Not authenticated');
    const u = mockDb.users.get(id);
    if (!u) throw new Error('Session expired');
    const { password: _p, ...safe } = u;
    return { user: safe as User };
  },
  async listDocs() {
    await delay(200);
    const id = userIdFromToken(tokenStore.get());
    if (!id) throw new Error('Not authenticated');
    return mockDb.docs.get(id) ?? [];
  },
  async uploadDoc(file: File) {
    await delay(800);
    const id = userIdFromToken(tokenStore.get());
    if (!id) throw new Error('Not authenticated');
    const doc: DocumentItem = {
      id: uid(), filename: file.name, size: file.size,
      mimeType: file.type || 'application/octet-stream',
      createdAt: new Date().toISOString(), status: 'ready',
    };
    const list = mockDb.docs.get(id) ?? [];
    list.unshift(doc);
    mockDb.docs.set(id, list);
    return doc;
  },
  async deleteDoc(docId: string) {
    await delay(200);
    const id = userIdFromToken(tokenStore.get());
    if (!id) throw new Error('Not authenticated');
    mockDb.docs.set(id, (mockDb.docs.get(id) ?? []).filter(d => d.id !== docId));
    return { ok: true };
  },
  async updateProfile(patch: Partial<Pick<User, 'name' | 'language'>>) {
    await delay();
    const id = userIdFromToken(tokenStore.get());
    if (!id) throw new Error('Not authenticated');
    const u = mockDb.users.get(id);
    if (!u) throw new Error('Session expired');
    Object.assign(u, patch);
    mockDb.users.set(id, u);
    const { password: _p, ...safe } = u;
    return { user: safe as User };
  },

  /* ----- chat ----- */
  async listSessions() {
    await delay(150);
    const id = userIdFromToken(tokenStore.get());
    if (!id) throw new Error('Not authenticated');
    return mockDb.sessions.get(id) ?? [];
  },
  async createSession(input: { title?: string; documentIds?: string[] }) {
    await delay(150);
    const id = userIdFromToken(tokenStore.get());
    if (!id) throw new Error('Not authenticated');
    const session: ChatSession = {
      id: uid(),
      title: input.title?.trim() || 'New conversation',
      documentIds: input.documentIds ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const list = mockDb.sessions.get(id) ?? [];
    list.unshift(session);
    mockDb.sessions.set(id, list);
    mockDb.messages.set(session.id, []);
    return session;
  },
  async getSession(sessionId: string) {
    await delay(150);
    const id = userIdFromToken(tokenStore.get());
    if (!id) throw new Error('Not authenticated');
    const session = (mockDb.sessions.get(id) ?? []).find(s => s.id === sessionId);
    if (!session) throw new Error('Conversation not found');
    return { session, messages: mockDb.messages.get(sessionId) ?? [] };
  },
  async deleteSession(sessionId: string) {
    await delay(150);
    const id = userIdFromToken(tokenStore.get());
    if (!id) throw new Error('Not authenticated');
    mockDb.sessions.set(id, (mockDb.sessions.get(id) ?? []).filter(s => s.id !== sessionId));
    mockDb.messages.delete(sessionId);
    return { ok: true };
  },
  async renameSession(sessionId: string, title: string) {
    await delay(120);
    const id = userIdFromToken(tokenStore.get());
    if (!id) throw new Error('Not authenticated');
    const list = mockDb.sessions.get(id) ?? [];
    const s = list.find(x => x.id === sessionId);
    if (!s) throw new Error('Conversation not found');
    s.title = title.trim() || s.title;
    s.updatedAt = new Date().toISOString();
    return s;
  },
  async clearAllSessions() {
    await delay(200);
    const id = userIdFromToken(tokenStore.get());
    if (!id) throw new Error('Not authenticated');
    const list = mockDb.sessions.get(id) ?? [];
    list.forEach(s => mockDb.messages.delete(s.id));
    mockDb.sessions.set(id, []);
    return { ok: true };
  },
  async ask(sessionId: string, question: string, documentIds?: string[]) {
    const userId = userIdFromToken(tokenStore.get());
    if (!userId) throw new Error('Not authenticated');
    const sessions = mockDb.sessions.get(userId) ?? [];
    const session = sessions.find(s => s.id === sessionId);
    if (!session) throw new Error('Conversation not found');

    const userMsg: ChatMessage = {
      id: uid(), sessionId, role: 'user', content: question, createdAt: new Date().toISOString(),
    };
    const msgs = mockDb.messages.get(sessionId) ?? [];
    msgs.push(userMsg);
    mockDb.messages.set(sessionId, msgs);

    await delay(900);

    const allDocs = mockDb.docs.get(userId) ?? [];
    const ids = documentIds && documentIds.length ? documentIds : session.documentIds;
    const scoped = ids.length ? allDocs.filter(d => ids.includes(d.id)) : allDocs;
    const { content, citations } = fakeAnswer(question, scoped);

    const assistantMsg: ChatMessage = {
      id: uid(), sessionId, role: 'assistant', content, citations,
      createdAt: new Date().toISOString(),
    };
    msgs.push(assistantMsg);
    mockDb.messages.set(sessionId, msgs);

    // update session preview/title
    if (session.title === 'New conversation') session.title = question.slice(0, 60);
    session.updatedAt = new Date().toISOString();
    session.lastMessagePreview = content.replace(/[#*`]/g, '').slice(0, 80);

    return { message: assistantMsg };
  },

  /* ----- quizzes ----- */
  async generateQuiz(input: { title?: string; documentIds?: string[]; numQuestions?: number; difficulty?: 'easy' | 'medium' | 'hard' }) {
    await delay(1100);
    const userId = userIdFromToken(tokenStore.get());
    if (!userId) throw new Error('Not authenticated');
    const allDocs = mockDb.docs.get(userId) ?? [];
    const ids = input.documentIds ?? [];
    const scoped = ids.length ? allDocs.filter(d => ids.includes(d.id)) : allDocs;
    const num = Math.max(3, Math.min(20, input.numQuestions ?? 5));
    const difficulty = input.difficulty ?? 'medium';
    const baseTitle = scoped[0]?.filename?.replace(/\.[^.]+$/, '') ?? 'Study';

    const questions: QuizQuestion[] = Array.from({ length: num }).map((_, i) => {
      const src = scoped[i % Math.max(1, scoped.length)];
      const correctIndex = Math.floor(Math.random() * 4);
      const options = ['Option A', 'Option B', 'Option C', 'Option D'].map((o, idx) =>
        idx === correctIndex ? `${o} — correct concept #${i + 1}` : `${o} — distractor #${i + 1}.${idx}`
      );
      return {
        id: uid(),
        question: scoped.length
          ? `Question ${i + 1}: According to "${src?.filename}", which statement best describes concept #${i + 1}?`
          : `Question ${i + 1}: Sample question (upload documents for grounded quizzes).`,
        options,
        correctIndex,
        explanation: scoped.length
          ? `The correct answer is grounded in ${src?.filename}${src?.pages ? `, around page ${(i % (src.pages || 1)) + 1}` : ''}.`
          : 'This is a mock explanation. Connect your FastAPI backend to enable real quiz generation.',
        sourceDocumentId: src?.id,
        sourcePage: src ? (i % 5) + 1 : undefined,
      };
    });

    const quiz: Quiz = {
      id: uid(),
      title: input.title?.trim() || `${baseTitle} quiz`,
      documentIds: ids,
      difficulty,
      questions,
      createdAt: new Date().toISOString(),
    };
    const list = mockDb.quizzes.get(userId) ?? [];
    list.unshift(quiz);
    mockDb.quizzes.set(userId, list);
    return quiz;
  },
  async listQuizzes() {
    await delay(150);
    const id = userIdFromToken(tokenStore.get());
    if (!id) throw new Error('Not authenticated');
    return mockDb.quizzes.get(id) ?? [];
  },
  async getQuiz(quizId: string) {
    await delay(150);
    const id = userIdFromToken(tokenStore.get());
    if (!id) throw new Error('Not authenticated');
    const q = (mockDb.quizzes.get(id) ?? []).find(x => x.id === quizId);
    if (!q) throw new Error('Quiz not found');
    return q;
  },
  async deleteQuiz(quizId: string) {
    await delay(150);
    const id = userIdFromToken(tokenStore.get());
    if (!id) throw new Error('Not authenticated');
    mockDb.quizzes.set(id, (mockDb.quizzes.get(id) ?? []).filter(x => x.id !== quizId));
    return { ok: true };
  },
  async submitAttempt(input: { quizId: string; answers: number[]; durationSec: number }) {
    await delay(400);
    const userId = userIdFromToken(tokenStore.get());
    if (!userId) throw new Error('Not authenticated');
    const quiz = (mockDb.quizzes.get(userId) ?? []).find(q => q.id === input.quizId);
    if (!quiz) throw new Error('Quiz not found');
    const correct = quiz.questions.reduce((acc, q, i) => acc + (input.answers[i] === q.correctIndex ? 1 : 0), 0);
    const total = quiz.questions.length;
    const attempt: QuizAttempt = {
      id: uid(),
      quizId: quiz.id,
      quizTitle: quiz.title,
      score: Math.round((correct / total) * 100),
      correct,
      total,
      answers: input.answers,
      durationSec: input.durationSec,
      createdAt: new Date().toISOString(),
    };
    const list = mockDb.attempts.get(userId) ?? [];
    list.unshift(attempt);
    mockDb.attempts.set(userId, list);
    return attempt;
  },
  async listAttempts() {
    await delay(150);
    const id = userIdFromToken(tokenStore.get());
    if (!id) throw new Error('Not authenticated');
    return mockDb.attempts.get(id) ?? [];
  },
};

// Persist mock DB after every successful mock mutation.
for (const k of Object.keys(mock) as (keyof typeof mock)[]) {
  const fn = mock[k] as any;
  if (typeof fn !== 'function') continue;
  (mock as any)[k] = async (...args: any[]) => {
    const out = await fn(...args);
    persistMockDb();
    return out;
  };
}
export const api = {
  isMock: !API_URL,

  signup: (name: string, email: string, password: string) =>
    API_URL
      ? http<{ token: string; user: User }>('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) })
      : mock.signup(name, email, password),

  login: (email: string, password: string) =>
    API_URL
      ? http<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      : mock.login(email, password),

  me: () => API_URL ? http<{ user: User }>('/auth/me') : mock.me(),

  listDocuments: () => API_URL ? http<DocumentItem[]>('/documents') : mock.listDocs(),

  uploadDocument: (file: File) => {
    if (API_URL) {
      const fd = new FormData();
      fd.append('file', file);
      return http<DocumentItem>('/documents/upload', { method: 'POST', body: fd });
    }
    return mock.uploadDoc(file);
  },

  deleteDocument: (id: string) =>
    API_URL ? http<{ ok: true }>(`/documents/${id}`, { method: 'DELETE' }) : mock.deleteDoc(id),

  updateProfile: (patch: Partial<Pick<User, 'name' | 'language'>>) =>
    API_URL ? http<{ user: User }>('/users/me', { method: 'PATCH', body: JSON.stringify(patch) }) : mock.updateProfile(patch),

  /* ---- Chat / RAG ---- */
  listSessions: () => API_URL ? http<ChatSession[]>('/chats') : mock.listSessions(),

  createSession: (input: { title?: string; documentIds?: string[] } = {}) =>
    API_URL
      ? http<ChatSession>('/chats', { method: 'POST', body: JSON.stringify(input) })
      : mock.createSession(input),

  getSession: (id: string) =>
    API_URL
      ? http<{ session: ChatSession; messages: ChatMessage[] }>(`/chats/${id}`)
      : mock.getSession(id),

  deleteSession: (id: string) =>
    API_URL ? http<{ ok: true }>(`/chats/${id}`, { method: 'DELETE' }) : mock.deleteSession(id),

  renameSession: (id: string, title: string) =>
    API_URL
      ? http<ChatSession>(`/chats/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) })
      : mock.renameSession(id, title),

  clearAllSessions: async () => {
    if (!API_URL) return mock.clearAllSessions();
    const list = await http<ChatSession[]>('/chats');
    await Promise.all(list.map(s => http<{ ok: true }>(`/chats/${s.id}`, { method: 'DELETE' })));
    return { ok: true } as const;
  },

  ask: (sessionId: string, question: string, documentIds?: string[]) =>
    API_URL
      ? http<{ message: ChatMessage }>(`/chats/${sessionId}/ask`, {
          method: 'POST',
          body: JSON.stringify({ question, documentIds }),
        })
      : mock.ask(sessionId, question, documentIds),

  /* ---- Quizzes ---- */
  generateQuiz: (input: { title?: string; documentIds?: string[]; numQuestions?: number; difficulty?: 'easy' | 'medium' | 'hard' }) =>
    API_URL
      ? http<Quiz>('/quizzes/generate', { method: 'POST', body: JSON.stringify(input) })
      : mock.generateQuiz(input),

  listQuizzes: () => API_URL ? http<Quiz[]>('/quizzes') : mock.listQuizzes(),

  getQuiz: (id: string) => API_URL ? http<Quiz>(`/quizzes/${id}`) : mock.getQuiz(id),

  deleteQuiz: (id: string) =>
    API_URL ? http<{ ok: true }>(`/quizzes/${id}`, { method: 'DELETE' }) : mock.deleteQuiz(id),

  submitAttempt: (input: { quizId: string; answers: number[]; durationSec: number }) =>
    API_URL
      ? http<QuizAttempt>(`/quizzes/${input.quizId}/attempts`, { method: 'POST', body: JSON.stringify({ answers: input.answers, durationSec: input.durationSec }) })
      : mock.submitAttempt(input),

  listAttempts: () => API_URL ? http<QuizAttempt[]>('/attempts') : mock.listAttempts(),
};
