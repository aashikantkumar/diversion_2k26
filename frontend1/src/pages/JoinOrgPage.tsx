import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { PageSpinner } from "../components/ui";
import api from "../lib/api";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function JoinOrgPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { refetchUser } = useUser();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // Backend uses POST /api/auth/org/join/:token
        const res = await api.post(`/api/auth/org/join/${token}`, {});
        const data = res.data as any;
        setMessage(data?.message || "Successfully joined the classroom!");
        setStatus("success");
        await refetchUser();
        toast.success("Joined classroom!");
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Invalid or expired invite link");
        setStatus("error");
      }
    })();
  }, [token, refetchUser]);

  if (status === "loading") {
    return <PageSpinner text="Joining classroom..." />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-56 w-56 rounded-full bg-fuchsia-200/40 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="glass rounded-3xl border border-white/70 p-10 text-center shadow-2xl">
          {/* Logo badge */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-lg shadow-violet-400/30">
            <Sparkles className="h-8 w-8 text-white" />
          </div>

          {status === "success" ? (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">You're In! 🎉</h2>
              <p className="mt-3 text-gray-500 leading-relaxed">{message}</p>
              <button
                onClick={() => navigate("/dashboard", { replace: true })}
                className="mt-8 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-400/30 hover:shadow-violet-400/50 transition-all hover:-translate-y-0.5"
              >
                Go to Dashboard
              </button>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Couldn't Join</h2>
              <p className="mt-3 text-gray-500 leading-relaxed">{message}</p>
              <button
                onClick={() => navigate("/", { replace: true })}
                className="mt-8 w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
              >
                Go Home
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
