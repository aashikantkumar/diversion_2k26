import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { Eye, EyeOff, Sparkles, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useUser();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name || user.email}!`);
      if (from) {
        navigate(from, { replace: true });
      } else if (!user.onboarded) {
        navigate("/onboarding/role", { replace: true });
      } else {
        navigate(user.role === "teacher" ? "/teacher" : "/dashboard", { replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-gradient-to-br from-violet-950 via-violet-900 to-fuchsia-900">
      <div className="pointer-events-none absolute inset-0 dot-grid-bright opacity-30" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="glass rounded-3xl border border-white/20 p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-xl">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <h1 className="font-display text-3xl font-bold text-white">Welcome back</h1>
            <p className="mt-2 text-white/60 text-sm">Sign in to continue to LearnNova</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/30 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Your password"
                  className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 pr-11 text-white placeholder-white/40 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/30 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 font-bold text-white shadow-lg shadow-violet-900/40 transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Signing in..." : "Sign in"}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-sm text-white/50">
            No account yet?{" "}
            <Link to="/register" className="font-semibold text-violet-300 hover:text-violet-200 transition">
              Create one free
            </Link>
          </p>
          <Link to="/" className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
