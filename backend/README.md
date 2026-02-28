# 🧠 NeuroAdapt Backend

**Neurodivergent-Adaptive Learning Engine** — An AI-powered backend that transforms educational content and delivers personalized learning experiences for students with ADHD, Dyslexia, and Dyscalculia.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [System Flow](#system-flow)

---

## Overview

NeuroAdapt adapts any educational PDF into multiple formats tailored to different learning profiles. A teacher uploads a lesson — the system automatically generates:

- **ADHD version** — micro-chunked with interaction prompts
- **Dyslexia version** — simplified text + phonetic word guides
- **Dyscalculia version** — visual step-by-step for all numbers
- **Simplified version** — Grade 3 reading level
- **Audio Script** — conversational narration

Students can then chat with a RAG-powered tutor that answers questions only from the uploaded lesson content.

---

## Features

- 📄 **PDF Upload & Transform** — Extracts text, runs 5 parallel AI transformations
- 🤖 **RAG Chatbot** — 3 adaptive tutors (Spark/ADHD, Lex/Dyslexia, Visu/Dyscalculia)
- 🧪 **Learning Assessment** — 10-question screening → identifies ADHD/Dyslexia/Dyscalculia
- 👩‍🏫 **Student Management** — Teacher creates students, assigns lessons, tracks assessments
- 🐘 **PostgreSQL Storage** — Lessons, students, assessments, lesson assignments
- 🔍 **Vector RAG** — Gemini embeddings + MemoryVectorStore for semantic search
- 🤗 **HuggingFace Primary** — Llama-3.2-3B-Instruct (free tier)
- 🔄 **Groq Fallback** — llama-3.3-70b-versatile auto-fallback on HF failure

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + Express |
| AI Framework | LangChain.js v1.2 |
| LLM (Primary) | HuggingFace — `meta-llama/Llama-3.2-3B-Instruct` |
| LLM (Fallback) | Groq — `llama-3.3-70b-versatile` |
| Embeddings | Google Gemini — `gemini-embedding-001` |
| Vector Store | MemoryVectorStore (`@langchain/classic`) |
| Database | PostgreSQL 16 (via `pg`) |
| PDF Parsing | `pdf-parse` + `pdftotext` fallback |
| File Upload | Multer (memory storage) |

---

## Project Structure

```
backend/
├── src/
│   ├── server.js              # Express app entry point
│   ├── config.js              # Environment config
│   ├── routes/
│   │   ├── upload.js          # POST /api/upload — PDF upload & transform
│   │   ├── lessons.js         # GET /api/lessons — lesson dashboard
│   │   ├── chat.js            # POST /api/chat/:mode — RAG chatbot
│   │   ├── assess.js          # POST /api/assess — disability screening
│   │   ├── students.js        # CRUD /api/students — student management
│   │   └── transform.js       # POST /api/transform — text-only transform
│   ├── services/
│   │   ├── supabaseClient.js  # PostgreSQL DB operations (pg Pool)
│   │   ├── chatClient.js      # HuggingFace + Groq fallback chat
│   │   ├── groqClient.js      # Multi-model parallel chains for transforms
│   │   ├── vectorStore.js     # Gemini embeddings + RAG search
│   │   ├── chunker.js         # Text chunking for RAG indexing
│   │   ├── pdfExtractor.js    # PDF text extraction (pdf-parse + pdftotext)
│   │   ├── geminiClient.js    # Gemini API client
│   │   ├── assessmentQuestions.js  # 10 screening questions + scale
│   │   └── prompts/
│   │       ├── adhd.js        # ADHD transform prompt
│   │       ├── dyslexia.js    # Dyslexia transform prompt
│   │       ├── dyscalculia.js # Dyscalculia transform prompt
│   │       ├── simplified.js  # Grade 3 simplification prompt
│   │       ├── audioScript.js # Audio narration prompt
│   │       ├── chatPersonalities.js  # Spark / Lex / Visu chat prompts
│   │       └── assessmentPrompt.js   # LLM assessment analysis prompt
│   ├── middleware/
│   │   └── multerConfig.js    # PDF upload config (10MB limit)
│   └── utils/
│       └── responseFormatter.js
├── .env                       # Environment variables (not committed)
├── .env.example               # Template for env variables
├── supabase-schema.sql        # PostgreSQL schema (students, lessons, student_lessons)
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 16
- `pdftotext` CLI: `sudo apt install poppler-utils`

### 1. Install Dependencies

```bash
cd backend
npm install --legacy-peer-deps
```

### 2. Set Up PostgreSQL

```bash
sudo -u postgres psql -c "CREATE DATABASE neuroadapt;"
sudo -u postgres psql -c "CREATE USER neuroadapt_user WITH PASSWORD 'neuroadapt123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE neuroadapt TO neuroadapt_user;"

# Create tables
psql -h localhost -U neuroadapt_user -d neuroadapt -f supabase-schema.sql
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 4. Run Development Server

```bash
npm run dev        # nodemon (auto-restart)
npm start          # production
```

Server starts at **http://localhost:3001**

---

## Environment Variables

Create a `.env` file:

```env
PORT=3001

# AI Engine
GEMINI_API_KEY=your_gemini_api_key        # For embeddings (gemini-embedding-001)
GROQ_API_KEY=your_groq_api_key            # LLM fallback + transforms
HUGGINGFACE_API_KEY=your_hf_api_key       # Primary chatbot (Llama-3.2-3B-Instruct)

# Database
DATABASE_URL=postgresql://neuroadapt_user:neuroadapt123@localhost:5432/neuroadapt
```

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Vector embeddings for RAG |
| `GROQ_API_KEY` | ✅ | Content transformation + chatbot fallback |
| `HUGGINGFACE_API_KEY` | ⚠️ Optional | Primary chatbot (Groq used if missing) |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |

---

## API Reference

### Health Check
```
GET /api/health
```

### Upload & Transform PDF
```
POST /api/upload
Content-Type: multipart/form-data

Fields:
  pdf         (file)    Required — PDF file
  studentId   (string)  Optional — assign lesson to a student
```

**Response includes:** `id`, `title`, `dyslexia`, `adhd`, `dyscalculia`, `simplified`, `audioScript`

---

### RAG Chatbot
```
POST /api/chat/:mode
Content-Type: application/json

Modes: adhd | dyslexia | dyscalculia

Body:
{
  "message": "What is photosynthesis?",
  "lessonId": "lesson_123456",
  "sessionId": "optional-session-id"
}
```

---

### Assessment (Disability Screening)
```
GET  /api/assess/questions        # Returns 10 questions
POST /api/assess                  # Submit answers

Body:
{
  "answers": [
    { "questionId": 1, "value": 2 },  // value: 0=Never, 1=Sometimes, 2=Often, 3=Always
    ...10 answers total
  ],
  "studentId": "uuid"   // Optional — saves result to student profile
}
```

---

### Student Management

```
POST   /api/students                    # Create student
GET    /api/students                    # List all students
GET    /api/students/:id                # Get student (includes assessment result)
PUT    /api/students/:id                # Update student
DELETE /api/students/:id                # Delete student
GET    /api/students/:id/lessons        # Get lessons assigned to student
```

**Create student body:**
```json
{ "name": "Rahul Sharma", "age": 14, "grade": "8th", "email": "rahul@school.com" }
```

---

### Lessons
```
GET /api/lessons         # All lessons (title, subject, created_at)
GET /api/lessons/:id     # Full lesson data including all transformed versions
```

---

## System Flow

### Upload → Transform → Index
```
Teacher uploads PDF
    → Extract text (pdf-parse / pdftotext fallback)
    → Run 5 parallel Groq chains (ADHD / Dyslexia / Dyscalculia / Simplified / Audio)
    → Save lesson to PostgreSQL
    → Chunk text + embed with Gemini → index in MemoryVectorStore
    → Return all 5 transformed versions
```

### Chat (RAG)
```
Student asks question
    → Embed question with Gemini
    → Search MemoryVectorStore → top 3 relevant chunks
    → Send [system prompt + context + question] to HuggingFace
    → HuggingFace fails? → auto-fallback to Groq
    → Return mode-adapted response (JSON with reply + extras)
```

### Assessment → Student Profile
```
Student answers 10 questions (0-3 scale)
    → LLM analyzes patterns → returns { primaryCondition, confidence, scores }
    → If studentId provided → save learning_mode + assessment_result to PostgreSQL
    → Teacher sees student profile with recommended learning mode
```

---

## Database Schema

```sql
students          -- id (uuid), name, age, grade, email, learning_mode, assessment_result, assessed_at
lessons           -- id (text), title, raw_text, subject, transformed (jsonb), created_at
student_lessons   -- id, student_id (fk), lesson_id (fk), learning_mode, assigned_at
```

---

## Notes

- **Vector store is in-memory** — resets on server restart. Re-upload PDFs after restart. For production, migrate to `pgvector`.
- **Groq models used:** `llama-3.3-70b-versatile` (transforms + fallback), `meta-llama/llama-4-scout-17b-16e-instruct`, `qwen/qwen3-32b`
- **HuggingFace model:** `meta-llama/Llama-3.2-3B-Instruct` (free tier, chat completion endpoint)
