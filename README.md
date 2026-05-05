# 🧠 NeuroAdapt — Neurodivergent-Adaptive Learning Engine

**NeuroAdapt** is an AI-powered full-stack platform built for **Diversion 2k26** that transforms educational content into personalized learning experiences for students with ADHD, Dyslexia, and Dyscalculia.

A teacher uploads a lesson PDF — the system automatically generates five adaptive versions and provides each student with an AI tutor tailored to their learning profile.

---

## ✨ Features

- 📄 **PDF Upload & Transform** — Extracts text and runs 5 parallel AI transformations (ADHD, Dyslexia, Dyscalculia, Simplified, Audio Script)
- 🤖 **RAG Chatbot Tutors** — Spark (ADHD), Lex (Dyslexia), Visu (Dyscalculia) — answer questions grounded in uploaded lesson content
- 🧪 **Learning Assessment** — 10-question screening that identifies a student's primary learning profile
- 👩‍🏫 **Teacher Dashboard** — Create students, assign lessons, track assessment results
- 🎓 **Student Portal** — Access adaptive lesson content and chat with the AI tutor

---

## 🗂️ Project Structure

```
diversion_2k26/
├── backend/        # Node.js + Express API (LangChain, PostgreSQL, Groq, Gemini)
└── frontend1/      # React + TypeScript + Vite UI (Tailwind CSS, Framer Motion)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express |
| AI Framework | LangChain.js v1.2 |
| LLM (Primary) | HuggingFace — `meta-llama/Llama-3.2-3B-Instruct` |
| LLM (Fallback) | Groq — `llama-3.3-70b-versatile` |
| Embeddings | Google Gemini — `gemini-embedding-001` |
| Vector Store | MemoryVectorStore |
| Database | PostgreSQL 16 |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 16
- `pdftotext` CLI: `sudo apt install poppler-utils`

### 1. Clone the repository

```bash
git clone https://github.com/aashikantkumar/diversion_2k26.git
cd diversion_2k26
```

### 2. Set up the Backend

```bash
cd backend
npm install --legacy-peer-deps
cp .env.example .env
# Fill in your API keys in .env
```

Create the PostgreSQL database and tables:

```bash
sudo -u postgres psql -c "CREATE DATABASE neuroadapt;"
sudo -u postgres psql -c "CREATE USER neuroadapt_user WITH PASSWORD 'neuroadapt123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE neuroadapt TO neuroadapt_user;"
psql -h localhost -U neuroadapt_user -d neuroadapt -f db-schema.sql
```

Start the backend server:

```bash
npm run dev      # development (auto-restart)
npm start        # production
```

Backend runs at **http://localhost:3001**

### 3. Set up the Frontend

```bash
cd ../frontend1
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**

---

## 🔑 Environment Variables

Create `backend/.env` using `backend/.env.example` as a template:

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Vector embeddings for RAG |
| `GROQ_API_KEY` | ✅ | Content transformation + chatbot fallback |
| `HUGGINGFACE_API_KEY` | ⚠️ Optional | Primary chatbot (Groq used if missing) |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |

---

## 🔄 System Flow

```
Teacher uploads PDF
  → Extract text → 5 parallel AI transformations (ADHD / Dyslexia / Dyscalculia / Simplified / Audio)
  → Save to PostgreSQL → Chunk + embed with Gemini → index in MemoryVectorStore

Student asks the AI tutor
  → Embed question → Search vector store → top 3 relevant chunks
  → Send to HuggingFace (or Groq fallback) → return adaptive response

Student takes assessment
  → 10 questions (0–3 scale) → LLM analysis → primaryCondition + confidence
  → Save learning_mode to student profile
```

---

## 📡 API Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/upload` | Upload PDF & generate transformations |
| `GET` | `/api/lessons` | List all lessons |
| `GET` | `/api/lessons/:id` | Get full lesson with all adaptive versions |
| `POST` | `/api/chat/:mode` | Chat with AI tutor (`adhd`/`dyslexia`/`dyscalculia`) |
| `GET` | `/api/assess/questions` | Get assessment questions |
| `POST` | `/api/assess` | Submit assessment answers |
| `POST` | `/api/students` | Create a student |
| `GET` | `/api/students` | List all students |
| `GET` | `/api/students/:id` | Get student profile |
| `GET` | `/api/students/:id/lessons` | Get lessons assigned to a student |

For full API documentation, see [`backend/README.md`](backend/README.md).

---

## 📝 Notes

- The vector store is **in-memory** — it resets on server restart. Re-upload PDFs after restarting the backend. For production use, migrate to `pgvector`.
- Built for **Diversion 2k26** hackathon.
