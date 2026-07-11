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
