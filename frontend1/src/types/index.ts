// ─── User ─────────────────────────────────────────────────────
export type Role = "teacher" | "org_student" | "individual";
export type NeuroDivType = "dyslexia" | "adhd" | "dyscalculia" | "none";

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  org_id: string | null;
  neurodiversity: NeuroDivType[];
  signup_type: "individual" | "org";
  onboarded: boolean;
  created_at: string;
  updated_at: string;
  org_name?: string | null;
}

// ─── Organization ─────────────────────────────────────────────
export interface Organization {
  id: string;
  name: string;
  teacher_id: string;
  created_at: string;
  student_count?: number;
}

// ─── Lesson ───────────────────────────────────────────────────
export interface DyslexiaContent {
  text: string;
  formatting: {
    font: string;
    lineHeight: number;
    bgColor: string;
  };
  difficultWords: string[];
  encouragement: {
    sectionComplete: string;
    halfwayPoint: string;
    allDone: string;
  };
}

export interface ADHDChunk {
  title: string;
  content: string;
  emoji: string;
  timeEstimate: string;
}

export interface ADHDContent {
  chunks: ADHDChunk[];
}

export interface DyscalculiaSection {
  title: string;
  steps: string[];
  visualAid?: string;
}

export interface DyscalculiaContent {
  sections: DyscalculiaSection[];
  summary: string;
}

export interface SimplifiedContent {
  text: string;
  readingLevel: string;
  keyTerms: string[];
}

export interface AudioContent {
  text: string;
  estimatedDuration: string;
  sections: string[];
}

export interface LessonMetadata {
  processingTimeMs: number;
  modelPool: string[];
  ragEnabled: boolean;
  ragChunks: number;
}

export interface Lesson {
  id: string;
  title: string;
  subject?: string;
  original: string;
  dyslexia: DyslexiaContent;
  adhd: ADHDContent;
  dyscalculia: DyscalculiaContent;
  simplified: SimplifiedContent;
  audioScript: AudioContent;
  signLanguage: { available: boolean; videoUrl: string; summary: string };
  metadata: LessonMetadata;
  created_at?: string;
}

export interface LessonSummary {
  id: string;
  title: string;
  subject?: string;
  created_at: string;
}

// ─── Assessment ───────────────────────────────────────────────
export interface AssessmentQuestion {
  id: number;
  question: string;
  emoji: string;
  targets: string[];
  examples: string;
}

export interface AnswerScale {
  value: number;
  label: string;
}

export interface AssessmentAnswer {
  questionId: number;
  value: 0 | 1 | 2 | 3;
}

export interface AssessmentResult {
  primaryCondition: NeuroDivType;
  secondaryCondition: string | null;
  confidence: "high" | "moderate" | "low";
  scores: { dyslexia: number; adhd: number; dyscalculia: number };
  explanation: string;
  recommendedMode: string;
  keySignals: string[];
  supportTips: string[];
}

// ─── Chat ─────────────────────────────────────────────────────
export type ChatMode = "dyslexia" | "adhd" | "dyscalculia";

export interface ChatMessage {
  role: "student" | "tutor";
  content: string;
  /** Structured mode-specific data from the tutor (dyslexia words, encouragement, etc.) */
  extra?: {
    difficultWords?: { word: string; phonetic: string; meaning: string }[];
    encouragement?: string;
    interactionPrompt?: string;
    emoji?: string;
    visualAid?: string;
    realWorldExample?: string;
  };
  timestamp?: string;
}

export interface ChatResponse {
  mode: string;
  lessonId: string;
  response: { reply: string; source: string };
  rag: {
    sourcesUsed: number;
    searchType: string;
    chunks: { chunkIndex: number; score: number }[];
  };
}

// ─── AI Image ─────────────────────────────────────────────────
export interface GeneratedImage {
  id: string;
  topic: string;
  mode: string;
  url: string;
  width: number;
  height: number;
  sizeKB: string;
  prompt: string;
  model: string;
}

// ─── Invite / Org ─────────────────────────────────────────────
export interface OrgInvite {
  inviteUrl: string;
  token: string;
  expiresAt: string;
}

// ─── Student (Legacy) ─────────────────────────────────────────
export interface Student {
  id: string;
  name: string;
  age: number;
  grade: string;
  email: string;
  neurodiversity_type: string;
  assessment_result: AssessmentResult | null;
  created_at: string;
}

// ─── API Response Wrappers ────────────────────────────────────
export interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}
