import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import AudioPlayer from "../../components/ui/AudioPlayer";
import api from "../../lib/api";
import type { ChatMessage, ChatMode } from "../../types";
import { MODE_THEMES, NEURO_MODES } from "../../lib/constants";
import { cn } from "../../lib/utils";
import { Send, ArrowLeft, Bot, User, Sparkles, Trash2 } from "lucide-react";
import Markdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";

// ─── Rich tutor bubble — renders mode-specific extras ────────
function TutorBubble({ msg, mode }: { msg: ChatMessage; mode: ChatMode }) {
  const ex = msg.extra;
  return (
    <div className="space-y-2.5">
      {/* Main reply + read-aloud button */}
      <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-p:mb-1">
        <Markdown>{msg.content}</Markdown>
      </div>
      {/* ElevenLabs read-aloud button */}
      <AudioPlayer
        text={msg.content}
        mode={mode}
        variant="icon"
        className="mt-0.5 opacity-60 hover:opacity-100"
      />

      {/* Dyslexia: difficult words */}
      {ex?.difficultWords && ex.difficultWords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {ex.difficultWords.map((w) => (
            <span
              key={w.word}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 text-xs"
              title={w.meaning}
            >
              <strong className="text-amber-800">{w.word}</strong>
              <span className="text-amber-500">({w.phonetic})</span>
              <span className="text-amber-700 hidden sm:inline">— {w.meaning}</span>
              {/* Pronounce this word via ElevenLabs */}
              <AudioPlayer word={w.word} variant="word" mode="dyslexia" />
            </span>
          ))}
        </div>
      )}

      {/* Dyscalculia: visual aid */}
      {ex?.visualAid && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
          <span className="font-semibold">🔍 Visual:</span> {ex.visualAid}
        </div>
      )}

      {/* Dyscalculia: real-world example */}
      {ex?.realWorldExample && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
          <span className="font-semibold">🌍 Example:</span> {ex.realWorldExample}
        </div>
      )}

      {/* Encouragement (dyslexia) or interaction prompt (ADHD) */}
      {(ex?.encouragement || ex?.interactionPrompt) && (
        <div className="rounded-lg bg-violet-50 border border-violet-200 px-3 py-2 text-xs font-medium text-violet-700">
          {ex.encouragement || ex.interactionPrompt} {ex?.emoji || ""}
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { primaryNeuro } = useUser();

  // Only these 3 modes have a backend chat personality; clamp everything else to dyslexia
  const VALID_CHAT_MODES: ChatMode[] = ["dyslexia", "adhd", "dyscalculia"];
  const initialMode: ChatMode = VALID_CHAT_MODES.includes(primaryNeuro as ChatMode)
    ? (primaryNeuro as ChatMode)
    : "dyslexia";
  const [mode, setMode] = useState<ChatMode>(initialMode);

  // ── Persist messages to localStorage keyed by lessonId ──
  const storageKey = `chat_history_${lessonId}`;

  // Unwrap any old messages where content was accidentally stored as raw JSON
  function normalizeMessages(msgs: ChatMessage[]): ChatMessage[] {
    return msgs.map((m) => {
      if (m.role !== "tutor" || !m.content?.trimStart().startsWith("{")) return m;
      try {
        const parsed = JSON.parse(m.content);
        if (parsed && typeof parsed.reply === "string") {
          return {
            ...m,
            content: parsed.reply,
            extra: m.extra ?? {
              difficultWords:    parsed.difficultWords,
              encouragement:     parsed.encouragement,
              interactionPrompt: parsed.interactionPrompt,
              emoji:             parsed.emoji,
              visualAid:         parsed.visualAid,
              realWorldExample:  parsed.realWorldExample,
            },
          };
        }
      } catch { /* not JSON */ }
      return m;
    });
  }

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? normalizeMessages(JSON.parse(saved) as ChatMessage[]) : [];
    } catch {
      return [];
    }
  });

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Save to localStorage whenever messages change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // storage quota exceeded — silently ignore
    }
  }, [messages, storageKey]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const studentMsg: ChatMessage = {
      role: "student",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, studentMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await api.post(`/api/chat/${mode}`, {
        message: text,
        lessonId,
        sessionId,
      });

      const data = res.data as any;
      let resp = data?.response ?? data;

      // Safety: if resp.reply is itself a JSON string (backend didn't fully parse),
      // unwrap it so structured fields are available and raw JSON is never displayed.
      if (resp && typeof resp.reply === "string" && resp.reply.trimStart().startsWith("{")) {
        try {
          const inner = JSON.parse(resp.reply);
          if (inner && typeof inner === "object") {
            resp = { ...resp, ...inner };
          }
        } catch {
          // not valid JSON — leave resp as-is
        }
      }

      // Also handle the case where the whole resp is a raw JSON string
      if (typeof resp === "string" && resp.trimStart().startsWith("{")) {
        try { resp = JSON.parse(resp); } catch { /* leave as-is */ }
      }

      const replyText: string =
        typeof resp?.reply === "string"
          ? resp.reply
          : "I couldn't generate a response.";

      const tutorMsg: ChatMessage = {
        role: "tutor",
        content: replyText,
        extra: {
          difficultWords: resp?.difficultWords,
          encouragement: resp?.encouragement,
          interactionPrompt: resp?.interactionPrompt,
          emoji: resp?.emoji,
          visualAid: resp?.visualAid,
          realWorldExample: resp?.realWorldExample,
        },
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tutorMsg]);
    } catch (err) {
      const tutorMsg: ChatMessage = {
        role: "tutor",
        content: `Sorry, I had trouble responding. ${err instanceof Error ? err.message : ""}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tutorMsg]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const theme = MODE_THEMES[mode];
  void theme; // used indirectly by mode pill styles

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-0 -mt-2">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between rounded-t-2xl border border-white/70 bg-white/80 glass px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-sm">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-none">AI Tutor</p>
              <p className="text-xs text-gray-400 mt-0.5">Lesson {lessonId?.replace("lesson_", "")}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Clear history */}
          {messages.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Clear chat history for this lesson?")) {
                  setMessages([]);
                  localStorage.removeItem(storageKey);
                }
              }}
              className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Clear chat history"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          )}

          {/* Mode switcher pill */}
          <div className="flex gap-1 bg-gray-100/80 rounded-xl p-1">
          {NEURO_MODES.map((m) => {
            const t = MODE_THEMES[m];
            return (
              <button
                key={m}
                onClick={() => setMode(m as ChatMode)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                  mode === m
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {t.emoji} {m}
              </button>
            );
          })}
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto border-x border-white/70 bg-gray-50/50 px-4 py-4 space-y-4 backdrop-blur-sm">
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex h-full min-h-[300px] flex-col items-center justify-center text-center"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 shadow-sm mb-5">
                <Sparkles className="h-9 w-9 text-violet-400" />
              </div>
              <p className="text-lg font-semibold text-gray-800">Start a conversation</p>
              <p className="text-sm text-gray-400 mt-2 max-w-xs leading-relaxed">
                Ask anything about this lesson — I'll adapt to your{" "}
                <span className="font-medium text-violet-600 capitalize">{mode}</span> learning style.
              </p>

              {/* Suggestion chips */}
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {["Summarize the key points", "Give me an example", "I don't understand this"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="rounded-xl border border-violet-100 bg-white px-3.5 py-2 text-xs font-medium text-violet-700 hover:bg-violet-50 hover:border-violet-200 transition-all shadow-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex gap-3 items-end",
              msg.role === "student" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "tutor" && (
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-sm flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
            )}

            <div
              className={cn(
                "max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                msg.role === "student"
                  ? "bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white rounded-br-sm"
                  : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm"
              )}
            >
              {msg.role === "tutor" ? (
                <TutorBubble msg={msg} mode={mode} />
              ) : (
                <p className="leading-relaxed">{msg.content}</p>
              )}
              <p className={cn(
                "text-[10px] mt-1.5",
                msg.role === "student" ? "text-white/50 text-right" : "text-gray-400"
              )}>
                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
              </p>
            </div>

            {msg.role === "student" && (
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 flex-shrink-0">
                <User className="h-4 w-4 text-violet-600" />
              </div>
            )}
          </motion.div>
        ))}

        {/* Typing indicator */}
        {sending && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 items-end"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-sm flex-shrink-0">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="rounded-2xl rounded-bl-sm border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <div className="flex gap-1.5 items-center">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="h-2 w-2 rounded-full bg-violet-400 animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={endRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="rounded-b-2xl border border-t-0 border-white/70 glass px-4 py-3 shadow-sm">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex gap-2.5 items-center"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask in ${mode} mode...`}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/25 transition-all placeholder:text-gray-400"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className={cn(
              "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition-all",
              input.trim() && !sending
                ? "bg-gradient-to-br from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 hover:shadow-violet-300/40"
                : "bg-gray-200 cursor-not-allowed"
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
