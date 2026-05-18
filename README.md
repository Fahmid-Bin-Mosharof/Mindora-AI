# Mindora AI — Frontend

A polished, production-ready React application for Mindora AI — a personal AI-powered study workspace. Features include document management, AI chat with citations, quiz generation, bilingual support (English + Bengali), and a fully functional mock backend for standalone demos.

#### Live Link: https://mindora-ai.netlify.app

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + Vite 5 + TypeScript 5 |
| Styling | Tailwind CSS v3 + shadcn/ui |
| State & Data | TanStack Query (React Query), React Context |
| Routing | React Router v6 |
| Animations | Framer Motion |
| Forms | React Hook Form + Zod |
| i18n | i18next + react-i18next + LanguageDetector |
| Icons | Lucide React |
| Charts | Recharts |
| Testing | Vitest + React Testing Library |

---

## Features

### Core Pages

| Route | Page | Auth Required | Description |
|-------|------|---------------|-------------|
| `/` | Landing | No | Hero section, feature highlights, CTA |
| `/signup` | Sign Up | No | Account creation with validation |
| `/login` | Log In | No | JWT-based authentication |
| `/dashboard` | Dashboard | Yes | Overview, stats, recent activity |
| `/library` | Library | Yes | Document list, upload, delete |
| `/upload` | Upload | Yes | Drag-and-drop file upload |
| `/chat` | AI Chat | Yes | RAG-powered Q&A with citations |
| `/quizzes` | Quizzes | Yes | Quiz list, generate new quizzes |
| `/quizzes/:id/take` | Quiz Take | Yes | Interactive quiz attempt |
| `/profile` | Profile | Yes | Edit name, language, view stats |

### Key Capabilities

- **Mock Backend** — Fully functional in-memory mock API when `VITE_API_URL` is unset. Data persists in `localStorage`.
- **Bilingual UI** — English (`en`) and Bengali (`bn`) with automatic font swapping (Hind Siliguri for Bengali).
- **Dark AI Design System** — Custom Tailwind theme with semantic tokens, gradients, and glassmorphism.
- **Protected Routes** — Automatic redirect to `/login` for unauthenticated users.
- **Responsive** — Mobile-first, works on all screen sizes.

---

## Project Structure

```
src/
├── components/
│   ├── ui/                 # shadcn/ui components (auto-generated)
│   ├── AppShell.tsx        # App layout shell
│   ├── LanguageToggle.tsx  # EN / BN language switcher
│   ├── Logo.tsx            # Brand logo component
│   ├── NavLink.tsx         # Active-state nav link
│   └── ProtectedRoute.tsx  # Route guard for auth pages
├── contexts/
│   └── AuthContext.tsx     # Global auth state (login/signup/logout)
├── hooks/
│   ├── use-mobile.tsx      # Mobile breakpoint detection
│   └── use-toast.ts        # Toast notifications
├── i18n/
│   ├── index.ts            # i18next configuration
│   └── locales/
│       ├── en.json         # English translations
│       └── bn.json         # Bengali translations
├── lib/
│   ├── api.ts              # API client + mock adapter
│   └── utils.ts            # Utility functions (cn helper)
├── pages/
│   ├── Auth.tsx            # Login & Signup forms
│   ├── Chat.tsx            # AI chat interface
│   ├── Dashboard.tsx       # User dashboard
│   ├── Landing.tsx         # Marketing landing page
│   ├── Library.tsx         # Document library
│   ├── NotFound.tsx        # 404 page
│   ├── Profile.tsx         # User profile settings
│   ├── QuizTake.tsx        # Quiz attempt UI
│   ├── Quizzes.tsx         # Quiz management
│   └── Upload.tsx          # File upload page
├── App.tsx                 # Root component with routes
├── index.css               # Tailwind theme & global styles
└── main.tsx                # Entry point
```

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm/bun

### Install & Run

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test
```

The dev server runs on `http://localhost:5173` by default.

---

## Environment Variables

Create `.env.local` in the project root:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | Backend API base URL (e.g. `https://api.mindora.app`). If omitted, mock mode activates. |

```bash
# Example: connect to a live FastAPI backend
VITE_API_URL=https://api.your-domain.com
```

---

## Backend API Contract

When `VITE_API_URL` is set, the frontend expects these endpoints:

### Authentication

| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| POST | `/auth/signup` | `{ name, email, password }` | `{ token, user }` |
| POST | `/auth/login` | `{ email, password }` | `{ token, user }` |
| GET | `/auth/me` | Bearer JWT | `{ user }` |

### Documents

| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| GET | `/documents` | Bearer JWT | `DocumentItem[]` |
| POST | `/documents/upload` | `multipart/form-data` (field: `file`) | `DocumentItem` |
| DELETE | `/documents/{id}` | Bearer JWT | `{ ok: true }` |

### Chat / RAG

| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| GET | `/chats` | Bearer JWT | `ChatSession[]` |
| POST | `/chats` | `{ title?, documentIds? }` | `ChatSession` |
| GET | `/chats/{id}` | Bearer JWT | `{ session, messages }` |
| POST | `/chats/{id}/ask` | `{ question, documentIds? }` | `{ message: ChatMessage }` |
| DELETE | `/chats/{id}` | Bearer JWT | `{ ok: true }` |
| PATCH | `/chats/{id}` | `{ title }` | `ChatSession` |

### Quizzes

| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| POST | `/quizzes/generate` | `{ title?, documentIds?, numQuestions?, difficulty? }` | `Quiz` |
| GET | `/quizzes` | Bearer JWT | `Quiz[]` |
| GET | `/quizzes/{id}` | Bearer JWT | `Quiz` |
| DELETE | `/quizzes/{id}` | Bearer JWT | `{ ok: true }` |
| POST | `/quizzes/{id}/attempts` | `{ answers, durationSec }` | `QuizAttempt` |
| GET | `/attempts` | Bearer JWT | `QuizAttempt[]` |

### User Profile

| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| PATCH | `/users/me` | `{ name?, language? }` | `{ user }` |

### Auth Header

All authenticated requests send:
```
Authorization: Bearer <JWT>
```

The JWT is stored in `localStorage` under the key `MINDORA_TOKEN`.

---

## Data Types

```typescript
// User
{ id, name, email, language?: 'en' | 'bn', avatarUrl?, createdAt }

// DocumentItem
{ id, filename, size, mimeType, pages?, createdAt, status: 'processing' | 'ready' | 'failed' }

// ChatSession
{ id, title, documentIds[], createdAt, updatedAt, lastMessagePreview? }

// ChatMessage
{ id, sessionId, role: 'user' | 'assistant', content, citations?: Citation[], createdAt }

// Citation
{ documentId, filename, page?, snippet, score? }

// Quiz
{ id, title, documentIds[], difficulty: 'easy' | 'medium' | 'hard', questions: QuizQuestion[], createdAt }

// QuizQuestion
{ id, question, options[4], correctIndex, explanation?, sourceDocumentId?, sourcePage? }

// QuizAttempt
{ id, quizId, quizTitle, score, correct, total, answers[], durationSec, createdAt }
```

---

## Mock Mode

If `VITE_API_URL` is **not set**, the app runs entirely in the browser with no backend required:

- Sign up / log in with any credentials
- Upload files (stored in memory)
- Chat with AI (simulated responses)
- Generate and take quizzes
- All data persists in `localStorage` across sessions

This is ideal for demos, UI development, and testing.

---

## i18n (Internationalization)

The app supports two languages out of the box:

| Language | Code | Font |
|----------|------|------|
| English | `en` | Inter (default) |
| Bengali | `bn` | Hind Siliguri |

- Language auto-detects from browser / localStorage (`mindora_lang` key)
- Users can manually switch via the `LanguageToggle` component
- All UI strings live in `src/i18n/locales/*.json`
- `<html lang="...">` updates dynamically for correct font rendering

To add a new language:
1. Create `src/i18n/locales/xx.json`
2. Import it in `src/i18n/index.ts`
3. Add to `supportedLngs` array

---

## Design System

The UI uses a custom dark-themed design system built on Tailwind CSS:

- **Semantic tokens**: `--background`, `--foreground`, `--primary`, `--accent`, `--muted`, etc.
- **Custom colors**: Deep navy backgrounds, electric indigo accents, glassmorphism surfaces
- **Typography**: Inter for Latin, Hind Siliguri for Bengali
- **Animations**: Framer Motion for page transitions, hover effects, and micro-interactions
- **Components**: Built with shadcn/ui primitives, customized for the dark AI aesthetic

See `src/index.css` and `tailwind.config.ts` for the full token definition.

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Dev | `npm run dev` | Start Vite dev server with HMR |
| Build | `npm run build` | Production build to `dist/` |
| Preview | `npm run preview` | Preview production build locally |
| Lint | `npm run lint` | ESLint check |
| Test | `npm run test` | Run Vitest once |
| Test Watch | `npm run test:watch` | Run Vitest in watch mode |

---

## Deployment

The frontend is a static SPA and can be deployed anywhere:

### Vercel (Recommended)

```bash
npm install -g vercel
vercel --prod
```

### Netlify

```bash
npm run build
# Deploy the `dist/` folder
```

### Render / Railway / Any Static Host

Build output is in `dist/`. Set up environment variables (`VITE_API_URL`) in your hosting dashboard.

---

## License

MIT
