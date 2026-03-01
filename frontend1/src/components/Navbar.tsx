import { Link, useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { NeuroBadge, Button } from "./ui";
import {
  LogOut,
  BookOpen,
  LayoutDashboard,
  Upload,
  Image as ImageIcon,
  Video,
  Menu,
  X,
  Sparkles,
  GraduationCap,
  Moon,
  Sun,
} from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";

export default function Navbar() {
  const { user, isTeacher, isAuthenticated, logout: ctxLogout } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname.startsWith(path);

  const navLinks = isTeacher
    ? [
      { to: "/teacher", label: "Dashboard", icon: LayoutDashboard },
      { to: "/teacher/upload", label: "Upload", icon: Upload },
    ]
    : [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/lessons",   label: "Lessons",   icon: BookOpen },
      { to: "/images",    label: "Images",    icon: ImageIcon },
      { to: "/videos",    label: "Videos",    icon: Video },
    ];

  return (
    <nav className="sticky top-0 z-40 glass border-b border-white/60 dark:border-white/8 shadow-sm shadow-violet-900/5">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* ── Logo ── */}
        <Link
          to={isAuthenticated ? (isTeacher ? "/teacher" : "/dashboard") : "/"}
          className="flex items-center gap-2.5 group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-md shadow-violet-400/30 group-hover:shadow-violet-400/50 transition-all duration-200">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-xl font-display font-bold gradient-text tracking-tight">
            LearnNova
          </span>
        </Link>

        {/* ── Desktop nav pills ── */}
        {isAuthenticated && user?.onboarded && (
          <div className="hidden md:flex items-center gap-1 bg-white/50 dark:bg-white/5 rounded-2xl px-2 py-1.5 border border-white/80 dark:border-white/10 shadow-inner shadow-gray-100/80">
            {navLinks.map((link) => (
              <Link
                key={link.to + link.label}
                to={link.to}
                className={cn(
                  "nav-pill",
                  isActive(link.to) && "active"
                )}
              >
                <link.icon className="h-3.5 w-3.5" />
                {link.label}
              </Link>
            ))}
          </div>
        )}

        {/* ── Right side ── */}
        <div className="flex items-center gap-3">
          {/* ── Theme toggle ── */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/6 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-white/12 hover:text-gray-800 dark:hover:text-white transition-all duration-200"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {isAuthenticated && user ? (
            <>
              {/* Neuro badges */}
              <div className="hidden sm:flex gap-1">
                {user.neurodiversity
                  ?.filter((n) => n !== "none")
                  .map((n) => (
                    <NeuroBadge key={n} type={n} />
                  ))}
              </div>

              {/* Avatar chip */}
              <div className="hidden md:flex items-center gap-2 rounded-full bg-white/70 dark:bg-white/8 border border-white dark:border-white/10 px-3 py-1.5 shadow-sm">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {isTeacher ? <GraduationCap className="h-3.5 w-3.5" /> : (user.name?.[0] || "S")}
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
                  {user.name || user.email}
                </span>
              </div>

              <button
                onClick={() => {
                  ctxLogout();
                  navigate('/');
                }}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-800/40"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
              >
                Log In
              </Button>
              <button
                onClick={() => navigate('/register')}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-md shadow-violet-400/30 hover:shadow-violet-400/50 hover:from-violet-500 hover:to-fuchsia-400 transition-all duration-200"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Mobile toggle */}
          <button
            className="md:hidden rounded-xl p-2 text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-white/8 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile nav ── */}
      <AnimatePresence>
        {mobileOpen && isAuthenticated && user?.onboarded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/60 dark:border-white/8 glass md:hidden"
          >
            <div className="space-y-1 px-4 py-3">
              {navLinks.map((link) => (
                <button
                  key={link.to + link.label}
                  onClick={() => {
                    navigate(link.to);
                    setMobileOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive(link.to)
                      ? "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/6"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}



