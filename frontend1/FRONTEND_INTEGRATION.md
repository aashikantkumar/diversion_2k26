# LearnNova Frontend — Complete Integration Guide

> **Stack**: React 19 + TypeScript + Vite + Tailwind CSS v4  
> **Backend**: `http://localhost:3001` (31 endpoints)  
> **Auth**: Auth0 (JWT RS256)  
> **Roles**: `teacher` | `individual` (self-signup student) | `org_student` (invited student)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Dependencies to Install](#2-dependencies-to-install)
3. [Environment Variables](#3-environment-variables)
4. [Auth0 Setup](#4-auth0-setup)
5. [Folder Structure](#5-folder-structure)
6. [Routing & Page Map](#6-routing--page-map)
7. [Feature Breakdown (with API mapping)](#7-feature-breakdown)
   - [F1: Authentication & Auth0](#f1-authentication--auth0)
   - [F2: Onboarding Flow](#f2-onboarding-flow)
   - [F3: Learning Disability Assessment](#f3-learning-disability-assessment-10-question-screener)
   - [F4: PDF Upload & AI Transformation](#f4-pdf-upload--ai-transformation)
   - [F5: Adaptive Lesson Viewer](#f5-adaptive-lesson-viewer-5-modes)
   - [F6: RAG-Powered Chat (3 modes)](#f6-rag-powered-chat-3-modes)
   - [F7: AI Image Generation](#f7-ai-image-generation)
   - [F8: Teacher Classroom Management](#f8-teacher-classroom-management)
   - [F9: Student Management (Legacy)](#f9-student-management-legacy)
   - [F10: Dashboard(s)](#f10-dashboards)
8. [API Reference (All 31 Endpoints)](#8-api-reference-all-31-endpoints)
9. [Data Types / Interfaces](#9-data-types--interfaces)
10. [UI/UX Guidelines per Neurodiversity](#10-uiux-guidelines-per-neurodiversity)
11. [Recommended Libraries](#11-recommended-libraries)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                        │
│                                                             │
│  Auth0 SDK ──→ Login/Signup ──→ JWT Token                   │
│        │                           │                        │
│        ▼                           ▼                        │
│  ProtectedRoute            API calls with Bearer token      │
│        │                           │                        │
│        ├── Teacher Dashboard       │                        │
│        │    ├── Create Org         │                        │
│        │    ├── Upload PDF ────────┼──→ POST /api/upload    │
│        │    ├── Invite Students    │                        │
│        │    └── View Students      │                        │
│        │                           │                        │
│        └── Student Dashboard       │                        │
│             ├── Assessment ────────┼──→ POST /api/assess    │
│             ├── Lesson Viewer ─────┼──→ GET /api/lessons/:id│
│             ├── Chat ──────────────┼──→ POST /api/chat/:mode│
│             └── AI Images ─────────┼──→ POST /api/gen-image │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (Express)                       │
│  Auth0 JWT verification → Role middleware → Route handler   │
│  PostgreSQL + pgvector │ Groq LLM │ HuggingFace Embeddings │
│  Cloudinary CDN │ Custom RAG (hybrid search + RRF)          │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Dependencies to Install

```bash
# Auth
npm install @auth0/auth0-react

# Routing
npm install react-router-dom

# HTTP client
npm install axios

# Icons
npm install lucide-react

# Toast notifications
npm install sonner

# PDF preview (optional)
npm install react-pdf

# Markdown rendering (for chat responses)
npm install react-markdown

# Form handling (optional but recommended)
npm install react-hook-form zod @hookform/resolvers

# Animations (optional)
npm install framer-motion
```

---

## 3. Environment Variables

Create `.env` in `frontend1/`:

```env
# Auth0
VITE_AUTH0_DOMAIN=hackathon-div2k26.us.auth0.com
VITE_AUTH0_CLIENT_ID=DcUoVwZnUvWZR8AMcJV11GA9wcWnM82s
VITE_AUTH0_AUDIENCE=http://localhost:3001

# Backend API
VITE_API_URL=http://localhost:3001
```

---

## 4. Auth0 Setup

### Auth0Provider (wrap in main.tsx)

```tsx
import { Auth0Provider } from "@auth0/auth0-react";

<Auth0Provider
  domain={import.meta.env.VITE_AUTH0_DOMAIN}
  clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
  authorizationParams={{
    redirect_uri: window.location.origin + "/callback",
    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
    scope: "openid profile email",
  }}
>
  <App />
</Auth0Provider>
```

### Getting tokens for API calls

```tsx
import { useAuth0 } from "@auth0/auth0-react";

const { getAccessTokenSilently } = useAuth0();

// Every API call:
const token = await getAccessTokenSilently();
const res = await fetch(`${API_URL}/api/auth/me`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

### Auth0 Custom Claims (from "Add Roles to Token" Action)

The JWT contains these custom claims after login:
```json
{
  "sub": "auth0|abc123",
  "https://neuroadapt.app/roles": ["teacher"],
  "https://neuroadapt.app/neurodiversity": ["dyslexia", "adhd"]
}
```

---

## 5. Folder Structure

```
src/
├── main.tsx                          # Auth0Provider + RouterProvider
├── App.tsx                           # Root layout + routes
├── lib/
│   └── api.ts                        # Axios instance with auth interceptor
├── types/
│   └── index.ts                      # All TypeScript interfaces
├── hooks/
│   ├── useApi.ts                     # Generic fetcher with token
│   └── useCurrentUser.ts             # Get /api/auth/me + cache
├── context/
│   └── UserContext.tsx                # Global user state (role, neuro, onboarded)
├── components/
│   ├── Navbar.tsx                     # Navigation bar (role-aware)
│   ├── ProtectedRoute.tsx            # Redirect to login if not authed
│   ├── RoleRoute.tsx                 # Redirect if wrong role
│   ├── LoadingSpinner.tsx
│   ├── student/
│   │   ├── LessonCard.tsx            # Lesson list card
│   │   ├── ChatBubble.tsx            # Chat message bubble
│   │   ├── NeuroBadge.tsx            # Dyslexia/ADHD/Dyscalculia badge
│   │   ├── AssessmentQuestion.tsx    # Single question with 4-option scale
│   │   └── AdaptiveContent.tsx       # Renders lesson in correct mode
│   └── teacher/
│       ├── OrgCard.tsx               # Organization card
│       ├── StudentList.tsx           # List of students in org
│       ├── InviteModal.tsx           # Email invite form
│       └── PdfUploader.tsx           # Drag-and-drop PDF upload
├── pages/
│   ├── LandingPage.tsx               # Public homepage
│   ├── CallbackPage.tsx              # Auth0 redirect handler
│   ├── onboarding/
│   │   ├── ChooseRolePage.tsx        # "I'm a Teacher" / "I'm a Student"
│   │   ├── NeuroDivKnownPage.tsx     # "I know my condition" → select checkboxes
│   │   └── AssessmentPage.tsx        # "I don't know" → 10-question screener
│   ├── student/
│   │   ├── StudentDashboard.tsx      # Student home: my lessons + chat
│   │   ├── LessonViewPage.tsx        # View single lesson (5 adaptive modes)
│   │   └── ChatPage.tsx              # Chat with adaptive AI tutor
│   └── teacher/
│       ├── TeacherDashboard.tsx       # Teacher home: orgs + uploads
│       ├── CreateOrgPage.tsx          # Create new classroom
│       ├── OrgDetailPage.tsx          # View org: students + invite
│       └── UploadLessonPage.tsx       # Upload PDF → see transformation result
```

---

## 6. Routing & Page Map

```tsx
<Routes>
  {/* Public */}
  <Route path="/"           element={<LandingPage />} />
  <Route path="/callback"   element={<CallbackPage />} />

  {/* Onboarding (authenticated, not yet onboarded) */}
  <Route path="/onboarding/role"       element={<ChooseRolePage />} />
  <Route path="/onboarding/neuro"      element={<NeuroDivKnownPage />} />
  <Route path="/onboarding/assessment" element={<AssessmentPage />} />

  {/* Student (role: individual | org_student) */}
  <Route path="/dashboard"          element={<StudentDashboard />} />
  <Route path="/lesson/:id"         element={<LessonViewPage />} />
  <Route path="/chat/:lessonId"     element={<ChatPage />} />

  {/* Teacher (role: teacher) */}
  <Route path="/teacher"            element={<TeacherDashboard />} />
  <Route path="/teacher/org/new"    element={<CreateOrgPage />} />
  <Route path="/teacher/org/:id"    element={<OrgDetailPage />} />
  <Route path="/teacher/upload"     element={<UploadLessonPage />} />

  {/* Org invite join (deep link) */}
  <Route path="/join/:token"        element={<JoinOrgPage />} />
</Routes>
```

### User Flow State Machine:

```
Login (Auth0)
    │
    ▼
POST /api/auth/sync  ─→  returns { user }
    │
    ├── user.onboarded === true?
    │       ├── role === "teacher"     → /teacher
    │       └── role === "individual"  → /dashboard
    │
    └── user.onboarded === false?
            │
            ▼
        /onboarding/role  ("Teacher" or "Student")
            │
            ├── Teacher → POST /api/auth/onboarding/role {role:"teacher"}
            │             → user.onboarded = true → /teacher
            │
            └── Student → POST /api/auth/onboarding/role {role:"student"}
                          → "Do you know your condition?"
                          │
                          ├── YES → /onboarding/neuro
                          │         POST /api/auth/onboarding/individual
                          │         { neurodiversity: ["dyslexia"] }
                          │         → user.onboarded = true → /dashboard
                          │
                          └── NO → /onboarding/assessment
                                   GET /api/assess/questions (10 questions)
                                   POST /api/assess { answers: [...] }
                                   → saves detected neurodiversity
                                   → user.onboarded = true → /dashboard
```

---

## 7. Feature Breakdown

### F1: Authentication & Auth0

| What | API | Details |
|------|-----|---------|
| Login | Auth0 SDK `loginWithRedirect()` | Redirects to Auth0 Universal Login |
| Callback | `/callback` page | Auth0 redirects back, SDK handles token |
| Sync user to DB | `POST /api/auth/sync` | Call after every login: `{ role, email, name }` |
| Get profile | `GET /api/auth/me` | Returns `{ user: { id, role, email, neurodiversity, onboarded, org_id } }` |
| Logout | Auth0 SDK `logout()` | Clears session |

**Key**: After login, ALWAYS call `/api/auth/sync` to ensure the Auth0 user exists in your DB. Then call `/api/auth/me` to get the full profile and check `onboarded` status.

---

### F2: Onboarding Flow

| Step | API | Body |
|------|-----|------|
| Choose role | `POST /api/auth/onboarding/role` | `{ role: "teacher" }` or `{ role: "student" }` |
| Know condition | `POST /api/auth/onboarding/individual` | `{ neurodiversity: ["dyslexia", "adhd"] }` |
| Take assessment | `POST /api/auth/onboarding/assessment` | `{ answers: { q1: "a", q2: "b", ... } }` |

**Valid neurodiversity values**: `"dyslexia"`, `"adhd"`, `"dyscalculia"`, `"none"`

---

### F3: Learning Disability Assessment (10-Question Screener)

| API | Method | Purpose |
|-----|--------|---------|
| `/api/assess/questions` | GET | Returns 10 questions + 4-option answer scale |
| `/api/assess` | POST | Submits answers → LLM analyzes → returns disability profile |

**Question format** (from GET):
```typescript
{
  questions: [
    {
      id: 1,
      question: "Do you mix up letters that look similar...",
      emoji: "📖",
      targets: ["dyslexia"],
      examples: "For example: writing 'dog' instead of 'bog'..."
    }
    // ...10 total
  ],
  answerScale: [
    { value: 0, label: "Never" },
    { value: 1, label: "Sometimes" },
    { value: 2, label: "Often" },
    { value: 3, label: "Always" }
  ]
}
```

**Submit format** (POST):
```json
{
  "answers": [
    { "questionId": 1, "value": 2 },
    { "questionId": 2, "value": 0 },
    ...10 total
  ],
  "studentName": "John",
  "age": 12
}
```

**Response**:
```json
{
  "primaryCondition": "dyslexia",
  "secondaryCondition": "adhd",
  "confidence": "high",
  "scores": { "dyslexia": 7, "adhd": 4, "dyscalculia": 1 },
  "explanation": "The student shows strong indicators of dyslexia...",
  "recommendedMode": "dyslexia",
  "keySignals": ["Letter reversal", "Slow reading speed"],
  "supportTips": ["Use OpenDyslexic font", "Increase line spacing"]
}
```

**UI**: Show each question as a card with the emoji, question text, example hint, and 4 radio buttons (Never/Sometimes/Often/Always). Progress bar at the top.

---

### F4: PDF Upload & AI Transformation

| API | Method | Content-Type | Purpose |
|-----|--------|-------------|---------|
| `/api/upload` | POST | `multipart/form-data` | Upload PDF → extract text → AI transforms into 5 modes |
| `/api/transform` | POST | `application/json` | Transform raw text (no PDF) into 5 modes |

**Upload form**:
```typescript
const formData = new FormData();
formData.append("pdf", file);           // Required: PDF file
formData.append("title", "Photosynthesis");  // Optional
formData.append("subject", "Biology");       // Optional
formData.append("studentId", "uuid");        // Optional: assign to student

const res = await api.post("/api/upload", formData, {
  headers: { "Content-Type": "multipart/form-data" },
});
```

**Response** (same for both upload & transform):
```json
{
  "id": "lesson_1709312345678",
  "title": "Photosynthesis",
  "original": "...raw extracted text...",
  "dyslexia": {
    "text": "...", 
    "formatting": { "font": "OpenDyslexic", "lineHeight": 2.0, "bgColor": "#fdf6e3" },
    "difficultWords": ["photosynthesis", "chlorophyll"],
    "encouragement": { "sectionComplete": "Great job! 🎉" }
  },
  "adhd": {
    "chunks": [
      { "title": "What is Photosynthesis?", "content": "...", "emoji": "🌱", "timeEstimate": "2 min" }
    ]
  },
  "dyscalculia": {
    "sections": [{ "title": "...", "steps": [...], "visualAid": "..." }],
    "summary": "..."
  },
  "simplified": {
    "text": "...", "readingLevel": "Grade 3", "keyTerms": [...]
  },
  "audioScript": {
    "text": "...", "estimatedDuration": "3 min", "sections": [...]
  },
  "signLanguage": {
    "available": false, "videoUrl": "...", "summary": "..."
  },
  "metadata": {
    "processingTimeMs": 12345,
    "modelPool": ["llama-3.3-70b-versatile", ...],
    "ragEnabled": true,
    "ragChunks": 15
  }
}
```

**UI**: Drag-and-drop file zone → progress indicator during transformation (~10-30s) → redirect to lesson viewer.

---

### F5: Adaptive Lesson Viewer (5 Modes)

| API | Method | Purpose |
|-----|--------|---------|
| `/api/lessons` | GET | List all lessons `[{ id, title, subject, created_at }]` |
| `/api/lessons/:id` | GET | Full lesson with all 5 transformed modes |

**5 Viewing Modes** (tabs or auto-selected based on user's neurodiversity):

| Mode | Key Data | UI Guidelines |
|------|----------|---------------|
| **Dyslexia** | `lesson.dyslexia` | OpenDyslexic font, cream background (#fdf6e3), 2.0 line height, highlight difficult words, encouragement popups |
| **ADHD** | `lesson.adhd` | Bite-sized chunks with emojis, time estimates per chunk, progress tracker, gamification elements |
| **Dyscalculia** | `lesson.dyscalculia` | Step-by-step sections, visual aids, simplified math explanations |
| **Simplified** | `lesson.simplified` | Grade 3 reading level, key terms highlighted, plain language |
| **Audio Script** | `lesson.audioScript` | Text-to-speech ready script, section markers, duration estimate |

**Auto-select**: If the logged-in user has `neurodiversity: ["dyslexia"]`, default to the dyslexia tab. Allow manual switching.

---

### F6: RAG-Powered Chat (3 Modes)

| API | Method | Purpose |
|-----|--------|---------|
| `/api/chat/:mode` | POST | Send message → get adaptive AI response using lesson context |
| `/api/chat/history/:sessionId` | GET | Retrieve past messages |
| `/api/chat/status` | GET | Check which lessons are indexed for chat |

**Modes**: `adhd`, `dyslexia`, `dyscalculia`

**Send message**:
```json
POST /api/chat/dyslexia
{
  "message": "Can you explain photosynthesis simply?",
  "lessonId": "lesson_1709312345678",
  "sessionId": "session_abc123"
}
```

**Response**:
```json
{
  "mode": "dyslexia",
  "lessonId": "lesson_1709312345678",
  "response": {
    "reply": "Sure! 🌱 Photosynthesis is how plants make their food...",
    "source": "huggingface"
  },
  "rag": {
    "sourcesUsed": 3,
    "searchType": "hybrid (vector + full-text + RRF)",
    "chunks": [{ "chunkIndex": 2, "score": 0.85 }]
  }
}
```

**UI**: Chat bubble interface. Auto-select mode based on user's neurodiversity. Show "Sources: 3 lesson chunks" below each AI message. Different chat bubble styling per mode.

**Chat personality per mode**:
- **ADHD**: Short, punchy, uses emojis, breaks info into bullets, encouraging
- **Dyslexia**: Simple words, short sentences, repeats key ideas, patient
- **Dyscalculia**: Step-by-step, avoids number jargon, uses analogies, visual descriptions

---

### F7: AI Image Generation

| API | Method | Purpose |
|-----|--------|---------|
| `/api/generate-image` | POST | Generate single image for topic+mode |
| `/api/generate-image/all` | POST | Generate all 4 modes at once |
| `/api/generate-image/styles` | GET | List available mode styles |
| `/api/generate-image/images` | GET | List stored images (query: topic, mode, studentId) |
| `/api/generate-image/images/:id` | GET | Get single image |
| `/api/generate-image/images/:id` | DELETE | Delete image |

**Generate single**:
```json
POST /api/generate-image
{
  "topic": "Photosynthesis",
  "mode": "adhd",
  "specificConcept": "chlorophyll absorbing sunlight",
  "studentId": "optional-uuid",
  "lessonId": "lesson_xxx"
}
```

**Response** includes Cloudinary CDN URL:
```json
{
  "success": true,
  "image": {
    "url": "https://res.cloudinary.com/xxx/image/upload/...",
    "width": 768,
    "height": 512,
    "sizeKB": "124.5"
  },
  "prompt": "...(the AI prompt that was used)...",
  "mode": "adhd"
}
```

**UI**: "Generate Visual Aid" button on lesson view. Shows generated image with mode-specific styling.

---

### F8: Teacher Classroom Management

| API | Method | Auth | Purpose |
|-----|--------|------|---------|
| `POST /api/auth/org/create` | POST | Teacher | Create classroom `{ orgName }` |
| `GET /api/auth/org/my` | GET | Teacher | List teacher's classrooms |
| `GET /api/auth/org/:orgId/students` | GET | Teacher | Students in a classroom |
| `POST /api/auth/org/invite` | POST | Teacher | Invite student by email `{ orgId, email }` |
| `GET /api/auth/org/join/:token` | GET | Any (logged in) | Student clicks invite link → joins org |

**Invite flow**:
1. Teacher creates org → gets org card on dashboard
2. Teacher clicks "Invite Student" → enters email → API returns `inviteUrl` + `token`
3. Share the URL with student (copy to clipboard / email)
4. Student opens URL → must be logged in → auto-joins org → role upgraded to `org_student`

**UI**: Teacher dashboard shows org cards with student count. Click org → see student list with their neurodiversity badges and assessment status.

---

### F9: Student Management (Legacy)

> These are the **non-auth** student management endpoints from before Auth0 was added. Still functional for quick demos without auth.

| API | Method | Purpose |
|-----|--------|---------|
| `POST /api/students` | POST | Create student `{ name, age, grade, email }` |
| `GET /api/students` | GET | List all students |
| `GET /api/students/:id` | GET | Student profile + assessment |
| `GET /api/students/:id/lessons` | GET | Lessons assigned to student |
| `PUT /api/students/:id` | PUT | Update student info |
| `DELETE /api/students/:id` | DELETE | Delete student |

---

### F10: Dashboards

#### Student Dashboard (`/dashboard`)
- Welcome message with neurodiversity badge(s)
- "My Lessons" grid (from `GET /api/lessons` or `/api/students/:id/lessons`)
- Quick action: "Start Assessment" (if not done)
- Quick action: "Chat with Tutor" (per lesson)
- Recent chat history

#### Teacher Dashboard (`/teacher`)
- "My Classrooms" grid (from `GET /api/auth/org/my`)
- "Upload New Lesson" button → `/teacher/upload`
- "Create Classroom" button → `/teacher/org/new`
- Student overview across all orgs
- Recent uploads list

---

## 8. API Reference (All 31 Endpoints)

### No Auth Required (21 endpoints)

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | GET | `/api/health` | Server health check |
| 2 | GET | `/api/assess/questions` | Get 10 assessment questions |
| 3 | POST | `/api/assess` | Submit assessment → AI result |
| 4 | POST | `/api/transform` | Transform raw text → 5 modes |
| 5 | POST | `/api/upload` | Upload PDF → transform → save |
| 6 | GET | `/api/lessons` | List all lessons |
| 7 | GET | `/api/lessons/:id` | Get single lesson (full data) |
| 8 | POST | `/api/chat/:mode` | Chat with adaptive tutor |
| 9 | GET | `/api/chat/history/:sessionId` | Chat history |
| 10 | GET | `/api/chat/status` | Indexed lessons for chat |
| 11 | POST | `/api/students` | Create student |
| 12 | GET | `/api/students` | List students |
| 13 | GET | `/api/students/:id` | Get student profile |
| 14 | GET | `/api/students/:id/lessons` | Student's assigned lessons |
| 15 | PUT | `/api/students/:id` | Update student |
| 16 | DELETE | `/api/students/:id` | Delete student |
| 17 | POST | `/api/generate-image` | Generate single AI image |
| 18 | POST | `/api/generate-image/all` | Generate all 4 mode images |
| 19 | GET | `/api/generate-image/styles` | List mode styles |
| 20 | GET | `/api/generate-image/images` | List stored images |
| 21 | GET | `/api/generate-image/images/:id` | Get single image |

### Auth Required (10 endpoints)

| # | Method | Endpoint | Role | Purpose |
|---|--------|----------|------|---------|
| 22 | POST | `/api/auth/sync` | Any | Sync Auth0 user to DB |
| 23 | POST | `/api/auth/onboarding/role` | Any | Set role (teacher/student) |
| 24 | GET | `/api/auth/me` | Any | Get full user profile |
| 25 | POST | `/api/auth/onboarding/individual` | Any | Save known neurodiversity |
| 26 | POST | `/api/auth/onboarding/assessment` | Any | Save assessment result |
| 27 | POST | `/api/auth/org/create` | Teacher | Create classroom |
| 28 | GET | `/api/auth/org/my` | Teacher | List teacher's orgs |
| 29 | GET | `/api/auth/org/:orgId/students` | Teacher | Students in org |
| 30 | POST | `/api/auth/org/invite` | Teacher | Invite student to org |
| 31 | GET | `/api/auth/org/join/:token` | Any | Join org via invite link |

---

## 9. Data Types / Interfaces

```typescript
// ── User ──────────────────────────────────────────────────────
interface User {
  id: string;
  auth0_id: string;
  email: string;
  name: string | null;
  role: "teacher" | "org_student" | "individual";
  org_id: string | null;
  neurodiversity: string[];          // ["dyslexia", "adhd", "dyscalculia", "none"]
  signup_type: "individual" | "org";
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

// ── Organization ──────────────────────────────────────────────
interface Organization {
  id: string;
  name: string;
  teacher_id: string;
  created_at: string;
  student_count?: number;
}

// ── Lesson ────────────────────────────────────────────────────
interface Lesson {
  id: string;
  title: string;
  original: string;
  dyslexia: DyslexiaContent;
  adhd: ADHDContent;
  dyscalculia: DyscalculiaContent;
  simplified: SimplifiedContent;
  audioScript: AudioContent;
  signLanguage: { available: boolean; videoUrl: string; summary: string };
  metadata: LessonMetadata;
}

interface DyslexiaContent {
  text: string;
  formatting: {
    font: string;           // "OpenDyslexic"
    lineHeight: number;     // 2.0
    bgColor: string;        // "#fdf6e3"
  };
  difficultWords: string[];
  encouragement: {
    sectionComplete: string;
    halfwayPoint: string;
    allDone: string;
  };
}

interface ADHDContent {
  chunks: {
    title: string;
    content: string;
    emoji: string;
    timeEstimate: string;
  }[];
}

interface DyscalculiaContent {
  sections: {
    title: string;
    steps: string[];
    visualAid?: string;
  }[];
  summary: string;
}

interface SimplifiedContent {
  text: string;
  readingLevel: string;
  keyTerms: string[];
}

interface AudioContent {
  text: string;
  estimatedDuration: string;
  sections: string[];
}

// ── Assessment ────────────────────────────────────────────────
interface AssessmentQuestion {
  id: number;
  question: string;
  emoji: string;
  targets: string[];
  examples: string;
}

interface AssessmentAnswer {
  questionId: number;
  value: 0 | 1 | 2 | 3;   // Never | Sometimes | Often | Always
}

interface AssessmentResult {
  primaryCondition: "dyslexia" | "adhd" | "dyscalculia" | "none";
  secondaryCondition: string | null;
  confidence: "high" | "moderate" | "low";
  scores: { dyslexia: number; adhd: number; dyscalculia: number };
  explanation: string;
  recommendedMode: string;
  keySignals: string[];
  supportTips: string[];
}

// ── Chat ──────────────────────────────────────────────────────
interface ChatMessage {
  role: "student" | "tutor";
  content: string;
}

interface ChatResponse {
  mode: string;
  lessonId: string;
  response: {
    reply: string;
    source: string;
  };
  rag: {
    sourcesUsed: number;
    searchType: string;
    chunks: { chunkIndex: number; score: number }[];
  };
}

// ── AI Image ──────────────────────────────────────────────────
interface GeneratedImage {
  id: string;
  topic: string;
  mode: string;
  url: string;            // Cloudinary CDN URL
  width: number;
  height: number;
  sizeKB: string;
  prompt: string;
  model: string;
}

// ── Invite ────────────────────────────────────────────────────
interface OrgInvite {
  inviteUrl: string;
  token: string;
  expiresAt: string;
}
```

---

## 10. UI/UX Guidelines per Neurodiversity

### Dyslexia Mode
- Font: **OpenDyslexic** (load from Google Fonts or self-host)
- Background: warm cream `#fdf6e3`
- Line height: `2.0`
- Letter spacing: `+0.05em`
- Highlight difficult words with tooltip definitions
- Short paragraphs, avoid justified text
- Show encouragement messages at milestones

### ADHD Mode
- Chunk content into bite-sized cards (max 2-3 sentences each)
- Each chunk shows emoji + time estimate ("⏱ 2 min")
- Gamification: progress bar, streak counter, checkmarks
- Bold key concepts
- Use high-contrast colors, avoid walls of text
- Auto-scroll to next chunk on completion

### Dyscalculia Mode
- Step-by-step breakdowns (numbered, one step per line)
- Visual aids: diagrams, charts, real-world analogies
- Color-code mathematical operations
- Avoid dense number sequences
- Show "real life" examples (money, time, measuring)

### Simplified Mode
- Grade 3 reading level
- Highlight key terms with definitions on hover
- Bullet points over paragraphs
- Large font size (18px+)

### Audio Mode
- Text-to-speech button (use Web Speech API or external TTS)
- Section markers for pause/resume
- Show reading progress as audio plays
- Transcript alongside audio controls

---

## 11. Recommended Libraries

| Purpose | Library | Why |
|---------|---------|-----|
| Auth | `@auth0/auth0-react` | Official Auth0 SDK |
| Routing | `react-router-dom` | Standard for React SPAs |
| HTTP | `axios` | Interceptors for auth tokens |
| Icons | `lucide-react` | Tree-shakeable, 1000+ icons |
| Toast | `sonner` | Beautiful toasts, tiny bundle |
| Rich Text | `react-markdown` | Render AI chat responses |
| File Upload | `react-dropzone` | Drag-and-drop PDF upload |
| Charts | `recharts` | Assessment score visualization |
| Animation | `framer-motion` | Page transitions, micro-interactions |
| Forms | `react-hook-form` + `zod` | Type-safe form validation |
| TTS | Web Speech API (built-in) | No library needed for audio mode |

---

## Quick Start

```bash
cd frontend1
npm install
npm install @auth0/auth0-react react-router-dom axios lucide-react sonner react-markdown

# Create .env with Auth0 + API config (see section 3)

npm run dev
# → http://localhost:5173
```

Backend must be running on `http://localhost:3001` (`cd backend && npm run dev`).
