# 🧠 LearnNova — Frontend Guide

React + Vite frontend with Auth0 authentication, two user types (Teacher / Student), and neurodiversity-adaptive content display.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **React + Vite** | Fast dev, simple setup |
| Auth | **@auth0/auth0-react** | Official Auth0 React SDK |
| Routing | **react-router-dom v6** | Standard routing |
| HTTP | **axios** | API calls to backend |
| Styling | **Tailwind CSS** | Rapid UI |
| State | **React Context** | Auth + user profile |

---

## Setup

```bash
# Create project
npm create vite@latest frontend -- --template react
cd frontend

# Install all dependencies
npm install @auth0/auth0-react react-router-dom axios tailwindcss @tailwindcss/vite
```

### `vite.config.js`
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'   // proxy all /api calls to backend
    }
  }
})
```

### `src/index.css`
```css
@import "tailwindcss";
```

---

## Environment Variables

Create `frontend/.env`:
```env
VITE_AUTH0_DOMAIN=hackathon-div2k26.us.auth0.com
VITE_AUTH0_CLIENT_ID=DcUoVwZnUvWZR8AMcJV11GA9wcWnM82s
VITE_AUTH0_AUDIENCE=http://localhost:3001
VITE_API_URL=http://localhost:3001
```

---

## Folder Structure

```
frontend/
├── .env
├── index.html
├── vite.config.js
└── src/
    ├── main.jsx                    ← Auth0Provider wraps everything
    ├── App.jsx                     ← Routes
    ├── index.css
    │
    ├── context/
    │   └── UserContext.jsx         ← Stores our DB user profile (role, neurodiversity, org)
    │
    ├── hooks/
    │   ├── useApi.js               ← Axios instance with Auth0 token injected
    │   └── useCurrentUser.js       ← Fetch + cache /api/auth/me
    │
    ├── pages/
    │   ├── LandingPage.jsx         ← Hero + Login/Signup buttons
    │   ├── CallbackPage.jsx        ← Auth0 redirect handler → calls /api/auth/sync
    │   │
    │   ├── onboarding/
    │   │   ├── ChooseRolePage.jsx  ← "I am a Teacher" / "I am a Student"
    │   │   ├── NeuroDivKnownPage.jsx   ← Student knows: pick dyslexia/adhd/etc
    │   │   └── AssessmentPage.jsx  ← Student unsure: 10 questions → auto detect
    │   │
    │   ├── teacher/
    │   │   ├── TeacherDashboard.jsx    ← List orgs + upload lesson
    │   │   ├── CreateOrgPage.jsx       ← Create classroom
    │   │   ├── OrgDetailPage.jsx       ← View students, invite student
    │   │   └── UploadLessonPage.jsx    ← Upload PDF → transformed content
    │   │
    │   └── student/
    │       ├── StudentDashboard.jsx    ← My lessons (adapted to their profile)
    │       ├── LessonViewPage.jsx      ← Read lesson in their format (dyslexia/adhd/etc)
    │       └── ChatPage.jsx            ← RAG chatbot for a lesson
    │
    ├── components/
    │   ├── Navbar.jsx
    │   ├── ProtectedRoute.jsx      ← Redirects to login if not authenticated
    │   ├── RoleRoute.jsx           ← Redirects if wrong role (teacher vs student)
    │   ├── LoadingSpinner.jsx
    │   │
    │   ├── teacher/
    │   │   ├── OrgCard.jsx
    │   │   ├── StudentList.jsx
    │   │   └── InviteModal.jsx
    │   │
    │   └── student/
    │       ├── LessonCard.jsx
    │       ├── ChatBubble.jsx
    │       └── NeuroBadge.jsx      ← Shows "ADHD" / "Dyslexia" badge
    │
    └── lib/
        └── api.js                  ← All backend API calls (auth, lessons, chat)
```

---

## Key File Implementations

### `src/main.jsx`
```jsx
import { Auth0Provider } from '@auth0/auth0-react'
import { BrowserRouter } from 'react-router-dom'
import { UserProvider } from './context/UserContext'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin + '/callback',
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        scope: 'openid profile email'
      }}
    >
      <UserProvider>
        <App />
      </UserProvider>
    </Auth0Provider>
  </BrowserRouter>
)
```

---

### `src/App.jsx`
```jsx
import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import CallbackPage from './pages/CallbackPage'
import ChooseRolePage from './pages/onboarding/ChooseRolePage'
import NeuroDivKnownPage from './pages/onboarding/NeuroDivKnownPage'
import AssessmentPage from './pages/onboarding/AssessmentPage'
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import OrgDetailPage from './pages/teacher/OrgDetailPage'
import UploadLessonPage from './pages/teacher/UploadLessonPage'
import StudentDashboard from './pages/student/StudentDashboard'
import LessonViewPage from './pages/student/LessonViewPage'
import ChatPage from './pages/student/ChatPage'
import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/RoleRoute'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/callback" element={<CallbackPage />} />

      {/* Onboarding (logged in, not yet onboarded) */}
      <Route path="/onboarding/role" element={<ProtectedRoute><ChooseRolePage /></ProtectedRoute>} />
      <Route path="/onboarding/neuro" element={<ProtectedRoute><NeuroDivKnownPage /></ProtectedRoute>} />
      <Route path="/onboarding/assessment" element={<ProtectedRoute><AssessmentPage /></ProtectedRoute>} />

      {/* Teacher routes */}
      <Route path="/teacher" element={<RoleRoute role="teacher"><TeacherDashboard /></RoleRoute>} />
      <Route path="/teacher/org/:orgId" element={<RoleRoute role="teacher"><OrgDetailPage /></RoleRoute>} />
      <Route path="/teacher/upload" element={<RoleRoute role="teacher"><UploadLessonPage /></RoleRoute>} />

      {/* Student routes */}
      <Route path="/student" element={<RoleRoute role="student"><StudentDashboard /></RoleRoute>} />
      <Route path="/student/lesson/:lessonId" element={<RoleRoute role="student"><LessonViewPage /></RoleRoute>} />
      <Route path="/student/chat/:lessonId" element={<RoleRoute role="student"><ChatPage /></RoleRoute>} />
    </Routes>
  )
}
```

---

### `src/pages/CallbackPage.jsx`
This is the most important page — runs right after Auth0 login:
```jsx
import { useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { syncUser } from '../lib/api'

export default function CallbackPage() {
  const { isAuthenticated, isLoading, getAccessTokenSilently, user } = useAuth0()
  const { setCurrentUser } = useUser()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoading || !isAuthenticated) return

    async function syncAfterLogin() {
      try {
        const token = await getAccessTokenSilently()

        // Sync to our DB (upsert user)
        const data = await syncUser(token, {
          email: user.email,
          name: user.name,
        })

        setCurrentUser(data.user)

        // Route based on onboarding status
        if (!data.user.onboarded) {
          navigate('/onboarding/role')
        } else if (data.user.role === 'teacher') {
          navigate('/teacher')
        } else {
          navigate('/student')
        }
      } catch (err) {
        console.error('Sync failed:', err)
      }
    }

    syncAfterLogin()
  }, [isAuthenticated, isLoading])

  return <div className="flex items-center justify-center h-screen">
    <p className="text-lg text-gray-500">Signing you in...</p>
  </div>
}
```

---

### `src/lib/api.js`
Centralized API calls:
```js
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL

// Auth endpoints
export const syncUser = (token, body) =>
  axios.post(`${BASE}/api/auth/sync`, body, headers(token)).then(r => r.data)

export const getMe = (token) =>
  axios.get(`${BASE}/api/auth/me`, headers(token)).then(r => r.data)

export const saveNeurodiversity = (token, neurodiversity) =>
  axios.post(`${BASE}/api/auth/onboarding/individual`, { neurodiversity }, headers(token)).then(r => r.data)

export const submitAssessment = (token, answers) =>
  axios.post(`${BASE}/api/auth/onboarding/assessment`, { answers }, headers(token)).then(r => r.data)

export const createOrg = (token, orgName) =>
  axios.post(`${BASE}/api/auth/org/create`, { orgName }, headers(token)).then(r => r.data)

export const inviteStudent = (token, orgId, email) =>
  axios.post(`${BASE}/api/auth/org/invite`, { orgId, email }, headers(token)).then(r => r.data)

export const getMyOrgs = (token) =>
  axios.get(`${BASE}/api/auth/org/my`, headers(token)).then(r => r.data)

// Lessons
export const getLessons = () =>
  axios.get(`${BASE}/api/lessons`).then(r => r.data)

export const uploadLesson = (token, formData) =>
  axios.post(`${BASE}/api/upload`, formData, {
    ...headers(token),
    headers: { ...headers(token).headers, 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data)

// Chat
export const sendChat = (token, mode, message, lessonId) =>
  axios.post(`${BASE}/api/chat/${mode}`, { message, lessonId }, headers(token)).then(r => r.data)

// Helper
const headers = (token) => ({ headers: { Authorization: `Bearer ${token}` } })
```

---

## User Flow Summary

```
User visits /
  → clicks Login
    → Auth0 Universal Login screen
      → redirects to /callback
        → CallbackPage calls POST /api/auth/sync
          ┌─ first time? → /onboarding/role
          │     → Teacher → /teacher dashboard
          │     → Student (knows neuro) → /onboarding/neuro → pick types → /student
          │     → Student (unsure) → /onboarding/assessment → 10 Qs → auto detect → /student
          └─ returning user → role-based redirect
```

---

## Auth0 Dashboard — Allowed URLs

**Dashboard → Applications → LearnNova → Settings:**

| Field | Value |
|---|---|
| Allowed Callback URLs | `http://localhost:3000/callback` |
| Allowed Logout URLs | `http://localhost:3000` |
| Allowed Web Origins | `http://localhost:3000` |

> Update these to your production domain when deploying.

---

## Run Both Together

```bash
# Terminal 1 — Backend
cd backend && npm run dev       # runs on :3001

# Terminal 2 — Frontend
cd frontend && npm run dev      # runs on :3000 (Vite proxies /api → :3001)
```

---

## Neurodiversity Display Logic

In `LessonViewPage.jsx`, render based on `currentUser.neurodiversity`:

| Neurodiversity | Which content field to show |
|---|---|
| `dyslexia` | `lesson.dyslexia.text` + `difficultWords` |
| `adhd` | `lesson.adhd.chunks` (micro-chunks) |
| `dyscalculia` | `lesson.dyscalculia.sections` |
| `none` / default | `lesson.simplified.text` |

Chat mode maps directly: `dyslexia` → `POST /api/chat/dyslexia`, etc.
